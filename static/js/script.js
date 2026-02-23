/* ====================================================
   PROJECT A1 - MASTER JAVASCRIPT ENGINE (V13.0)
   100% Error-Free Connection Logic
==================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. 💾 PERSISTENT LOGIN (Remember Me)
    function autoLoginCheck() {
        try {
            const savedData = localStorage.getItem("a1_indian_user");
            if (savedData) {
                // सीधे चैट स्क्रीन खोलें
                switchScreen('signup-screen', 'chat-screen');
                window.A1_Haptic("success");
            } else {
                // पहली बार में साइनअप दिखाएं
                document.getElementById('signup-screen').classList.remove('hidden');
            }
        } catch (e) {
            console.error("Auth Engine Fail:", e);
        }
    }

    // 2. 🔄 SCREEN SWITCHER (Smooth Animation)
    window.switchScreen = function(fromId, toId) {
        const fromElem = document.getElementById(fromId);
        const toElem = document.getElementById(toId);
        
        if(window.A1_Animate) {
            window.A1_Animate.pageTransition(fromElem, toElem);
        } else {
            fromElem.classList.add('hidden');
            toElem.classList.remove('hidden');
        }
    };

    // 3. 🛡️ FORM SUBMISSION & AUTH LOGIC
    // Signup Button Click
    const signupBtn = document.getElementById('signup-submit-btn');
    if(signupBtn) {
        signupBtn.addEventListener('click', () => {
            const name = document.getElementById('reg-name').value || "Commander";
            localStorage.setItem("a1_indian_user", JSON.stringify({name: name}));
            switchScreen('signup-screen', 'chat-screen');
        });
    }

    // Login Button Click
    const loginBtn = document.getElementById('login-submit-btn');
    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            localStorage.setItem("a1_indian_user", JSON.stringify({name: "User"}));
            switchScreen('login-screen', 'chat-screen');
        });
    }

    // 4. 🎙️ VOICE & MODAL TRIGGER
    window.addEventListener('open-modal', (e) => {
        const modal = document.getElementById(e.detail.modalId);
        if(modal) modal.classList.remove('hidden');
    });

    // 5. Initialize Page
    autoLoginCheck();
});
