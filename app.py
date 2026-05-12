from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import os

# 1. Flask App Initialization
# Static aur Templates folders ko spasht roop se paribhashit kiya gaya hai
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- [MASTER CONFIGURATION] ---
# A1 Core Admin Panel - naya URL update kar diya gaya hai
ADMIN_URL = "https://nirman-ai1.onrender.com/api/chat"

# 2. Advanced Persona Database 
# Umar ke hisab se AI ka vyaktitva badalta hai
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
        data = request.get_json() or {}
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

@app.route('/api/chat', methods=['POST'])
def chat():
    """Admin Panel API Bridge"""
    try:
        # Frontend (JS) se aane wala poora JSON data nikal liya
        data = request.get_json() or {}

        # ✅ Naya ADMIN_URL use kiya gaya hai aur data directly bheja gaya hai 
        # (is se session_id aur query dono aage jayenge memory ke liye)
        # ✅ 500 second ka timeout lagaya gaya hai
        response = requests.post(ADMIN_URL, json=data, timeout=500)
        
        if response.status_code == 200:
            backend_data = response.json()
            return jsonify(backend_data)
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
    
