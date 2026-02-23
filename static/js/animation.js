/* ====================================================
   PROJECT A1 - MASTER ANIMATION CONTROLLER
   Handling Viewport Entrance & Micro-Interactions
==================================================== */

const A1_Animation = {
    // 1. Intersection Observer: जब यूज़र स्क्रॉल करे तो एनिमेट करना
    initObserver: function() {
        const observerOptions = {
            threshold: 0.15
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-slide-up');
                    // एक बार एनिमेट होने के बाद ऑब्जर्वर हटाना (Performance)
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // उन सभी एलिमेंट्स को ढूँढना जिन्हें एनिमेट करना है
        document.querySelectorAll('.chat-item, .prompt-chip, .auth-container, .profile-card').forEach(el => {
            observer.observe(el);
        });
    },

    // 2. Window Transition Logic (MacBook स्टाइल स्मूथ फेड)
    pageTransition: function(hideElem, showElem) {
        if (!hideElem || !showElem) return;

        hideElem.style.transition = "opacity 0.4s var(--apple-spring), transform 0.4s var(--apple-spring)";
        hideElem.style.opacity = "0";
        hideElem.style.transform = "scale(0.98)";

        setTimeout(() => {
            hideElem.classList.add('hidden');
            showElem.classList.remove('hidden');
            showElem.style.opacity = "0";
            showElem.style.transform = "scale(1.02)";
            
            // Force Reflow
            showElem.offsetHeight;

            showElem.style.transition = "opacity 0.5s var(--samsung-bounce), transform 0.5s var(--samsung-bounce)";
            showElem.style.opacity = "1";
            showElem.style.transform = "scale(1)";
        }, 400);
    },

    // 3. AI Reply Step Controller (एक-एक करके स्टेप्स दिखाना)
    animateThinkingSteps: async function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const steps = container.querySelectorAll('.step');
        for (let step of steps) {
            step.classList.add('hidden');
        }

        for (let step of steps) {
            step.classList.remove('hidden');
            step.classList.add('step-fade-in');
            await new Promise(r => setTimeout(r, 800)); // हर स्टेप के बीच गैप
            // अगर अगला स्टेप है, तो पिछले को फेड आउट कर सकते हैं या रहने दे सकते हैं
        }
    }
};

// Start the Engine
document.addEventListener("DOMContentLoaded", () => {
    A1_Animation.initObserver();
    // console.log("A1 Animation Engine Loaded...");
});

// Global Access
window.A1_Animate = A1_Animation;
