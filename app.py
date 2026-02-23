from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import os

# 1. Flask Initialization
# static_folder aur template_folder ko explicitly define kiya gaya hai
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- [MASTER CONFIG] ---
# Admin Panel Address - Jahan A1 ka dimaag (AI Logic) hai
ADMIN_URL = "https://a1-zc43.onrender.com/api/ai/ask"

# 2. Persona Logic (Age-Based Personality)
PERSONAS = {
    "buddy": {"label": "Buddy Mode (Kids)", "greeting": "Namaste chote dost! Main A1 hoon. Aaj kya seekhenge?"},
    "wingman": {"label": "Wingman Mode (Youth)", "greeting": "Hey bro! A1 here. Sab set hai? Kya help chahiye?"},
    "professional": {"label": "Professional Mode (Adults)", "greeting": "Namaskar. Main A1. Main aapki kya sahayata kar sakta hoon?"},
    "caretaker": {"label": "Caretaker Mode (Seniors)", "greeting": "Pranam. Main A1 hoon. Aap nishchint ho kar bataiye kya kaam hai."}
}

# --- [CORE FUNCTIONS] ---

def calculate_age(dob_string):
    """Janam tithi se umar nikalne ka bulletproof tarika"""
    try:
        if not dob_string or dob_string == "null": return 25
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    except Exception:
        return 25

def get_persona_mode(age):
    """Umar ke hisab se AI ka bartav tay karna"""
    if age < 18: return PERSONAS["buddy"]
    elif 18 <= age <= 25: return PERSONAS["wingman"]
    elif 26 <= age <= 55: return PERSONAS["professional"]
    else: return PERSONAS["caretaker"]

# --- [MODULAR ROUTES] ---

@app.route('/')
def home():
    """Main Entry Point - Yeh sari modular files ko ek sath load karega"""
    # Dhyaan dein: index.html ka naam templates folder mein sahi hona chahiye
    return render_template('index.html')

# Agar user seedha in pages par jana chahe (Testing ke liye)
@app.route('/test/<page_name>')
def test_pages(page_name):
    try:
        # modular files ko render karne ke liye
        return render_template(f'{page_name}.html')
    except:
        return "File nahi mili, Commander!", 404

# --- [API ENDPOINTS] ---

@app.route('/api/login', methods=['POST'])
def login():
    """Login ke waqt user ka persona set karna"""
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
    """AI Se Baat Karne Ka Main System"""
    try:
        data = request.get_json() or {}
        user_message = data.get('query', '') # frontend 'query' bhej raha hai
        ai_mode = data.get('mode', 'chat')   # Image, Video, Coding, etc.
        web_search = data.get('web_search', False)
        user_context = data.get('user_context', {})

        # Admin Panel ko intelligent data bhejna
        payload = {
            "query": user_message,
            "mode": ai_mode,
            "web_search": web_search,
            "check_database_cache": True, # Paise bachane ke liye pehle DB check karein
            "user_context": user_context
        }
        
        # Requests call with timeout to prevent server hang
        response = requests.post(ADMIN_URL, json=payload, timeout=15)
        backend_data = response.json()

        # Final answer ko frontend ki format mein bhejna
        return jsonify(backend_data)
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "answer": "System Error: A1 Engine se sampark nahi ho paa raha hai. Kripya check karein.",
            "message": str(e)
        })

if __name__ == '__main__':
    # Debug mode ON taki galti turant dikhe
    app.run(debug=True, port=5000)
    
