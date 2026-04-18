/* ============================================================
   app.js — SevaSetu Volunteer Dashboard
   Handles: nav dropdown, all-tasks modal, map modal
   ============================================================ */

/* ── 1. HAMBURGER NAV DROPDOWN ─────────────────────────────
   Toggles the top-right navigation dropdown menu.
   Closes when user clicks anywhere outside.
*/
const menuWrap = document.querySelector('.menu-wrap');
const navDd    = document.getElementById('nav-dd');

document.querySelector('.menu-btn')?.addEventListener('click', () => {
  navDd.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (menuWrap && !menuWrap.contains(e.target)) {
    navDd.classList.remove('open');
  }
});


/* ── 2. GENERIC MODAL HELPERS ──────────────────────────────
   openModal(id)  → adds .open class, locks body scroll
   closeModal(id) → removes .open class, restores scroll
   closeOnBackdrop(id) → closes if user clicks the dark backdrop
*/
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

function closeOnBackdrop(event, id) {
  // Only close if the click is directly on the backdrop (not the modal box)
  if (event.target === document.getElementById(id)) {
    closeModal(id);
  }
}


/* ── 3. ALL TASKS MODAL ────────────────────────────────────
   "View All" button opens #all-tasks-modal showing every task.
*/
document.getElementById('view-all-btn')?.addEventListener('click', () => {
  openModal('all-tasks-modal');
});

document.getElementById('close-tasks-modal')?.addEventListener('click', () => {
  closeModal('all-tasks-modal');
});


/* ── 4. MAP MODAL ──────────────────────────────────────────
   "Find Task" button opens #map-modal with the full interactive map.
*/
document.getElementById('find-task-btn')?.addEventListener('click', () => {
  openModal('map-modal');
});

document.getElementById('close-map-modal')?.addEventListener('click', () => {
  closeModal('map-modal');
});


/* ── 5. KEYBOARD ACCESSIBILITY ─────────────────────────────
   Pressing Escape closes any open modal.
*/
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal('all-tasks-modal');
    closeModal('map-modal');
  }
});


/* ── 6. ACCEPT / DECLINE TASK FEEDBACK ─────────────────────
   Clicking "Accept Task" shows a brief green confirmation.
   Clicking "Decline" shows a brief grey dismissal.
   In production: replace with real API call.
*/
document.querySelectorAll('.btn-accept').forEach(btn => {
  btn.addEventListener('click', function () {
    const card = this.closest('.task-card');
    const original = this.textContent;
    this.textContent = '✓ Accepted!';
    this.style.background = '#059669';
    setTimeout(() => {
      this.textContent = original;
      this.style.background = '';
    }, 1800);
  });
});

document.querySelectorAll('.btn-decline').forEach(btn => {
  btn.addEventListener('click', function () {
    const card = this.closest('.task-card');
    card.style.opacity = '0.4';
    card.style.pointerEvents = 'none';
    setTimeout(() => {
      card.style.opacity = '';
      card.style.pointerEvents = '';
    }, 1500);
  });
});
