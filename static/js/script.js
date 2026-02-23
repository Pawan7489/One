document.addEventListener("DOMContentLoaded", () => {
    // --- UI ELEMENTS ---
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
    
    // New Elements for Blueprint
    const miniHologram = document.getElementById("mini-hologram");
    const statusText = document.getElementById("status-text");
    const guestBtn = document.querySelector(".btn-secondary"); // Guest Button
    
    // Modals & Sidebar
    const profileBtn = document.getElementById("profile-btn");
    const profileModal = document.getElementById("profile-modal");
    const closeProfile = document.getElementById("close-profile");
    const settingsBtn = document.getElementById("settings-btn");
    const settingsModal = document.getElementById("settings-modal");
    const closeSettings = document.getElementById("close-settings");

    let currentUser = { name: "User", age: 25, persona: { label: "A1 Core" } };
    let isContinuousMicOn = false;
    let recognition;

    // --- 🚀 COMMANDER ADMIN PANEL URL ---
    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    // --- BROWSER AUDIO UNLOCK HACK ---
    function unlockAudio() {
        if(window.speechSynthesis) {
            let u = new SpeechSynthesisUtterance('');
            u.volume = 0; window.speechSynthesis.speak(u);
        }
    }

    // ==========================================
    // 1. UI TOGGLES & MODALS (Apple Smoothness)
    // ==========================================
    
    // Tabs Logic
    tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active"); tabSignup.classList.remove("active");
        loginForm.classList.remove("hidden"); signupForm.classList.add("hidden");
    });
    tabSignup.addEventListener("click", () => {
        tabSignup.classList.add("active"); tabLogin.classList.remove("active");
        signupForm.classList.remove("hidden"); loginForm.classList.add("hidden");
    });

    // Modals Logic
    profileBtn.addEventListener("click", () => profileModal.classList.remove("hidden"));
    closeProfile.addEventListener("click", () => profileModal.classList.add("hidden"));
    
    settingsBtn.addEventListener("click", () => settingsModal.classList.remove("hidden"));
    closeSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));

    // Plus Menu Logic
    plusBtn.addEventListener("click", () => actionMenu.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
        if (!plusBtn.contains(e.target) && !actionMenu.contains(e.target)) {
            actionMenu.classList.add("hidden");
        }
    });

    // ==========================================
    // 2. AUTHENTICATION LOGIC
    // ==========================================
    
    function enterChatArea(greetingMsg) {
        authScreen.classList.add("hidden");
        // Smooth transition
        setTimeout(() => {
            chatScreen.classList.remove("hidden");
            document.getElementById("persona-badge").innerText = `Mode: ${currentUser.persona.label}`;
            
            // Welcome Message & Voice
            if(greetingMsg) {
                appendTypingAI(greetingMsg, false); // No action bar for greeting
                speak(greetingMsg);
            }
        }, 400);
    }

    // Guest Login
    if(guestBtn) {
        guestBtn.addEventListener("click", () => {
            unlockAudio();
            currentUser = { name: "Guest", age: 25, persona: { label: "Guest Mode" } };
            enterChatArea("Namaste Guest! Main A1 hoon. Boliye main aapki kya madad kar sakta hoon?");
        });
    }

    // Sign Up Logic (Connects to your Python backend for Persona)
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        unlockAudio();
        const name = document.getElementById("reg-name").value || "Commander";
        const dob = document.getElementById("reg-dob").value;
        const gender = document.getElementById("reg-gender").value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.innerText = "Securing Connection...";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, dob, gender })
            });
            const data = await response.json();
            currentUser = { name, dob, gender, age: data.age, persona: data.persona };
            enterChatArea(data.greeting);
        } catch (error) {
            submitBtn.innerText = "Create Secure Account";
            // Fallback for UI Demo if backend is off
            enterChatArea(`Swagat hai ${name}, Main A1 hoon.`);
        }
    });

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        unlockAudio();
        enterChatArea("Secure Login Successful. Welcome back, Commander.");
    });

    // ==========================================
    // 3. VOICE SYNTHESIS (Mini-Hologram Sync)
    // ==========================================
    window.speakText = function(text) { speak(text); }; // Global function for Action Bar

    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        
        // Remove markdown (*, #, etc.) before speaking
        let cleanText = text.replace(/[*#_`]/g, ''); 
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        
        let selectedVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN"));
        if (!selectedVoice) selectedVoice = voices[0];
        
        utterance.voice = selectedVoice;
        utterance.rate = 1.0;

        // Mini Hologram Animation Sync
        utterance.onstart = () => { miniHologram.classList.add("speaking"); if(statusText) statusText.innerText = "A1 is speaking..."; };
        utterance.onend = () => { miniHologram.classList.remove("speaking"); if(statusText) statusText.innerText = "Ready..."; };
        
        window.speechSynthesis.speak(utterance);
    }

    // ==========================================
    // 4. CONTINUOUS MIC LOGIC
    // ==========================================
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;

        recognition.onstart = () => {
            micBtn.classList.add("active");
            miniHologram.classList.add("listening");
            if(statusText) statusText.innerText = "Listening continuously...";
        };

        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            sendMessage(); // Auto-send
        };

        recognition.onend = () => {
            if (isContinuousMicOn) {
                try { recognition.start(); } catch(e) {}
            } else {
                micBtn.classList.remove("active");
                miniHologram.classList.remove("listening");
                if(statusText) statusText.innerText = "Ready...";
            }
        };
    }

    micBtn.addEventListener("click", () => {
        if (isContinuousMicOn) {
            isContinuousMicOn = false;
            recognition.stop();
            micBtn.classList.remove("active");
        } else {
            isContinuousMicOn = true;
            try { recognition.start(); } catch(e) {}
        }
    });

    // ==========================================
    // 5. CHAT LOGIC (Gemini Streaming Style)
    // ==========================================
    
    // Function to append User Message
    function appendUserMessage(text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message user-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    // Function to append AI Message with Typing Effect & Action Bar
    function appendTypingAI(text, showActionBar = true) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ai-message`;
        chatBox.appendChild(msgDiv);
        
        // Split text by spaces to type word-by-word (Smooth Gemini feel)
        let words = text.replace(/\n/g, '<br>').split(' ');
        let i = 0;
        
        function typeWriter() {
            if (i < words.length) {
                msgDiv.innerHTML += words[i] + ' ';
                i++;
                chatBox.scrollTo({ top: chatBox.scrollHeight });
                setTimeout(typeWriter, 35); // Typing speed
            } else {
                // Typing finished, add Action Bar
                if(showActionBar) {
                    addActionBar(msgDiv, text);
                }
            }
        }
        typeWriter();
    }

    // Global copy function
    window.copyTextToClipboard = function(text) {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    // Add Feedback/Action Bar below AI message
    function addActionBar(container, rawText) {
        const actionBar = document.createElement("div");
        actionBar.className = "ai-actions";
        
        // Escape quotes for onclick events
        const safeText = rawText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        actionBar.innerHTML = `
            <button class="action-icon" onclick="copyTextToClipboard('${safeText}')" title="Copy">📋 Copy</button>
            <button class="action-icon" onclick="speakText('${safeText}')" title="Read Aloud">🔊 Listen</button>
            <button class="action-icon" title="Good Response">👍</button>
            <button class="action-icon" title="Bad Response">👎</button>
            <span class="sources-badge">🔗 AI Engine</span>
        `;
        
        // Fade in animation for action bar
        actionBar.style.opacity = "0";
        container.appendChild(actionBar);
        setTimeout(() => actionBar.style.opacity = "1", 100);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    // --- MASTER ENGINE SEND FUNCTION ---
    window.sendMessageToAI = async function() {
        const text = userInput.value.trim();
        if (!text) return;

        // Make chat layout full screen by shrinking top space
        document.getElementById("chat-screen").classList.add("chat-active");

        appendUserMessage(text);
        userInput.value = "";
        if(statusText) statusText.innerText = "A1 is thinking...";

        console.log("LOG: Connecting to A1 Engine for: " + text);

        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text })
            });

            const data = await response.json();
            console.log("LOG: Data Received: ", data);
            
            if(statusText) statusText.innerText = "Ready...";

            if (data.status === "success") {
                let aiResponse = data.answer;
                // UI Fix: Remove "Commander AI:" if backend sends it
                aiResponse = aiResponse.replace(/Commander AI:/gi, '').trim();
                
                // Trigger Gemini Typing Effect & Speak
                appendTypingAI(aiResponse, true);
                speak(aiResponse);
            } else {
                appendTypingAI("Engine Error: " + data.message, false);
                speak("Engine error.");
            }
        } catch (error) {
            console.error("CRITICAL ERROR: ", error);
            if(statusText) statusText.innerText = "Connection Failed";
            appendTypingAI("System Error: AI Engine se sampark tut gaya hai. Network check karein.", false);
            speak("Connection failed.");
        }
    };

    // Attach Event Listeners to Send buttons
    sendBtn.addEventListener("click", sendMessageToAI);
    userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessageToAI(); });
});
