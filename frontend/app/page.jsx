"use client";

import React, { useState } from 'react';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');

  // JavaScript function jo Python backend se baat karega
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg('');

    try {
      // Python API ko call karna (FastAPI default port 8000 par chalta hai)
      const res = await fetch(`http://localhost:8000/api/get-persona?dob=${dob}&gender=${gender}`, {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if(data.success) {
        setResponseMsg(`Welcome ${name}! AI Mode: ${data.persona.type}. ${data.persona.greeting}`);
        // Yahan se hum user ko main chat interface par bhejenge
      }
    } catch (error) {
      setResponseMsg("Backend se connect nahi ho paya. Kya Python server chalu hai?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="secure-container">
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: 'var(--primary-saffron)', margin: 0 }}>A1</h1>
        <p>Aapka Secure AI Companion</p>
      </div>

      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label>Aapka Naam</label>
          <input 
            type="text" 
            required 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Naam darj karein"
          />
        </div>

        <div className="input-group">
          <label>Date of Birth</label>
          <input 
            type="date" 
            required 
            value={dob} 
            onChange={(e) => setDob(e.target.value)} 
          />
        </div>

        <div className="input-group">
          <label>Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Male (Purush)</option>
            <option value="female">Female (Mahila)</option>
          </select>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Connecting to AI...' : 'Secure Login'}
        </button>
      </form>

      {responseMsg && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(19, 136, 8, 0.2)', borderRadius: '8px', border: '1px solid var(--primary-green)' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>{responseMsg}</p>
        </div>
      )}
    </div>
  );
}
