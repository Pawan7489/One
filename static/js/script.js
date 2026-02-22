document.addEventListener("DOMContentLoaded", () => {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");
    const hologram = document.getElementById("hologram");
    const statusText = document.getElementById("status-text");

    let isListening = false;

    // --- Voice Synthesis (AI Bolna) ---
    function speak(text) {
        if (!window.speechSynthesis) return;
        
        window.speechSynthesis.cancel(); // Purani aawaz roko
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Indian voice select karna
        const voices = window.speechSynthesis.getVoices();
        let indianVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
        if (indianVoice) utterance.voice = indianVoice;
        
        utterance.rate = 1.0;

        utterance.onstart = () => {
            hologram.className = "hologram speaking";
            statusText.innerText = "A1 is speaking...";
        };
        
        utterance.onend = () => {
            hologram.className = "hologram idle";
            statusText.innerText = "A1 is ready...";
        };

        window.speechSynthesis.speak(utterance);
    }

    // --- Speech Recognition (Mic se sunna) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; // Indian English/Hindi support
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add("active");
            hologram.className = "hologram listening";
            statusText.innerText = "Listening...";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage(); // Automatically send message after speaking
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove("active");
            if (hologram.className !== "hologram speaking") {
                hologram.className = "hologram idle";
                statusText.innerText = "A1 is ready...";
            }
        };
    }

    micBtn.addEventListener("click", () => {
        if (isListening) {
            recognition.stop();
        } else {
            if (recognition) recognition.start();
        }
    });

    // --- Chat Logic & Backend Communication ---
    function appendMessage(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage("user", text);
        userInput.value = "";

        // Python Backend ko request bhejna
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: text,
                    gender: "male", // Ise baad me login page se link karenge
                    age: 25         // Ise baad me login page se link karenge
                })
            });

            const data = await response.json();
            appendMessage("ai", data.reply);
            speak(data.reply);

        } catch (error) {
            appendMessage("ai", "Sorry, server se connection toot gaya hai.");
        }
    }

    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // Pehli baar load hone par greeting
    setTimeout(() => {
        speak("Namaskar Commander, main aapki kya madad kar sakta hoon?");
    }, 1000);
});
