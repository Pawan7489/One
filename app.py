from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import os

# 1. Flask App Initialization
# Static और Templates फोल्डर्स को स्पष्ट रूप से परिभाषित किया गया है ताकि कोई रेंडरिंग एरर न आए
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- [MASTER CONFIGURATION] ---
# A1 Core Admin Panel - जहाँ असली AI प्रोसेसिंग और लॉजिक स्टोर है
ADMIN_URL = "https://nirman-ai1.onrender.com/api/ai/ask"

# 2. Advanced Persona Database (Blueprint के अनुसार)
# उम्र के हिसाब से AI का व्यक्तित्व और बातचीत का तरीका बदल जाता है
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
    """Main Gateway - यह आपकी मास्टर index.html फाइल को लोड करेगा"""
    return render_template('index.html')

# --- [API ENDPOINTS - THE ENGINE ROOM] ---

@app.route('/api/login', methods=['POST'])
def login():
    """User login aur persona calculation endpoint"""
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
    """Admin Panel API Bridge - असली AI जवाब यहीं से आते हैं"""
    try:
        data = request.get_json() or {}
        user_message = data.get('query', '')
        ai_mode = data.get('mode', 'chat') 
        user_context = data.get('user_context', {})

        payload = {
            "query": user_message,
            "mode": ai_mode,
            "check_database_cache": True, 
            "web_search": True, 
            "user_context": user_context
        }
        
        # ✅ URL aur 120 second ka timeout yahan theek se add kiya gaya hai
        response = requests.post("https://nirman-ai-ubjx.onrender.com/api/ai/ask", json=payload, timeout=500)
        backend_data = response.json()

        return jsonify(backend_data)
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "answer": "Commander, AI Engine se sampark nahi ho paa raha hai. Kripya net check karein.",
            "message": str(e)
        })

if __name__ == '__main__':
    # Debug mode ON ताकि कोई भी गलती तुरंत कंसोल में दिखे
    app.run(debug=True, port=5000)
