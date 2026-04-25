/* ================================================================
   topbar.js  — Shared top bar behaviour for all authenticated pages
   Handles:
     1. Lazy-load avatar (photo_url) from /api/user/topbar
     2. Notification bell:
        - If push already granted + FCM token saved → hide bell
        - If not → show bell as a one-time prompt trigger
     3. Chat inbox icon — always rendered, links to /inbox
   ================================================================ */

'use strict';

(async function initTopBar() {

  // ── 0. Fetch topbar data (avatar + notification state) ──────
  let topbarData = {};
  try {
    const res = await fetch('/api/user/topbar');
    if (res.ok) topbarData = await res.json();
  } catch (e) {
    console.warn('[topbar] /api/user/topbar failed:', e);
  }

  // ── 1. Lazy-load avatar ──────────────────────────────────────
  const avatarEl = document.getElementById('topbar-avatar');
  if (avatarEl) {
    if (topbarData.photo_url) {
      avatarEl.src = topbarData.photo_url;
      avatarEl.alt = topbarData.name || 'Profile';
    } else {
      // Fallback: initials avatar if no photo_url
      avatarEl.style.display = 'none';
      const fallback = document.getElementById('topbar-avatar-fallback');
      if (fallback) {
        const initials = (topbarData.name || 'U').charAt(0).toUpperCase();
        fallback.textContent = initials;
        fallback.style.display = 'flex';
      }
    }
  }

  // ── 2. Chat inbox icon — always shown ───────────────────────
  const chatIcon = document.getElementById('topbar-chat-btn');
  if (chatIcon) chatIcon.style.display = 'flex';

  // ── 3. Notification bell logic ───────────────────────────────
  const bellBtn = document.getElementById('topbar-bell-btn');
  if (!bellBtn) return;

  // If already enabled in Firestore, hide the bell
  if (topbarData.notifications_enabled) {
    bellBtn.style.display = 'none';
    return;
  }

  // Browser doesn't support push or already denied — also hide
  if (!('Notification' in window) || Notification.permission === 'denied') {
    bellBtn.style.display = 'none';
    return;
  }

  // Already granted at browser level but token not yet saved → try saving silently
  if (Notification.permission === 'granted') {
    await _requestAndSaveFcmToken(bellBtn);
    return;
  }

  // Permission is 'default' — show bell as invite to enable
  bellBtn.style.display = 'flex';
  bellBtn.title = 'Enable push notifications';
  bellBtn.addEventListener('click', async () => {
    await _requestAndSaveFcmToken(bellBtn);
  });

  // ── 4. Logout interceptor ──────────────────────────────────
  _setupLogoutHandler();

})();

// ────────────────────────────────────────────────────────────────
// Internal: Intercept logout to remove current FCM token
// ────────────────────────────────────────────────────────────────
function _setupLogoutHandler() {
  const logoutLinks = document.querySelectorAll('a[href="/logout"]');
  logoutLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      const token = localStorage.getItem('current_fcm_token');
      if (token) {
        e.preventDefault(); // Pause navigation
        try {
          await fetch('/api/user/fcm-token', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
          localStorage.removeItem('current_fcm_token');
        } catch (err) {
          console.error('[topbar] Logout token removal failed:', err);
        }
        window.location.href = '/logout'; // Proceed
      }
    });
  });
}

// ────────────────────────────────────────────────────────────────
// Internal: request FCM token and save it, then hide bell
// ────────────────────────────────────────────────────────────────
async function _requestAndSaveFcmToken(bellBtn) {
  try {
    // Step 1 — ask for permission (no-op if already granted)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (bellBtn) bellBtn.style.display = 'none'; 
      return;
    }

    // Step 2 — initialize Firebase Messaging and get token
    const { firebaseConfig } = await _getFirebaseConfig();
    if (!firebaseConfig) return;

    // Dynamically import Firebase modules (only when needed)
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getMessaging, getToken } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');

    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    const messaging = getMessaging(app);
    
    // Register Service Worker for background
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/static/firebase-messaging-sw.js');
      registration.active?.postMessage({ type: 'SET_CONFIG', config: firebaseConfig });
    }

    const fcmToken  = await getToken(messaging, { vapidKey: firebaseConfig.vapidKey });

    if (!fcmToken) {
      console.warn('[topbar] FCM getToken returned empty');
      return;
    }

    // Handle incoming messages while in foreground
    const { onMessage } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
    onMessage(messaging, (payload) => {
      console.log('[topbar] Foreground message:', payload);
      _showTopbarToast(`🔔 ${payload.notification.title}: ${payload.notification.body}`);
    });

    // Store locally for logout cleanup

    localStorage.setItem('current_fcm_token', fcmToken);

    // Step 3 — save token to backend
    await fetch('/api/user/fcm-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: fcmToken }),
    });

    // Step 4 — hide bell (notification is now enabled)
    if (bellBtn) bellBtn.style.display = 'none';

    // Visual confirmation
    _showTopbarToast('🔔 Push notifications enabled!');

  } catch (err) {
    console.error('[topbar] FCM registration failed:', err);
  }
}


async function _getFirebaseConfig() {
  try {
    const res = await fetch('/api/get_firebase_config');
    const firebaseConfig = await res.json();
    return { firebaseConfig };
  } catch {
    return { firebaseConfig: null };
  }
}

function _showTopbarToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = [
    'position:fixed;bottom:80px;right:24px;z-index:9999;',
    'background:white;border-left:4px solid #006c44;border-radius:.75rem;',
    'padding:14px 18px;box-shadow:0 8px 32px rgba(0,0,0,.12);',
    "font-size:.875rem;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;",
    'color:#121c2a;cursor:pointer;max-width:300px;',
  ].join('');
  toast.textContent = message;
  toast.addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all .3s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
