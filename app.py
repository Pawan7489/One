from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from datetime import datetime
import json
import os
import re
import time
import uuid
import queue
import threading
import requests
import werkzeug  # File formatting ke liye zaruri

# 1. Flask App Initialization
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/*": {"origins": "*"}})

# --- [INTERNAL API & ENGINE CONFIGURATION (ADMIN_URL REMOVED)] ---
AI_ENGINE_CONFIG = {
    "base_url": os.environ.get("AI_ENGINE_URL", "").strip().rstrip("/"),
    "api_key": os.environ.get("AI_ENGINE_KEY", "").strip(),
    "engine_name": os.environ.get("AI_ENGINE_NAME", "A1-Core-Engine"),
    "updated_at": None
}

ACTIVE_STREAM_SESSIONS = {}

# 2. Advanced Persona Database
PERSONAS = {
    "child": {"label": "Buddy Mode (5-15)", "greeting": "Namaste chote dost! Main A1 hoon. Aaj hum kya seekhenge?"},
    "youth": {"label": "Wingman Mode (18-25)", "greeting": "Hey bro! A1 here. Sab set hai? Kya help chahiye?"},
    "adult": {"label": "Professional Mode (26-50)", "greeting": "Namaskar. Main A1, aapka digital assistant. Main aapki kya sahayata kar sakta hoon?"},
    "senior": {"label": "Caretaker Mode (50+)", "greeting": "Pranam. Main A1 hoon. Aap aaram se bataiye, main aapke liye kya kar sakta hoon?"}
}

# --- [CORE LOGIC FUNCTIONS] ---
def calculate_age(dob_string):
    """Janam tithi se umar nikalne ka bulletproof logic"""
    try:
        if not dob_string or dob_string == "null":
            return 25
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        return 25

def get_persona_mode(age):
    """Umar ke hisab se AI ka persona chunna"""
    if age <= 15:
        return PERSONAS["child"]
    elif 16 <= age <= 25:
        return PERSONAS["youth"]
    elif 26 <= age <= 50:
        return PERSONAS["adult"]
    else:
        return PERSONAS["senior"]

def _clean_base_url(raw_url):
    u = str(raw_url or "").strip().rstrip("/")
    if not u:
        return ""
    u = re.sub(r"/api/(?:ai/(?:ask|stream|image|video|audio|document|code|search)|generate|chat)$", "", u, flags=re.IGNORECASE)
    return u.rstrip("/")

def _get_engine_endpoints():
    base = _clean_base_url(AI_ENGINE_CONFIG.get("base_url"))
    if not base:
        return "", ""
    return f"{base}/api/ai/ask", f"{base}/api/ai/stream"

def _parse_incoming_request(req):
    """JSON aur Multipart Form-Data dono ko parse karke unified structure banata hai"""
    payload = {}
    files_to_send = []
    uploaded_meta = []

    if req.is_json:
        payload = req.get_json(silent=True) or {}
    elif req.content_type and req.content_type.startswith('multipart/form-data'):
        payload = dict(req.form)
        uploaded_files = req.files.getlist('files')
        framework_tags = req.form.getlist('frameworks')

        for idx, file_obj in enumerate(uploaded_files):
            filename = werkzeug.utils.secure_filename(file_obj.filename or f"file_{idx}.bin")
            tag = framework_tags[idx] if idx < len(framework_tags) else "GENERAL_FRAMEWORK"
            raw_bytes = file_obj.read()
            mime_type = file_obj.content_type or "application/octet-stream"

            files_to_send.append(('files', (filename, raw_bytes, mime_type)))
            payload[f'framework_tag_{idx}'] = tag
            uploaded_meta.append({
                "filename": filename,
                "content_type": mime_type,
                "framework": tag,
                "size_bytes": len(raw_bytes)
            })
    else:
        raw_body = req.get_data(as_text=True)
        if raw_body:
            try:
                payload = json.loads(raw_body)
            except Exception:
                payload = {"query": raw_body}

    user_query = str(
        payload.get("query")
        or payload.get("message")
        or payload.get("prompt")
        or ""
    ).strip()

    stream_flag = (
        str(payload.get("stream", "")).lower() == "true"
        or req.args.get("stream", "").lower() == "true"
        or "text/event-stream" in req.headers.get("Accept", "")
    )

    return payload, user_query, files_to_send, uploaded_meta, stream_flag

def _stream_ai_tokens(payload, user_query, files_to_send=None):
    """
    Real-Time SSE Generator:
    1. Thinking frames aur 2-second heartbeat bhejta hai.
    2. Agar GPU/Colab tunnel connected hai toh wahan se live stream lata hai.
    3. Agar local mode me hai toh smooth live token stream generate karta hai.
    """
    ask_url, stream_url = _get_engine_endpoints()
    target_url = stream_url or ask_url
    headers = {"Accept": "text/event-stream, application/json"}
    if AI_ENGINE_CONFIG.get("api_key"):
        headers["Authorization"] = f"Bearer {AI_ENGINE_CONFIG['api_key']}"
        headers["X-API-Key"] = AI_ENGINE_CONFIG["api_key"]

    short_q = (user_query or "request")[:50]
    yield f"data: {json.dumps({'thinking': f'Analyzing query: \"{short_q}\"...', 'replaceThinking': True}, ensure_ascii=False)}\n\n"

    if target_url:
        q_out = queue.Queue()

        def _worker():
            try:
                req_data = dict(payload)
                req_data["query"] = user_query
                req_data["message"] = user_query
                req_data["stream"] = True

                if files_to_send:
                    resp = requests.post(target_url, data=req_data, files=files_to_send, headers=headers, stream=True, timeout=(15, 300))
                else:
                    headers["Content-Type"] = "application/json"
                    resp = requests.post(target_url, json=req_data, headers=headers, stream=True, timeout=(15, 300))

                with resp:
                    if resp.status_code == 200:
                        ctype = (resp.headers.get("Content-Type") or "").lower()
                        if "text/event-stream" in ctype:
                            for raw_line in resp.iter_lines(decode_unicode=True):
                                if not raw_line:
                                    continue
                                line = raw_line.strip()
                                if line.startswith("data:"):
                                    data_str = line[5:].strip()
                                    if data_str == "[DONE]":
                                        break
                                    q_out.put(("sse", data_str))
                        else:
                            body = resp.json()
                            ans = str(body.get("answer") or body.get("response") or body.get("text") or "")
                            for word in re.split(r"(\s+)", ans):
                                if word:
                                    q_out.put(("token", word))
                                    time.sleep(0.015)
                            if body.get("generated_files") or body.get("image_url") or body.get("video_url") or body.get("audio_url"):
                                q_out.put(("media", body))
                    else:
                        q_out.put(("error", f"Engine HTTP {resp.status_code}"))
            except Exception as err:
                q_out.put(("error", str(err)))
            finally:
                q_out.put(("done", None))

        threading.Thread(target=_worker, daemon=True).start()

        hb_count = 0
        while True:
            try:
                kind, val = q_out.get(timeout=2.0)
                if kind == "done":
                    break
                elif kind == "sse":
                    if val.startswith("{") and val.endswith("}"):
                        yield f"data: {val}\n\n"
                    else:
                        yield f"data: {json.dumps({'token': val}, ensure_ascii=False)}\n\n"
                elif kind == "token":
                    yield f"data: {json.dumps({'token': val}, ensure_ascii=False)}\n\n"
                elif kind == "media":
                    yield f"data: {json.dumps(val, ensure_ascii=False)}\n\n"
                elif kind == "error":
                    fallback_msg = f"Commander, AI Engine notice: {val}"
                    yield f"data: {json.dumps({'token': fallback_msg}, ensure_ascii=False)}\n\n"
                    break
            except queue.Empty:
                hb_count += 1
                yield ": keepalive\n\n"
                yield f"data: {json.dumps({'thinking': f'Processing neural layers ({hb_count * 2}s)...', 'replaceThinking': True}, ensure_ascii=False)}\n\n"

        yield "data: [DONE]\n\n"
        return

    # Local Built-in Stream Fallback (Jab external tunnel connected na ho tab bhi stream aur JSON 100% kaam karega)
    dob = payload.get("dob", "")
    persona = get_persona_mode(calculate_age(dob))
    reply_text = (
        f"[{persona['label']}] Namaste! Aapka message mil gaya hai: \"{user_query}\". "
        f"Local API aur Live Stream 100% active hain."
    )
    for word in re.split(r"(\s+)", reply_text):
        if word:
            yield f"data: {json.dumps({'token': word}, ensure_ascii=False)}\n\n"
            time.sleep(0.02)

    yield "data: [DONE]\n\n"


def _execute_sync_json_response(payload, user_query, files_to_send, uploaded_meta):
    """Standard JSON request ke liye poora answer collect karke clean JSON return karta hai"""
    collected_tokens = []
    media_extras = {}

    for chunk_line in _stream_ai_tokens(payload, user_query, files_to_send):
        line = chunk_line.strip()
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
                    collected_tokens.append(str(parsed.get("answer") or parsed.get("response") or parsed.get("text")))
                for k in ("image_url", "video_url", "audio_url", "pdf_url", "docx_url", "generated_files"):
                    if k in parsed:
                        media_extras[k] = parsed[k]
            except Exception:
                pass

    final_answer = "".join(collected_tokens).strip()
    if not final_answer:
        final_answer = "Response processed successfully."

    resp_obj = {
        "status": "success",
        "success": True,
        "answer": final_answer,
        "response": final_answer,
        "text": final_answer,
        "uploaded_files": uploaded_meta,
        "engine": AI_ENGINE_CONFIG["engine_name"]
    }
    resp_obj.update(media_extras)
    return resp_obj


# --- [MODULAR ROUTES] ---
@app.route('/')
def home():
    """Main Gateway - index.html load karega"""
    return render_template('index.html')


@app.route('/api/login', methods=['POST'])
def login():
    """User login aur persona calculation"""
    try:
        if request.is_json:
            data = request.get_json(silent=True) or {}
        else:
            data = request.form

        dob = data.get('dob', '')
        name = data.get('name', 'Commander')

        age = calculate_age(dob)
        persona = get_persona_mode(age)

        return jsonify({
            "success": True,
            "user_data": {
                "name": name,
                "age": age,
                "persona": persona['label'],
                "greeting": f"{name}, {persona['greeting']}"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- [IN-APP TUNNEL SYNC ENDPOINTS FOR COLAB / KAGGLE] ---
@app.route('/api/admin/update-tunnel', methods=['POST'])
def update_tunnel():
    """Colab ya Kaggle se aane wale Cloudflare Tunnel URL ko seedha is app.py me save karta hai"""
    try:
        data = request.get_json(silent=True) or {}
        raw_url = data.get("tunnel_url") or data.get("ask_endpoint") or ""
        clean_base = _clean_base_url(raw_url)
        if not clean_base:
            return jsonify({"success": False, "error": "Invalid tunnel_url"}), 400

        AI_ENGINE_CONFIG["base_url"] = clean_base
        AI_ENGINE_CONFIG["engine_name"] = data.get("engine") or AI_ENGINE_CONFIG["engine_name"]
        AI_ENGINE_CONFIG["updated_at"] = datetime.utcnow().isoformat()

        return jsonify({
            "success": True,
            "message": "AI Engine Tunnel synced inside app.py!",
            "base_tunnel_url": clean_base,
            "ask_endpoint": f"{clean_base}/api/ai/ask",
            "stream_endpoint": f"{clean_base}/api/ai/stream"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/admin/tunnel-status', methods=['GET'])
def tunnel_status():
    ask_url, stream_url = _get_engine_endpoints()
    return jsonify({
        "success": True,
        "base_url": AI_ENGINE_CONFIG["base_url"],
        "ask_endpoint": ask_url,
        "stream_endpoint": stream_url,
        "engine": AI_ENGINE_CONFIG["engine_name"],
        "updated_at": AI_ENGINE_CONFIG["updated_at"]
    })


# --- [UNIFIED CHAT, JSON & LIVE STREAM API ENDPOINTS] ---
@app.route('/api/chat', methods=['POST'])
@app.route('/api/ai/ask', methods=['POST'])
@app.route('/api/ai/stream', methods=['POST'])
def chat():
    """Supports both Direct JSON Response AND Real-Time SSE Live Streaming"""
    try:
        payload, user_query, files_to_send, uploaded_meta, stream_flag = _parse_incoming_request(request)

        if not user_query and not files_to_send:
            return jsonify({
                "status": "error",
                "success": False,
                "message": "Query ya file missing hai."
            }), 400

        # Agar /api/ai/stream call hua hai ya stream=True hai, toh Live Stream (SSE) return karein
        if request.path == '/api/ai/stream' or stream_flag:
            return Response(
                stream_with_context(_stream_ai_tokens(payload, user_query, files_to_send)),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )

        # Warna Standard JSON Response return karein
        result_json = _execute_sync_json_response(payload, user_query, files_to_send, uploaded_meta)
        return jsonify(result_json)

    except requests.exceptions.Timeout:
        return jsonify({
            "status": "error",
            "success": False,
            "answer": "Timeout: Engine bahut deep thinking kar raha hai. Kripya dobara try karein.",
            "message": "Engine thinking timeout."
        }), 504
    except Exception as e:
        return jsonify({
            "status": "error",
            "success": False,
            "answer": "Commander, AI Engine process me error aaya hai.",
            "message": str(e)
        }), 500


# --- [TWO-STEP LIVESTREAM ROUTES FOR EVENT-SOURCE FRONTENDS] ---
@app.route('/api/chat/omniprocess', methods=['POST'])
def omniprocess_start():
    """Frontend EventSource ke liye streamId generate karta hai"""
    try:
        payload, user_query, files_to_send, uploaded_meta, _ = _parse_incoming_request(request)
        stream_id = f"stream_{uuid.uuid4().hex[:12]}"
        ACTIVE_STREAM_SESSIONS[stream_id] = {
            "payload": payload,
            "user_query": user_query,
            "uploaded_meta": uploaded_meta,
            "stopped": False
        }
        return jsonify({
            "success": True,
            "status": "success",
            "streamId": stream_id
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/chat/livestream/<stream_id>', methods=['GET'])
def omniprocess_livestream(stream_id):
    """EventSource (GET) ke zariye live SSE tokens stream karta hai"""
    session = ACTIVE_STREAM_SESSIONS.pop(stream_id, None)
    if not session:
        return jsonify({"success": False, "error": "Stream expired or not found"}), 404

    return Response(
        stream_with_context(_stream_ai_tokens(session["payload"], session["user_query"], None)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", debug=True, port=port, threaded=True)
                            
