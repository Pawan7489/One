/* ====================================================
   PROJECT A1 - MASTER ORCHESTRATOR (V13.0)
   Connecting all modular functions and fixing gaps.
==================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. 💾 PERSISTENT LOGIN (Remember Me)
    function autoLoginCheck() {
        const savedUser = localStorage.getItem("a1_indian_user");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            document.getElementById('signup-screen').classList.add('hidden');
            document.getElementById('chat-screen').classList.remove('hidden');
            // Using Haptic Module
            window.A1_Haptic("success");
            console.log("Welcome back, Commander!");
        }
    }
    autoLoginCheck();

    // 2. 🛑 STOP GENERATION & FETCH LOGIC
    let abortController = null;
    let isGenerating = false;

    window.sendMessage = async function(text) {
        if (isGenerating) return;
        
        isGenerating = true;
        abortController = new AbortController();
        
        // Show Thinking steps from Animation module
        const thinkingBox = document.getElementById('ai-thinking-indicator');
        thinkingBox.classList.remove('hidden');
        
        // Update Send/Stop Buttons in Bottom UI
        document.getElementById('send-btn').classList.add('hidden');
        document.getElementById('stop-btn').classList.remove('hidden');

        try {
            const response = await fetch("https://a1-zc43.onrender.com/api/ai/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text, check_database_cache: true }),
                signal: abortController.signal
            });
            
            const data = await response.json();
            thinkingBox.classList.add('hidden');
            
            if (data.status === "success") {
                // Call Chatroom.js typing effect
                window.typeAndSpeak(document.getElementById('latest-ai-bubble'), data.answer);
            }
        } catch (e) {
            console.log("User stopped generation or network failed.");
        } finally {
            isGenerating = false;
            document.getElementById('send-btn').classList.remove('hidden');
            document.getElementById('stop-btn').classList.add('hidden');
        }
    };

    // 3. MODAL DISPATCHER
    // SideBar या Header से क्लिक होने पर सही मोडल खोलना
    window.addEventListener('open-modal', (e) => {
        const modalId = e.detail.modalId;
        document.getElementById(modalId).classList.remove('hidden');
        window.A1_Haptic("medium");
    });

    // 4. 🎙️ VOICE ENGINE COUPLING
    // Dashboard और Voice Engine को जोड़ना
    const liveVoiceBtn = document.getElementById('live-voice-mode-btn');
    liveVoiceBtn.addEventListener('click', () => {
        document.getElementById('live-voice-overlay').classList.remove('hidden');
        // Trigger Animation Module's pulse
        document.querySelector('.live-hologram').classList.add('voice-pulse');
    });

});
