from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Main page load karne ke liye (Ye templates folder se index.html uthayega)
@app.route('/')
def home():
    return render_template('index.html')

# Frontend se message aane par AI ka jawab generate karne ka API
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message', '')
    user_gender = data.get('gender', 'male')
    user_age = data.get('age', 25)

    # Yahan par hum aage chalkar aur deep logic lagayenge
    # Abhi ke liye ek basic reply bhej rahe hain
    if user_age < 18:
        reply = f"Aapne kaha: '{user_message}'. Main ispar kaam kar raha hoon chote dost!"
    elif user_age >= 60:
        reply = f"Aapne kaha: '{user_message}'. Ji pranam, main abhi iski jaankari nikalta hoon."
    else:
        reply = f"Aapne kaha: '{user_message}'. Main ispar kaam kar raha hoon Commander."

    return jsonify({"reply": reply})

if __name__ == '__main__':
    # Debug mode on karke port 5000 par server chalana
    app.run(debug=True, port=5000)
  
