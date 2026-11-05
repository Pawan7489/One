from __future__ import annotations

from datetime import datetime
from pathlib import Path
import base64
import json
import mimetypes
import os
import queue
import re
import threading
import time
import uuid
from urllib.parse import urlparse

import requests
import werkzeug
from flask import Flask, Response, jsonify, render_template, request, send_file, stream_with_context
from flask_cors import CORS

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app, resources={r"/*": {"origins": "*"}})

# Allow large requests so 10,000+ word prompts and attachments can be submitted safely.
app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("MAX_CONTENT_LENGTH_BYTES", 50 * 1024 * 1024))
app.config["MAX_FORM_MEMORY_SIZE"] = int(os.environ.get("MAX_FORM_MEMORY_SIZE", 10 * 1024 * 1024))

ENGINE_CONFIG = {
    "base_url": os.environ.get("AI_ENGINE_URL", "").strip().rstrip("/"),
    "api_key": os.environ.get("AI_ENGINE_KEY", "").strip(),
    "engine_name": os.environ.get("AI_ENGINE_NAME", "A1-Core-Engine"),
    "updated_at": None,
}

DEFAULT_MAX_OUTPUT_TOKENS = int(os.environ.get("MAX_OUTPUT_TOKENS", 32768))
ACTIVE_STREAM_SESSIONS: dict[str, dict] = {}

PERSONAS = {
    "child": {
        "label": "Learning Mode (5-15)",
        "greeting": "Hi there! I am your assistant. What would you like to learn today?",
    },
    "youth": {
        "label": "Student Mode (16-25)",
        "greeting": "Hey! I am here to help. What do you need?",
    },
    "adult": {
        "label": "Professional Mode (26-50)",
        "greeting": "Hello. I am your digital assistant. How can I help you today?",
    },
    "senior": {
        "label": "Guided Mode (50+)",
        "greeting": "Hello. Please share what you need, and I will help step by step.",
    },
}

MEDIA_ROOT = Path(os.environ.get("APP_MEDIA_ROOT", "/tmp/one_media"))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
MEDIA_REGISTRY: dict[str, dict] = {}


@app.errorhandler(werkzeug.exceptions.RequestEntityTooLarge)
def handle_request_too_large(_error):
    return (
        jsonify(
            {
                "status": "error",
                "success": False,
                "message": "The request is too large. Please reduce attachment size and try again.",
            }
        ),
        413,
    )


def calculate_age(date_of_birth: str) -> int:
    try:
        if not date_of_birth or date_of_birth == "null":
            return 25
        birth_date = datetime.strptime(date_of_birth, "%Y-%m-%d")
        today = datetime.now()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    except Exception:
        return 25


def get_persona_mode(age: int) -> dict:
    if age <= 15:
        return PERSONAS["child"]
    if age <= 25:
        return PERSONAS["youth"]
    if age <= 50:
        return PERSONAS["adult"]
    return PERSONAS["senior"]


