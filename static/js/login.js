document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const remember = document.getElementById('remember').checked;

    if(navigator.vibrate) navigator.vibrate(60);

    if(remember) {
        localStorage.setItem('a1_indian_user', user);
    }
    
    alert("Login Successful!");
    window.location.href = "dashboard.HTML";
});
