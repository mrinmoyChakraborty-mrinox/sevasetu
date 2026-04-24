/* ─── MODAL HELPERS ─────────────────────────────────────────── */
const overlay      = document.getElementById('modalOverlay');
const modal        = document.getElementById('modal');
const modalIcon    = document.getElementById('modalIcon');
const modalTitle   = document.getElementById('modalTitle');
const modalMsg     = document.getElementById('modalMsg');
const modalConfirm = document.getElementById('modalConfirm');
const modalClose   = document.getElementById('modalClose');

function openModal({ icon, title, msg, confirmText, onConfirm, confirmClass = 'btn-primary' }) {
  modalIcon.textContent  = icon;
  modalTitle.textContent = title;
  modalMsg.textContent   = msg;
  modalConfirm.textContent = confirmText;
  modalConfirm.className = `btn ${confirmClass} modal-confirm`;

  // Remove old listener and add fresh one
  const newBtn = modalConfirm.cloneNode(true);
  modalConfirm.replaceWith(newBtn);
  newBtn.addEventListener('click', () => { onConfirm && onConfirm(); closeModal(); });

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ─── ACCEPT TASK ───────────────────────────────────────────── */
document.getElementById('acceptBtn').addEventListener('click', () => {
  openModal({
    icon: '🎉',
    title: 'Accept this Task?',
    msg: 'You\'re about to commit to "Mobile Health Clinic Support for Urban Migrant Workers". The coordinator will be notified immediately.',
    confirmText: 'Yes, Accept Task',
    onConfirm: () => {
      const btn = document.getElementById('acceptBtn');
      btn.textContent = '✓ Task Accepted';
      btn.style.background = '#166534';
      btn.disabled = true;
      showToast('Task accepted! Arjun Mehta has been notified.', 'success');
    }
  });
});

/* ─── DECLINE ───────────────────────────────────────────────── */
document.getElementById('declineBtn').addEventListener('click', () => {
  openModal({
    icon: '🙁',
    title: 'Decline this Task?',
    msg: 'Are you sure you want to decline this opportunity? It will be reassigned to the next best matched volunteer.',
    confirmText: 'Yes, Decline',
    confirmClass: 'btn-outline',
    onConfirm: () => {
      showToast('Task declined. Thank you for letting us know.', 'info');
    }
  });
});

/* ─── CHAT DRAWER ───────────────────────────────────────────── */
const chatDrawer  = document.getElementById('chatDrawer');
const chatOverlay = document.getElementById('chatOverlay');
const chatInput   = document.getElementById('chatInput');
const chatMessages= document.getElementById('chatMessages');
const chatSend    = document.getElementById('chatSend');
const chatClose   = document.getElementById('chatClose');

function openChat() {
  chatDrawer.classList.add('active');
  chatOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => chatInput.focus(), 320);
}

function closeChat() {
  chatDrawer.classList.remove('active');
  chatOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('chatBtn').addEventListener('click', openChat);
chatClose.addEventListener('click', closeChat);
chatOverlay.addEventListener('click', closeChat);

// Auto-replies for demo
const autoReplies = [
  "Sure! Happy to walk you through the process. 😊",
  "The drive is this weekend — Saturday 8 AM at the North District community centre.",
  "Please bring your volunteer ID and wear comfortable clothes!",
  "Any other questions? I'm here to help.",
  "Looking forward to working with you on this mission! 💪"
];
let replyIndex = 0;

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = text;
  chatMessages.appendChild(userBubble);
  chatInput.value = '';
  scrollChat();

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'chat-bubble arjun';
  typing.textContent = '…';
  typing.style.opacity = '.5';
  chatMessages.appendChild(typing);
  scrollChat();

  // Auto-reply after delay
  setTimeout(() => {
    typing.remove();
    const reply = document.createElement('div');
    reply.className = 'chat-bubble arjun';
    reply.textContent = autoReplies[replyIndex % autoReplies.length];
    replyIndex++;
    chatMessages.appendChild(reply);
    scrollChat();
  }, 900 + Math.random() * 600);
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

function scrollChat() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ─── TOAST NOTIFICATION ────────────────────────────────────── */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  const bg    = type === 'success' ? '#1a6b4a' : '#374151';
  const emoji = type === 'success' ? '✓ ' : 'ℹ ';

  Object.assign(toast.style, {
    position:      'fixed',
    bottom:        '28px',
    left:          '50%',
    transform:     'translateX(-50%) translateY(80px)',
    background:    bg,
    color:         'white',
    padding:       '13px 24px',
    borderRadius:  '12px',
    fontSize:      '14px',
    fontWeight:    '600',
    fontFamily:    'DM Sans, sans-serif',
    boxShadow:     '0 8px 30px rgba(0,0,0,.2)',
    zIndex:        '1000',
    transition:    'transform .35s cubic-bezier(.4,0,.2,1), opacity .35s',
    whiteSpace:    'nowrap'
  });
  toast.textContent = emoji + message;

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
    toast.style.opacity   = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}