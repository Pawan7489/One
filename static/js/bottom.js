/* Project A1 - Bottom UI Logic */

document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById('user-prompt');
    const plusBtn = document.getElementById('plus-btn');
    const attachMenu = document.getElementById('attachment-menu');
    const micBtn = document.getElementById('mic-btn');
    const visualizer = document.getElementById('voice-visualizer');

    // 1. Smart Auto-Grow Textarea (1 to 10 lines)
    promptInput.addEventListener('input', function() {
        this.style.height = 'auto'; // Reset
        this.style.height = (this.scrollHeight) + 'px'; // Expand based on content
        
        // Character count trigger animation if needed
        if(this.value.length > 500) {
            this.style.borderColor = 'var(--saffron)';
        }
    });

    // 2. Plus Menu Toggle
    plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        attachMenu.classList.toggle('hidden');
        if(navigator.vibrate) navigator.vibrate(30);
    });

    document.addEventListener('click', () => attachMenu.classList.add('hidden'));

    // 3. Microphone & Voice Animation Logic
    micBtn.addEventListener('click', () => {
        const isActive = micBtn.classList.toggle('active');
        visualizer.classList.toggle('hidden', !isActive);
        
        if(isActive) {
            if(navigator.vibrate) navigator.vibrate(50);
            // Triggering modular voice engine
            console.log("A1 Voice Recognition Started...");
        } else {
            console.log("A1 Voice Recognition Stopped.");
        }
    });

    // 4. Send Arrow Action
    document.getElementById('send-btn').addEventListener('click', () => {
        const text = promptInput.value.trim();
        if(text) {
            if(navigator.vibrate) navigator.vibrate([40, 40]);
            console.log("Sending Prompt:", text);
            // Integration with main dashboard messaging logic
            promptInput.value = '';
            promptInput.style.height = 'auto';
        }
    });
});
