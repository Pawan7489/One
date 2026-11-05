document.addEventListener("DOMContentLoaded", () => {
    const dom = {
        screens: {
            signup: document.getElementById("signup-screen"),
            login: document.getElementById("login-screen"),
            chat: document.getElementById("chat-screen"),
        },
        auth: {
            loginForm: document.getElementById("login-form"),
            signupForm: document.getElementById("signup-form"),
            welcomeBanner: document.getElementById("welcome-banner"),
            welcomeName: document.getElementById("welcome-user-name"),
            guestButton: document.getElementById("guest-btn"),
            goToLogin: document.getElementById("go-to-login"),
            goToSignup: document.getElementById("go-to-signup"),
        },
        chat: {
            container: document.getElementById("chat-box"),
            input: document.getElementById("composer-input"),
            sendButton: document.getElementById("send-btn"),
            stopButton: document.getElementById("stop-btn"),
            micButton: document.getElementById("mic-btn"),
            attachmentButton: document.getElementById("attachment-menu-btn"),
            attachmentMenu: document.getElementById("attachment-menu"),
            thinkingIndicator: document.getElementById("ai-thinking-indicator"),
            toolIndicator: document.getElementById("active-tool-indicator"),
            toolIcon: document.getElementById("tool-icon"),
            toolText: document.getElementById("tool-text"),
            closeToolButton: document.getElementById("close-tool-btn"),
            suggestions: [...document.querySelectorAll(".suggestion-chip")],
        },
        layout: {
            menuToggle: document.getElementById("menu-toggle"),
            sidebar: document.getElementById("app-sidebar"),
            newChatButton: document.getElementById("new-chat-btn"),
            chatArea: document.querySelector(".chat-area"),
            tools: [...document.querySelectorAll(".ai-tools-list li")],
        },
        voice: {
            launch: document.getElementById("live-voice-mode-btn"),
            overlay: document.getElementById("live-voice-overlay"),
            close: document.getElementById("close-live-voice"),
            status: document.getElementById("live-voice-status"),
            text: document.getElementById("live-voice-text"),
            log: document.getElementById("live-voice-chat-log"),
        },
        modals: {
            profile: {
                open: document.getElementById("profile-btn"),
                modal: document.getElementById("profile-modal"),
                close: document.getElementById("close-profile"),
            },
            settings: {
                open: document.getElementById("settings-btn"),
                modal: document.getElementById("settings-modal"),
                close: document.getElementById("close-settings"),
            },
            support: {
                open: document.getElementById("support-btn"),
                modal: document.getElementById("support-modal"),
                close: document.getElementById("close-support"),
            },
            history: {
                open: document.getElementById("history-settings-btn"),
                modal: document.getElementById("history-modal"),
                close: document.getElementById("close-history"),
            },
        },
        profile: {
            upload: document.getElementById("profile-photo-upload"),
            avatarPreview: document.getElementById("profile-avatar-preview"),
            profileButton: document.getElementById("profile-btn"),
            profileIcon: document.getElementById("header-profile-icon"),
            saveButton: document.getElementById("close-profile"),
            nameInput: document.getElementById("prof-name"),
        },
    };

    document.getElementById("dummy-ai-message")?.remove();

    const state = {
        currentUser: { name: "User" },
        currentMode: "chat",
        isGenerating: false,
        abortController: null,
        speechRecognition: null,
        liveVoiceEnabled: false,
        continuousMic: false,
        seededInputText: "",
        availableVoices: [],
    };

    const API_STREAM_URL = "/api/ai/stream";

    function triggerHaptic(type = "light") {
        if (!navigator.vibrate) {
            return;
        }
        if (type === "light") {
            navigator.vibrate(10);
        } else if (type === "medium") {
            navigator.vibrate(25);
        } else {
            navigator.vibrate([30, 40, 30]);
        }
    }

    function escapeHtml(value) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function switchScreen(hiddenScreen, visibleScreen) {
        triggerHaptic("light");
        hiddenScreen.style.opacity = "0";
        setTimeout(() => {
            hiddenScreen.classList.add("hidden");
            visibleScreen.classList.remove("hidden");
            setTimeout(() => {
                visibleScreen.style.opacity = "1";
            }, 50);
        }, 300);
    }

    function enterChat(name, guest = false) {
        state.currentUser.name = name || "User";
        const title = guest ? "Welcome, Guest!" : `Welcome back, ${state.currentUser.name}!`;
        dom.auth.welcomeName.textContent = title;

        dom.screens.signup.style.opacity = "0";
        dom.screens.login.style.opacity = "0";
        setTimeout(() => {
            dom.screens.signup.classList.add("hidden");
            dom.screens.login.classList.add("hidden");
            dom.screens.chat.classList.remove("hidden");
            setTimeout(() => {
                dom.screens.chat.style.opacity = "1";
            }, 50);
        }, 350);
    }

    function openModal(element) {
        triggerHaptic("medium");
        element.classList.remove("hidden");
    }

    function closeModal(element) {
        triggerHaptic("light");
        element.classList.add("hidden");
    }

    function toggleSidebar() {
        dom.layout.sidebar.classList.toggle("open");
        triggerHaptic("light");
    }

    function setGeneratingState(active) {
        state.isGenerating = active;
        if (active) {
            dom.chat.sendButton.classList.add("hidden");
            dom.chat.stopButton.classList.remove("hidden");
        } else {
            dom.chat.sendButton.classList.remove("hidden");
            dom.chat.stopButton.classList.add("hidden");
        }
    }

    function resizeComposer() {
        const input = dom.chat.input;
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 320)}px`;
    }

    function createLongMessageToggle(messageBody, originalText) {
        const previewLimit = 1800;
        if (originalText.length <= previewLimit) {
            messageBody.textContent = originalText;
            return;
        }

        let expanded = false;
        const previewText = `${originalText.slice(0, previewLimit)}…`;
        messageBody.textContent = previewText;

        const toggleButton = document.createElement("button");
        toggleButton.className = "message-preview-toggle";
        toggleButton.textContent = "Show more";
        toggleButton.addEventListener("click", () => {
            expanded = !expanded;
            messageBody.textContent = expanded ? originalText : previewText;
            toggleButton.textContent = expanded ? "Show less" : "Show more";
        });

        return toggleButton;
    }

    function appendUserMessage(text) {
        dom.auth.welcomeBanner.style.display = "none";

        const row = document.createElement("div");
        row.className = "msg-row";
        row.style.alignItems = "flex-end";

        const bubble = document.createElement("div");
        bubble.className = "message user-message msg-bubble--user";
        const toggleButton = createLongMessageToggle(bubble, text);

        const actions = document.createElement("div");
        actions.className = "user-actions";

        const readButton = document.createElement("button");
        readButton.className = "user-action-icon";
        readButton.textContent = "🔊 Read";
        readButton.title = "Read this message";
        readButton.addEventListener("click", () => speakText(text));

        const editButton = document.createElement("button");
        editButton.className = "user-action-icon";
        editButton.textContent = "✏️ Edit";
        editButton.title = "Edit this message";
        editButton.addEventListener("click", () => {
            dom.chat.input.value = text;
            resizeComposer();
            dom.chat.input.focus();
        });

        actions.append(readButton, editButton);
        row.appendChild(bubble);
        if (toggleButton) {
            row.appendChild(toggleButton);
        }
        row.appendChild(actions);

        dom.chat.container.appendChild(row);
        dom.chat.container.scrollTo({ top: dom.chat.container.scrollHeight, behavior: "smooth" });
    }

    function addAssistantActions(wrapper, text) {
        const bar = document.createElement("div");
        bar.className = "ai-actions";

        const read = document.createElement("button");
        read.className = "action-icon";
        read.textContent = "🔊 Read";
        read.addEventListener("click", () => speakText(text));

        const copy = document.createElement("button");
        copy.className = "action-icon";
        copy.textContent = "📋 Copy";
        copy.addEventListener("click", async () => {
            await navigator.clipboard.writeText(text);
            triggerHaptic("medium");
        });

        const share = document.createElement("button");
        share.className = "action-icon";
        share.textContent = "📤 Share";
        share.addEventListener("click", async () => {
            if (navigator.share) {
                await navigator.share({ title: "Assistant response", text });
            } else {
                await navigator.clipboard.writeText(text);
            }
            triggerHaptic("medium");
        });

        bar.append(read, copy, share);
        wrapper.appendChild(bar);
    }

    function isProgrammingLanguage(language) {
        return [
            "python",
            "javascript",
            "typescript",
            "html",
            "css",
            "cpp",
            "java",
            "sql",
            "json",
            "bash",
            "sh",
        ].includes(language);
    }

    function isMathLanguage(language) {
        return ["latex", "math", "tex"].includes(language);
    }

    function looksLikeMath(content) {
        const mathSignals = [
            /\\begin\{(aligned|matrix|pmatrix|bmatrix|cases|equation)\}/,
            /\\(frac|sum|int|sqrt|alpha|beta|gamma|theta|pi|lambda)/,
            /\$\$[\s\S]+\$\$/,
            /[∫∑√πθλΔ∞≤≥≈]/,
            /\[[^\]]+\]\s*=/,
        ];
        const codeSignals = [/(^|\n)\s*(def|function|class|const|let|var|import|from|SELECT|INSERT)\b/i, /[{};<>]/];

        const hasMathSignal = mathSignals.some((pattern) => pattern.test(content));
        const hasCodeSignal = codeSignals.some((pattern) => pattern.test(content));
        return hasMathSignal && !hasCodeSignal;
    }

    function buildMathBlock(content, inline = false) {
        const wrapper = document.createElement(inline ? "span" : "div");
        wrapper.className = inline ? "inline-math" : "math-block";

        if (window.katex) {
            try {
                katex.render(content.trim(), wrapper, {
                    displayMode: !inline,
                    throwOnError: false,
                    strict: "ignore",
                    trust: true,
                });
                return wrapper;
            } catch (error) {
                wrapper.textContent = content;
                return wrapper;
            }
        }

        wrapper.textContent = content;
        return wrapper;
    }

    function buildCodeBlock(language, content) {
        const codeBlock = document.createElement("div");
        codeBlock.className = "code-block";

        const header = document.createElement("div");
        header.className = "code-block__header";

        const languageTag = document.createElement("span");
        languageTag.textContent = language || "text";

        const lineCount = document.createElement("span");
        const lines = content.split("\n");
        lineCount.textContent = `${lines.length} lines`;

        const copyButton = document.createElement("button");
        copyButton.className = "code-block__copy";
        copyButton.textContent = "Copy";
        copyButton.addEventListener("click", async () => {
            await navigator.clipboard.writeText(content);
            copyButton.textContent = "Copied";
            setTimeout(() => {
                copyButton.textContent = "Copy";
            }, 1200);
        });

        header.append(languageTag, lineCount, copyButton);

        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.className = `language-${language || "text"}`;

        code.innerHTML = lines
            .map((line, index) => `<span class=\"code-line\"><span class=\"code-line-number\">${index + 1}</span> ${escapeHtml(line)}</span>`)
            .join("\n");

        pre.appendChild(code);
        codeBlock.append(header, pre);
        return codeBlock;
    }

    function appendParagraphWithInlineMath(target, text) {
        if (!text.trim()) {
            return;
        }

        const paragraph = document.createElement("p");
        paragraph.style.whiteSpace = "pre-wrap";

        const inlinePattern = /\$([^$\n]+)\$|\\\((.+?)\\\)/g;
        let cursor = 0;
        let match;

        while ((match = inlinePattern.exec(text)) !== null) {
            const plainChunk = text.slice(cursor, match.index);
            if (plainChunk) {
                paragraph.appendChild(document.createTextNode(plainChunk));
            }
            const mathContent = (match[1] || match[2] || "").trim();
            paragraph.appendChild(buildMathBlock(mathContent, true));
            cursor = match.index + match[0].length;
        }

        const tail = text.slice(cursor);
        if (tail) {
            paragraph.appendChild(document.createTextNode(tail));
        }

        target.appendChild(paragraph);
    }

    function appendRichText(target, text) {
        const blockMathPattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\begin\{(?:aligned|matrix|pmatrix|bmatrix|cases|equation)\}[\s\S]+?\\end\{(?:aligned|matrix|pmatrix|bmatrix|cases|equation)\})/g;
        let cursor = 0;
        let match;

        while ((match = blockMathPattern.exec(text)) !== null) {
            const plainText = text.slice(cursor, match.index);
            appendParagraphWithInlineMath(target, plainText);

            let mathBody = match[0];
            if (mathBody.startsWith("$$") && mathBody.endsWith("$$")) {
                mathBody = mathBody.slice(2, -2);
            } else if (mathBody.startsWith("\\[") && mathBody.endsWith("\\]")) {
                mathBody = mathBody.slice(2, -2);
            }
            target.appendChild(buildMathBlock(mathBody, false));
            cursor = match.index + match[0].length;
        }

        appendParagraphWithInlineMath(target, text.slice(cursor));
    }

    function renderAssistantContent(container, fullText) {
        container.innerHTML = "";
        const fencePattern = /```(\w+)?\n([\s\S]*?)```/g;
        let cursor = 0;
        let match;

        while ((match = fencePattern.exec(fullText)) !== null) {
            const plainText = fullText.slice(cursor, match.index);
            appendRichText(container, plainText);

            const language = (match[1] || "").toLowerCase();
            const body = match[2] || "";

            if (isMathLanguage(language) || (!language && looksLikeMath(body))) {
                container.appendChild(buildMathBlock(body, false));
            } else if (isProgrammingLanguage(language) || language) {
                container.appendChild(buildCodeBlock(language || "text", body));
            } else if (looksLikeMath(body)) {
                container.appendChild(buildMathBlock(body, false));
            } else {
                container.appendChild(buildCodeBlock("text", body));
            }

            cursor = match.index + match[0].length;
        }

        appendRichText(container, fullText.slice(cursor));
    }

    function createAssistantMessageShell() {
        const wrapper = document.createElement("div");
        wrapper.className = "message ai-message msg-bubble--assistant";
        wrapper.style.marginBottom = "20px";
        dom.chat.container.appendChild(wrapper);
        return wrapper;
    }

    function updateThinkingStatus(text) {
        if (!dom.chat.thinkingIndicator) {
            return;
        }

        dom.chat.container.appendChild(dom.chat.thinkingIndicator);
        dom.chat.thinkingIndicator.classList.remove("hidden");

        const stepOne = dom.chat.thinkingIndicator.querySelector(".step-1");
        if (stepOne && text) {
            stepOne.textContent = text;
            stepOne.classList.remove("hidden");
        }
    }

    function parseSseEventChunk(chunk) {
        const lines = chunk.split("\n");
        const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .filter(Boolean);

        if (!dataLines.length) {
            return null;
        }

        const payload = dataLines.join("\n");
        if (payload === "[DONE]") {
            return { done: true };
        }

        try {
            return { done: false, parsed: JSON.parse(payload) };
        } catch (_error) {
            return { done: false, parsed: { token: payload } };
        }
    }

    function appendMediaLinks(target, mediaData) {
        const mediaContainer = document.createElement("div");
        mediaContainer.className = "ai-actions";

        const labels = {
            image_url: "Image",
            video_url: "Video",
            audio_url: "Audio",
            pdf_url: "PDF",
            docx_url: "DOCX",
        };

        Object.entries(labels).forEach(([key, label]) => {
            const url = mediaData[key];
            if (!url) {
                return;
            }
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "action-icon";
            link.textContent = `Open ${label}`;
            mediaContainer.appendChild(link);
        });

        if (Array.isArray(mediaData.generated_files)) {
            mediaData.generated_files.forEach((entry, index) => {
                const fileUrl = typeof entry === "string" ? entry : entry?.url;
                if (!fileUrl) {
                    return;
                }
                const fileLink = document.createElement("a");
                fileLink.href = fileUrl;
                fileLink.target = "_blank";
                fileLink.rel = "noopener noreferrer";
                fileLink.className = "action-icon";
                fileLink.textContent = `File ${index + 1}`;
                mediaContainer.appendChild(fileLink);
            });
        }

        if (mediaContainer.children.length) {
            target.appendChild(mediaContainer);
        }
    }

    async function streamResponse(promptText, mode, webSearchEnabled) {
        state.abortController = new AbortController();
        const signal = state.abortController.signal;

        const response = await fetch(API_STREAM_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: promptText,
                message: promptText,
                prompt: promptText,
                mode,
                web_search: webSearchEnabled,
                stream: true,
            }),
            signal,
        });

        if (!response.ok || !response.body) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const messageNode = createAssistantMessageShell();
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullAssistantText = "";
        let latestRender = 0;
        let mediaPayload = null;

        while (state.isGenerating) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
                if (!chunk.trim() || chunk.startsWith(":")) {
                    continue;
                }

                const eventData = parseSseEventChunk(chunk);
                if (!eventData) {
                    continue;
                }

                if (eventData.done) {
                    break;
                }

                const parsed = eventData.parsed || {};
                if (parsed.thinking) {
                    updateThinkingStatus(parsed.thinking);
                    continue;
                }

                if (parsed.token) {
                    fullAssistantText += String(parsed.token);
                    const now = Date.now();
                    if (now - latestRender > 120) {
                        renderAssistantContent(messageNode, fullAssistantText);
                        latestRender = now;
                        dom.chat.container.scrollTo({ top: dom.chat.container.scrollHeight });
                    }
                    continue;
                }

                if (
                    parsed.image_url ||
                    parsed.video_url ||
                    parsed.audio_url ||
                    parsed.pdf_url ||
                    parsed.docx_url ||
                    parsed.generated_files
                ) {
                    mediaPayload = parsed;
                }
            }
        }

        renderAssistantContent(messageNode, fullAssistantText);
        if (mediaPayload) {
            appendMediaLinks(messageNode, mediaPayload);
        }
        addAssistantActions(messageNode, fullAssistantText);
        return fullAssistantText;
    }

    function endGeneration() {
        setGeneratingState(false);
        dom.chat.thinkingIndicator.classList.add("hidden");
    }

    async function sendMessage() {
        const text = dom.chat.input.value.trim();
        if (!text || state.isGenerating) {
            return;
        }

        triggerHaptic("medium");
        appendUserMessage(text);
        dom.chat.input.value = "";
        resizeComposer();

        setGeneratingState(true);
        updateThinkingStatus("Preparing response...");

        try {
            const webSearchEnabled = document.getElementById("toggle-search")?.checked || false;
            const assistantText = await streamResponse(text, state.currentMode, webSearchEnabled);
            speakText(assistantText);
        } catch (error) {
            const messageNode = createAssistantMessageShell();
            messageNode.textContent =
                error.name === "AbortError"
                    ? "Generation stopped by user."
                    : "The response could not be generated due to a network or server issue.";
        } finally {
            endGeneration();
        }
    }

    function stopGeneration() {
        triggerHaptic("heavy");
        state.abortController?.abort();
        window.speechSynthesis?.cancel();
        endGeneration();
    }

    function updateAvailableVoices() {
        state.availableVoices = window.speechSynthesis?.getVoices() || [];
    }

    function speakText(text) {
        if (!window.speechSynthesis || !text) {
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ""));
        const preferredVoice =
            state.availableVoices.find((voice) => voice.lang.includes("en-IN")) || state.availableVoices[0];

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        const voicePreference = document.getElementById("setting-voice")?.value || "";
        if (voicePreference.includes("kid")) {
            utterance.pitch = 1.5;
            utterance.rate = 1.1;
        } else if (voicePreference.includes("senior")) {
            utterance.pitch = 0.85;
            utterance.rate = 0.9;
        } else {
            utterance.pitch = 1;
            utterance.rate = 1;
        }

        window.speechSynthesis.speak(utterance);
    }

    function initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.interimResults = true;

        let finalTranscript = "";

        recognition.onstart = () => {
            triggerHaptic("light");
            if (state.liveVoiceEnabled) {
                dom.voice.status.textContent = "Listening...";
            } else {
                dom.chat.micButton.classList.add("active");
                state.seededInputText = dom.chat.input.value.trim();
            }
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                if (event.results[index].isFinal) {
                    finalTranscript += event.results[index][0].transcript;
                } else {
                    interimTranscript += event.results[index][0].transcript;
                }
            }

            if (state.liveVoiceEnabled) {
                dom.voice.text.textContent = `${finalTranscript}${interimTranscript}`;
            } else {
                const gap = state.seededInputText.length ? " " : "";
                dom.chat.input.value = `${state.seededInputText}${gap}${finalTranscript}${interimTranscript}`;
                resizeComposer();
            }
        };

        recognition.onend = () => {
            if (state.liveVoiceEnabled) {
                dom.voice.status.textContent = "Processing...";
                const query = dom.voice.text.textContent.trim();
                if (query.length > 2) {
                    handleLiveVoiceQuery(query);
                } else {
                    try {
                        recognition.start();
                    } catch (_error) {
                        // noop
                    }
                }
            } else {
                dom.chat.micButton.classList.remove("active");
                state.seededInputText = dom.chat.input.value.trim();
                if (state.continuousMic) {
                    try {
                        recognition.start();
                    } catch (_error) {
                        // noop
                    }
                }
            }
            finalTranscript = "";
        };

        state.speechRecognition = recognition;
    }

    function appendVoiceLog(text, role) {
        if (!dom.voice.log) {
            return;
        }

        const entry = document.createElement("div");
        entry.style.padding = "8px 12px";
        entry.style.borderRadius = "12px";
        entry.style.maxWidth = "85%";
        entry.style.lineHeight = "1.4";
        entry.style.fontSize = "14px";

        if (role === "user") {
            entry.style.alignSelf = "flex-end";
            entry.style.background = "rgba(255,153,51,0.2)";
            entry.textContent = text;
        } else {
            entry.style.alignSelf = "flex-start";
            entry.style.background = "rgba(255,255,255,0.05)";
            entry.style.color = "var(--saffron-gold)";
            entry.textContent = `Assistant: ${text}`;
        }

        dom.voice.log.appendChild(entry);
        dom.voice.log.scrollTo({ top: dom.voice.log.scrollHeight, behavior: "smooth" });
    }

    async function handleLiveVoiceQuery(text) {
        appendVoiceLog(text, "user");

        try {
            const response = await fetch(API_STREAM_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text, stream: false }),
            });

            const data = await response.json();
            const answer = (data.answer || data.response || "I could not generate a response.").trim();
            dom.voice.text.textContent = answer;
            appendVoiceLog(answer, "assistant");
            speakText(answer);
        } catch (_error) {
            dom.voice.text.textContent = "Connection lost. Please try again.";
        }
    }

    function initializeProfileUpload() {
        if (!dom.profile.upload) {
            return;
        }

        dom.profile.upload.addEventListener("change", (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const imageUrl = `url(${loadEvent.target.result})`;
                dom.profile.avatarPreview.style.backgroundImage = imageUrl;
                dom.profile.avatarPreview.textContent = "";

                if (dom.profile.profileButton && dom.profile.profileIcon) {
                    dom.profile.profileButton.style.backgroundImage = imageUrl;
                    dom.profile.profileIcon.style.display = "none";
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function clearChat() {
        state.abortController?.abort();
        dom.chat.container.innerHTML = "";
        dom.chat.container.appendChild(dom.auth.welcomeBanner);
        dom.auth.welcomeBanner.style.display = "flex";
        if (window.innerWidth <= 768) {
            dom.layout.sidebar.classList.remove("open");
        }
    }

    dom.auth.goToLogin?.addEventListener("click", (event) => {
        event.preventDefault();
        switchScreen(dom.screens.signup, dom.screens.login);
    });

    dom.auth.goToSignup?.addEventListener("click", (event) => {
        event.preventDefault();
        switchScreen(dom.screens.login, dom.screens.signup);
    });

    dom.auth.guestButton?.addEventListener("click", () => enterChat("Guest", true));

    dom.auth.signupForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        enterChat(document.getElementById("reg-name")?.value || "User");
    });

    dom.auth.loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const identifier = document.getElementById("login-id")?.value || "User";
        enterChat(identifier.split("@")[0]);
    });

    dom.layout.menuToggle?.addEventListener("click", toggleSidebar);

    dom.layout.chatArea?.addEventListener("click", (event) => {
        if (
            window.innerWidth <= 768 &&
            dom.layout.sidebar.classList.contains("open") &&
            !dom.layout.menuToggle.contains(event.target)
        ) {
            dom.layout.sidebar.classList.remove("open");
        }
    });

    Object.values(dom.modals).forEach((modalConfig) => {
        if (!modalConfig.open || !modalConfig.modal || !modalConfig.close) {
            return;
        }
        modalConfig.open.addEventListener("click", () => {
            dom.layout.sidebar.classList.remove("open");
            openModal(modalConfig.modal);
        });
        modalConfig.close.addEventListener("click", () => closeModal(modalConfig.modal));
    });

    dom.layout.newChatButton?.addEventListener("click", clearChat);

    dom.layout.tools.forEach((toolItem) => {
        toolItem.addEventListener("click", () => {
            dom.layout.tools.forEach((item) => item.classList.remove("active"));
            toolItem.classList.add("active");

            state.currentMode = toolItem.getAttribute("data-mode") || "chat";
            const selectedName = toolItem.getAttribute("data-name") || "Chat";
            const selectedIcon = toolItem.getAttribute("data-icon") || "💬";

            if (state.currentMode === "chat") {
                dom.chat.toolIndicator.classList.add("hidden");
            } else {
                dom.chat.toolIndicator.classList.remove("hidden");
                dom.chat.toolText.textContent = selectedName;
                dom.chat.toolIcon.textContent = selectedIcon;
            }

            if (window.innerWidth <= 768) {
                dom.layout.sidebar.classList.remove("open");
            }
        });
    });

    dom.chat.closeToolButton?.addEventListener("click", () => {
        dom.chat.toolIndicator.classList.add("hidden");
        state.currentMode = "chat";
        dom.layout.tools.forEach((item) => item.classList.remove("active"));
        document.querySelector('[data-mode="chat"]')?.classList.add("active");
    });

    dom.chat.attachmentButton?.addEventListener("click", () => {
        dom.chat.attachmentMenu.classList.toggle("hidden");
        dom.chat.attachmentMenu.style.display = dom.chat.attachmentMenu.classList.contains("hidden") ? "none" : "block";
        triggerHaptic("light");
    });

    document.addEventListener("click", (event) => {
        if (
            dom.chat.attachmentButton &&
            dom.chat.attachmentMenu &&
            !dom.chat.attachmentButton.contains(event.target) &&
            !dom.chat.attachmentMenu.contains(event.target)
        ) {
            dom.chat.attachmentMenu.classList.add("hidden");
            dom.chat.attachmentMenu.style.display = "none";
        }
    });

    document.querySelectorAll(".menu-item").forEach((item) => {
        item.addEventListener("click", () => {
            triggerHaptic("light");
            dom.chat.attachmentMenu.classList.add("hidden");
            dom.chat.attachmentMenu.style.display = "none";
        });
    });

    dom.chat.input?.addEventListener("input", resizeComposer);

    dom.chat.input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    dom.chat.suggestions.forEach((chip) => {
        chip.addEventListener("click", () => {
            dom.chat.input.value = chip.textContent.replace(/[📝📊🐍]/g, "").trim();
            resizeComposer();
            sendMessage();
        });
    });

    dom.chat.sendButton?.addEventListener("click", sendMessage);
    dom.chat.stopButton?.addEventListener("click", stopGeneration);

    dom.chat.micButton?.addEventListener("click", () => {
        if (!state.speechRecognition) {
            return;
        }

        triggerHaptic("light");
        if (dom.chat.micButton.classList.contains("active")) {
            state.continuousMic = false;
            state.speechRecognition.stop();
        } else {
            state.continuousMic = true;
            try {
                state.speechRecognition.start();
            } catch (_error) {
                // noop
            }
        }
    });

    dom.voice.launch?.addEventListener("click", () => {
        if (!state.speechRecognition) {
            return;
        }

        state.liveVoiceEnabled = true;
        dom.voice.overlay.classList.remove("hidden");
        dom.voice.text.textContent = "(Start speaking...)";
        if (dom.voice.log) {
            dom.voice.log.innerHTML =
                '<div style="color: var(--text-muted); font-size: 12px; text-align: center; margin-bottom: 5px;">Voice session started...</div>';
        }

        try {
            state.speechRecognition.start();
        } catch (_error) {
            // noop
        }
    });

    dom.voice.close?.addEventListener("click", () => {
        state.liveVoiceEnabled = false;
        state.speechRecognition?.stop();
        window.speechSynthesis?.cancel();
        dom.voice.overlay.classList.add("hidden");
    });

    dom.profile.saveButton?.addEventListener("click", () => {
        const newName = dom.profile.nameInput?.value.trim();
        if (!newName) {
            return;
        }
        state.currentUser.name = newName;
        dom.auth.welcomeName.textContent = `Welcome back, ${newName}!`;
        localStorage.setItem("one_user", JSON.stringify(state.currentUser));
    });

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = updateAvailableVoices;
        updateAvailableVoices();
    }

    initializeSpeechRecognition();
    initializeProfileUpload();
    resizeComposer();

    window.speakText = speakText;
});
