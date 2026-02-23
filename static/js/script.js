/* Project A1 - Master Screen Controller */

const A1_Controller = {
    // 1. स्क्रीन बदलने का फंक्शन
    showScreen: function(screenId) {
        // सारी स्क्रीन्स से 'active-screen' हटाओ
        document.querySelectorAll('.app-screen').forEach(s => {
            s.classList.remove('active-screen');
        });
        // चुनी हुई स्क्रीन दिखाओ
        const target = document.getElementById(screenId);
        if(target) target.classList.add('active-screen');
        
        if(window.A1_Haptic) window.A1_Haptic("medium");
    },

    // 2. मोडल (पॉप-अप) खोलने का फंक्शन
    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if(modal) modal.classList.add('active-screen');
    },

    // 3. मोडल बंद करने का फंक्शन
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if(modal) modal.classList.remove('active-screen');
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Check Auto-Login
    const user = localStorage.getItem("a1_indian_user");
    if(user) {
        A1_Controller.showScreen('chat-screen');
    }

    // Wiring Buttons
    document.getElementById('go-to-login')?.addEventListener('click', () => A1_Controller.showScreen('login-screen'));
    document.getElementById('go-to-signup')?.addEventListener('click', () => A1_Controller.showScreen('signup-screen'));
    
    // Login Success Trigger
    document.getElementById('login-submit-btn')?.addEventListener('click', () => {
        // Logic for login...
        A1_Controller.showScreen('chat-screen');
    });

    // Profile & Settings
    document.getElementById('profile-btn')?.addEventListener('click', () => A1_Controller.openModal('profile-modal'));
    document.getElementById('settings-btn')?.addEventListener('click', () => A1_Controller.openModal('settings-modal'));
});
