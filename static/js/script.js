document.addEventListener("DOMContentLoaded", () => {
    
    function showScreen(id) {
        document.querySelectorAll('.app-screen, .custom-modal').forEach(s => s.classList.remove('active-screen'));
        document.getElementById(id).classList.add('active-screen');
    }

    // Auth Navigation
    document.getElementById('go-to-login')?.addEventListener('click', () => showScreen('login-screen'));
    document.getElementById('go-to-signup')?.addEventListener('click', () => showScreen('signup-screen'));

    // Login Success
    document.getElementById('signup-submit-btn')?.addEventListener('click', () => {
        localStorage.setItem("a1_user", "active");
        showScreen('chat-screen');
    });

    // Profile Trigger
    document.getElementById('profile-btn')?.addEventListener('click', () => {
        document.getElementById('profile-modal').classList.add('active-screen');
    });

    document.getElementById('close-profile')?.addEventListener('click', () => {
        document.getElementById('profile-modal').classList.remove('active-screen');
    });

    // Initial Screen
    if(localStorage.getItem("a1_user")) {
        showScreen('chat-screen');
    } else {
        showScreen('signup-screen');
    }
});
