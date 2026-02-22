"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useVoice } from '../../hooks/useVoice';

export default function ChatDashboard() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState(null);
  
  // Custom Hook for Voice
  const { isSpeaking, isListening, speak, stopSpeaking, startListening } = useVoice(persona?.voice_gender || "male");
  const messagesEndRef = useRef(null);

  // Login page se bheje gaye data ko nikalna (Real app mein ye Context ya Redux se aayega)
  useEffect(() => {
    // Demo ke liye hum dummy data le rahe hain, aap ise apne hisaab se set kar sakte hain
    const dummyPersona = {
      type: "adult_professional",
      greeting: "Namaskar Commander. Main aaj aapki kya madad kar sakta hoon?",
      voice_gender: "male"
    };
    setPersona(dummyPersona);
    
    // AI ka pehla message (Greeting)
    addMessage("assistant", dummyPersona.greeting);
    
    // Page load hote hi AI bolega (Jaise aapne manga tha)
    setTimeout(() => {
      speak(dummyPersona.greeting);
    }, 1000);
  }, [speak]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, id: Date.now() }]);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    addMessage("user", userText);

    // Yahan Python backend API call aayegi (abhi dummy response hai)
    setTimeout(() => {
      const aiResponse = `Aapne kaha: "${userText}". Main ispar kaam kar raha hoon Commander.`;
      addMessage("assistant", aiResponse);
      speak(aiResponse); // AI automatically jawab bolega
    }, 1000);
  };

  const toggleMic = () => {
    if (isListening) return;
    startListening((transcript) => {
      setInput(transcript);
      // Automatically send message after listening
      setTimeout(() => {
        document.getElementById('send-btn').click();
      }, 500);
    });
  };

  // Hologram ka animation color logic (Indian Secure Colors)
  const getHologramColor = () => {
    if (isListening) return "var(--primary-green)"; // Sunte waqt Green (Secure)
    if (isSpeaking) return "var(--primary-saffron)"; // Bolte waqt Saffron/Orange (Energy)
    return "#555"; // Khali baithne par Earthy Gray
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <h2 style={{ color: 'var(--primary-saffron)', margin: 0 }}>A1 Workspace</h2>
        <span style={{ fontSize: '12px', background: 'rgba(255,153,51,0.2)', padding: '5px 10px', borderRadius: '15px' }}>
          Mode: {persona?.type || 'Loading...'}
        </span>
      </div>

      {/* Visual Hologram Animation (Warm UI) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', marginTop: '10px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: getHologramColor(),
          boxShadow: `0 0 ${isSpeaking ? '40px' : '15px'} ${getHologramColor()}`,
          transition: 'all 0.3s ease-in-out',
          animation: isSpeaking ? 'pulse 1.5s infinite' : 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#000',
          fontWeight: 'bold'
        }}>
          {isListening ? '...' : 'A1'}
        </div>
      </div>

      {/* Chat Area */}
      <div className="scrollbar-none" style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '15px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ 
            textAlign: msg.role === 'user' ? 'right' : 'left', 
            marginBottom: '15px' 
          }}>
            <div style={{ 
              display: 'inline-block', 
              padding: '12px 18px', 
              borderRadius: '20px',
              maxWidth: '80%',
              backgroundColor: msg.role === 'user' ? 'var(--primary-saffron)' : 'var(--panel-bg)',
              color: msg.role === 'user' ? '#000' : 'var(--text-color)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
              fontWeight: msg.role === 'user' ? '600' : 'normal'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
        <button 
          type="button" 
          onClick={toggleMic}
          style={{
            padding: '15px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isListening ? 'var(--primary-green)' : 'var(--panel-bg)',
            color: isListening ? '#fff' : 'var(--primary-saffron)',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            transition: 'all 0.3s'
          }}
        >
          {/* Simple Mic Icon text as placeholder */}
          🎤
        </button>
        
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Apna message type karein..."
          style={{ flex: 1, padding: '15px', borderRadius: '25px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'white', fontSize: '16px', outline: 'none' }}
        />
        
        <button id="send-btn" type="submit" className="btn-primary" style={{ width: '80px', borderRadius: '25px' }}>
          Send
        </button>
      </form>

      {/* CSS Animation specifically for this page */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}} />
    </div>
  );
          }
