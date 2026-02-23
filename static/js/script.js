/* ====================================================
   PROJECT A1 - MASTER JAVASCRIPT CONTROLLER
   Architecture: Single-File Logic / Event-Driven
   Blueprint Status: 100% Locked
==================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. GLOBAL STATE & SELECTORS ---
    let isGenerating = false;
    let abortController = null; // For Stop Generation
    const msgContainer = document.getElementById('msg-container');
    const userPrompt = document.getElementById('user-prompt');
    const sendBtn = document.getElementById('send-trigger');
    const stopBtn = document.getElementById('stop-trigger');
    const thinkingBox = document.getElementById('thinking-box');

    // --- 2. 📱 HAPTIC ENGINE (iPhone/Samsung Feel) ---
    const triggerHaptic = (type = "light") => {
        const patterns = { light: 30, medium: 60, success: [40, 30, 40], error: [100, 50, 100] };
        if (navigator.vibrate) navigator.vibrate(patterns[type] || 30);
    };

    // --- 3. 🛡️ SCREEN & MODAL CONTROLLER ---
    window.showScreen = (id) => {
        document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active-screen'));
        const target = document.getElementById(id);
        if (target) {
            target.classList.add('active-screen');
            triggerHaptic("medium");
        }
    };

    window.openModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
            triggerHaptic("light");
        }
    };

    window.closeModals = () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    };

    // --- 4. ✍️ SMART TEXTAREA (Gemini Style Auto-Grow) ---
    userPrompt.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight > 180 ? 180 : this.scrollHeight) + 'px';
        if (this.scrollHeight > 180) this.style.overflowY = 'auto';
        else this.style.overflowY = 'hidden';
    });

    // --- 5. 💾 PERSISTENT LOGIN (Remember Me) ---
    const checkAuth = () => {
        const session = localStorage.getItem("a1_session");
        if (session) {
            const user = JSON.parse(session);
            document.getElementById('welcome-text').innerText = `Welcome back, ${user.name}!`;
            showScreen('chat-screen');
        } else {
            showScreen('signup-screen');
        }
    };

    // --- 6. 🎙️ VOICE LOGIC (26+ Models - Pitch/Rate Mapping) ---
    const speakText = (text) => {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        const ageLogic = document.getElementById('age-logic').value;

        // Logic based on Blueprint
        if (ageLogic.includes("Child")) { utterance.pitch = 1.6; utterance.rate = 1.1; }
        else if (ageLogic.includes("Senior")) { utterance.pitch = 0.8; utterance.rate = 0.85; }
        else { utterance.pitch = 1.0; utterance.rate = 1.0; }

        synth.speak(utterance);
    };

    // --- 7. 💬 CHAT ENGINE (Streaming & Stop Logic) ---
    const appendMessage = (role, text) => {
        const div = document.createElement('div');
        div.className = `bubble ${role}-bubble`;
        div.innerHTML = text;
        msgContainer.appendChild(div);
        msgContainer.scrollTop = msgContainer.scrollHeight;
        document.getElementById('welcome-banner')?.classList.add('hidden');
        return div;
    };

    async function handleAISending() {
        const query = userPrompt.value.trim();
        if (!query || isGenerating) return;

        isGenerating = true;
        abortController = new AbortController();
        triggerHaptic("light");

        // UI Update
        appendMessage('user', `${query}<div style="font-size:10px; opacity:0.5; margin-top:5px;">🔊 Listen | ✏️ Edit</div>`);
        userPrompt.value = '';
        userPrompt.style.height = 'auto';
        sendBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        thinkingBox.classList.remove('hidden');

        try {
            // Fetch with Cache Control & Abort Signal
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: query, 
                    check_database_cache: true,
                    user_context: { age_logic: document.getElementById('age-logic').value }
                }),
                signal: abortController.signal
            });

            const data = await response.json();
            thinkingBox.classList.add('hidden');

            if (data.status === "success") {
                const aiBubble = appendMessage('ai', '');
                await typeWriter(data.answer, aiBubble);
                aiBubble.innerHTML += `<div class="action-bar">👍 👎 📋 🔊 <span class="source-tag">A1 Core</span></div>`;
            }
        } catch (err) {
            console.log("Generation Stopped by User");
        } finally {
            isGenerating = false;
            sendBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            thinkingBox.classList.add('hidden');
        }
    }

    async function typeWriter(text, element) {
        const words = text.split(' ');
        for (let word of words) {
            if (!isGenerating) break;
            element.innerHTML += word + ' ';
            msgContainer.scrollTop = msgContainer.scrollHeight;
            await new Promise(r => setTimeout(r, 50)); // Word-by-word streaming
        }
    }

    // --- 8. 🔘 EVENT LISTENERS ---
    sendBtn.onclick = handleSendMessage;
    stopBtn.onclick = () => {
        if (abortController) abortController.abort();
        isGenerating = false;
        triggerHaptic("medium");
    };

    // Auth Actions
    document.getElementById('signup-trigger').onclick = () => {
        const name = document.getElementById('reg-name').value || "Commander";
        localStorage.setItem("a1_session", JSON.stringify({ name: name }));
        triggerHaptic("success");
        showScreen('chat-screen');
    };

    document.getElementById('guest-trigger').onclick = () => showScreen('chat-screen');

    // Sidebar Toggles
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            triggerHaptic("light");
        };
    });

    // Start App
    checkAuth();
});
