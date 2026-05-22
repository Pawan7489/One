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
         data = request.get_json() or {}
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
            "answer": "Timeout (500s): Engine ",
            "message": "Engine thinking timeout."
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "answer": "Commander, AI Engine se sampark nahi ho paa raha hai. Kripya apna backend ya internet check karein.",
            "message": str(e)
        })
