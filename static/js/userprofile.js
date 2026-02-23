document.addEventListener("DOMContentLoaded", () => {
    const triggerHaptic = (ms = 50) => {
        if (navigator.vibrate) navigator.vibrate(ms);
    };

    // 📸 Avatar Upload Preview
    const avatarInput = document.getElementById('avatar-upload');
    const imgPreview = document.getElementById('profile-img-preview');

    avatarInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => imgPreview.src = e.target.result;
            reader.readAsDataURL(file);
            triggerHaptic(60);
        }
    });

    // ✅ Verification Buttons Logic
    const verifyBtns = document.querySelectorAll('.btn-verify');
    verifyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            triggerHaptic(80);
            this.innerText = "Processing...";
            this.style.opacity = "0.6";
            
            setTimeout(() => {
                this.innerText = "Verified ✓";
                this.style.background = "var(--emerald)";
                this.style.color = "white";
                this.style.opacity = "1";
                this.disabled = true;
                triggerHaptic([40, 40, 40]); // Success pattern
            }, 1500);
        });
    });

    // 💾 Save Profile
    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        triggerHaptic(100);
        const newName = document.getElementById('user-name').value;
        
        // Save to LocalStorage for A1 Persistence
        const profileData = {
            name: newName,
            dob: document.getElementById('user-dob').value,
            gender: document.getElementById('user-gender').value
        };
        localStorage.setItem('a1_user_profile', JSON.stringify(profileData));
        
        alert("Profile Updated Successfully, Commander!");
    });
});
