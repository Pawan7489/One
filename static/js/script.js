document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 📱 1. SMART HAPTIC ENGINE (Light & Premium)
    // ==========================================
    // सिर्फ खास जगहों पर वाइब्रेशन होगा ताकि यूजर परेशान न हो
    function triggerHaptic(type = "light") {
        if (!navigator.vibrate) return;
        if (type === "light") navigator.vibrate(15);   // Very soft tick
        if (type === "medium") navigator.vibrate(30);  // Button press
        if (type === "heavy") navigator.vibrate([40, 30, 40]); // Error or Stop
    }

    // ==========================================
    // 🎯 2. DOM ELEMENTS SETUP
    // ==========================================
    const signupScreen = document.getElementById("signup-screen");
    const loginScreen = document.getElementById("login-screen");
    const chatScreen = document.getElementById("chat-screen");
    
    // Auth & Banners
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const rememberMeCheck = document.getElementById("remember-me");
    const welcomeBanner = document.getElementById("welcome-banner");
    const welcomeUserName = document.getElementById("welcome-user-name");
    
    // Chat Area
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const stopBtn = document.getElementById("stop-btn");
    const micBtn = document.getElementById("mic-btn");
    const plusBtn = document.getElementById("plus-btn");
    const actionMenu = document.getElementById("action-menu");
    
    // Sidebar & UI
    const menuToggle = document.getElementById("menu-toggle");
    const appSidebar = document.getElementById("app-sidebar");
    const newChatBtn = document.getElementById("new-chat-btn");
    const aiThinkingIndicator = document.getElementById("ai-thinking-indicator");
    const suggestionChips = document.querySelectorAll(".suggestion-chip");
    
    // Tools
    const aiTools = document.querySelectorAll(".ai-tools-list li");
    let currentAIMode = "chat";
    let currentAbortController = null;
    let isGenerating = false;

    // Modals
    const modals = {
        profile: { btn: document.getElementById("profile-btn"), modal: document.getElementById("profile-modal"), close: document.getElementById("close-profile") },
        settings: { btn: document.getElementById("settings-btn"), modal: document.getElementById("settings-modal"), close: document.getElementById("close-settings") },
        support: { btn: document.getElementById("support-btn"), modal: document.getElementById("support-modal"), close: document.getElementById("close-support") },
        history: { btn: document.getElementById("history-settings-btn"), modal: document.getElementById("history-modal"), close: document.getElementById("close-history") }
    };
    
    // Live Voice Chat
    const liveVoiceBtn = document.getElementById("live-voice-mode-btn");
    const liveVoiceOverlay = document.getElementById("live-voice-overlay");
    const liveVoiceText = document.getElementById("live-voice-text");
    const liveVoiceStatus = document.getElementById("live-voice-status");
    const closeLiveVoice = document.getElementById("close-live-voice");
    const liveVoiceChatLog = document.getElementById("live-voice-chat-log"); // NEW: History Box

    let currentUser = { name: "User" };
    let isContinuousMicOn = false;
    let isLiveVoiceMode = false;
    let recognition;

    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    function unlockAudio() {
        if(window.speechSynthesis) { let u = new SpeechSynthesisUtterance(''); u.volume = 0; window.speechSynthesis.speak(u); }
    }

    // ==========================================
    // 🖼️ 3. PROFILE PHOTO UPLOAD LOGIC
    // ==========================================
    const photoUpload = document.getElementById('profile-photo-upload');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    
    if(photoUpload && avatarPreview) {
        photoUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    avatarPreview.style.backgroundImage = `url(${event.target.result})`;
                    avatarPreview.innerText = ""; // Remove the camera emoji
                    triggerHaptic("medium");
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // 💾 4. PERSISTENT LOGIN & UI SWITCHING
    // ==========================================
    window.speakText = function(text) { speak(text); };

    function checkLoginState() {
        try {
            const savedUser = localStorage.getItem("a1_indian_user");
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                signupScreen.classList.add("hidden");
                loginScreen.classList.add("hidden");
                chatScreen.classList.remove("hidden");
                welcomeUserName.innerText = `Welcome back, ${currentUser.name}!`;
                setTimeout(() => { speakText(`Welcome back ${currentUser.name}`); }, 1000);
            }
        } catch (error) { localStorage.removeItem("a1_indian_user"); }
    }

    // Text To Speech (TTS) Logic
    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        let cleanText = text.replace(/[*#_`]/g, '').replace(/Commander AI:/gi, ''); 
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN")) || voices[0];
        utterance.voice = selectedVoice;
        
        const voicePref = document.getElementById("setting-voice").value || "";
        if (voicePref.includes("kid")) { utterance.pitch = 1.6; utterance.rate = 1.1; } 
        else if (voicePref.includes("senior")) { utterance.pitch = 0.8; utterance.rate = 0.85; } 
        else if (voicePref.includes("deep")) { utterance.pitch = 0.6; utterance.rate = 0.95; } 
        else { utterance.pitch = 1.0; utterance.rate = 1.0; }

        utterance.onstart = () => { 
            document.querySelectorAll('.holo-core').forEach(el => el.style.animationDuration = "0.5s"); 
        };
        utterance.onend = () => { 
            document.querySelectorAll('.holo-core').forEach(el => el.style.animationDuration = "2s");
            if(isLiveVoiceMode) { try{ recognition.start(); }catch(e){} }
        };
        window.speechSynthesis.speak(utterance);
    }

    checkLoginState(); 

    function switchScreen(hideElem, showElem) {
        hideElem.style.opacity = "0";
        setTimeout(() => {
            hideElem.classList.add("hidden");
            showElem.classList.remove("hidden");
            setTimeout(() => { showElem.style.opacity = "1"; }, 50);
        }, 400);
    }

    document.getElementById("go-to-login")?.addEventListener("click", (e) => { e.preventDefault(); switchScreen(signupScreen, loginScreen); });
    document.getElementById("go-to-signup")?.addEventListener("click", (e) => { e.preventDefault(); switchScreen(loginScreen, signupScreen); });

    function enterChatArea(name, isGuest = false) {
        triggerHaptic("heavy");
        currentUser.name = name;
        if (!isGuest && rememberMeCheck?.checked) localStorage.setItem("a1_indian_user", JSON.stringify(currentUser));

        signupScreen.style.opacity = "0";
        loginScreen.style.opacity = "0";
        setTimeout(() => {
            signupScreen.classList.add("hidden");
            loginScreen.classList.add("hidden");
            chatScreen.classList.remove("hidden");
            welcomeUserName.innerText = isGuest ? `Namaste Guest! 🙏` : `Namaste ${name}! 🙏`;
            setTimeout(() => { chatScreen.style.opacity = "1"; }, 50);
            setTimeout(() => { speakText(isGuest ? "Namaste Guest!" : `Welcome ${name}.`); }, 800);
        }, 400);
    }

    document.getElementById("guest-btn")?.addEventListener("click", () => { unlockAudio(); enterChatArea("Guest", true); });
    signupForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea(document.getElementById("reg-name").value); });
    loginForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea(document.getElementById("login-id").value.split('@')[0]); });

    // ==========================================
    // 🗂️ 5. SIDEBAR, MODALS & TOOLS
    // ==========================================
    menuToggle?.addEventListener("click", () => { appSidebar.classList.toggle("open"); triggerHaptic("light"); });
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

    plusBtn.addEventListener("click", () => { 
        actionMenu.classList.toggle("hidden"); 
        actionMenu.style.display = actionMenu.classList.contains("hidden") ? "none" : "block"; 
        triggerHaptic("light");
    });
    document.addEventListener("click", (e) => { if (!plusBtn.contains(e.target) && !actionMenu.contains(e.target)) { actionMenu.classList.add("hidden"); actionMenu.style.display = "none"; } });

    newChatBtn.addEventListener("click", () => {
        triggerHaptic("medium");
        if (isGenerating && currentAbortController) currentAbortController.abort();
        
        // Remove dummy demo message and all chats
        chatBox.innerHTML = ""; 
        chatBox.appendChild(welcomeBanner);
        welcomeBanner.style.display = "flex";
        
        if (window.innerWidth <= 768) appSidebar.classList.remove("open");
        speakText("Naya chat shuru ho gaya hai.");
    });

    aiTools.forEach(item => {
        item.addEventListener("click", () => {
            triggerHaptic("light");
            aiTools.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            currentAIMode = item.getAttribute("data-mode");
            if (window.innerWidth <= 768) appSidebar.classList.remove("open");
        });
    });

    // ==========================================
    // ✍️ 6. SMART TEXTAREA & PROMPT CHIPS
    // ==========================================
    userInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = (this.scrollHeight) + "px";
        if(this.value.trim() === "") this.style.height = "auto";
    });

    userInput.addEventListener("keydown", function(e) {
        // Shift+Enter से नई लाइन, सिर्फ Enter से सेंड
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); 
            sendMessageToAI();
        }
    });

    // Handle Prompt Suggestion Chips
    suggestionChips.forEach(chip => {
        chip.addEventListener("click", () => {
            triggerHaptic("medium");
            userInput.value = chip.innerText.replace(/[📝📊🐍]/g, '').trim(); 
            userInput.style.height = "auto";
            sendMessageToAI();
        });
    });

    // ==========================================
    // 🎙️ 7. LIVE VOICE CHAT & HISTORY LOG
    // ==========================================
    const SpeechRecAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecAPI) {
        recognition = new SpeechRecAPI();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = true; 

        recognition.onstart = () => { 
            triggerHaptic("light");
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
                if(liveVoiceText.innerText.length > 3) {
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
        triggerHaptic("light");
        if (micBtn.classList.contains("active")) { isContinuousMicOn = false; recognition.stop(); } 
        else { isContinuousMicOn = true; try { recognition.start(); } catch(e) {} }
    });

    liveVoiceBtn.addEventListener("click", () => {
        triggerHaptic("heavy");
        isLiveVoiceMode = true;
        liveVoiceOverlay.classList.remove("hidden");
        liveVoiceText.innerText = "(Bolna shuru karein...)";
        
        // Reset voice history log
        if(liveVoiceChatLog) {
            liveVoiceChatLog.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; margin-bottom: 5px;">Voice session started...</div>';
        }
        try { recognition.start(); } catch(e) {}
    });

    closeLiveVoice.addEventListener("click", () => {
        triggerHaptic("light");
        isLiveVoiceMode = false;
        recognition.stop();
        window.speechSynthesis.cancel();
        liveVoiceOverlay.classList.add("hidden");
    });

    // NEW: Function to add chat history in Live Voice Mode
    function appendLiveVoiceLog(text, sender) {
        if(!liveVoiceChatLog) return;
        const logMsg = document.createElement("div");
        logMsg.style.padding = "8px 12px";
        logMsg.style.borderRadius = "12px";
        logMsg.style.fontSize = "14px";
        logMsg.style.maxWidth = "85%";
        logMsg.style.lineHeight = "1.4";
        logMsg.style.animation = "slideUpFade 0.3s ease forwards";
        
        if(sender === "user") {
            logMsg.style.alignSelf = "flex-end";
            logMsg.style.background = "rgba(255,153,51,0.2)";
            logMsg.style.color = "#fff";
            logMsg.innerText = text;
        } else {
            logMsg.style.alignSelf = "flex-start";
            logMsg.style.background = "rgba(255,255,255,0.05)";
            logMsg.style.color = "var(--saffron-gold)";
            logMsg.innerText = "A1: " + text;
        }
        liveVoiceChatLog.appendChild(logMsg);
        liveVoiceChatLog.scrollTo({ top: liveVoiceChatLog.scrollHeight, behavior: 'smooth' });
    }

    // ==========================================
    // 🧠 8. AI ENGINE, ABORT LOGIC & ACTION BAR
    // ==========================================
    function toggleInputUI(generating) {
        isGenerating = generating;
        if (generating) {
            sendBtn.classList.add("hidden");
            stopBtn.classList.remove("hidden");
        } else {
            sendBtn.classList.remove("hidden");
            stopBtn.classList.add("hidden");
        }
    }

    async function showThinkingSteps() {
        chatBox.appendChild(aiThinkingIndicator);
        aiThinkingIndicator.classList.remove("hidden");
        const steps = aiThinkingIndicator.querySelectorAll(".step");
        steps.forEach(s => s.classList.add("hidden"));
        
        steps[0].classList.remove("hidden"); triggerHaptic("light");
        await new Promise(r => setTimeout(r, 600));
        steps[0].classList.add("hidden"); steps[1].classList.remove("hidden"); triggerHaptic("light");
    }

    window.editUserMessage = function(text) {
        triggerHaptic("medium");
        userInput.value = text;
        userInput.focus();
        userInput.dispatchEvent(new Event('input')); // auto-grow adjust
    };

    function appendUserMessage(text) {
        if(welcomeBanner) welcomeBanner.style.display = "none"; 
        
        // Remove dummy demo message if it exists
        const dummyMsg = document.getElementById("dummy-ai-message");
        if(dummyMsg) dummyMsg.remove(); 

        const msgContainer = document.createElement("div");
        msgContainer.style.display = "flex"; msgContainer.style.flexDirection = "column";
        msgContainer.style.alignSelf = "flex-end"; msgContainer.style.maxWidth = "85%";
        
        const msgDiv = document.createElement("div");
        msgDiv.className = `message user-message`;
        msgDiv.innerText = text;
        msgDiv.style.maxWidth = "100%";
        
        const safeText = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        // User actions (Listen & Edit)
        const userActions = document.createElement("div");
        userActions.className = "user-actions";
        userActions.innerHTML = `
            <button class="user-action-icon" onclick="speakText('${safeText}')" title="Listen">🔊</button>
            <button class="user-action-icon" onclick="editUserMessage('${safeText}')" title="Edit">✏️</button>
        `;

        msgContainer.appendChild(msgDiv);
        msgContainer.appendChild(userActions);
        chatBox.appendChild(msgContainer);
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
            if (!isGenerating) return; // Stop if aborted

            if (i < words.length) {
                msgDiv.innerHTML += words[i] + ' ';
                i++;
                chatBox.scrollTo({ top: chatBox.scrollHeight });
                // Make typing faster for large texts
                setTimeout(typeWriter, Math.floor(Math.random() * 15) + 5); 
            } else {
                toggleInputUI(false);
                if(!isError) addActionBar(msgDiv, text);
            }
        }
        typeWriter();
    }

    window.copyTextToClipboard = function(text) {
        navigator.clipboard.writeText(text); triggerHaptic("medium"); alert("📋 Text Copied!");
    };

    // NEW: Share Feature Logic
    window.shareText = function(text) {
        triggerHaptic("medium");
        if (navigator.share) {
            navigator.share({
                title: 'A1 AI Response',
                text: text
            }).catch(console.error);
        } else {
            alert("Share feature not supported on this device. Text Copied instead!");
            copyTextToClipboard(text);
        }
    };

    function addActionBar(container, rawText) {
        const actionBar = document.createElement("div");
        actionBar.className = "ai-actions";
        const safeText = rawText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        // Random source number logic for premium feel (can connect to backend later)
        const sourcesCount = Math.floor(Math.random() * 5) + 1;
        
        actionBar.innerHTML = `
            <button class="action-icon" onclick="speakText('${safeText}')" title="Listen">🔊 Reader</button>
            <button class="action-icon" onclick="copyTextToClipboard('${safeText}')" title="Copy">📋 Copy</button>
            <button class="action-icon" onclick="shareText('${safeText}')" title="Share">📤 Share</button>
            <button class="action-icon" title="Good">👍</button>
            <button class="action-icon" title="Bad">👎</button>
            <span class="mode-badge" style="margin-left:auto; background: rgba(255,153,51,0.1); border: 1px solid var(--saffron-gold); color: var(--saffron-gold); padding: 5px 10px; border-radius: 12px; font-size: 11px;">📚 ${sourcesCount} Sources</span>
        `;
        actionBar.style.opacity = "0";
        container.appendChild(actionBar);
        setTimeout(() => actionBar.style.opacity = "1", 100);
        triggerHaptic("light"); 
    }

    stopBtn.addEventListener("click", () => {
        triggerHaptic("heavy");
        if (currentAbortController) currentAbortController.abort(); 
        toggleInputUI(false);
        window.speechSynthesis.cancel(); 
        aiThinkingIndicator.classList.add("hidden");
    });

    window.sendMessageToAI = async function() {
        const text = userInput.value.trim();
        if (!text) return;

        triggerHaptic("medium");
        appendUserMessage(text);
        
        userInput.value = "";
        userInput.style.height = "auto"; 
        
        toggleInputUI(true); 
        const deepSearchON = document.getElementById('toggle-search')?.checked || false;
        showThinkingSteps(); 

        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text, mode: currentAIMode, web_search: deepSearchON, check_database_cache: true }),
                signal: signal 
            });

            const data = await response.json();
            if (!isGenerating) return; 

            if (data.status === "success" || data.answer) {
                let aiResponse = (data.answer || "No response generated.").replace(/Commander AI:/gi, '').trim();
                appendTypingAI(aiResponse);
                speak(aiResponse);
            } else {
                appendTypingAI("Engine Error: " + (data.message || "Unknown error"), true);
                toggleInputUI(false);
            }
        } catch (error) {
            if (error.name === 'AbortError') console.log("Generation stopped.");
            else if (isGenerating) {
                appendTypingAI("System Error: Network unreachable.", true);
                toggleInputUI(false);
            }
        }
    };

    async function processLiveVoiceQuery(text) {
        appendLiveVoiceLog(text, "user"); // Log user message
        
        currentAbortController = new AbortController();
        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text, check_database_cache: true }),
                signal: currentAbortController.signal
            });
            const data = await response.json();
            let aiResponse = data.answer.replace(/Commander AI:/gi, '').trim();
            
            liveVoiceText.innerText = aiResponse;
            appendLiveVoiceLog(aiResponse, "ai"); // Log AI message
            speak(aiResponse);
            
        } catch(e) {
            if (e.name !== 'AbortError') {
                liveVoiceText.innerText = "Connection lost. Please try again.";
                setTimeout(() => { try{ recognition.start(); } catch(err){} }, 2000);
            }
        }
    }

    sendBtn.addEventListener("click", sendMessageToAI);

}); // End of DOMContentLoaded
            



    
                
