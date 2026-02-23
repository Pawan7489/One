/* Project A1 - Chat Engine & Synchronous Reader */

document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.getElementById('chat-messages');

    // 1. Function to Speak text word-by-word with typing
    window.typeAndSpeak = function(element, text, sources = []) {
        const words = text.split(' ');
        let i = 0;
        
        // Initializing TTS
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN")) || voices[0];
        
        // Forced Reader functionality
        window.speechSynthesis.speak(utterance);

        function type() {
            if (i < words.length) {
                element.innerHTML += words[i] + ' ';
                i++;
                chatContainer.scrollTo({ top: chatContainer.scrollHeight });
                setTimeout(type, 30); // Dynamic typing speed
            } else {
                // Typing finished, show sources list if any
                if(sources.length > 0) renderSources(element.parentElement, sources);
            }
        }
        type();
    };

    // 2. Add User Message with Reader/Edit Logic
    window.appendUserMessage = function(text) {
        const template = document.getElementById('user-msg-template').content.cloneNode(true);
        const bubble = template.querySelector('.text-content');
        bubble.innerText = text;

        // Edit Button Action
        template.querySelector('.edit').onclick = () => {
            const inputField = document.getElementById('user-prompt'); // From bottom.js
            inputField.value = text;
            inputField.focus();
            if(navigator.vibrate) navigator.vibrate(40);
        };

        // Reader Button Action
        template.querySelector('.reader').onclick = () => {
            const ut = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(ut);
        };

        chatContainer.appendChild(template);
    };

    // 3. Performance Handler: Clean up old messages if chat exceeds 500 nodes
    function optimizeChatPerformance() {
        if (chatContainer.children.length > 500) {
            // Keep recent 200, archive others (Advanced logic for later)
            console.log("A1 Optimization: Keeping chat smooth...");
        }
    }

    // 4. Source Toggle Logic
    window.toggleSourcesList = function(badge) {
        const list = badge.parentElement.querySelector('.sources-list');
        list.classList.toggle('hidden');
    };

    // 5. Copy to Clipboard
    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        if(navigator.vibrate) navigator.vibrate(30);
    };
});
