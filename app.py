from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

# Persona Logic Database
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

# 🛠️ Fix: Error-proof Age Calculation
def calculate_age(dob_string):
    try:
        if not dob_string:
            return 25  # Agar date na ho toh default 25 maan lein
            
        birth_date = datetime.strptime(dob_string, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        # Date me koi bhi gadbadi hone par crash hone se bachana
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

# Main page load karne ke liye
@app.route('/')
def home():
    return render_template('index.html')

# Login API route 
@app.route('/api/login', methods=['POST'])
def login():
    try:
        # 🛠️ Fix: Agar JSON data na aaye toh empty dict lein
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
        # Fallback agar koi aur error aaye
        default_persona = PERSONAS["professional"]
        return jsonify({
            "success": True,
            "age": 25,
            "persona": default_persona,
            "greeting": f"Namaskar {name}, Main A1 aapki sahayata ke liye taiyar hoon."
        })

# Chat API route
@app.route('/api/chat', methods=['POST'])
def chat():
    # 🛠️ Fix: JSON handling ko safe banaya
    data = request.get_json() or {}
    user_message = data.get('message', '')
    user_info = data.get('user', {})
    
    age = user_info.get('age', 25)
    name = user_info.get('name', 'User')

    # AI Basic Logic (Baad me yahan asli LLM aayega)
    if age < 18:
        reply = f"Arey waah {name}, tumne poocha: '{user_message}'. Main iska jawab dhoondhta hoon!"
    elif age >= 56:
        reply = f"Ji {name} ji, aapne pucha: '{user_message}'. Main bilkul aaram se check karke batata hoon."
    else:
        reply = f"Noted {name} (Commander). Aapki query: '{user_message}' process ho rahi hai."

    return jsonify({"reply": reply})

if __name__ == '__main__':
    # Debug mode on karke port 5000 par server chalana
    app.run(debug=True, port=5000)
    
