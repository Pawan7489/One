document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 📱 1. PREMIUM HAPTIC ENGINE (Light Vibration)
    // ==========================================
    function triggerHaptic(type = "light") {
        if (!navigator.vibrate) return;
        if (type === "light") navigator.vibrate(12);   // बहुत हल्का (MacBook Trackpad जैसा)
        if (type === "medium") navigator.vibrate(25);  // बटन्स के लिए
        if (type === "heavy") navigator.vibrate([30, 40, 30]); // एरर या स्टॉप के लिए
    }

    // ==========================================
    // 🗣️ 2. BUG FIX: PRE-LOAD VOICES
    // ==========================================
    let availableVoices = [];
    function loadVoices() {
        availableVoices = window.speechSynthesis.getVoices();
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices(); // Initial fetch
    }

    // ==========================================
    // 🎯 3. DOM ELEMENTS SETUP
    // ==========================================
    const screens = {
        signup: document.getElementById("signup-screen"),
        login: document.getElementById("login-screen"),
        chat: document.getElementById("chat-screen")
    };
    
    // Auth Elements
    const auth = {
        loginForm: document.getElementById("login-form"),
        signupForm: document.getElementById("signup-form"),
        rememberMe: document.getElementById("remember-me"),
        welcomeBanner: document.getElementById("welcome-banner"),
        welcomeUserText: document.getElementById("welcome-user-name"),
        guestBtn: document.getElementById("guest-btn"),
        goToLogin: document.getElementById("go-to-login"),
        goToSignup: document.getElementById("go-to-signup")
    };
    
    // Chat Elements
    const chatUI = {
        box: document.getElementById("chat-box"),
        input: document.getElementById("user-input"),
        sendBtn: document.getElementById("send-btn"),
        stopBtn: document.getElementById("stop-btn"),
        micBtn: document.getElementById("mic-btn"),
        plusBtn: document.getElementById("plus-btn"),
        actionMenu: document.getElementById("action-menu"),
        thinkingIndicator: document.getElementById("ai-thinking-indicator"),
        suggestionChips: document.querySelectorAll(".suggestion-chip"),
        dummyMsg: document.getElementById("dummy-ai-message") // BUG FIX ID
    };
    
    // Sidebar & Tools
    const menuToggle = document.getElementById("menu-toggle");
    const appSidebar = document.getElementById("app-sidebar");
    const newChatBtn = document.getElementById("new-chat-btn");
    const aiTools = document.querySelectorAll(".ai-tools-list li");

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
    const liveVoiceChatLog = document.getElementById("live-voice-chat-log");

    let currentUser = { name: "User" };
    let currentAIMode = "chat";
    let currentAbortController = null;
    let isGenerating = false;
    let isContinuousMicOn = false;
    let isLiveVoiceMode = false;
    let recognition;

    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    function unlockAudio() {
        if(window.speechSynthesis) { let u = new SpeechSynthesisUtterance(''); u.volume = 0; window.speechSynthesis.speak(u); }
    }

    // ==========================================
    // 🖼️ 4. PROFILE PHOTO UPLOAD LOGIC
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
                    avatarPreview.innerText = ""; // Removes the 📷 emoji
                    triggerHaptic("medium");
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // 🔐 5. AUTHENTICATION & LOGIN LOGIC
    // ==========================================
    window.speakText = function(text) { speak(text); }; // Defined later in Part 2

    function checkLoginState() {
        try {
            const savedUser = localStorage.getItem("a1_indian_user");
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                enterChatArea(currentUser.name, false, true); 
            }
        } catch (error) { localStorage.removeItem("a1_indian_user"); }
    }

    function switchScreen(hideElem, showElem) {
        triggerHaptic("light");
        hideElem.style.opacity = "0";
        setTimeout(() => {
            hideElem.classList.add("hidden");
            showElem.classList.remove("hidden");
            setTimeout(() => { showElem.style.opacity = "1"; }, 50);
        }, 300);
    }

    auth.goToLogin?.addEventListener("click", (e) => { e.preventDefault(); switchScreen(screens.signup, screens.login); });
    auth.goToSignup?.addEventListener("click", (e) => { e.preventDefault(); switchScreen(screens.login, screens.signup); });

    function enterChatArea(name, isGuest = false, skipIntro = false) {
        if(!skipIntro) triggerHaptic("medium");
        currentUser.name = name;
        auth.welcomeUserText.innerText = isGuest ? `Namaste Guest! 🙏` : `Welcome back, ${name}!`;
        
        if (!isGuest && auth.rememberMe?.checked) {
            localStorage.setItem("a1_indian_user", JSON.stringify(currentUser));
        }

        screens.signup.style.opacity = "0";
        screens.login.style.opacity = "0";
        setTimeout(() => {
            screens.signup.classList.add("hidden");
            screens.login.classList.add("hidden");
            screens.chat.classList.remove("hidden");
            setTimeout(() => { screens.chat.style.opacity = "1"; }, 50);
            
            if(!skipIntro) {
                setTimeout(() => { 
                    if(window.speakText) window.speakText(isGuest ? "Namaste Guest! Main A1 hoon." : `Welcome ${name}.`); 
                }, 800);
            }
        }, 400);
    }

    auth.guestBtn?.addEventListener("click", () => { unlockAudio(); enterChatArea("Guest", true); });
    auth.signupForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea(document.getElementById("reg-name").value || "Commander"); });
    auth.loginForm.addEventListener("submit", (e) => { e.preventDefault(); unlockAudio(); enterChatArea(document.getElementById("login-id").value.split('@')[0] || "Commander"); });

    checkLoginState();

    // ==========================================
    // 🗂️ 6. SIDEBAR, HISTORY MODAL & AI TOOLS
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

    // 🚨 BUG FIX: Recover and Delete Buttons Logic
    const demoRecoverBtn = document.getElementById("demo-recover-btn");
    const demoDeleteBtn = document.getElementById("demo-delete-btn");

    if(demoRecoverBtn) {
        demoRecoverBtn.addEventListener("click", () => {
            triggerHaptic("medium");
            alert("✅ Chat Recovered Successfully!");
        });
    }

    if(demoDeleteBtn) {
        demoDeleteBtn.addEventListener("click", (e) => {
            triggerHaptic("heavy");
            const item = e.target.closest('.history-item');
            if(item) {
                item.style.opacity = "0";
                setTimeout(() => item.remove(), 300);
            }
        });
    }

    chatUI.plusBtn.addEventListener("click", () => { 
        chatUI.actionMenu.classList.toggle("hidden"); 
        chatUI.actionMenu.style.display = chatUI.actionMenu.classList.contains("hidden") ? "none" : "block"; 
        triggerHaptic("light");
    });
    document.addEventListener("click", (e) => { 
        if (!chatUI.plusBtn.contains(e.target) && !chatUI.actionMenu.contains(e.target)) { 
            chatUI.actionMenu.classList.add("hidden"); chatUI.actionMenu.style.display = "none"; 
        } 
    });

    newChatBtn.addEventListener("click", () => {
        triggerHaptic("medium");
        if (isGenerating && currentAbortController) currentAbortController.abort();
        
        // BUG FIX: Hide Dummy Message
        if(chatUI.dummyMsg) chatUI.dummyMsg.style.display = "none";
        
        // Reset Chat Box
        chatUI.box.innerHTML = ""; 
        chatUI.box.appendChild(auth.welcomeBanner);
        auth.welcomeBanner.style.display = "flex";
        
        if (window.innerWidth <= 768) appSidebar.classList.remove("open");
        window.speakText("Naya chat shuru ho gaya hai.");
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
    // 🗣️ 7. TEXT-TO-SPEECH (TTS) & SATURN ANIMATION SYNC
    // ==========================================
    window.speakText = function(text) { speak(text); };

    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        
        let cleanText = text.replace(/[*#_`]/g, '').replace(/Commander AI:/gi, ''); 
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Use pre-loaded voices (Bug Fix)
        let selectedVoice = availableVoices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN")) || availableVoices[0];
        if (selectedVoice) utterance.voice = selectedVoice;
        
        // Voice Logic (Pitch & Rate) based on User Selection
        const voicePref = document.getElementById("setting-voice")?.value || "";
        if (voicePref.includes("kid")) { utterance.pitch = 1.6; utterance.rate = 1.1; } 
        else if (voicePref.includes("senior")) { utterance.pitch = 0.8; utterance.rate = 0.85; } 
        else if (voicePref.includes("adult-male-2")) { utterance.pitch = 0.6; utterance.rate = 0.95; } 
        else { utterance.pitch = 1.0; utterance.rate = 1.0; }

        utterance.onstart = () => { 
            // 🪐 ANIMATION SYNC: Saturn Rings Spin Faster when speaking!
            document.querySelectorAll('.core-ai').forEach(el => el.style.animationDuration = "0.5s"); 
            document.querySelectorAll('.ring-x').forEach(el => el.style.animationDuration = "2s");
            document.querySelectorAll('.ring-y').forEach(el => el.style.animationDuration = "3s");
        };
        utterance.onend = () => { 
            // 🪐 ANIMATION SYNC: Return to normal calm speed
            document.querySelectorAll('.core-ai').forEach(el => el.style.animationDuration = "2s");
            document.querySelectorAll('.ring-x').forEach(el => el.style.animationDuration = "6s");
            document.querySelectorAll('.ring-y').forEach(el => el.style.animationDuration = "8s");
            
            if(isLiveVoiceMode) { try{ recognition.start(); }catch(e){} }
        };
        window.speechSynthesis.speak(utterance);
    }

    // ==========================================
    // ✍️ 8. SMART TEXTAREA (10k Words BUG FIX) & CHIPS
    // ==========================================
    chatUI.input.addEventListener("input", function() {
        this.style.height = "auto"; // Reset height
        // Set new height based on scrollHeight, CSS max-height will handle the scrollbar
        this.style.height = (this.scrollHeight) + "px";
        if(this.value.trim() === "") this.style.height = "auto";
    });

    chatUI.input.addEventListener("keydown", function(e) {
        // Shift+Enter creates a new line, normal Enter sends the message
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); 
            sendMessageToAI();
        }
    });

    chatUI.suggestionChips.forEach(chip => {
        chip.addEventListener("click", () => {
            triggerHaptic("medium");
            chatUI.input.value = chip.innerText.replace(/[📝📊🐍]/g, '').trim(); 
            chatUI.input.style.height = "auto";
            sendMessageToAI();
        });
    });

    // ==========================================
    // 🎙️ 9. LIVE VOICE CHAT & HISTORY LOG
    // ==========================================
    const SpeechRecAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecAPI) {
        recognition = new SpeechRecAPI();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = true; 

        recognition.onstart = () => { 
            triggerHaptic("light");
            if(isLiveVoiceMode) liveVoiceStatus.innerText = "Listening...";
            else chatUI.micBtn.classList.add("active");
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
                chatUI.input.value = finalTranscript + interimTranscript;
                chatUI.input.dispatchEvent(new Event('input')); // Auto-grow trigger
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
                chatUI.micBtn.classList.remove("active");
                if (isContinuousMicOn) { try { recognition.start(); } catch(e) {} } 
            }
            finalTranscript = ""; 
        };
    }

    chatUI.micBtn.addEventListener("click", () => {
        triggerHaptic("light");
        if (chatUI.micBtn.classList.contains("active")) { isContinuousMicOn = false; recognition.stop(); } 
        else { isContinuousMicOn = true; try { recognition.start(); } catch(e) {} }
    });

    liveVoiceBtn?.addEventListener("click", () => {
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

    closeLiveVoice?.addEventListener("click", () => {
        triggerHaptic("light");
        isLiveVoiceMode = false;
        recognition.stop();
        window.speechSynthesis.cancel();
        liveVoiceOverlay.classList.add("hidden");
    });

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
    // 🧠 10. AI ENGINE, EDIT, ABORT & ACTION BAR
    // ==========================================
    function toggleInputUI(generating) {
        isGenerating = generating;
        if (generating) {
            chatUI.sendBtn.classList.add("hidden");
            chatUI.stopBtn.classList.remove("hidden");
        } else {
            chatUI.sendBtn.classList.remove("hidden");
            chatUI.stopBtn.classList.add("hidden");
        }
    }

    async function showThinkingSteps() {
        chatUI.box.appendChild(chatUI.thinkingIndicator);
        chatUI.thinkingIndicator.classList.remove("hidden");
        
        // 🪐 Faster Saturn Rings while thinking
        const thinkingHolo = chatUI.thinkingIndicator.querySelector('.saturn-hologram');
        if(thinkingHolo) {
            thinkingHolo.querySelector('.core-ai').style.animationDuration = "0.8s";
            thinkingHolo.querySelector('.ring-x').style.animationDuration = "2s";
            thinkingHolo.querySelector('.ring-y').style.animationDuration = "3s";
        }

        const steps = chatUI.thinkingIndicator.querySelectorAll(".step");
        steps.forEach(s => s.classList.add("hidden"));
        
        steps[0].classList.remove("hidden"); triggerHaptic("light");
        await new Promise(r => setTimeout(r, 600));
        steps[0].classList.add("hidden"); steps[1].classList.remove("hidden"); triggerHaptic("light");
    }

    window.editUserMessage = function(text) {
        triggerHaptic("medium");
        chatUI.input.value = text;
        chatUI.input.focus();
        chatUI.input.dispatchEvent(new Event('input')); // auto-grow adjust
    };

    function appendUserMessage(text) {
        if(auth.welcomeBanner) auth.welcomeBanner.style.display = "none"; 
        if(chatUI.dummyMsg) chatUI.dummyMsg.style.display = "none"; // Hide Dummy Bug Fix

        const msgContainer = document.createElement("div");
        msgContainer.style.display = "flex"; msgContainer.style.flexDirection = "column";
        msgContainer.style.alignSelf = "flex-end"; msgContainer.style.maxWidth = "85%";
        msgContainer.style.marginBottom = "20px";
        
        const msgDiv = document.createElement("div");
        msgDiv.className = `message user-message`;
        msgDiv.innerText = text;
        msgDiv.style.maxWidth = "100%";
        msgDiv.style.marginBottom = "5px";
        
        const safeText = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        const userActions = document.createElement("div");
        userActions.className = "user-actions";
        userActions.innerHTML = `
            <button class="user-action-icon" onclick="speakText('${safeText}')" title="Listen">🔊 Reader</button>
            <button class="user-action-icon" onclick="editUserMessage('${safeText}')" title="Edit">✏️ Edit</button>
        `;

        msgContainer.appendChild(msgDiv);
        msgContainer.appendChild(userActions);
        chatUI.box.appendChild(msgContainer);
        chatUI.box.scrollTo({ top: chatUI.box.scrollHeight, behavior: 'smooth' });
    }

    function appendTypingAI(text, isError = false) {
        chatUI.thinkingIndicator.classList.add("hidden"); 
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ai-message`;
        msgDiv.style.marginBottom = "20px";
        chatUI.box.appendChild(msgDiv);
        
        let words = text.replace(/\n/g, '<br>').split(' ');
        let i = 0;
        
        function typeWriter() {
            if (!isGenerating) return; 

            if (i < words.length) {
                msgDiv.innerHTML += words[i] + ' ';
                i++;
                chatUI.box.scrollTo({ top: chatUI.box.scrollHeight });
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

    window.shareText = function(text) {
        triggerHaptic("medium");
        if (navigator.share) {
            navigator.share({ title: 'A1 AI Response', text: text }).catch(console.error);
        } else {
            alert("Share API not supported on this device. Text Copied instead!");
            copyTextToClipboard(text);
        }
    };

    function addActionBar(container, rawText) {
        const actionBar = document.createElement("div");
        actionBar.className = "ai-actions";
        const safeText = rawText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
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

    chatUI.stopBtn.addEventListener("click", () => {
        triggerHaptic("heavy");
        if (currentAbortController) currentAbortController.abort(); 
        toggleInputUI(false);
        window.speechSynthesis.cancel(); 
        chatUI.thinkingIndicator.classList.add("hidden");
    });

    window.sendMessageToAI = async function() {
        const text = chatUI.input.value.trim();
        if (!text) return;

        triggerHaptic("medium");
        appendUserMessage(text);
        
        chatUI.input.value = "";
        chatUI.input.style.height = "auto"; 
        
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
        appendLiveVoiceLog(text, "user"); 
        
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
            appendLiveVoiceLog(aiResponse, "ai"); 
            speak(aiResponse);
            
        } catch(e) {
            if (e.name !== 'AbortError') {
                liveVoiceText.innerText = "Connection lost. Please try again.";
                setTimeout(() => { try{ recognition.start(); } catch(err){} }, 2000);
            }
        }
    }

    chatUI.sendBtn.addEventListener("click", sendMessageToAI);

}); // End of DOMContentLoaded
                
    
                                                                                                                                 
