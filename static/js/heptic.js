/* ====================================================
   PROJECT A1 - MASTER HAPTIC ENGINE (V13.0)
   Simulating iPhone Taptic & Samsung Haptic Engine
==================================================== */

const HapticEngine = {
    // 1. Vibration Patterns
    types: {
        light: 35,          // हल्का टैप (iOS 'Peak' feel)
        medium: 65,         // सामान्य क्लिक
        heavy: [40, 50, 40], // सफलता या एरर (Double tap)
        success: [30, 40, 30, 40],
        warning: [100, 50, 100]
    },

    // 2. Trigger Function
    trigger: function(type = "light") {
        if (!navigator.vibrate) return; // Browser support check
        
        const pattern = this.types[type] || this.types.light;
        navigator.vibrate(pattern);
        
        // Console log for Admin debugging
        // console.log(`Haptic: ${type} triggered`);
    },

    // 3. Auto-Binder Logic (Puri Website par apne aap apply hoga)
    init: function() {
        const self = this;

        // Global Event Delegation: Naye elements par bhi kaam karega
        document.addEventListener('click', (e) => {
            const target = e.target;

            // List of interactive elements
            if (target.closest('button') || 
                target.closest('.chat-item') || 
                target.closest('.prompt-chip') || 
                target.closest('.action-icon') ||
                target.closest('a')) {
                
                self.trigger("light");
            }
            
            // Special: Submit buttons trigger Medium haptic
            if (target.type === "submit") {
                self.trigger("medium");
            }
        });

        // Modals opening/closing triggers Heavy
        window.addEventListener('open-modal', () => self.trigger("medium"));
        
        // Typing subtle feedback (Optional - Use with caution for performance)
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => self.trigger("light"));
        });
    }
};

// Start the Engine
document.addEventListener("DOMContentLoaded", () => {
    HapticEngine.init();
    // console.log("A1 Haptic Engine Initialized...");
});

// Global Access for other modules (e.g., chatroom.js or voice.js)
window.A1_Haptic = (type) => HapticEngine.trigger(type);
