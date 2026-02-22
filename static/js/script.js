document.addEventListener("DOMContentLoaded", () => {
    const authScreen = document.getElementById("auth-screen");
    const chatScreen = document.getElementById("chat-screen");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");
    const plusBtn = document.getElementById("plus-btn");
    const actionMenu = document.getElementById("action-menu");
    const hologram = document.getElementById("hologram");
    const statusText = document.getElementById("status-text");

    let currentUser = {};
    let isContinuousMicOn = false;
    let recognition;

    // --- 🚀 COMMANDER ADMIN PANEL URL (NEW) ---
    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    // --- BROWSER AUDIO UNLOCK HACK (Mobile Fix) ---
    // Mobile browsers pehle user interaction par hi audio allow karte hain
    function unlockAudio() {
        if(window.speechSynthesis) {
            let u = new SpeechSynthesisUtterance('');
            u.volume = 0; window.speechSynthesis.speak(u);
        }
    }

    // --- TABS LOGIC ---
    tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active"); tabSignup.classList.remove("active");
        loginForm.classList.remove("hidden"); signupForm.classList.add("hidden");
    });
    tabSignup.addEventListener("click", () => {
        tabSignup.classList.add("active"); tabLogin.classList.remove("active");
        signupForm.classList.remove("hidden"); loginForm.classList.add("hidden");
    });

    // --- SIGNUP / LOGIN SUBMIT ---
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        unlockAudio(); // Unlocking audio immediately on button click

        const name = document.getElementById("reg-name").value;
        const dob = document.getElementById("reg-dob").value;
        const gender = document.getElementById("reg-gender").value;
        const submitBtn = signupForm.querySelector('button');
        submitBtn.innerText = "Securing Connection...";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, dob, gender })
            });
            const data = await response.json();
            currentUser = { name, dob, gender, age: data.age, persona: data.persona };

            authScreen.classList.add("hidden");
            chatScreen.classList.remove("hidden");
            document.getElementById("persona-badge").innerText = `Mode: ${data.persona.label}`;
            
            // Speak immediately
            appendMessage("ai", data.greeting);
            speak(data.greeting);

        } catch (error) {
            submitBtn.innerText = "Create Secure Account";
            alert("Server Error! Please restart Python backend.");
        }
    });

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        alert("Sirf UI Demo hai. Test karne ke liye 'Sign Up' tab use karein!");
    });

    // --- VOICE SYNTHESIS ---
    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        let selectedVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN"));
        if (!selectedVoice) selectedVoice = voices[0];
        
        utterance.voice = selectedVoice;
        utterance.rate = 1.0;

        utterance.onstart = () => { hologram.className = "hologram-container speaking"; statusText.innerText = "A1 is speaking..."; };
        utterance.onend = () => { hologram.className = "hologram-container"; statusText.innerText = "Ready..."; };
        
        window.speechSynthesis.speak(utterance);
    }

    // --- CONTINUOUS MIC LOGIC ---
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;

        recognition.onstart = () => {
            micBtn.classList.add("active");
            hologram.className = "hologram-container listening";
            statusText.innerText = "Listening continuously...";
        };

        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            sendMessage();
        };

        recognition.onend = () => {
            if (isContinuousMicOn) {
                try { recognition.start(); } catch(e) {}
            } else {
                micBtn.classList.remove("active");
                if(!hologram.classList.contains("speaking")) {
                    hologram.className = "hologram-container"; statusText.innerText = "Ready...";
                }
            }
        };
    }

    micBtn.addEventListener("click", () => {
        if (isContinuousMicOn) {
            isContinuousMicOn = false;
            recognition.stop();
            micBtn.classList.remove("active");
            statusText.innerText = "Mic paused.";
        } else {
            isContinuousMicOn = true;
            try { recognition.start(); } catch(e) {}
        }
    });

    // --- PLUS MENU TOGGLE ---
    plusBtn.addEventListener("click", () => actionMenu.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
        if (!plusBtn.contains(e.target) && !actionMenu.contains(e.target)) {
            actionMenu.classList.add("hidden");
        }
    });

    // --- SEND MESSAGE ---
    function appendMessage(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    // 🛠️ UPGRADED MASTER ENGINE FUNCTION WITH DEBUG LOGS 🛠️
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage("user", text);
        userInput.value = "";
        statusText.innerText = "A1 is thinking...";

        // Debugging Logs - Mobile Console में देखने के लिए
        console.log("LOG 1: Request started for: " + text);

        try {
            console.log("LOG 2: Connecting to: " + ADMIN_PANEL_URL);
            
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text }) // सीधे Admin Panel को query भेज रहे हैं
            });

            console.log("LOG 3: Response Status Code: " + response.status);

            const data = await response.json();
            console.log("LOG 4: Data Received: ", data);

            statusText.innerText = "Ready...";

            if (data.status === "success") {
                appendMessage("ai", data.answer);
                speak(data.answer); // आपका AI बोलकर भी जवाब देगा!
            } else {
                console.error("LOG 5: Engine Error: ", data.message);
                appendMessage("ai", "Engine Error: " + data.message);
                speak("Engine offline hai.");
            }
        } catch (error) {
            console.error("CRITICAL ERROR (LOG 6): ", error);
            statusText.innerText = "Connection Failed";
            appendMessage("ai", "System Error: Backend unreachable. Console logs check karein.");
            speak("Connection failed. Please check network.");
        }
    }

    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
});
