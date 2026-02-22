from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests  # <-- [NEW] Admin Panel से बात करने के लिए

app = Flask(__name__)

# --- [NEW] Admin Panel Address ---
ADMIN_URL = "https://a1-zc43.onrender.com/api/ai/ask"

# Persona Logic Database (Unchanged)
PERSONAS = {
    "buddy": {
        "label": "Buddy Mode (Kids)",
        "greeting": "Namaste chote dost! Main A1 hoon. Aaj hum kya khelenge ya seekhenge?"
    },
    "wingman": {
        "label": "Wingman Mode (Youth)",
        "greeting": "Hey bro! A1 here. Kaisa chal raha hai sab? Koi naya project ya coding ki baat karein?"
    },
    "professional": {
        "label": "Professional Mode (Adults)",
        "greeting": "Namaskar. Main A1, aapka digital assistant. Main aapki kya sahayata kar sakta hoon?"
    },
    "caretaker": {
        "label": "Caretaker Mode (Seniors)",
        "greeting": "Pranam. Main A1 hoon. Aap aaram se bataiye, main aapke liye kya kaam kar sakta hoon?"
    }
}

# Fix: Error-proof Age Calculation (Unchanged)
def calculate_age(dob_string):
    try:
        if not dob_string:
            return 25
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        return 25

def get_persona_mode(age):
    if age < 18:
        return PERSONAS["buddy"]
    elif 18 <= age <= 25:
        return PERSONAS["wingman"]
    elif 26 <= age <= 55:
        return PERSONAS["professional"]
    else:
        return PERSONAS["caretaker"]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        dob = data.get('dob', '')
        name = data.get('name', 'User')
        
        age = calculate_age(dob)
        persona = get_persona_mode(age)
        
        personalized_greeting = f"{name}, {persona['greeting']}"
        
        return jsonify({
            "success": True,
            "age": age,
            "persona": persona,
            "greeting": personalized_greeting
        })
    except Exception as e:
        return jsonify({
            "success": True,
            "age": 25,
            "persona": PERSONAS["professional"],
            "greeting": "Namaskar, Main A1 aapki sahayata ke liye taiyar hoon."
        })

# --- [UPDATED] Chat API: Admin Panel से कनेक्टेड ---
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json() or {}
    user_message = data.get('message', '')
    user_info = data.get('user', {}) # Login se mila hua data
    ai_version = data.get('engine', 'llama3-8b-8192') # HTML se mila model choice

    # 1. Admin Panel को डेटा भेजना
    try:
        payload = {
            "query": user_message,
            "engine": ai_version,
            "user_context": {
                "name": user_info.get('name', 'User'),
                "age": user_info.get('age', 25),
                "persona": user_info.get('persona', 'professional')
            }
        }
        
        # Admin Panel (Backend) को कॉल करना
        response = requests.post(ADMIN_URL, json=payload, timeout=10)
        backend_data = response.json()

        if backend_data.get('status') == 'success':
            reply = backend_data.get('answer')
        else:
            reply = "Commander, AI Engine se sampark nahi ho paa raha hai."
            
    except Exception as e:
        reply = f"System Error: Backend unreachable. ({str(e)})"

    return jsonify({"reply": reply})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    
