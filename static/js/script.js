document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    const loginForm = document.getElementById("login-form");
    
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");
    const hologram = document.getElementById("hologram");
    const statusText = document.getElementById("status-text");
    const personaBadge = document.getElementById("persona-badge");

    let currentUser = {};
    let isListening = false;
    let recognition;

    // Load voices early
    if (window.speechSynthesis) window.speechSynthesis.getVoices();

    // 1. LOGIN LOGIC
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("user-name").value;
        const dob = document.getElementById("user-dob").value;
        const gender = document.getElementById("user-gender").value;
        
        const submitBtn = loginForm.querySelector('button');
        submitBtn.innerText = "Securing Connection...";
        submitBtn.style.opacity = "0.8";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, dob, gender })
            });
            const data = await response.json();

            currentUser = { name, dob, gender, age: data.age, persona: data.persona };

            // Apple style smooth screen transition
            loginScreen.classList.add("hidden");
            setTimeout(() => {
                chatScreen.classList.remove("hidden");
                personaBadge.innerText = `Mode: ${data.persona.label}`;
                
                // Greeting Voice
                setTimeout(() => {
                    appendMessage("ai", data.greeting);
                    speak(data.greeting);
                }, 400); // Thoda ruk kar bolega taaki screen load ho jaye
            }, 600);

        } catch (error) {
            submitBtn.innerText = "Secure Login";
            submitBtn.style.opacity = "1";
            alert("Connection error! Server check karein.");
        }
    });

    // 2. VOICE SYNTHESIS & AURA ANIMATION
    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); 
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        let selectedVoice = null;
        if (currentUser.gender === "female") {
            selectedVoice = voices.find(v => (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("samantha")) && v.lang.includes("en"));
        } else {
            selectedVoice = voices.find(v => (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david")) && v.lang.includes("en"));
        }
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
        
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = 1.0;

        // Trigger Aura Ripple Animation
        utterance.onstart = () => {
            hologram.classList.remove("listening");
            hologram.classList.add("speaking");
            statusText.innerText = "A1 is speaking...";
        };
        
        utterance.onend = () => {
            hologram.classList.remove("speaking");
            statusText.innerText = "A1 is ready...";
        };

        window.speechSynthesis.speak(utterance);
    }

    // 3. MIC RECORDING
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add("active");
            hologram.classList.remove("speaking");
            hologram.classList.add("listening");
            statusText.innerText = "Listening to you...";
        };

        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            sendMessage(); 
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove("active");
            hologram.classList.remove("listening");
            if(hologram.classList.length === 0) statusText.innerText = "A1 is ready...";
        };
    }

    micBtn.addEventListener("click", () => {
        if (isListening) recognition.stop();
        else if (recognition) recognition.start();
    });

    // 4. CHAT LOGIC
    function appendMessage(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage("user", text);
        userInput.value = "";

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, user: currentUser })
        });

        const data = await response.json();
        appendMessage("ai", data.reply);
        speak(data.reply);
    }

    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
});
          
