from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import os

# 1. Flask App Initialization
# Static aur Templates folders ko explicitly set kiya gaya hai
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- [MASTER CONFIG] ---
# A1 Core Admin Panel - Jahan se AI ke jawab aate hain
ADMIN_URL = "https://a1-zc43.onrender.com/api/ai/ask"

# 2. Persona Logic (A1 Special Age-Groups)
PERSONAS = {
    "buddy": {"label": "Buddy Mode (Kids)", "greeting": "Namaste chote dost! Main A1 hoon. Aaj kya seekhenge?"},
    "wingman": {"label": "Wingman Mode (Youth)", "greeting": "Hey bro! A1 here. Sab set hai? Kya help chahiye?"},
    "professional": {"label": "Professional Mode (Adults)", "greeting": "Namaskar. Main A1, aapka digital assistant. Kya sahayata karoon?"},
    "caretaker": {"label": "Caretaker Mode (Seniors)", "greeting": "Pranam. Main A1 hoon. Aap nishchint ho kar bataiye kya kaam hai."}
}

# --- [CORE LOGIC FUNCTIONS] ---

def calculate_age(dob_string):
    """Janam tithi se umar nikalne ka logic"""
    try:
        if not dob_string or dob_string == "null": return 25
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        return 25

def get_persona_mode(age):
    """Umar ke hisab se persona chunna"""
    if age < 18: return PERSONAS["buddy"]
    elif 18 <= age <= 25: return PERSONAS["wingman"]
    elif 26 <= age <= 55: return PERSONAS["professional"]
    else: return PERSONAS["caretaker"]

# --- [ROUTES & API] ---

@app.route('/')
def home():
    """Sirf ek rasta - Sari HTML ek hi jagah"""
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    """User data se persona set karna"""
    try:
        data = request.get_json() or {}
        dob = data.get('dob', '')
        name = data.get('name', 'User')
        
        age = calculate_age(dob)
        persona = get_persona_mode(age)
        
        return jsonify({
            "success": True,
            "user_info": {
                "name": name,
                "persona": persona['label'],
                "greeting": f"{name}, {persona['greeting']}"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/chat', methods=['POST'])
def chat():
    """Main AI Bridge - Admin Panel se connection"""
    try:
        data = request.get_json() or {}
        
        # Payload for Admin Panel
        payload = {
            "query": data.get('query', ''),
            "mode": data.get('mode', 'chat'),
            "user_context": data.get('user_context', {})
        }
        
        # 15 second ka timeout taki server hang na ho
        response = requests.post(ADMIN_URL, json=payload, timeout=15)
        return jsonify(response.json())
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "answer": "System Error: A1 Engine se sampark toot gaya hai."
        })

if __name__ == '__main__':
    # Commander, debug mode ON hai
    app.run(debug=True, port=5000)
        
