document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if(navigator.vibrate) navigator.vibrate(50); // Haptic
    alert("Account Success! Ab Login Karein.");
    window.location.href = "login.HTML";
});

document.getElementById('guest-btn').addEventListener('click', () => {
    if(navigator.vibrate) navigator.vibrate(30);
    localStorage.setItem('a1_user', 'Guest');
    window.location.href = "dashboard.HTML"; // Future main file
});
