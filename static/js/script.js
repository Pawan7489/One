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
    
    const appSidebar = document.getElementById("app-sidebar");
    const newChatBtn = document.getElementById("new-chat-btn");
    const aiThinkingIndicator = document.getElementById("ai-thinking-indicator");
    
    // Live Voice
    const liveVoiceBtn = document.getElementById("live-voice-mode-btn");
    const liveVoiceOverlay = document.getElementById("live-voice-overlay");
    const liveVoiceText = document.getElementById("live-voice-text");
    const liveVoiceStatus = document.getElementById("live-voice-status");
    const closeLiveVoice = document.getElementById("close-live-voice");

    let currentUser = { name: "User", persona: "A1 Core" };
    let isContinuousMicOn = false;
    let isLiveVoiceMode = false;
    let recognition;

    const ADMIN_PANEL_URL = "https://a1-zc43.onrender.com/api/ai/ask";

    // ==========================================
    // 💾 3. PERSISTENT LOGIN (Remember Me)
    // ==========================================
    function checkLoginState() {
        const savedUser = localStorage.getItem("a1_indian_user");
        if (savedUser) {
            currentUser = JSON.JSON.parse(savedUser);
            // Bypass Auth Screens directly to Chat
            signupScreen.classList.add("hidden");
            loginScreen.classList.add("hidden");
            chatScreen.classList.remove("hidden");
            welcomeUserName.innerText = `Welcome back, ${currentUser.name}!`;
            document.getElementById("persona-badge").innerText = `Mode: ${currentUser.persona}`;
            
            // Speak Welcome
            setTimeout(() => {
                speakText(`Welcome back ${currentUser.name}, Main aapki kya madad kar sakta hoon?`);
            }, 1000);
        }
    }
    checkLoginState(); // Run on page load

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
        document.getElementById("guest-btn").addEventListener("click", () => enterChatArea("Guest", true));
    }
    signupForm.addEventListener("submit", (e) => { e.preventDefault(); enterChatArea(document.getElementById("reg-name").value || "Commander"); });
    loginForm.addEventListener("submit", (e) => { e.preventDefault(); enterChatArea(document.getElementById("login-id").value.split('@')[0] || "Commander"); });

    // ==========================================
    // 🗂️ 4. CHAT HISTORY (Context Menu & New Chat)
    // ==========================================
    newChatBtn.addEventListener("click", () => {
        triggerHaptic("medium");
        // Clear chat area, show welcome banner again
        chatBox.innerHTML = ""; 
        chatBox.appendChild(welcomeBanner);
        welcomeBanner.style.display = "flex";
        if (window.innerWidth <= 768) appSidebar.classList.remove("open");
    });

    // Handle Context Menu (⋮) on Chat History
    document.querySelectorAll(".chat-options-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            triggerHaptic("light");
            // Hide all other menus first
            document.querySelectorAll(".chat-context-menu").forEach(m => m.classList.add("hidden"));
            // Toggle current menu
            const menu = btn.nextElementSibling;
            if(menu) menu.classList.toggle("hidden");
        });
    });

    // Close context menu when clicked outside
    document.addEventListener("click", () => {
        document.querySelectorAll(".chat-context-menu").forEach(m => m.classList.add("hidden"));
    });

    // ==========================================
    // ✍️ 5. SMART TEXTAREA (1 to 10 lines)
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
    // 🗣️ 6. 26+ VOICE MODELS LOGIC (TTS)
    // ==========================================
    window.speakText = function(text) { speak(text); triggerHaptic("light"); };

    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        let cleanText = text.replace(/[*#_`]/g, '').replace(/Commander AI:/gi, ''); 
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        
        // Find best Indian voice
        let selectedVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN")) || voices[0];
        utterance.voice = selectedVoice;
        
        // 🚨 GET SELECTED VOICE PREFERENCE FROM SETTINGS
        const voicePref = document.getElementById("setting-voice").value;
        
        // Apply Pitch and Rate modifiers based on Persona
        if (voicePref.includes("kid")) {
            utterance.pitch = 1.6; // Patli awaaz
            utterance.rate = 1.1;  // Tez bolna
        } else if (voicePref.includes("senior")) {
            utterance.pitch = 0.8; // Bhari awaaz
            utterance.rate = 0.85; // Aaram se bolna
        } else if (voicePref.includes("deep") || voicePref.includes("adult-male-2")) {
            utterance.pitch = 0.6; // Ekdam Bhari (Mature)
            utterance.rate = 0.95;
        } else if (voicePref.includes("youth")) {
            utterance.pitch = 1.1; 
            utterance.rate = 1.05; // Energetic
        } else {
            // Standard Adult
            utterance.pitch = 1.0;
            utterance.rate = 1.0;
        }

        utterance.onstart = () => { 
            document.getElementById("mini-hologram").classList.add("speaking"); 
            if(isLiveVoiceMode) document.querySelector(".live-hologram").style.animation = "pulseVoice 0.5s infinite alternate";
        };
        utterance.onend = () => { 
            document.getElementById("mini-hologram").classList.remove("speaking"); 
            if(isLiveVoiceMode) {
                document.querySelector(".live-hologram").style.animation = "none";
                // Restart listening after speaking
                try{ recognition.start(); }catch(e){}
            }
        };
        window.speechSynthesis.speak(utterance);
    }

    // ==========================================
    // 🎙️ 7. LIVE VOICE CHAT & MIC LOGIC
    // ==========================================
    const SpeechRecAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecAPI) {
        recognition = new SpeechRecAPI();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = true; // For live typing effect

        recognition.onstart = () => { 
            triggerHaptic("medium");
            if(isLiveVoiceMode) liveVoiceStatus.innerText = "Listening...";
            else micBtn.classList.add("active");
        };

        let finalTranscript = "";
        recognition.onresult = (event) => { 
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            if(isLiveVoiceMode) {
                liveVoiceText.innerText = finalTranscript + interimTranscript;
            } else {
                userInput.value = finalTranscript + interimTranscript;
                userInput.dispatchEvent(new Event('input')); // Auto-grow trigger
            }
        };

        recognition.onend = () => {
            if (isLiveVoiceMode) {
                liveVoiceStatus.innerText = "Processing...";
                if(liveVoiceText.innerText.length > 5) {
                    // Auto-send in live voice mode
                    processLiveVoiceQuery(liveVoiceText.innerText);
                } else {
                    try{ recognition.start(); }catch(e){} // Keep listening if nothing said
                }
            } else {
                micBtn.classList.remove("active");
                if (isContinuousMicOn) { try { recognition.start(); } catch(e) {} } 
            }
            finalTranscript = ""; // Reset
        };
    }

    // Normal Textbox Mic Button
    micBtn.addEventListener("click", () => {
        if (micBtn.classList.contains("active")) { isContinuousMicOn = false; recognition.stop(); } 
        else { isContinuousMicOn = true; try { recognition.start(); } catch(e) {} }
    });

    // Live Voice Mode Overlays
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
    // 🧠 8. AI ENGINE & THINKING ANIMATION
    // ==========================================
    async function showThinkingSteps() {
        chatBox.appendChild(aiThinkingIndicator);
        aiThinkingIndicator.classList.remove("hidden");
        
        const steps = aiThinkingIndicator.querySelectorAll(".step");
        steps.forEach(s => s.classList.add("hidden"));
        
        // Step 1: DB Check
        steps[0].classList.remove("hidden"); triggerHaptic("light");
        await new Promise(r => setTimeout(r, 800));
        
        // Step 2: Logic
        steps[0].classList.add("hidden"); steps[1].classList.remove("hidden"); triggerHaptic("light");
        await new Promise(r => setTimeout(r, 800));

        // Wait till API actually replies, then we hide it completely in the main function.
    }

    function appendUserMessage(text) {
        welcomeBanner.style.display = "none"; // Hide welcome banner
        const msgDiv = document.createElement("div");
        msgDiv.className = `message user-message`;
        msgDiv.innerText = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    }

    function appendTypingAI(text, isError = false) {
        aiThinkingIndicator.classList.add("hidden"); // Hide thinking box
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

    // MAIN SEND FUNCTION
    window.sendMessageToAI = async function() {
        const text = userInput.value.trim();
        if (!text) return;

        triggerHaptic("medium");
        appendUserMessage(text);
        
        userInput.value = "";
        userInput.style.height = "auto"; 

        const deepSearchON = document.getElementById('toggle-search').checked;
        const currentMode = document.querySelector(".ai-tools-list .active").getAttribute("data-mode");

        showThinkingSteps(); // Start UI Animation

        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    query: text,
                    mode: currentMode,
                    web_search: deepSearchON,
                    check_database_cache: true // 🚨 Instructing backend to check DB first
                })
            });

            const data = await response.json();
            if (data.status === "success") {
                appendTypingAI(data.answer);
                speak(data.answer);
            } else {
                appendTypingAI("Engine Error: " + data.message, true);
            }
        } catch (error) {
            appendTypingAI("System Error: Network unreachable. Database fallback failed.", true);
        }
    };

    // Live Voice Chat Processor
    async function processLiveVoiceQuery(text) {
        try {
            const response = await fetch(ADMIN_PANEL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text, check_database_cache: true })
            });
            const data = await response.json();
            liveVoiceText.innerText = data.answer; // Show answer on live overlay
            speak(data.answer); // Speak it, which will restart mic on end
        } catch(e) {
            liveVoiceText.innerText = "Connection lost. Please try again.";
            setTimeout(() => { try{ recognition.start(); }catch(e){} }, 2000);
        }
    }

    sendBtn.addEventListener("click", sendMessageToAI);
});
                          
