document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 📱 1. HAPTIC ENGINE (Vibration)
    // ==========================================
    function triggerHaptic(type = "light") {
        if (!navigator.vibrate) return;
        if (type === "light") navigator.vibrate(30); 
        if (type === "medium") navigator.vibrate(60); 
        if (type === "heavy") navigator.vibrate([40, 50, 40]); 
    }
    document.querySelectorAll('button, .action-icon, .chat-item').forEach(btn => {
        btn.addEventListener('click', () => triggerHaptic("light"));
    });

    // ==========================================
    // 🎯 2. DOM ELEMENTS SETUP
    // ==========================================
    const signupScreen = document.getElementById("signup-screen");
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    
    // Auth & Modals
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const rememberMeCheck = document.getElementById("remember-me");
    const welcomeBanner = document.getElementById("welcome-banner");
    const welcomeUserName = document.getElementById("welcome-user-name");
    
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");
    const plusBtn = document.getElementById("plus-btn");
    const actionMenu = document.getElementById("action-menu");
    
    const menuToggle = document.getElementById("menu-toggle");
    const appSidebar = document.getElementById("app-sidebar");
    const newChatBtn = document.getElementById("new-chat-btn");
    const aiThinkingIndicator = document.getElementById("ai-thinking-indicator");
    
    // Tools
    const aiTools = document.querySelectorAll(".ai-tools-list li");
    const activeToolIndicator = document.getElementById("active-tool-indicator");
    const toolIcon = document.getElementById("tool-icon");
    const toolText = document.getElementById("tool-text");
    const closeToolBtn = document.getElementById("close-tool-btn");
    let currentAIMode = "chat";

    // 🚨 FIX: Added History Modal to the Modals Object
    const modals = {
        profile: { btn: document.getElementById("profile-btn"), modal: document.getElementById("profile-modal"), close: document.getElementById("close-profile") },
        settings: { btn: document.getElementById("settings-btn"), modal: document.getElementById("settings-modal"), close: document.getElementById("close-settings") },
        support: { btn: document.getElementById("support-btn"), modal: document.getElementById("support-modal"), close: document.getElementById("close-support") },
        history: { btn: document.getElementById("history-settings-btn"), modal: document.getElementById("history-modal"), close: document.getElementById("close-history") }
    };
    
    // Live Voice
    const liveVoiceBtn = document.getElementById("live-voice-mode-btn");
    const liveVoiceOverlay = document.getElementById("live-voice-overlay");
    const liveVoiceText = document.getElementById("live-voice-text");
    const liveVoiceStatus = document.getElementById("live-voice-status");
    const closeLiveVoice = document.getElementById("close-live-voice");
    const miniHologram = document.getElementById("mini-hologram");

    let currentUser = { name: "User", persona: "A1 Core" };
    let isContinuousMicOn = false;
    let isLiveVoiceMode = false;
    let recognition;

    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    function unlockAudio() {
        if(window.speechSynthesis) { let u = new SpeechSynthesisUtterance(''); u.volume = 0; window.speechSynthesis.speak(u); }
    }

    // ==========================================
    // 💾 3. PERSISTENT LOGIN (THE BUG FIX)
    // ==========================================
    function checkLoginState() {
        try {
            const savedUser = localStorage.getItem("a1_indian_user");
            if (savedUser) {
                // 🚨 BIG FIX: Changed JSON.JSON.parse to JSON.parse
                currentUser = JSON.parse(savedUser);
                
                signupScreen.classList.add("hidden");
                loginScreen.classList.add("hidden");
                chatScreen.classList.remove("hidden");
                welcomeUserName.innerText = `Welcome back, ${currentUser.name}!`;
                
                setTimeout(() => {
                    speakText(`Welcome back ${currentUser.name}, Main aapki kya madad kar sakta hoon?`);
                }, 1000);
            }
        } catch (error) {
            console.error("Login Cache Error Fixed: ", error);
            localStorage.removeItem("a1_indian_user"); // Clear corrupted data
        }
    }
    
    // Speak function needs to be defined before calling it in checkLoginState
    window.speakText = function(text) { speak(text); triggerHaptic("light"); };

    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        let cleanText = text.replace(/[*#_`]/g, '').replace(/Commander AI:/gi, ''); 
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN")) || voices[0];
        utterance.voice = selectedVoice;
        
        const voicePref = document.getElementById("setting-voice").value;
        if (voicePref.includes("kid")) { utterance.pitch = 1.6; utterance.rate = 1.1; } 
        else if (voicePref.includes("senior")) { utterance.pitch = 0.8; utterance.rate = 0.85; } 
        else if (voicePref.includes("deep") || voicePref.includes("adult-male-2")) { utterance.pitch = 0.6; utterance.rate = 0.95; } 
        else if (voicePref.includes("youth")) { utterance.pitch = 1.1; utterance.rate = 1.05; } 
        else { utterance.pitch = 1.0; utterance.rate = 1.0; }

        utterance.onstart = () => { 
            miniHologram.classList.add("speaking"); 
            if(isLiveVoiceMode) document.querySelector(".live-hologram").style.animation = "pulseVoice 0.5s infinite alternate";
        };
        utterance.onend = () => { 
            miniHologram.classList.remove("speaking"); 
            if(isLiveVoiceMode) {
                document.querySelector(".live-hologram").style.animation = "none";
                try{ recognition.start(); }catch(e){}
            }
        };
        window.speechSynthesis.speak(utterance);
    }

    // Now run login check safely
    checkLoginState(); 

    function switchScreen(hideElem, showElem) {
        hideElem.style.opacity = "0";
        setTimeout(() => {
            hideElem.classList.add("hidden");
            showElem.classList.remove("hidden");
            setTimeout(() => { showElem.style.opacity = "1"; }, 50);
        }, 400);
    }

    const goToLogin = document.getElementById("go-to-login");
    const goToSignup = document.getElementById("go-to-signup");
    if(goToLogin) goToLogin.addEventListener("click", (e) => { e.preventDefault(); switchScreen(signupScreen, loginScreen); });
    if(goToSignup) goToSignup.addEventListener("click", (e) => { e.preventDefault(); switchScreen(loginScreen, signupScreen); });

    function enterChatArea(name, isGuest = false) {
        triggerHaptic("heavy");
        currentUser.name = name;
        
        if (!isGuest && rememberMeCheck && rememberMeCheck.checked) {
            localStorage.setItem("a1_indian_user", JSON.stringify(currentUser));
        }

        signupScreen.style.opacity = "0";
        loginScreen.style.opacity = "0";
        setTimeout(() => {
            signupScreen.classList.add("hidden");
            loginScreen.classList.add("hidden");
            chatScreen.classList.remove("hidden");
            welcomeUserName.innerText = isGuest ? `Namaste Guest! 🙏` : `Namaste ${name}! 🙏`;
            
            setTimeout(() => { chatScreen.style.opacity = "1"; }, 50);
            setTimeout(() => { speakText(isGuest ? "Namaste Guest! Main A1 hoon." : `Welcome ${name}. Main A1 hoon.`); }, 800);
        }, 400);
    }

    if(document.getElementById("guest-btn")) {
        document.getElementById("guest-btn").addEventListener("click", () => { unlockAudio(); enterChatArea("Guest", true); });
    }
    signupForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea(document.getElementById("reg-name").value || "Commander"); });
    loginForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea(document.getElementById("login-id").value.split('@')[0] || "Commander"); });

    // ==========================================
    // 🗂️ 4. SIDEBAR, MODALS & CHAT HISTORY
    // ==========================================
    if(menuToggle) menuToggle.addEventListener("click", () => { appSidebar.classList.toggle("open"); triggerHaptic("medium"); });
    document.querySelector(".chat-area").addEventListener("click", (e) => {
        if (window.innerWidth <= 768 && appSidebar.classList.contains("open") && !menuToggle.contains(e.target)) {
            appSidebar.classList.remove("open");
        }
    });

    function openModal(modal) { triggerHaptic("medium"); modal.classList.remove("hidden"); }
    function closeModal(modal) { triggerHaptic("light"); modal.classList.add("hidden"); }

    Object.values(modals).forEach(m => {
        if(m.btn && m.modal && m.close) {
            m.btn.addEventListener("click", () => { appSidebar.classList.remove("open"); openModal(m.modal); });
            m.close.addEventListener("click", () => closeModal(m.modal));
        }
    });

    plusBtn.addEventListener("click", () => { actionMenu.classList.toggle("hidden"); actionMenu.style.display = actionMenu.classList.contains("hidden") ? "none" : "block"; });
    document.addEventListener("click", (e) => { if (!plusBtn.contains(e.target) && !actionMenu.contains(e.target)) { actionMenu.classList.add("hidden"); actionMenu.style.display = "none"; } });

    newChatBtn.addEventListener("click", () => {
        triggerHaptic("medium");
        chatBox.innerHTML = ""; 
        chatBox.appendChild(welcomeBanner);
        welcomeBanner.style.display = "flex";
        closeToolBtn.click();
        if (window.innerWidth <= 768) appSidebar.classList.remove("open");
        speakText("Naya chat room shuru ho gaya hai. Boliye?");
    });

    // Chat History Context Menu (⋮)
    document.querySelectorAll(".chat-options-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            triggerHaptic("light");
            document.querySelectorAll(".chat-context-menu").forEach(m => m.classList.add("hidden"));
            const menu = btn.nextElementSibling;
            if(menu) menu.classList.toggle("hidden");
        });
    });

    document.addEventListener("click", () => {
        document.querySelectorAll(".chat-context-menu").forEach(m => m.classList.add("hidden"));
    });

    // AI Super Powers Selection
    aiTools.forEach(item => {
        item.addEventListener("click", () => {
            triggerHaptic("light");
            aiTools.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            currentAIMode = item.getAttribute("data-mode");

            if (currentAIMode !== "chat") {
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
        aiTools[0].classList.add("active"); 
        currentAIMode = "chat";
    });

    // ==========================================
    // ✍️ 5. SMART TEXTAREA
    // ==========================================
    userInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = (this.scrollHeight) + "px";
        if(this.value.trim() === "") this.style.height = "auto";
    });

    userInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); 
            sendMessageToAI();
        }
    });

    // ==========================================
    // 🎙️ 6. LIVE VOICE CHAT & MIC LOGIC
    // ==========================================
    const SpeechRecAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecAPI) {
        recognition = new SpeechRecAPI();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = true; 

        recognition.onstart = () => { 
            triggerHaptic("medium");
            if(isLiveVoiceMode) liveVoiceStatus.innerText = "Listening...";
            else micBtn.classList.add("active");
        };

        let finalTranscript = "";
        recognition.onresult = (event) => { 
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }
            
            if(isLiveVoiceMode) {
                liveVoiceText.innerText = finalTranscript + interimTranscript;
            } else {
                userInput.value = finalTranscript + interimTranscript;
                userInput.dispatchEvent(new Event('input')); 
            }
        };

        recognition.onend = () => {
            if (isLiveVoiceMode) {
                liveVoiceStatus.innerText = "Processing...";
                if(liveVoiceText.innerText.length > 5) {
                    processLiveVoiceQuery(liveVoiceText.innerText);
                } else {
                    try{ recognition.start(); }catch(e){} 
                }
            } else {
                micBtn.classList.remove("active");
                if (isContinuousMicOn) { try { recognition.start(); } catch(e) {} } 
            }
            finalTranscript = ""; 
        };
    }

    micBtn.addEventListener("click", () => {
        if (micBtn.classList.contains("active")) { isContinuousMicOn = false; recognition.stop(); } 
        else { isContinuousMicOn = true; try { recognition.start(); } catch(e) {} }
    });

    liveVoiceBtn.addEventListener("click", () => {
        isLiveVoiceMode = true;
        liveVoiceOverlay.classList.remove("hidden");
        liveVoiceText.innerText = "(Bolna shuru karein...)";
        try { recognition.start(); } catch(e) {}
    });

    closeLiveVoice.addEventListener("click", () => {
        isLiveVoiceMode = false;
        recognition.stop();
        window.speechSynthesis.cancel();
        liveVoiceOverlay.classList.add("hidden");
    });

    // ==========================================
    // 🧠 7. AI ENGINE & THINKING ANIMATION
    // ==========================================
    async function showThinkingSteps() {
        chatBox.appendChild(aiThinkingIndicator);
        aiThinkingIndicator.classList.remove("hidden");
        
        const steps = aiThinkingIndicator.querySelectorAll(".step");
        steps.forEach(s => s.classList.add("hidden"));
        
        steps[0].classList.remove("hidden"); triggerHaptic("light");
        await new Promise(r => setTimeout(r, 800));
        steps[0].classList.add("hidden"); steps[1].classList.remove("hidden"); triggerHaptic("light");
        await new Promise(r => setTimeout(r, 800));
    }

    function appendUserMessage(text) {
        welcomeBanner.style.display = "none"; 
        const msgDiv = document.createElement("div");
        msgDiv.className = `message user-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    function appendTypingAI(text, isError = false) {
        aiThinkingIndicator.classList.add("hidden"); 
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
                setTimeout(typeWriter, Math.floor(Math.random() * 20) + 15); 
            } else {
                if(!isError) addActionBar(msgDiv, text);
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
            <button class="action-icon" onclick="copyTextToClipboard('${safeText}')" title="Copy">📋</button>
            <button class="action-icon" onclick="speakText('${safeText}')" title="Read">🔊</button>
            <button class="action-icon">👍</button>
            <button class="action-icon">👎</button>
            <span class="sources-badge">🔗 Cache Verified</span>
        `;
        actionBar.style.opacity = "0";
        container.appendChild(actionBar);
        setTimeout(() => actionBar.style.opacity = "1", 100);
        triggerHaptic("light"); 
    }

    window.sendMessageToAI = async function() {
        const text = userInput.value.trim();
        if (!text) return;

        triggerHaptic("medium");
        appendUserMessage(text);
        
        userInput.value = "";
        userInput.style.height = "auto"; 

        const deepSearchON = document.getElementById('toggle-search').checked;
        
        showThinkingSteps(); 

        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    query: text,
                    mode: currentAIMode,
                    web_search: deepSearchON,
                    check_database_cache: true 
                })
            });

            const data = await response.json();
            if (data.status === "success") {
                let aiResponse = data.answer.replace(/Commander AI:/gi, '').trim();
                appendTypingAI(aiResponse);
                speak(aiResponse);
            } else {
                appendTypingAI("Engine Error: " + data.message, true);
            }
        } catch (error) {
            appendTypingAI("System Error: Network unreachable. Database fallback failed.", true);
        }
    };

    async function processLiveVoiceQuery(text) {
        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
             
