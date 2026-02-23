
/* ====================================================
   PROJECT A1 - THE INDIAN SUPER-AI (MASTER JS V13.0)
   100% Fixed Login, Smart Logic & Premium Animations
==================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 📱 1. HAPTIC ENGINE (Vibration Logic) ---
    function triggerHaptic(type = "light") {
        if (!navigator.vibrate) return;
        if (type === "light") navigator.vibrate(35); 
        if (type === "medium") navigator.vibrate(65); 
        if (type === "heavy") navigator.vibrate([40, 50, 40]); 
    }

    // --- 🎯 2. DOM ELEMENTS SELECTION ---
    const signupScreen = document.getElementById("signup-screen");
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const stopBtn = document.getElementById("stop-btn");
    const micBtn = document.getElementById("mic-btn");
    const appSidebar = document.getElementById("app-sidebar");
    const menuToggle = document.getElementById("menu-toggle");
    const welcomeBanner = document.getElementById("welcome-banner");
    const aiThinkingIndicator = document.getElementById("ai-thinking-indicator");
    const activeToolIndicator = document.getElementById("active-tool-indicator");

    // Live Voice Chat Elements
    const liveVoiceOverlay = document.getElementById("live-voice-overlay");
    const liveVoiceText = document.getElementById("live-voice-text");
    const liveVoiceBtn = document.getElementById("live-voice-mode-btn");

    let currentUser = { name: "User", persona: "A1 Core" };
    let isTyping = false;
    let abortController = null;
    let recognition;

    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    // --- 💾 3. LOGIN & AUTH LOGIC (FIXED) ---
    
    // Safe JSON Parsing Function
    function checkLoginState() {
        try {
            const savedData = localStorage.getItem("a1_indian_user");
            if (savedData) {
                currentUser = JSON.parse(savedData); // CORRECTED: No double JSON
                signupScreen.classList.add("hidden");
                loginScreen.classList.add("hidden");
                chatScreen.classList.remove("hidden");
                document.getElementById("welcome-user-name").innerText = `Welcome back, ${currentUser.name}!`;
                setTimeout(() => {
                    speakText(`Welcome back ${currentUser.name}, Main aapki kya madad kar sakta hoon?`);
                }, 1000);
            }
        } catch (e) {
            localStorage.removeItem("a1_indian_user");
        }
    }

    function enterChatArea(name) {
        triggerHaptic("heavy");
        currentUser.name = name;
        
        // Auto-Save Login for next time
        localStorage.setItem("a1_indian_user", JSON.stringify(currentUser));

        // Smooth Fade Out
        [signupScreen, loginScreen].forEach(s => s.style.opacity = "0");
        
        setTimeout(() => {
            signupScreen.classList.add("hidden");
            loginScreen.classList.add("hidden");
            chatScreen.classList.remove("hidden");
            document.getElementById("welcome-user-name").innerText = `Namaste ${name}! 🙏`;
            setTimeout(() => { chatScreen.style.opacity = "1"; }, 50);
            speakText(`Namaste ${name}. Main A1 Super AI hoon.`);
        }, 400);
    }

    // Button Event Listeners for Login/Signup
    document.getElementById("signup-submit-btn").addEventListener("click", () => {
        const name = document.getElementById("reg-name").value || "Commander";
        enterChatArea(name);
    });

    document.getElementById("login-submit-btn").addEventListener("click", () => {
        const id = document.getElementById("login-id").value || "Commander";
        enterChatArea(id.split('@')[0]);
    });

    document.getElementById("guest-btn").addEventListener("click", () => {
        enterChatArea("Guest");
    });

    // Window Navigation
    document.getElementById("go-to-login").addEventListener("click", (e) => {
        e.preventDefault();
        signupScreen.classList.add("hidden");
        loginScreen.classList.remove("hidden");
    });

    document.getElementById("go-to-signup").addEventListener("click", (e) => {
        e.preventDefault();
        loginScreen.classList.add("hidden");
        signupScreen.classList.remove("hidden");
    });

    // --- 🎙️ 4. VOICE & MIC ENGINE ---
    
    window.speakText = function(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ''));
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN")) || voices[0];
        
        // Dynamic Voice Styles (Kid, Senior, etc)
        const voicePref = document.getElementById("setting-voice").value;
        if (voicePref.includes("kid")) { utterance.pitch = 1.5; utterance.rate = 1.1; }
        else if (voicePref.includes("senior")) { utterance.pitch = 0.8; utterance.rate = 0.85; }
        
        utterance.onstart = () => document.getElementById("mini-hologram").classList.add("speaking");
        utterance.onend = () => document.getElementById("mini-hologram").classList.remove("speaking");
        window.speechSynthesis.speak(utterance);
    };

    // --- 💬 5. MESSAGE & AI ENGINE ---

    async function sendMessageToAI() {
        const text = userInput.value.trim();
        if (!text) return;

        triggerHaptic("medium");
        appendUserMessage(text);
        userInput.value = "";
        userInput.style.height = "auto";
        
        welcomeBanner.style.display = "none";
        document.getElementById("prompt-suggestions").style.display = "none";

        isTyping = true;
        abortController = new AbortController();
        
        // Show Thinking steps
        aiThinkingIndicator.classList.remove("hidden");
        toggleUIState(true);

        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text, check_database_cache: true }),
                signal: abortController.signal
            });

            const data = await response.json();
            aiThinkingIndicator.classList.add("hidden");
            
            if (isTyping && data.status === "success") {
                appendTypingAI(data.answer);
                speakText(data.answer);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                aiThinkingIndicator.classList.add("hidden");
                appendTypingAI("Error: AI Engine offline hai.");
            }
        }
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "message user-message";
        const safeText = text.replace(/'/g, "\\'");
        msgDiv.innerHTML = `
            <div>${text}</div>
            <div class="user-actions">
                <button class="action-icon" onclick="speakText('${safeText}')">🔊</button>
                <button class="action-icon" onclick="document.getElementById('user-input').value='${safeText}'; document.getElementById('user-input').focus();">✏️</button>
            </div>
        `;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    function appendTypingAI(text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "message ai-message";
        chatBox.appendChild(msgDiv);
        
        let words = text.split(' ');
        let i = 0;
        function type() {
            if (i < words.length && isTyping) {
                msgDiv.innerHTML += words[i] + ' ';
                i++;
                chatBox.scrollTo({ top: chatBox.scrollHeight });
                setTimeout(type, 30);
            } else {
                toggleUIState(false);
                addActionBar(msgDiv, text);
            }
        }
        type();
    }

    function addActionBar(container, rawText) {
        const bar = document.createElement("div");
        bar.className = "ai-actions";
        bar.innerHTML = `
            <button class="action-icon" onclick="navigator.clipboard.writeText('${rawText.replace(/'/g, "\\'")}')">📋 Copy</button>
            <button class="action-icon" onclick="speakText('${rawText.replace(/'/g, "\\'")}')">🔊 Read</button>
            <span class="sources-badge">🔗 Indian Engine</span>
        `;
        container.appendChild(bar);
    }

    function toggleUIState(generating) {
        if (generating) {
            sendBtn.classList.add("hidden");
            stopBtn.classList.remove("hidden");
        } else {
            sendBtn.classList.remove("hidden");
            stopBtn.classList.add("hidden");
        }
    }

    stopBtn.addEventListener("click", () => {
        isTyping = false;
        if(abortController) abortController.abort();
        window.speechSynthesis.cancel();
        toggleUIState(false);
        aiThinkingIndicator.classList.add("hidden");
    });

    // --- 🛠️ 6. MODALS & SIDEBAR (BOUNCY UI) ---
    
    function manageModal(id, btnId, closeId) {
        const modal = document.getElementById(id);
        const btn = document.getElementById(btnId);
        const close = document.getElementById(closeId);
        
        btn.addEventListener("click", () => {
            triggerHaptic("medium");
            modal.classList.remove("hidden");
            if (window.innerWidth <= 768) appSidebar.classList.remove("open");
        });
        close.addEventListener("click", () => modal.classList.add("hidden"));
    }

    manageModal("settings-modal", "settings-btn", "close-settings");
    manageModal("profile-modal", "profile-btn", "close-profile");
    manageModal("support-modal", "support-btn", "close-support");
    manageModal("history-modal", "history-settings-btn", "close-history");

    menuToggle.addEventListener("click", () => {
        appSidebar.classList.toggle("open");
        triggerHaptic("medium");
    });

    // Smart Textarea Logic
    userInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = (this.scrollHeight) + "px";
    });

    sendBtn.addEventListener("click", sendMessageToAI);
    userInput.addEventListener("keydown", (e) => {
        if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessageToAI(); }
    });

    // Initialize Page
    checkLoginState();

});
                          
