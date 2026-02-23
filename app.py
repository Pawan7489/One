from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests

app = Flask(__name__)

# --- [MASTER CONFIG] ---
# Admin Panel Address - जहा सारा AI लॉजिक प्रोसेस होता है
ADMIN_URL = "https://a1-zc43.onrender.com/api/ai/ask"

# Persona Logic (A1 Special Age-Groups)
PERSONAS = {
    "buddy": {"label": "Buddy Mode (Kids)", "greeting": "Namaste chote dost! Main A1 hoon. Aaj kya seekhenge?"},
    "wingman": {"label": "Wingman Mode (Youth)", "greeting": "Hey bro! A1 here. Sab set hai? Kya help chahiye?"},
    "professional": {"label": "Professional Mode (Adults)", "greeting": "Namaskar. Main A1. Main aapki kya sahayata kar sakta hoon?"},
    "caretaker": {"label": "Caretaker Mode (Seniors)", "greeting": "Pranam. Main A1 hoon. Aap nishchint ho kar bataiye kya kaam hai."}
}

# --- [HELPER FUNCTIONS] ---
def calculate_age(dob_string):
    try:
        if not dob_string: return 25
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    except: return 25

def get_persona_mode(age):
    if age < 18: return PERSONAS["buddy"]
    elif 18 <= age <= 25: return PERSONAS["wingman"]
    elif 26 <= age <= 55: return PERSONAS["professional"]
    else: return PERSONAS["caretaker"]

# --- [MODULAR ROUTES - कनेक्टिंग फाइल्स] ---

@app.route('/')
def index():
    # यह मुख्य फाइल है जो सभी मॉड्यूल्स को लोड करती है
    return render_template('index.html')

# हर मॉड्यूलर पार्ट के लिए अलग रूट (Testing और Scaling के लिए)
@app.route('/signup')
def signup_page():
    return render_template('signup.HTML')

@app.route('/login')
def login_page():
    return render_template('login.HTML')

@app.route('/profile')
def profile_page():
    return render_template('userprofile.HTML')

@app.route('/voice')
def voice_page():
    return render_template('voice.HTML')

# --- [API ENDPOINTS] ---

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        dob = data.get('dob', '')
        name = data.get('name', 'User')
        
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
    data = request.get_json() or {}
    user_message = data.get('query', '')
    ai_mode = data.get('mode', 'chat') # Image, Video, Coding etc.
    web_search = data.get('web_search', False)
    user_context = data.get('user_context', {})

    # 1. Admin Panel को स्मार्ट पेलोड भेजना
    try:
        payload = {
            "query": user_message,
            "mode": ai_mode,
            "web_search": web_search,
            "check_database_cache": True, # इंजन की लागत बचाने के लिए
            "user_context": user_context
        }
        
        # Admin Panel (Backend AI) को कॉल करना
        response = requests.post(ADMIN_URL, json=payload, timeout=15)
        backend_data = response.json()

        return jsonify(backend_data)
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "answer": "System Error: Backend unreachable. AI Engine offline hai.",
            "message": str(e)
        })

if __name__ == '__main__':
    # Commander, डिबग मोड ऑन है ताकि कोई भी एरर तुरंत दिखे
    app.run(debug=True, port=5000)
    
