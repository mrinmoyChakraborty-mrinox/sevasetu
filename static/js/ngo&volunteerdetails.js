/**
 * ngo&volunteerdetails.js
 * Merged Coordination & UI logic with Skeleton Loading.
 */

document.addEventListener("DOMContentLoaded", async function () {
    const needId = document.getElementById("needId").value;
    const userRole = document.getElementById("userRole").value;

    console.log(`[Details] Initializing for Need: ${needId}, Role: ${userRole}`);

    // --- 1. SKELETON LOADING ---
    showSkeletons();
    
    // Simulating a slightly longer load for aesthetics (and real fetching)
    try {
        await Promise.all([
            loadAssignedVolunteer(needId),
            // Add other async loads here if needed
        ]);
    } finally {
        hideSkeletons();
    }

    // --- 2. COORDINATION LOGIC ---

    // Action: Accept Task (Volunteer)
    const acceptBtn = document.getElementById("acceptBtn");
    if (acceptBtn) {
        acceptBtn.addEventListener("click", () => {
            openModal({
                icon: '🎉',
                title: 'Ready to Help?',
                msg: 'You are about to accept this mission. The coordinating NGO will be notified immediately.',
                confirmText: 'Yes, Accept Task',
                onConfirm: async () => {
                    try {
                        const resp = await fetch(`/api/volunteer/task/${needId}/accept`, { method: "POST" });
                        const result = await resp.json();
                        if (result.success) {
                            showToast("Mission accepted! You can now start coordinating.", "success");
                            setTimeout(() => window.location.reload(), 1500);
                        } else {
                            showToast(result.error || "Failed to accept", "error");
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Network error", "error");
                    }
                }
            });
        });
    }

    // Action: Chat with NGO (Volunteer)
    const chatNgoBtn = document.getElementById("chatWithNgoBtn");
    if (chatNgoBtn) {
        chatNgoBtn.addEventListener("click", () => handleStartChat('ngo'));
    }

    // Action: Chat with Volunteer (NGO)
    const chatVolBtn = document.getElementById("chatWithVolBtn");
    if (chatVolBtn) {
        chatVolBtn.addEventListener("click", () => handleStartChat('vol'));
    }

    // --- 3. CHAT DRAWER LOGIC ---
    const chatDrawer = document.getElementById('chatDrawer');
    const chatOverlay = document.getElementById('chatOverlay');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');

    async function handleStartChat(targetRole) {
        try {
            const apiPath = targetRole === 'ngo' ? `/api/chat/start-with-ngo/${needId}` : `/api/chat/start-with-vol/${needId}`;
            const resp = await fetch(apiPath, { method: "POST" });
            const data = await resp.json();
            
            if (data.success) {
                // For now, redirect to Inbox for the full experience
                // Optimization: In future versions, we can load the drawer here
                window.location.href = `/inbox?conv_id=${data.conversation_id}`;
            } else {
                showToast("Could not start chat session", "error");
            }
        } catch (e) {
            showToast("Server error", "error");
        }
    }

    if (chatClose) chatClose.addEventListener('click', () => {
        chatDrawer.classList.remove('active');
        chatOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    if (chatOverlay) chatOverlay.addEventListener('click', () => {
        chatDrawer.classList.remove('active');
        chatOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
});

/* ─── DATA LOADING ─────────────────────────────────────────── */

async function loadAssignedVolunteer(needId) {
    const volNameEl = document.getElementById("volName");
    const volAvatarEl = document.getElementById("volAvatar");
    
    if (!volNameEl) return;

    try {
        const resp = await fetch(`/api/need/${needId}`);
        const data = await resp.json();
        
        if (data && data.assigned_volunteer) {
            volNameEl.textContent = data.assigned_volunteer.name || "Volunteer";
            if (data.assigned_volunteer.photo_url) {
                volAvatarEl.innerHTML = `<img src="${data.assigned_volunteer.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
            } else {
                volAvatarEl.textContent = (data.assigned_volunteer.name || "V")[0];
            }
        } else {
            // Not assigned yet
            const volInfo = document.getElementById("assignedVolInfo");
            if (volInfo) volInfo.innerHTML = `<p class="text-xs text-on-surface-variant italic">No volunteer assigned yet.</p>`;
        }
    } catch (e) {
        console.warn("[Details] Failed to load volunteer data:", e);
    }
}

/* ─── MODAL HELPERS ─────────────────────────────────────────── */
const overlay      = document.getElementById('modalOverlay');
const modal        = document.getElementById('modal');
const modalIcon    = document.getElementById('modalIcon');
const modalTitle   = document.getElementById('modalTitle');
const modalMsg     = document.getElementById('modalMsg');
const modalConfirm = document.getElementById('modalConfirm');
const modalClose   = document.getElementById('modalClose');

function openModal({ icon, title, msg, confirmText, onConfirm, confirmClass = 'btn-primary' }) {
  if (!overlay || !modal) return;
  
  modalIcon.textContent  = icon;
  modalTitle.textContent = title;
  modalMsg.textContent   = msg;
  modalConfirm.textContent = confirmText;
  modalConfirm.className = `btn ${confirmClass} modal-confirm`;

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

if (modalClose) modalClose.addEventListener('click', closeModal);

/* ─── TOAST NOTIFICATION ────────────────────────────────────── */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  const bg    = type === 'success' ? '#1a6b4a' : (type === 'error' ? '#991b1b' : '#374151');
  const emoji = type === 'success' ? '✓ ' : (type === 'error' ? '✕ ' : 'ℹ ');

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

/* ─── SKELETON LOADING ─────────────────────────────────────── */
function showSkeletons() {
    // Add skeleton classes to elements
    const volCard = document.querySelector('.volunteer-card');
    if (volCard) {
        volCard.querySelectorAll('.volunteer-name, #volAvatar').forEach(el => {
            el.classList.add('skeleton-box');
        });
    }
}

function hideSkeletons() {
    document.querySelectorAll('.skeleton-box').forEach(el => {
        el.classList.remove('skeleton-box');
    });
}