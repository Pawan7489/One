document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 📱 1. HAPTIC ENGINE (iPhone/Samsung Style Vibration)
    // ==========================================
    function triggerHaptic(type = "light") {
        if (!navigator.vibrate) return;
        if (type === "light") navigator.vibrate(40); // Soft tick
        if (type === "medium") navigator.vibrate(80); // Medium pop
        if (type === "heavy") navigator.vibrate([50, 50, 50]); // Success/Error
    }

    document.querySelectorAll('button, .action-icon').forEach(btn => {
        btn.addEventListener('click', () => triggerHaptic("light"));
    });

    // ==========================================
    // 🎯 2. DOM ELEMENTS SETUP
    // ==========================================
    const signupScreen = document.getElementById("signup-screen");
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    
    const goToLogin = document.getElementById("go-to-login");
    const goToSignup = document.getElementById("go-to-signup");
    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");
    const guestBtn = document.getElementById("guest-btn");
    
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input"); // Now a TEXTAREA
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");
    const plusBtn = document.getElementById("plus-btn");
    const actionMenu = document.getElementById("action-menu");
    
    const menuToggle = document.getElementById("menu-toggle");
    const appSidebar = document.getElementById("app-sidebar");
    const newChatBtn = document.getElementById("new-chat-btn");
    
    // Tools & Modes
    const aiTools = document.querySelectorAll(".ai-tools-list li");
    const activeToolIndicator = document.getElementById("active-tool-indicator");
    const toolIcon = document.getElementById("tool-icon");
    const toolText = document.getElementById("tool-text");
    const closeToolBtn = document.getElementById("close-tool-btn");
    let currentAIMode = "chat"; // Default mode

    // Modals
    const modals = {
        profile: { btn: document.getElementById("profile-btn"), modal: document.getElementById("profile-modal"), close: document.getElementById("close-profile") },
        settings: { btn: document.getElementById("settings-btn"), modal: document.getElementById("settings-modal"), close: document.getElementById("close-settings") },
        support: { btn: document.getElementById("support-btn"), modal: document.getElementById("support-modal"), close: document.getElementById("close-support") }
    };
    
    const miniHologram = document.getElementById("mini-hologram");
    let currentUser = { name: "User", age: 25, persona: { label: "A1 Core" } };
    let isContinuousMicOn = false;
    let recognition;

    // 🚀 COMMANDER ADMIN PANEL URL
    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    function unlockAudio() {
        if(window.speechSynthesis) { let u = new SpeechSynthesisUtterance(''); u.volume = 0; window.speechSynthesis.speak(u); }
    }

    // ==========================================
    // 🔄 3. SCREEN TRANSITIONS
    // ==========================================
    function switchScreen(hideElem, showElem) {
        hideElem.style.opacity = "0";
        setTimeout(() => {
            hideElem.classList.add("hidden");
            showElem.classList.remove("hidden");
            setTimeout(() => { showElem.style.opacity = "1"; }, 50);
        }, 400);
    }

    if(goToLogin) goToLogin.addEventListener("click", (e) => { e.preventDefault(); switchScreen(signupScreen, loginScreen); });
    if(goToSignup) goToSignup.addEventListener("click", (e) => { e.preventDefault(); switchScreen(loginScreen, signupScreen); });

    function enterChatArea(greetingMsg) {
        triggerHaptic("heavy");
        if(!signupScreen.classList.contains("hidden")) switchScreen(signupScreen, chatScreen);
        if(!loginScreen.classList.contains("hidden")) switchScreen(loginScreen, chatScreen);
        
        setTimeout(() => {
            document.getElementById("persona-badge").innerText = `Mode: ${currentUser.persona.label}`;
            if(greetingMsg) { appendTypingAI(greetingMsg, false); speak(greetingMsg); }
        }, 800);
    }

    if(guestBtn) guestBtn.addEventListener("click", () => {
        unlockAudio(); currentUser = { name: "Guest", persona: { label: "Guest Mode" } };
        enterChatArea("Namaste Guest! Main A1 hoon. Aapke liye kya generate karun?");
    });

    signupForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea("Account created securely. Namaste Commander!"); });
    loginForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea("Secure Login Successful. Welcome back."); });

    // ==========================================
    // 🗂️ 4. SIDEBAR, MODALS & NEW CHAT
    // ==========================================
    if(menuToggle) menuToggle.addEventListener("click", () => { appSidebar.classList.toggle("open"); triggerHaptic("medium"); });
    document.querySelector(".chat-area").addEventListener("click", (e) => {
        if (window.innerWidth <= 768 && appSidebar.classList.contains("open") && !menuToggle.contains(e.target)) {
            appSidebar.classList.remove("open");
        }
    });

    // Modals Logic
    function openModal(modal) { triggerHaptic("medium"); modal.classList.remove("hidden"); }
    function closeModal(modal) { triggerHaptic("light"); modal.classList.add("hidden"); }

    Object.values(modals).forEach(m => {
        if(m.btn && m.modal && m.close) {
            m.btn.addEventListener("click", () => { appSidebar.classList.remove("open"); openModal(m.modal); });
            m.close.addEventListener("click", () => closeModal(m.modal));
        }
    });

    // Plus Menu (+)
    plusBtn.addEventListener("click", () => { actionMenu.classList.toggle("hidden"); actionMenu.style.display = actionMenu.classList.contains("hidden") ? "none" : "block"; });
    document.addEventListener("click", (e) => { if (!plusBtn.contains(e.target) && !actionMenu.contains(e.target)) { actionMenu.classList.add("hidden"); actionMenu.style.display = "none"; } });

    // 🚨 NEW CHAT ROOM LOGIC
    newChatBtn.addEventListener("click", () => {
        triggerHaptic("medium");
        chatBox.innerHTML = ""; // Clear chat history from screen
        closeToolBtn.click(); // Reset tool to default
        if (window.innerWidth <= 768) appSidebar.classList.remove("open");
        appendTypingAI("Naya chat room shuru ho gaya hai. Boliye?", false);
    });

    // 🚨 AI TOOL SELECTION LOGIC (Menu Bar -> Badge)
    aiTools.forEach(item => {
        item.addEventListener("click", () => {
            triggerHaptic("light");
            aiTools.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            currentAIMode = item.getAttribute("data-mode");

            if (currentAIMode !== "chat") {
                // Emoji nikalna aur text set karna
                const textParts = item.innerText.split(" ");
                toolIcon.innerText = textParts[0]; 
                toolText.innerText = item.innerText.substring(item.innerText.indexOf(" ") + 1) + " Mode";
                
                activeToolIndicator.classList.remove("hidden");
                activeToolIndicator.style.display = "flex";
            } else {
                activeToolIndicator.classList.add("hidden");
                setTimeout(()=> activeToolIndicator.style.display = "none", 300);
            }
            if (window.innerWidth <= 768) appSidebar.classList.remove("open");
        });
    });

    closeToolBtn.addEventListener("click", () => {
        triggerHaptic("light");
        activeToolIndicator.classList.add("hidden");
        setTimeout(()=> activeToolIndicator.style.display = "none", 300);
        aiTools.forEach(i => i.classList.remove("active"));
        aiTools[0].classList.add("active"); // Wapas Core Chat par
        currentAIMode = "chat";
    });

    // ==========================================
    // ✍️ 5. SMART TEXTAREA (Auto-grow & Shift+Enter)
    // ==========================================
    userInput.addEventListener("input", function() {
        this.style.height = "auto"; // Reset height
        this.style.height = (this.scrollHeight) + "px"; // Set to scroll height
        if(this.value.trim() === "") this.style.height = "auto"; // wapas chota karna
    });

    userInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); // Nayi line banne se rokna
            sendMessageToAI();
        }
        // Shift+Enter will automatically add a new line due to default textarea behavior
    });

    // ==========================================
    // 🎙️ 6. VOICE & MIC LOGIC
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
        // FIX: Sirf textarea mein likhega, apne aap send nahi karega
        recognition.onresult = (event) => { 
            userInput.value += " " + event.results[0][0].transcript; 
            userInput.dispatchEvent(new Event('input')); // Trigger auto-grow
        };
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
    // 🤖 7. AI CHAT ENGINE (Gemini Streaming & Actions)
    // ==========================================
    function appendUserMessage(text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message user-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

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
                setTimeout(typeWriter, Math.floor(Math.random() * 20) + 20); // Human speed
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
            <span class="sources-badge">🔗 Mode: ${currentAIMode.toUpperCase()}</span>
        `;
        
        actionBar.style.opacity = "0";
        container.appendChild(actionBar);
        setTimeout(() => actionBar.style.opacity = "1", 100);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    window.sendMessageToAI = async function() {
        const text = userInput.value.trim();
        if (!text) return;

        triggerHaptic("medium");
        appendUserMessage(text);
        
        // Reset Textarea
        userInput.value = "";
        userInput.style.height = "auto"; 

        // Check Toggles
        const deepSearchON = document.getElementById('toggle-search').checked;
        const deepThinkON = document.getElementById('toggle-reasoning').checked;
        
        // Prepare Full Query with context
        let finalQuery = text;
        if(currentAIMode !== "chat") finalQuery = `[Generate ${currentAIMode}] ` + text;
        if(deepSearchON) finalQuery = `[Web Search] ` + finalQuery;

        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: finalQuery })
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
            appendTypingAI("System Error: Network unreachable.", false);
        }
    };

    sendBtn.addEventListener("click", sendMessageToAI);
});
           
