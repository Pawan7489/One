/* Project A1 - Sidebar & History Engine */

document.addEventListener("DOMContentLoaded", () => {
    const triggerHaptic = (type = 50) => { if(navigator.vibrate) navigator.vibrate(type); };

    // --- 🕒 1. Chat History Management ---
    window.toggleChatMenu = (e, id) => {
        e.stopPropagation();
        const menu = document.getElementById(`menu-${id}`);
        document.querySelectorAll('.context-menu').forEach(m => m.classList.add('hidden'));
        menu.classList.toggle('hidden');
        triggerHaptic(30);
    };

    window.pinChat = (id) => {
        const item = document.querySelector(`[data-id="${id}"]`);
        item.classList.toggle('pinned');
        triggerHaptic(60);
        // Logic to move to top of list
    };

    window.deleteChatToTrash = (id) => {
        if(confirm("Yeh chat Trash mein bhej dein?")) {
            // Logic to move item from Active List to Trash Array in LocalStorage
            triggerHaptic([40, 40]);
            location.reload(); 
        }
    };

    // --- 🚀 2. AI Tools Selector ---
    const toolItems = document.querySelectorAll('.ai-tools-list li');
    toolItems.forEach(tool => {
        tool.addEventListener('click', function() {
            toolItems.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const mode = this.getAttribute('data-mode');
            
            // Dispatch event to Main Chat UI to change mode
            window.dispatchEvent(new CustomEvent('ai-mode-change', { detail: { mode: mode } }));
            triggerHaptic(40);
        });
    });

    // --- ⚙️ 3. Settings Modal Trigger ---
    const settingsBtn = document.getElementById('master-settings-btn');
    settingsBtn.addEventListener('click', () => {
        // Blueprint: This opens the global settings modal defined in modals_master.html
        window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'settings-modal' } }));
        triggerHaptic(65);
    });

    // --- 📂 4. Trash & History Modal ---
    const historyBtn = document.getElementById('history-settings-btn');
    const historyModal = document.getElementById('history-trash-modal');

    historyBtn.addEventListener('click', () => {
        historyModal.classList.remove('hidden');
        triggerHaptic(50);
    });

    document.getElementById('close-history').addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });

    // --- 🤝 5. Help Desk ---
    document.getElementById('help-desk-btn').addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('open-modal', { detail: { modalId: 'support-modal' } }));
    });
});
