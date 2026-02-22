from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yaml
from datetime import datetime

app = FastAPI(title="Project A1 Backend")

# Frontend (Next.js) ko Python se connect karne ke liye CORS allow karna
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Render par deploy karne ke baad yahan Next.js ka URL aayega
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# YAML file se Persona data load karna
def load_personas():
    with open("../config/personas.yaml", "r") as file:
        return yaml.safe_load(file)["personas"]

@app.get("/")
def read_root():
    return {"message": "A1 Indian Super-AI Backend Running System Securely"}

@app.post("/api/get-persona")
def get_persona(dob: str, gender: str):
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
        age = (datetime.now() - birth_date).days // 365
        
        personas = load_personas()
        selected_persona = None
        
        for key, data in personas.items():
            if data["min_age"] <= age <= data["max_age"]:
                selected_persona = data
                selected_persona["type"] = key
                break
                
        if not selected_persona:
            selected_persona = personas["adult_professional"]
            
        # Add gender logic for voice
        selected_persona["voice_gender"] = gender
        
        return {"success": True, "age": age, "persona": selected_persona}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
      