def clean_base_url(raw_url: str) -> str:
    cleaned = str(raw_url or "").strip().rstrip("/")
    if not cleaned:
        return ""
    cleaned = re.sub(
        r"/api/(?:ai/(?:ask|stream|image|video|audio|document|code|search)|generate|chat)$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned.rstrip("/")


def get_engine_endpoints() -> tuple[str, str]:
    base_url = clean_base_url(ENGINE_CONFIG.get("base_url"))
    if not base_url:
        return "", ""
    return f"{base_url}/api/ai/ask", f"{base_url}/api/ai/stream"


def infer_extension(content_type: str | None, fallback: str = ".bin") -> str:
    if not content_type:
        return fallback
    guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
    return guessed or fallback


def register_saved_file(file_path: Path, content_type: str | None = None, filename: str | None = None) -> str:
    public_name = filename or file_path.name
    safe_name = werkzeug.utils.secure_filename(public_name) or f"file_{uuid.uuid4().hex}"
    registry_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    MEDIA_REGISTRY[registry_name] = {
        "path": str(file_path),
        "content_type": content_type or mimetypes.guess_type(str(file_path))[0] or "application/octet-stream",
    }
    return f"/api/media/{registry_name}"


def save_base64_media(value: str, filename_hint: str | None = None) -> str | None:
    try:
        payload = value
        content_type = "application/octet-stream"

        if value.startswith("data:") and ";base64," in value:
            header, payload = value.split(",", 1)
            content_type = header[5:].split(";")[0] or content_type

        decoded = base64.b64decode(payload, validate=False)
        extension = infer_extension(content_type)
        file_name = werkzeug.utils.secure_filename(filename_hint or f"media_{uuid.uuid4().hex}{extension}")
        output_path = MEDIA_ROOT / file_name
        output_path.write_bytes(decoded)
        return register_saved_file(output_path, content_type=content_type, filename=file_name)
    except Exception:
        return None


def copy_remote_media(remote_url: str) -> str | None:
    try:
        parsed = urlparse(remote_url)
        candidate_name = Path(parsed.path).name or f"media_{uuid.uuid4().hex}.bin"
        safe_name = werkzeug.utils.secure_filename(candidate_name)
        response = requests.get(remote_url, timeout=30)
        if response.status_code != 200:
            return None
        output_path = MEDIA_ROOT / f"{uuid.uuid4().hex[:8]}_{safe_name}"
        output_path.write_bytes(response.content)
        return register_saved_file(
            output_path,
            content_type=response.headers.get("Content-Type"),
            filename=output_path.name,
        )
    except Exception:
        return None


def normalize_media_value(value, key_hint: str = "media"):
    if isinstance(value, str):
        if value.startswith("data:") or len(value) > 2048:
            media_url = save_base64_media(value, filename_hint=f"{key_hint}_{uuid.uuid4().hex[:8]}")
            return media_url or value
        if value.startswith("http://") or value.startswith("https://"):
            copied = copy_remote_media(value)
            return copied or value
    if isinstance(value, dict):
        normalized = dict(value)
        file_name = normalized.get("filename") or normalized.get("name")
        if normalized.get("content"):
            media_url = save_base64_media(str(normalized["content"]), filename_hint=file_name)
            if media_url:
                normalized["url"] = media_url
                normalized.pop("content", None)
        elif normalized.get("base64"):
            media_url = save_base64_media(str(normalized["base64"]), filename_hint=file_name)
            if media_url:
                normalized["url"] = media_url
                normalized.pop("base64", None)
        elif normalized.get("url"):
            normalized["url"] = normalize_media_value(normalized["url"], key_hint=key_hint)
        return normalized
    return value


def normalize_media_payload(payload: dict) -> dict:
    media_keys = ("image_url", "video_url", "audio_url", "pdf_url", "docx_url")
    normalized = dict(payload)

    for key in media_keys:
        if key in normalized:
            normalized[key] = normalize_media_value(normalized[key], key_hint=key)

    if "generated_files" in normalized and isinstance(normalized["generated_files"], list):
        normalized["generated_files"] = [
            normalize_media_value(item, key_hint="generated_file") for item in normalized["generated_files"]
        ]

    return normalized


def parse_incoming_request(req):
    payload = {}
    files_to_send = []
    uploaded_meta = []

    if req.is_json:
        payload = req.get_json(silent=True) or {}
    elif req.content_type and req.content_type.startswith("multipart/form-data"):
        payload = dict(req.form)
        uploaded_files = req.files.getlist("files")
        framework_tags = req.form.getlist("frameworks")

        for index, file_obj in enumerate(uploaded_files):
            filename = werkzeug.utils.secure_filename(file_obj.filename or f"file_{index}.bin")
            framework_tag = framework_tags[index] if index < len(framework_tags) else "GENERAL_FRAMEWORK"
            raw_bytes = file_obj.read()
            mime_type = file_obj.content_type or "application/octet-stream"

            files_to_send.append(("files", (filename, raw_bytes, mime_type)))
            payload[f"framework_tag_{index}"] = framework_tag
            uploaded_meta.append(
                {
                    "filename": filename,
                    "content_type": mime_type,
                    "framework": framework_tag,
                    "size_bytes": len(raw_bytes),
                }
            )
    else:
        raw_body = req.get_data(as_text=True)
        if raw_body:
            try:
                payload = json.loads(raw_body)
            except Exception:
                payload = {"query": raw_body}

    user_query = str(payload.get("query") or payload.get("message") or payload.get("prompt") or "").strip()

    stream_flag = (
        str(payload.get("stream", "")).lower() == "true"
        or req.args.get("stream", "").lower() == "true"
        or "text/event-stream" in req.headers.get("Accept", "")
    )

    return payload, user_query, files_to_send, uploaded_meta, stream_flag


def stream_ai_tokens(payload, user_query, files_to_send=None):
    ask_url, stream_url = get_engine_endpoints()
    target_url = stream_url or ask_url

    headers = {"Accept": "text/event-stream, application/json"}
    if ENGINE_CONFIG.get("api_key"):
        headers["Authorization"] = "Bearer " + ENGINE_CONFIG["api_key"]
        headers["X-API-Key"] = ENGINE_CONFIG["api_key"]

    short_query = (user_query or "request")[:60]
    yield f"data: {json.dumps({'thinking': f'Processing query: "{short_query}"...', 'replaceThinking': True}, ensure_ascii=False)}\n\n"

    if target_url:
        events = queue.Queue()

        def stream_worker():
            try:
                request_payload = dict(payload)
                request_payload["query"] = user_query
                request_payload["message"] = user_query
                request_payload["prompt"] = user_query
                request_payload["stream"] = True

                request_payload.setdefault("max_tokens", DEFAULT_MAX_OUTPUT_TOKENS)
                request_payload.setdefault("max_output_tokens", DEFAULT_MAX_OUTPUT_TOKENS)

                if files_to_send:
                    response = requests.post(
                        target_url,
                        data=request_payload,
                        files=files_to_send,
                        headers=headers,
                        stream=True,
                        timeout=(30, 1800),
                    )
                else:
                    request_headers = dict(headers)
                    request_headers["Content-Type"] = "application/json"
                    response = requests.post(
                        target_url,
                        json=request_payload,
                        headers=request_headers,
                        stream=True,
                        timeout=(30, 1800),
                    )

                with response:
                    if response.status_code == 200:
                        content_type = (response.headers.get("Content-Type") or "").lower()
                        if "text/event-stream" in content_type:
                            for raw_line in response.iter_lines(decode_unicode=True):
                                if not raw_line:
                                    continue
                                line = raw_line.strip()
                                if line.startswith("data:"):
                                    data_str = line[5:].strip()
                                    if data_str == "[DONE]":
                                        break
                                    events.put(("sse", data_str))
                        else:
                            body = response.json()
                            answer = str(body.get("answer") or body.get("response") or body.get("text") or "")
                            chunk_size = 32
                            for offset in range(0, len(answer), chunk_size):
                                events.put(("token", answer[offset : offset + chunk_size]))
                                time.sleep(0.005)
                            normalized_media = normalize_media_payload(body)
                            if any(
                                normalized_media.get(field)
                                for field in ("generated_files", "image_url", "video_url", "audio_url", "pdf_url", "docx_url")
                            ):
                                events.put(("media", normalized_media))
                    else:
                        events.put(("error", f"Engine HTTP Status: {response.status_code}"))
            except Exception as error:
                events.put(("error", str(error)))
            finally:
                events.put(("done", None))

        threading.Thread(target=stream_worker, daemon=True).start()

        heartbeat_count = 0
        while True:
            try:
                event_type, value = events.get(timeout=2.0)
                if event_type == "done":
                    break
                if event_type == "sse":
                    if value.startswith("{") and value.endswith("}"):
                        try:
                            parsed = json.loads(value)
                            parsed = normalize_media_payload(parsed)
                            yield f"data: {json.dumps(parsed, ensure_ascii=False)}\n\n"
                        except Exception:
                            yield f"data: {value}\n\n"
                    else:
                        yield f"data: {json.dumps({'token': value}, ensure_ascii=False)}\n\n"
                elif event_type == "token":
                    yield f"data: {json.dumps({'token': value}, ensure_ascii=False)}\n\n"
                elif event_type == "media":
                    yield f"data: {json.dumps(value, ensure_ascii=False)}\n\n"
                elif event_type == "error":
                    yield f"data: {json.dumps({'token': f'\n[Engine Notice: {value}]'}, ensure_ascii=False)}\n\n"
                    break
            except queue.Empty:
                heartbeat_count += 1
                yield ": keepalive\n\n"
                if heartbeat_count % 3 == 0:
                    status = {
                        "thinking": f"Generating high-context response ({heartbeat_count * 2}s)...",
                        "replaceThinking": True,
                    }
                    yield f"data: {json.dumps(status, ensure_ascii=False)}\n\n"

        yield "data: [DONE]\n\n"
        return

    persona = get_persona_mode(calculate_age(payload.get("dob", "")))
    fallback_text = (
        f"[{persona['label']}] Your request was received: \"{user_query}\". "
        "The local API is active. Connect a tunnel-enabled model endpoint to receive live model responses."
    )

    for part in re.split(r"(\s+)", fallback_text):
        if part:
            yield f"data: {json.dumps({'token': part}, ensure_ascii=False)}\n\n"
            time.sleep(0.01)

    yield "data: [DONE]\n\n"


def execute_sync_json_response(payload, user_query, files_to_send, uploaded_meta):
    collected_tokens = []
    media_fields = {}

    for chunk in stream_ai_tokens(payload, user_query, files_to_send):
        line = chunk.strip()
        if not line.startswith("data:"):
            continue
        data_str = line[5:].strip()
        if data_str == "[DONE]":
            break
        if data_str.startswith("{") and data_str.endswith("}"):
            try:
                parsed = json.loads(data_str)
                if parsed.get("token"):
                    collected_tokens.append(str(parsed["token"]))
                elif parsed.get("answer") or parsed.get("response") or parsed.get("text"):
                    collected_tokens.append(
                        str(parsed.get("answer") or parsed.get("response") or parsed.get("text"))
                    )
                for key in ("image_url", "video_url", "audio_url", "pdf_url", "docx_url", "generated_files"):
                    if key in parsed:
                        media_fields[key] = parsed[key]
            except Exception:
                continue

    final_answer = "".join(collected_tokens).strip() or "Response processed successfully."
    response_object = {
        "status": "success",
        "success": True,
        "answer": final_answer,
        "response": final_answer,
        "text": final_answer,
        "uploaded_files": uploaded_meta,
        "engine": ENGINE_CONFIG["engine_name"],
    }
    response_object.update(normalize_media_payload(media_fields))
    return response_object


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/media/<path:filename>", methods=["GET"])
def serve_media(filename):
    media_entry = MEDIA_REGISTRY.get(filename)
    if not media_entry:
        return jsonify({"success": False, "error": "Media not found"}), 404

    media_path = media_entry.get("path")
    if not media_path or not Path(media_path).exists():
        return jsonify({"success": False, "error": "Media file is missing"}), 404

    return send_file(media_path, mimetype=media_entry.get("content_type") or "application/octet-stream")


@app.route("/api/login", methods=["POST"])
def login():
    try:
        request_data = request.get_json(silent=True) if request.is_json else request.form
        request_data = request_data or {}

        date_of_birth = request_data.get("dob", "")
        name = request_data.get("name", "User")
        age = calculate_age(date_of_birth)
        persona = get_persona_mode(age)

        return jsonify(
            {
                "success": True,
                "user_data": {
                    "name": name,
                    "age": age,
                    "persona": persona["label"],
                    "greeting": f"{name}, {persona['greeting']}",
                },
            }
        )
    except Exception:
        app.logger.exception("Login endpoint failed")
        return jsonify({"success": False, "error": "Login request failed"}), 500


@app.route("/api/admin/update-tunnel", methods=["POST"])
def update_tunnel():
    try:
        request_data = request.get_json(silent=True) or {}
        raw_url = request_data.get("tunnel_url") or request_data.get("ask_endpoint") or ""
        clean_url = clean_base_url(raw_url)
        if not clean_url:
            return jsonify({"success": False, "error": "Invalid tunnel_url"}), 400

        ENGINE_CONFIG["base_url"] = clean_url
        ENGINE_CONFIG["engine_name"] = request_data.get("engine") or ENGINE_CONFIG["engine_name"]
        ENGINE_CONFIG["updated_at"] = datetime.utcnow().isoformat()

        return jsonify(
            {
                "success": True,
                "message": "AI engine tunnel synced successfully.",
                "base_tunnel_url": clean_url,
                "ask_endpoint": f"{clean_url}/api/ai/ask",
                "stream_endpoint": f"{clean_url}/api/ai/stream",
            }
        )
    except Exception:
        app.logger.exception("Tunnel update failed")
        return jsonify({"success": False, "error": "Tunnel update failed"}), 500


@app.route("/api/admin/tunnel-status", methods=["GET"])
def tunnel_status():
    ask_url, stream_url = get_engine_endpoints()
    return jsonify(
        {
            "success": True,
            "base_url": ENGINE_CONFIG["base_url"],
            "ask_endpoint": ask_url,
            "stream_endpoint": stream_url,
            "engine": ENGINE_CONFIG["engine_name"],
            "updated_at": ENGINE_CONFIG["updated_at"],
        }
    )


@app.route("/api/chat", methods=["POST"])
@app.route("/api/ai/ask", methods=["POST"])
@app.route("/api/ai/stream", methods=["POST"])
def chat():
    try:
        payload, user_query, files_to_send, uploaded_meta, stream_flag = parse_incoming_request(request)

        if not user_query and not files_to_send:
            return jsonify(
                {
                    "status": "error",
                    "success": False,
                    "message": "Please provide a prompt or upload at least one file.",
                }
            ), 400

        if request.path == "/api/ai/stream" or stream_flag:
            return Response(
                stream_with_context(stream_ai_tokens(payload, user_query, files_to_send)),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )

        result = execute_sync_json_response(payload, user_query, files_to_send, uploaded_meta)
        return jsonify(result)

    except requests.exceptions.Timeout:
        return (
            jsonify(
                {
                    "status": "error",
                    "success": False,
                    "answer": "The model timed out while generating a long response. Please try again.",
                    "message": "Engine timeout.",
                }
            ),
            504,
        )
    except Exception:
        app.logger.exception("Chat endpoint failed")
        return (
            jsonify(
                {
                    "status": "error",
                    "success": False,
                    "answer": "The request could not be processed due to an internal error.",
                    "message": "Internal server error.",
                }
            ),
            500,
        )


@app.route("/api/chat/omniprocess", methods=["POST"])
def start_stream_session():
    try:
        payload, user_query, _files_to_send, uploaded_meta, _ = parse_incoming_request(request)
        stream_id = f"stream_{uuid.uuid4().hex[:12]}"
        ACTIVE_STREAM_SESSIONS[stream_id] = {
            "payload": payload,
            "user_query": user_query,
            "uploaded_meta": uploaded_meta,
            "stopped": False,
        }
        return jsonify({"success": True, "status": "success", "streamId": stream_id})
    except Exception:
        app.logger.exception("Stream session bootstrap failed")
        return jsonify({"success": False, "error": "Could not start stream session"}), 500


@app.route("/api/chat/livestream/<stream_id>", methods=["GET"])
def stream_session(stream_id):
    session = ACTIVE_STREAM_SESSIONS.pop(stream_id, None)
    if not session:
        return jsonify({"success": False, "error": "Stream expired or not found"}), 404

    return Response(
        stream_with_context(stream_ai_tokens(session["payload"], session["user_query"], None)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", debug=False, port=port, threaded=True)
