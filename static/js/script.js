document.addEventListener("DOMContentLoaded", () => {
    // --- Elements (UI के हिस्से) ---
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    const loginForm = document.getElementById("login-form");
    
    const chatBox = document.querySelector(".chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.querySelector(".send-btn");
    const micBtn = document.querySelector(".mic-btn");
    const hologram = document.querySelector(".hologram");
    const statusText = document.getElementById("status-text");
    const personaBadge = document.querySelector(".mode-badge");

    let currentUser = {};
    let isListening = false;
    let recognition;

    // ब्राउज़र में आवाज़ें लोड होने में थोड़ा समय लगता है, इसलिए पहले ही लोड कर लें
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
    }

    // ==========================================
    // 1. LOGIN & AUTO-VOICE GREETING (लॉगिन और स्वागत)
    // ==========================================
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // पेज को रिफ्रेश होने से रोकना
        
        const name = document.getElementById("user-name").value;
        const dob = document.getElementById("user-dob").value;
        const gender = document.getElementById("user-gender").value;

        try {
            // Python backend से डेटा मंगाना
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, dob, gender })
            });
            const data = await response.json();

            currentUser = { name, dob, gender, age: data.age, persona: data.persona };

            // लॉगिन स्क्रीन छिपाना और चैट स्क्रीन दिखाना
            loginScreen.classList.add("hidden");
            chatScreen.classList.remove("hidden");
            personaBadge.innerText = `Mode: ${data.persona.label}`;

            // 🎯 जादुई पल: जैसे ही स्क्रीन खुलेगी, AI नाम लेकर स्वागत करेगा
            appendMessage("ai", data.greeting);
            speak(data.greeting); // AI जोर से बोलेगा

        } catch (error) {
            console.error("Login Error:", error);
            alert("Server se connect nahi ho paya. Server chalu karein!");
        }
    });

    // ==========================================
    // 2. AI VOICE SYNTHESIS (AI का बोलना)
    // ==========================================
    function speak(text) {
        if (!window.speechSynthesis) {
            alert("Aapka browser voice support nahi karta.");
            return;
        }
        
        // पुरानी आवाज़ रोकना
        window.speechSynthesis.cancel(); 
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        // Gender के हिसाब से भारतीय आवाज़ खोजना
        let selectedVoice = null;
        if (currentUser.gender === "female") {
            // महिलाओं की आवाज़
            selectedVoice = voices.find(v => (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("samantha")) && (v.lang.includes("en") || v.lang.includes("hi")));
        } else {
            // पुरुषों की आवाज़
            selectedVoice = voices.find(v => (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david")) && (v.lang.includes("en") || v.lang.includes("hi")));
        }
        
        // अगर चुनी हुई आवाज़ न मिले, तो कोई भी भारतीय (Indian) आवाज़ लगा दो
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.rate = 1.0; // नॉर्मल स्पीड

        // बोलते समय होलोग्राम एनिमेशन
        utterance.onstart = () => {
            hologram.classList.remove("idle", "listening");
            hologram.classList.add("speaking");
            statusText.innerText = "A1 is speaking...";
        };
        
        // चुप होने पर होलोग्राम एनिमेशन
        utterance.onend = () => {
            hologram.classList.remove("speaking");
            hologram.classList.add("idle");
            statusText.innerText = "A1 is ready...";
        };

        window.speechSynthesis.speak(utterance);
    }

    // ==========================================
    // 3. MIC RECORDING (यूज़र का बोलकर निर्देश देना)
    // ==========================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; // भारतीय भाषा और लहज़ा
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add("active");
            hologram.classList.remove("idle", "speaking");
            hologram.classList.add("listening");
            statusText.innerText = "Listening...";
        };

        recognition.onresult = (event) => {
            // जो यूज़र ने बोला, उसे इनपुट बॉक्स में डालना
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage(); // ऑटोमैटिक सेंड कर देना
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove("active");
            if (!hologram.classList.contains("speaking")) {
                hologram.classList.remove("listening");
                hologram.classList.add("idle");
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

    // ==========================================
    // 4. TEXT CHAT & GENERATIVE TASKS (टेक्स्ट और मैसेजिंग)
    // ==========================================
    function appendMessage(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // नए मैसेज पर स्क्रॉल करना
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage("user", text); // यूज़र का मैसेज दिखाना
        userInput.value = ""; // इनपुट खाली करना

        try {
            // Python Backend को मैसेज भेजना (यहीं पर Image/Code जनरेशन होगा)
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: text,
                    user: currentUser
                })
            });

            const data = await response.json();
            
            // AI का जवाब दिखाना और बोलकर सुनाना
            appendMessage("ai", data.reply);
            speak(data.reply); 

        } catch (error) {
            const errorMsg = "Sorry Commander, server se connection toot gaya hai.";
            appendMessage("ai", errorMsg);
            speak(errorMsg);
        }
    }

    // 'Send' बटन क्लिक करने पर
    sendBtn.addEventListener("click", sendMessage);
    
    // कीबोर्ड पर 'Enter' दबाने पर
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
});
