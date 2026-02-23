document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 📱 1. HAPTIC ENGINE (iPhone Style Vibration)
    // ==========================================
    // Har button click par halka sa premium vibration hoga (Sirf Mobile par)
    function triggerHaptic(type = "light") {
        if (!navigator.vibrate) return;
        if (type === "light") navigator.vibrate(40); // Soft tick (Buttons)
        if (type === "medium") navigator.vibrate(80); // Medium (Modals open)
        if (type === "heavy") navigator.vibrate([50, 50, 50]); // Error or Success
    }

    // Sabhi buttons par auto-haptic lagana
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => triggerHaptic("light"));
    });

    // ==========================================
    // 🎯 2. UI ELEMENTS & DOM SETUP
    // ==========================================
    // Screens
    const signupScreen = document.getElementById("signup-screen");
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    
    // Auth Toggles
    const goToLogin = document.getElementById("go-to-login");
    const goToSignup = document.getElementById("go-to-signup");
    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");
    const guestBtn = document.getElementById("guest-btn");
    
    // Chat & Input Elements
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");
    const plusBtn = document.getElementById("plus-btn");
    const actionMenu = document.getElementById("action-menu");
    
    // Sidebar & Menus
    const menuToggle = document.getElementById("menu-toggle");
    const appSidebar = document.getElementById("app-sidebar");
    
    // Modals & Triggers
    const profileBtn = document.getElementById("profile-btn");
    const profileModal = document.getElementById("profile-modal");
    const settingsBtn = document.getElementById("settings-btn");
    const settingsModal = document.getElementById("settings-modal");
    const supportBtn = document.getElementById("support-btn");
    const supportModal = document.getElementById("support-modal");
    
    // Core AI Visuals
    const miniHologram = document.getElementById("mini-hologram");
    let currentUser = { name: "User", age: 25, persona: { label: "A1 Core" } };
    let isContinuousMicOn = false;
    let recognition;

    // 🚀 COMMANDER ADMIN PANEL URL
    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    function unlockAudio() {
        if(window.speechSynthesis) {
            let u = new SpeechSynthesisUtterance(''); u.volume = 0; window.speechSynthesis.speak(u);
        }
    }

    // ==========================================
    // 🔄 3. SCREEN TRANSITIONS (Smooth Fade-ins)
    // ==========================================
    function switchScreen(hideElem, showElem) {
        hideElem.style.opacity = "0";
        setTimeout(() => {
            hideElem.classList.add("hidden");
            showElem.classList.remove("hidden");
            // Thoda delay dekar opacity badhana (Samsung UI feel)
            setTimeout(() => { showElem.style.opacity = "1"; }, 50);
        }, 400); // Wait for CSS transition
    }

    if(goToLogin) goToLogin.addEventListener("click", (e) => { e.preventDefault(); switchScreen(signupScreen, loginScreen); });
    if(goToSignup) goToSignup.addEventListener("click", (e) => { e.preventDefault(); switchScreen(loginScreen, signupScreen); });

    function enterChatArea(greetingMsg) {
        triggerHaptic("heavy"); // Success feel
        if(!signupScreen.classList.contains("hidden")) switchScreen(signupScreen, chatScreen);
        if(!loginScreen.classList.contains("hidden")) switchScreen(loginScreen, chatScreen);
        
        setTimeout(() => {
            document.getElementById("persona-badge").innerText = `Mode: ${currentUser.persona.label}`;
            if(greetingMsg) { appendTypingAI(greetingMsg, false); speak(greetingMsg); }
        }, 800);
    }

    // Auth Submits
    if(guestBtn) guestBtn.addEventListener("click", () => {
        unlockAudio(); currentUser = { name: "Guest", persona: { label: "Guest Mode" } };
        enterChatArea("Namaste Guest! Main A1 hoon. Boliye main aapki kya madad kar sakta hoon?");
    });

    signupForm.addEventListener("submit", (e) => {
        e.preventDefault(); unlockAudio(); enterChatArea("Account created securely. Namaste Commander!");
    });
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault(); unlockAudio(); enterChatArea("Secure Login Successful. Welcome back.");
    });

    // ==========================================
    // 🗂️ 4. SIDEBAR & MODALS LOGIC (Bouncy UI)
    // ==========================================
    // Mobile Sidebar
    if(menuToggle) menuToggle.addEventListener("click", () => {
        appSidebar.classList.toggle("open");
        triggerHaptic("medium");
    });
    // Click outside sidebar to close (Mobile)
    document.querySelector(".chat-area").addEventListener("click", (e) => {
        if (window.innerWidth <= 768 && appSidebar.classList.contains("open") && !menuToggle.contains(e.target)) {
            appSidebar.classList.remove("open");
        }
    });

    // Plus Menu (+)
    plusBtn.addEventListener("click", () => actionMenu.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
        if (!plusBtn.contains(e.target) && !actionMenu.contains(e.target)) actionMenu.classList.add("hidden");
    });

    // Generic Modal Opener
    function openModal(modal) { triggerHaptic("medium"); modal.classList.remove("hidden"); }
    function closeModal(modal) { triggerHaptic("light"); modal.classList.add("hidden"); }

    profileBtn.addEventListener("click", () => openModal(profileModal));
    document.getElementById("close-profile").addEventListener("click", () => closeModal(profileModal));
    
    settingsBtn.addEventListener("click", () => { appSidebar.classList.remove("open"); openModal(settingsModal); });
    document.getElementById("close-settings").addEventListener("click", () => closeModal(settingsModal));

    supportBtn.addEventListener("click", () => { appSidebar.classList.remove("open"); openModal(supportModal); });
    document.getElementById("close-support").addEventListener("click", () => closeModal(supportModal));

    // ==========================================
    // 🎙️ 5. VOICE & CONTINUOUS MIC (Mini Hologram Sync)
    // ==========================================
    window.speakText = function(text) { speak(text); triggerHaptic("light"); };

    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        let cleanText = text.replace(/[*#_`]/g, ''); 
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN")) || voices[0];
        utterance.voice = selectedVoice; utterance.rate = 1.0;

        utterance.onstart = () => { miniHologram.classList.add("speaking"); };
        utterance.onend = () => { miniHologram.classList.remove("speaking"); };
        window.speechSynthesis.speak(utterance);
    }

    const SpeechRecAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecAPI) {
        recognition = new SpeechRecAPI();
        recognition.lang = 'en-IN'; recognition.interimResults = false;

        recognition.onstart = () => { micBtn.classList.add("active"); triggerHaptic("medium"); };
        recognition.onresult = (event) => { userInput.value = event.results[0][0].transcript; sendMessageToAI(); };
        recognition.onend = () => {
            if (isContinuousMicOn) { try { recognition.start(); } catch(e) {} } 
            else { micBtn.classList.remove("active"); }
        };
    }

    micBtn.addEventListener("click", () => {
        if (isContinuousMicOn) { isContinuousMicOn = false; recognition.stop(); micBtn.classList.remove("active"); } 
        else { isContinuousMicOn = true; try { recognition.start(); } catch(e) {} }
    });

    // ==========================================
    // 🤖 6. AI CHAT ENGINE (Gemini Streaming & Actions)
    // ==========================================
    function appendUserMessage(text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message user-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    // iPhone style Smooth Word-by-Word Typing
    function appendTypingAI(text, showActionBar = true) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ai-message`;
        chatBox.appendChild(msgDiv);
        
        let words = text.replace(/\n/g, '<br>').split(' ');
        let i = 0;
        
        function typeWriter() {
            if (i < words.length) {
                msgDiv.innerHTML += words[i] + ' ';
                i++;
                chatBox.scrollTo({ top: chatBox.scrollHeight });
                // Random typing speed delay for human feel (20ms to 40ms)
                let speed = Math.floor(Math.random() * 20) + 20; 
                setTimeout(typeWriter, speed);
            } else {
                if(showActionBar) addActionBar(msgDiv, text);
            }
        }
        typeWriter();
    }

    window.copyTextToClipboard = function(text) {
        navigator.clipboard.writeText(text); triggerHaptic("medium"); alert("📋 Copied to clipboard!");
    };

    function addActionBar(container, rawText) {
        const actionBar = document.createElement("div");
        actionBar.className = "ai-actions";
        const safeText = rawText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        actionBar.innerHTML = `
            <button class="action-icon" onclick="copyTextToClipboard('${safeText}')" title="Copy">📋 Copy</button>
            <button class="action-icon" onclick="speakText('${safeText}')" title="Read Aloud">🔊 Listen</button>
            <button class="action-icon" title="Good Response">👍</button>
            <button class="action-icon" title="Bad Response">👎</button>
            <span class="sources-badge">🔗 AI Engine</span>
        `;
        
        actionBar.style.opacity = "0";
        container.appendChild(actionBar);
        setTimeout(() => actionBar.style.opacity = "1", 100);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
        triggerHaptic("light"); // AI msg finish haptic
    }

    window.sendMessageToAI = async function() {
        const text = userInput.value.trim();
        if (!text) return;

        triggerHaptic("medium"); // Send click haptic
        appendUserMessage(text);
        userInput.value = "";

        // Check if Quick Toggles are ON
        const deepSearchON = document.querySelectorAll('.toggle-pill input')[0].checked;
        const deepThinkON = document.querySelectorAll('.toggle-pill input')[1].checked;
        
        console.log(`LOG: Connecting. Search: ${deepSearchON}, Think: ${deepThinkON}`);

        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text })
            });

            const data = await response.json();
            if (data.status === "success") {
                let aiResponse = data.answer.replace(/Commander AI:/gi, '').trim();
                appendTypingAI(aiResponse, true);
                speak(aiResponse);
            } else {
                appendTypingAI("Engine Error: " + data.message, false);
            }
        } catch (error) {
            appendTypingAI("System Error: Network unreachable. Please check connection.", false);
        }
    };

    // Keyboard 'Enter' send
    userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessageToAI(); });
});
            
