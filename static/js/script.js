/* =============================================
   SevaSetu — Global JavaScript
   ============================================= */


// =============================================
// Mobile Menu Toggle
// =============================================

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });
}


// =============================================
// Smooth Scroll for Anchor Links
// =============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});


// =============================================
// Button Hover Scale Effect
// =============================================

document.querySelectorAll('.btn-scale').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.03)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
    });
});


// =============================================
// Toast Notification Helper
// =============================================

const toastAudio = new Audio('/static/sounds/toast.mp3');

function showToast(message, type = 'default') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Play sound
    toastAudio.currentTime = 0;
    toastAudio.play().catch(e => console.log('Audio play failed:', e));

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'urgent' ? 'urgent' : ''}`;
    toast.innerText = message;

    toast.addEventListener('click', () => toast.remove());

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


// =============================================
// Upload Drop Zone
// =============================================

function initUploadZone(zoneId, inputId, onFile) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);

    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && onFile) onFile(file);
    });

    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file && onFile) onFile(file);
    });
}


// =============================================
// Skeleton Loader Helper
// =============================================

function showSkeleton(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="seva-card mb-3">
                <div class="skeleton h-4 w-3/4 mb-3"></div>
                <div class="skeleton h-3 w-full mb-2"></div>
                <div class="skeleton h-3 w-2/3"></div>
            </div>
        `;
    }
}


// =============================================
// Active Nav Link Highlighter
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});


// =============================================
// Online / Offline Toggle (Worker/Volunteer)
// =============================================

const onlineToggle = document.getElementById('onlineToggle');
const statusText = document.getElementById('statusText');

if (onlineToggle && statusText) {
    onlineToggle.addEventListener('change', async function () {
        const isOnline = this.checked;
        statusText.textContent = isOnline ? 'Online' : 'Offline';

        try {
            await fetch('/api/volunteer/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ online: isOnline })
            });
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    });
}


// =============================================
// Urgency Score → Color Class Helper
// =============================================

function getUrgencyClass(score) {
    if (score <= 3) return 'urgency-low';
    if (score <= 6) return 'urgency-medium';
    return 'urgency-high';
}

function getUrgencyLabel(score) {
    if (score <= 3) return 'Low';
    if (score <= 6) return 'Medium';
    return 'High';
}


// =============================================
// Format Firestore Timestamp
// =============================================

function formatTimestamp(timestamp) {
    if (!timestamp) return '—';
    if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }
    return new Date(timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);

    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}