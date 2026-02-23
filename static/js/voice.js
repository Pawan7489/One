/* Project A1 - Advanced Voice Engine JS */
document.addEventListener("DOMContentLoaded", () => {
    const micBtn = document.getElementById('mic-toggle');
    const statusText = document.getElementById('voice-status');
    const userText = document.getElementById('user-speech-text');
    const personaDisplay = document.getElementById('persona-display');

    // Speech Recognition Setup
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = SpeechRec ? new SpeechRec() : null;
    if(recognition) {
        recognition.lang = 'en-IN';
        recognition.interimResults = true;
    }

    // 26 Voice Logic (A1 Special)
    function getA1PersonaVoice(ageGroup, gender) {
        let config = { pitch: 1.0, rate: 1.0 };
        
        // Age Logic Mapping
        if (ageGroup === "5-15") { // Kids & School
            config.pitch = 1.6; config.rate = 1.1; // Patli aur tez awaaz
        } else if (ageGroup === "18-25") { // College/Youth
            config.pitch = 1.1; config.rate = 1.05; // Energetic
        } else if (ageGroup === "50+") { // Seniors
            config.pitch = 0.8; config.rate = 0.85; // Bhari aur aaram se
        }
        return config;
    }

    // AI Speaking Function
    window.aiSpeak = function(text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Settings se user ka data fetch karna (Age logic)
        const userSettings = JSON.parse(localStorage.getItem('a1_user_profile')) || {dob: "2000", gender: "male"};
        const age = 2026 - new Date(userSettings.dob).getFullYear();
        
        let ageLabel = age < 18 ? "5-15" : (age > 50 ? "50+" : "18-25");
        let voiceSettings = getA1PersonaVoice(ageLabel, userSettings.gender);

        utterance.pitch = voiceSettings.pitch;
        utterance.rate = voiceSettings.rate;
        
        utterance.onstart = () => { statusText.innerText = "A1 is Speaking..."; };
        utterance.onend = () => { statusText.innerText = "Listening..."; };
        
        window.speechSynthesis.speak(utterance);
    };

    // Mic Toggle Logic
    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('active')) {
            recognition.stop();
            micBtn.classList.remove('active');
            statusText.innerText = "Paused";
        } else {
            recognition.start();
            micBtn.classList.add('active');
            statusText.innerText = "Listening...";
            if(navigator.vibrate) navigator.vibrate(50);
        }
    });

    if(recognition) {
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            userText.innerText = transcript;
            
            if(event.results[0].isFinal) {
                // Yahan Admin Panel ko request jayegi
                console.log("Sending to Admin Panel:", transcript);
            }
        };
    }
});
