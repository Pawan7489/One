/* ====================================================
   PROJECT A1 - THE INDIAN SUPER-AI (MASTER JS V13.0)
   100% Integrated, Single-File Logic & Crash-Free
==================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. 📂 GLOBAL ELEMENTS & STATE ---
    const chatMessages = document.getElementById('chat-messages');
    const userPrompt = document.getElementById('user-prompt');
    const sendBtn = document.getElementById('send-btn');
    const stopBtn = document.getElementById('stop-btn');
    const thinkingBox = document.getElementById('ai-thinking-indicator');
    
    let isGenerating = false;
    let abortController = null;

    // --- 2. 🛡️ SCREEN CONTROLLER (Signup/Login/Chat) ---
    function showScreen(screenId) {
        // Sabhi screens ko hide karo
        document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active-screen'));
        
        // Target screen ko active karo
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active-screen');
            // Haptic & Animation triggers
            if(window.A1_Haptic) window.A1_Haptic("medium");
            if(window.A1_Animate) target.classList.add('animate-slide-up');
        }
    }

    // --- 3. 💾 AUTO-LOGIN & AUTH LOGIC ---
    function checkAuth() {
        const user = localStorage.getItem("a1_indian_user");
        if (user) {
            const data = JSON.parse(user);
            document.getElementById('welcome-user-name').innerText = `Welcome back, ${data.name}!`;
            showScreen('chat-screen');
        } else {
            showScreen('signup-screen');
        }
    }

    // Signup Action
    document.getElementById('signup-submit-btn')?.addEventListener('click', () => {
        const name = document.getElementById('reg-name').value;
        if(!name) return alert("Please enter your name!");
        
        localStorage.setItem("a1_indian_user", JSON.stringify({ name: name }));
        if(window.A1_Haptic) window.A1_Haptic("success");
        showScreen('chat-screen');
    });

    // Navigation between Auth screens
    document.getElementById('go-to-login')?.addEventListener('click', () => showScreen('login-screen'));
    document.getElementById('go-to-signup')?.addEventListener('click', () => showScreen('signup-screen'));
    document.getElementById('login-submit-btn')?.addEventListener('click', () => showScreen('chat-screen'));

    // --- 4. 💬 CHAT ENGINE (Send & Type Effect) ---
    async function handleSendMessage() {
        const text = userPrompt.value.trim();
        if (!text || isGenerating) return;

        isGenerating = true;
        abortController = new AbortController();
        
        // 1. User Message Display
        appendMessage('user', text);
        userPrompt.value = '';
        userPrompt.style.height = 'auto';
        
        // 2. UI State Change
        sendBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        thinkingBox.classList.remove('hidden');
        if(window.A1_Haptic) window.A1_Haptic("light");

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text }),
                signal: abortController.signal
            });
            
            const data = await response.json();
            thinkingBox.classList.add('hidden');

            if (data.status === "success") {
                typeWriterEffect(data.answer);
            } else {
                appendMessage('ai', "Mafi chahta hoon, engine offline hai.");
            }
        } catch (err) {
            console.log("Request stopped or failed.");
        } finally {
            resetUIState();
        }
    }

    function typeWriterEffect(text) {
        const bubble = appendMessage('ai', '');
        let i = 0;
        const words = text.split(' ');
        
        function type() {
            if (i < words.length) {
                bubble.innerHTML += words[i] + ' ';
                i++;
                chatMessages.scrollTop = chatMessages.scrollHeight;
                setTimeout(type, 40);
            }
        }
        type();
    }

    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message-bubble ${role}-bubble`;
        div.innerText = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        document.getElementById('welcome-banner')?.classList.add('hidden');
        return div;
    }

    function resetUIState() {
        isGenerating = false;
        sendBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        thinkingBox.classList.add('hidden');
    }

    // Stop Button Logic
    stopBtn?.addEventListener('click', () => {
        if (abortController) abortController.abort();
        resetUIState();
    });

    // --- 5. 🛠️ UI INTERACTION (Sidebar, Modals, Plus Menu) ---
    
    // Sidebar Toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        document.getElementById('app-sidebar').classList.toggle('active-screen');
    });

    // Plus Menu Toggle
    document.getElementById('plus-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('attachment-menu').classList.toggle('hidden');
    });

    // Modal Triggers
    document.getElementById('profile-btn')?.addEventListener('click', () => {
        document.getElementById('profile-modal').classList.add('active-screen');
    });
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('active-screen');
    });
    document.getElementById('live-voice-mode-btn')?.addEventListener('click', () => {
        document.getElementById('live-voice-overlay').classList.add('active-screen');
    });

    // Close All Modals
    document.querySelectorAll('.custom-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active-screen');
        });
    });

    // Auto-grow Textarea
    userPrompt?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Initial Execution
    checkAuth();
});
