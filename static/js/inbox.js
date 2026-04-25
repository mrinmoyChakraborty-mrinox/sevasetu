/**
 * inbox.js
 * Wires the Inbox UI using Socket.io for true real-time, bidirectional chat.
 */

document.addEventListener("DOMContentLoaded", function () {
    let activeConversationId = null;
    let currentUserUid = null;
    let socket = null;

    // --- State Initialization ---
    async function init() {
        // 1. Auth check
        const resp = await fetch("/api/check-auth");
        const auth = await resp.json();
        if (auth.authenticated) {
            currentUserUid = auth.user.uid;
            
            // 2. Initialize Socket
            initSocket();
            
            // 3. Load initial conversations list
            loadConversations();
        } else {
            window.location.href = "/getstarted";
        }
    }

    function initSocket() {
        socket = io();

        socket.on("connect", () => {
            console.log("✅ Socket connected:", socket.id);
        });

        socket.on("receive_message", (msg) => {
            // Only render if it belongs to the currently open chat
            if (activeConversationId === msg.conversation_id || !msg.conversation_id) {
                // If the message came from the socket, it might not have conversation_id explicitly 
                // depending on how we emit, but we know it's for this room.
                appendMessageToUI(msg);
                loadConversations(); // Update previews
            }
        });

        socket.on("display_typing", (data) => {
            const status = document.getElementById("chatUserStatus");
            if (status && activeConversationId) {
                status.textContent = data.is_typing ? "Typing..." : "Online";
                status.classList.toggle("text-primary", data.is_typing);
            }
        });
    }

    // --- Conversations List ---
    async function loadConversations() {
        try {
            const resp = await fetch("/api/chat/conversations");
            const data = await resp.json();
            renderConversations(data.conversations);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    }

    function renderConversations(conversations) {
        const list = document.getElementById("messagesList");
        if (!list) return;
        
        // Save current list state to avoid flickering? 
        // For now just re-render.
        list.innerHTML = "";

        if (conversations.length === 0) {
            list.innerHTML = `<div class="p-4 text-center text-outline text-sm">No messages yet.</div>`;
            return;
        }

        conversations.forEach(conv => {
            const item = document.createElement("div");
            item.className = `p-4 flex items-center gap-4 cursor-pointer hover:bg-white/50 rounded-2xl transition-all mb-2 ${activeConversationId === conv.id ? 'bg-white shadow-sm ring-1 ring-emerald-100' : ''}`;
            
            const photo = conv.other_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_name)}&background=random`;
            const lastMsg = conv.last_message || "No messages yet";

            item.innerHTML = `
                <div class="relative">
                    <img src="${photo}" class="w-12 h-12 rounded-full border shadow-sm">
                    <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div class="flex-1 overflow-hidden">
                    <div class="flex justify-between items-center">
                        <h4 class="font-bold text-sm truncate">${conv.other_name}</h4>
                        <span class="text-[10px] text-outline">${formatTime(conv.updated_at)}</span>
                    </div>
                    <p class="text-xs text-outline truncate">${lastMsg}</p>
                </div>
            `;

            item.addEventListener("click", () => selectConversation(conv));
            list.appendChild(item);
        });
    }

    // --- Selection ---
    async function selectConversation(conv) {
        if (activeConversationId) {
            socket.emit("leave", { conversation_id: activeConversationId });
        }

        activeConversationId = conv.id;
        socket.emit("join", { conversation_id: activeConversationId });

        // Update UI Header
        const headerName = document.getElementById("chatUserName");
        const headerImg = document.getElementById("chatUserImage");
        const headerStatus = document.getElementById("chatUserStatus");
        
        if (headerName) headerName.textContent = conv.other_name;
        if (headerImg) {
            headerImg.src = conv.other_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_name)}&background=random`;
            headerImg.classList.remove("hidden");
        }
        if (headerStatus) headerStatus.textContent = "Online";

        // Initial Load History
        await loadMessageHistory();
        
        // UI Polish
        document.querySelector("section.hidden.md\\:flex").classList.remove("hidden");
        loadConversations(); // Update active state in list
    }

    async function loadMessageHistory() {
        if (!activeConversationId) return;
        const container = document.getElementById("messagesContainer");
        container.innerHTML = `<div class="flex justify-center mt-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>`;

        try {
            const resp = await fetch(`/api/chat/messages/${activeConversationId}`);
            const data = await resp.json();
            container.innerHTML = "";
            data.messages.forEach(msg => appendMessageToUI(msg, false));
            container.scrollTop = container.scrollHeight;
        } catch (err) {
            console.error("History loading failed", err);
        }
    }

    function appendMessageToUI(msg, animate = true) {
        const container = document.getElementById("messagesContainer");
        if (!container) return;

        // Prevent duplicates (e.g. from history + socket race)
        if (document.getElementById(`msg-${msg.id}`)) return;

        const isMe = msg.sender_id === currentUserUid;
        const wrap = document.createElement("div");
        wrap.id = `msg-${msg.id}`;
        wrap.className = `flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 ${animate ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}`;
        
        wrap.innerHTML = `
            <div class="${isMe ? 'bg-primary text-white rounded-br-none shadow-emerald-100' : 'bg-[#eff4ff] text-on-surface rounded-bl-none shadow-blue-50'} px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-md relative group transition-all hover:scale-[1.02]">
                <p class="whitespace-pre-wrap">${escapeHTML(msg.text)}</p>
                <div class="flex items-center gap-1 justify-end mt-1 opacity-60">
                     <span class="text-[9px]">${formatTime(msg.created_at)}</span>
                     ${isMe ? '<span class="material-symbols-outlined text-[10px]">done_all</span>' : ''}
                </div>
            </div>
        `;
        container.appendChild(wrap);
        
        // Auto-scroll logic
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
        if (isAtBottom || isMe) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    }

    // --- Sending & Interaction ---
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    let typingTimeout = null;

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !activeConversationId || !socket) return;

        socket.emit("send_message", {
            conversation_id: activeConversationId,
            sender_id: currentUserUid,
            text: text
        });

        messageInput.value = "";
        socket.emit("typing", { conversation_id: activeConversationId, is_typing: false, user_id: currentUserUid });
    }

    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
    if (messageInput) {
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });

        messageInput.addEventListener("input", () => {
            if (!activeConversationId) return;
            socket.emit("typing", { conversation_id: activeConversationId, is_typing: true, user_id: currentUserUid });
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                socket.emit("typing", { conversation_id: activeConversationId, is_typing: false, user_id: currentUserUid });
            }, 1000);
        });
    }

    // --- Helpers ---
    function formatTime(val) {
        if (!val) return "";
        const d = new Date(val);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }

    init();
});