from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import os
import werkzeug # File formatting ke liye zaruri

# 1. Flask App Initialization
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- [MASTER CONFIGURATION] ---
ADMIN_URL = "https://admin0-ihl1.onrender.com/api/chat"

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
        if not dob_string or dob_string == "null": return 25
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        return 25

def get_persona_mode(age):
    """Umar ke hisab se AI ka persona chunna"""
    if age <= 15: return PERSONAS["child"]
    elif 16 <= age <= 25: return PERSONAS["youth"]
    elif 26 <= age <= 50: return PERSONAS["adult"]
    else: return PERSONAS["senior"]

# --- [MODULAR ROUTES] ---
@app.route('/')
def home():
    """Main Gateway - index.html load karega"""
    return render_template('index.html')

# --- [API ENDPOINTS - THE ENGINE ROOM] ---
@app.route('/api/login', methods=['POST'])
def login():
    """User login aur persona calculation"""
    try:
        if request.is_json:
            data = request.get_json()
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
        return jsonify({"success": False, "error": str(e)})


# 🚀 UPDATED: DUAL-MODE CHAT ROUTER (JSON + MULTIPART)
@app.route('/api/chat', methods=['POST'])
def chat():
    """Admin Panel API Bridge (Supports both pure JSON and 10 File Frameworks)"""
    try:
        # ==========================================
        # MODE 1: PURE TEXT (JSON) - Super Fast
        # ==========================================
        if request.is_json:
            data = request.get_json() or {}
            
            # JSON data ko aage JSON format mein hi bhej rahe hain
            response = requests.post(ADMIN_URL, json=data, timeout=500)
            
        # ==========================================
        # MODE 2: FILES + TEXT (MULTIPART/FORM-DATA)
        # ==========================================
        elif request.content_type and request.content_type.startswith('multipart/form-data'):
            
            # Form se Text aur Tags nikalna
            user_data = dict(request.form)
            uploaded_files = request.files.getlist('files')
            framework_tags = request.form.getlist('frameworks')
            
            files_to_send = []
            
            # Har file ko Render / Colab ke liye pack karna
            for idx, file in enumerate(uploaded_files):
                filename = werkzeug.utils.secure_filename(file.filename)
                tag = framework_tags[idx] if idx < len(framework_tags) else "GENERAL_FRAMEWORK"
                
                # File ko HTTP post package mein convert karna
                files_to_send.append(
                    ('files', (filename, file.read(), file.content_type))
                )
                user_data[f'framework_tag_{idx}'] = tag

            # Data aur Files dono ko aage Admin URL par bhejna
            response = requests.post(ADMIN_URL, data=user_data, files=files_to_send, timeout=500)

        # ==========================================
        # MODE 3: UNKNOWN FORMAT
        # ==========================================
        else:
            return jsonify({
                "status": "error",
                "message": "Data format samajh nahi aaya. Kripya JSON ya Form-Data bhejein."
            }), 415

        # --- RESULT HANDLING ---
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({
                "status": "error",
                "message": f"Admin Panel error: Status {response.status_code}"
            })
            
    except requests.exceptions.Timeout:
        return jsonify({
            "status": "error",
            "answer": "Timeout (500s): Engine bahut deep thinking kar raha hai. Kripya thodi der baad dobara request bhejein.",
            "message": "Engine thinking timeout."
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "answer": "Commander, AI Engine se sampark nahi ho paa raha hai. Kripya apna backend ya internet check karein.",
            "message": str(e)
        })

if __name__ == '__main__':
    # Debug mode ON
    app.run(debug=True, port=5000)
    
