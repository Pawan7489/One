"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useVoice(gender = "male") {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // AI ko bulwane (Speak) ka function
  const speak = useCallback((text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Pehle ki awaaz rok do
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Indian accent aur gender ke hisaab se awaaz chunna
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (gender === "female") {
      selectedVoice = voices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("samantha"));
    } else {
      selectedVoice = voices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david"));
    }
    
    // Agar specific na mile toh Indian English (en-IN) default set karein
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
    }

    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.pitch = gender === "female" ? 1.2 : 0.9;
    utterance.rate = 1.0; // Normal speed
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [gender]);

  // AI ko chup karane ka function
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // User ki awaaz sunne (Listen) ka function
  const startListening = useCallback((onResult) => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Aapka browser voice command support nahi karta.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN"; // Default Indian English/Hindi mix
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return { isSpeaking, isListening, speak, stopSpeaking, startListening, stopListening };
  }
