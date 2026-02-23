from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import os

# 1. Flask App Initialization
# Static और Templates फोल्डर्स को स्पष्ट रूप से परिभाषित किया गया है
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- [MASTER CONFIG] ---
# A1 Admin Panel - जहाँ असली AI प्रोसेसिंग होती है
ADMIN_URL = "https://a1-zc43.onrender.com/api/ai/ask"

# 2. Persona Logic (A1 Special Age-Groups)
PERSONAS = {
    "buddy": {
        "label": "Buddy Mode (Kids)", 
        "greeting": "Namaste chote dost! Main A1 hoon. Aaj hum kya seekhenge?"
    },
    "wingman": {
        "label": "Wingman Mode (Youth)", 
        "greeting": "Hey bro! A1 here. Sab set hai? Kya help chahiye?"
    },
    "professional": {
        "label": "Professional Mode (Adults)", 
        "greeting": "Namaskar. Main A1, aapka digital assistant. Main aapki kya sahayata kar sakta hoon?"
    },
    "caretaker": {
        "label": "Caretaker Mode (Seniors)", 
        "greeting": "Pranam. Main A1 hoon. Aap nishchint ho kar bataiye, main aapke liye kya kar sakta hoon?"
    }
}

# --- [CORE FUNCTIONS] ---

def calculate_age(dob_string):
    """Janam tithi se sahi umar nikalne ka logic"""
    try:
        if not dob_string or dob_string == "null":
            return 25
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        # उम्र गणना का सटीक फार्मूला
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        return 25

def get_persona_mode(age):
    """Umar ke hisab se AI ka bartav (Persona) chunna"""
    if age < 18:
        return PERSONAS["buddy"]
    elif 18 <= age <= 25:
        return PERSONAS["wingman"]
    elif 26 <= age <= 55:
        return PERSONAS["professional"]
    else:
        return PERSONAS["caretaker"]

# --- [MODULAR ROUTES] ---

@app.route('/')
def home():
    """Main Gateway - Yeh Master index.html ko load karta hai"""
    return render_template('index.html')

# --- [API ENDPOINTS] ---

@app.route('/api/login', methods=['POST'])
def login():
    """User login ke waqt persona aur greeting set karna"""
    try:
        data = request.get_json() or {}
        dob = data.get('dob', '')
        name = data.get('name', 'User')
        
        age = calculate_age(dob)
        persona = get_persona_mode(age)
        
        personalized_greeting = f"{name}, {persona['greeting']}"
        
        return jsonify({
            "success": True,
            "user_info": {
                "name": name,
                "age": age,
                "persona_label": persona['label'],
                "greeting": personalized_greeting
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/chat', methods=['POST'])
def chat():
    """Admin Panel se baat karne ka main API bridge"""
    try:
        data = request.get_json() or {}
        user_message = data.get('query', '')
        ai_mode = data.get('mode', 'chat')  # Image, Video, Coding, etc.
        user_context = data.get('user_context', {})

        # Admin Panel को डेटा भेजना
        payload = {
            "query": user_message,
            "mode": ai_mode,
            "web_search": True, # Deep search feature enabled by default
            "check_database_cache": True,
            "user_context": user_context
        }
        
        # Requests call with timeout to prevent server hang
        response = requests.post(ADMIN_URL, json=payload, timeout=20)
        backend_data = response.json()

        # Final answer ko frontend ki format mein bhejna
        return jsonify(backend_data)
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "answer": "Commander, System Error: AI Engine se sampark nahi ho paa raha hai.",
            "message": str(e)
        })

if __name__ == '__main__':
    # Debug mode ON taki koi bhi technical issue turant dikhe
    app.run(debug=True, port=5000)
            
