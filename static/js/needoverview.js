/* ═══════════════════════════════════════════
   SEVASETU ADMIN DASHBOARD — script.js
═══════════════════════════════════════════ */

'use strict';

/* ── Data ── */
const requests = [
  {
    id: 1,
    urgency: 9.2,
    level: 'high',
    title: 'Emergency Medical Supplies',
    ai: true,
    category: 'Healthcare',
    ngo: 'Red Cross City Unit',
    location: 'Central Delhi',
    volunteer: null,
    status: 'urgent',
    created: '14:20 PM (2h ago)',
    coords: '28.6328° N, 77.2197° E',
    snapLocation: 'Connaught Place',
    ngoShort: 'RC',
    ngoFull: 'Red Cross Unit',
    trustScore: '9.8',
    ai_body: `This request for <strong>Emergency Medical Supplies</strong> is prioritised due to hospital overflow alerts in Delhi Central. Recommendation: Assign to <u>Volunteer M. Singh</u> based on proximity (1.2 km) and medical first-responder certification.`,
    ai_conf: '98% Match Confidence',
    ngoColor: 'linear-gradient(135deg,#c0392b,#e74c3c)',
  },
  {
    id: 2,
    urgency: 7.4,
    level: 'mid',
    title: 'Weekly Ration Distribution',
    ai: false,
    category: 'Food Security',
    ngo: 'Feeding Hands',
    location: 'North Sector',
    volunteer: { initials: 'MS', name: 'M. Singh', class: 'va-green' },
    status: 'progress',
    created: '09:45 AM (7h ago)',
    coords: '28.7041° N, 77.1025° E',
    snapLocation: 'Rohini Sector 8',
    ngoShort: 'FH',
    ngoFull: 'Feeding Hands NGO',
    trustScore: '8.5',
    ai_body: `<strong>Weekly Ration Distribution</strong> in North Sector. M. Singh has confirmed availability and is currently in transit. Expected delivery window: 3–5 PM today.`,
    ai_conf: '85% Match Confidence',
    ngoColor: 'linear-gradient(135deg,#16a085,#27ae60)',
  },
  {
    id: 3,
    urgency: 3.1,
    level: 'low',
    title: 'Digital Literacy Workshop',
    ai: false,
    category: 'Education',
    ngo: 'Skill Foundation',
    location: 'South Extension',
    volunteer: { initials: 'AS', name: 'A. Sharma', class: 'va-amber' },
    status: 'planned',
    created: '08:00 AM (9h ago)',
    coords: '28.5672° N, 77.2100° E',
    snapLocation: 'South Extension Part II',
    ngoShort: 'SF',
    ngoFull: 'Skill Foundation Trust',
    trustScore: '9.1',
    ai_body: `<strong>Digital Literacy Workshop</strong> is scheduled for Saturday. A. Sharma has all required teaching materials. Venue confirmed at Skill Foundation community hall.`,
    ai_conf: '72% Match Confidence',
    ngoColor: 'linear-gradient(135deg,#8e44ad,#9b59b6)',
  },
];

/* Active filter state */
let activeFilter = 'all';
let selectedId = 1;

/* ── Helpers ── */
function levelClass(level) {
  return level === 'high' ? 'high' : level === 'mid' ? 'mid' : 'low';
}
function scoreClass(level) {
  return level === 'high' ? 'score-high' : level === 'mid' ? 'score-mid' : 'score-low';
}
function statusMeta(status) {
  const map = {
    urgent:   { cls: 's-urgent',   label: 'Urgent' },
    progress: { cls: 's-progress', label: 'In Progress' },
    planned:  { cls: 's-planned',  label: 'Planned' },
    resolved: { cls: 's-planned',  label: 'Resolved' },
    open:     { cls: 's-urgent',   label: 'Open' },
  };
  return map[status] || { cls: '', label: status };
}

/* Filter mapping */
function matchesFilter(req, filter) {
  if (filter === 'all') return true;
  if (filter === 'open') return req.status === 'urgent' || req.volunteer === null;
  if (filter === 'assigned') return req.volunteer !== null && req.status !== 'resolved';
  if (filter === 'resolved') return req.status === 'resolved';
  return true;
}

/* ── Render table rows ── */
function renderTable() {
  const tbody = document.getElementById('tableBody');
  const filtered = requests.filter(r => matchesFilter(r, activeFilter));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-faint);font-style:italic;">No requests found for this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(req => {
    const { cls: sCls, label: sLabel } = statusMeta(req.status);
    const rowBg = req.level === 'high' ? 'row-urgent-bg' : '';
    const isSelected = req.id === selectedId ? 'selected' : '';

    const volunteerCell = req.volunteer
      ? `<div class="vol-cell">
           <div class="vol-avatar ${req.volunteer.class}">${req.volunteer.initials}</div>
           <span class="vol-name">${req.volunteer.name}</span>
         </div>`
      : `<span class="unassigned">Unassigned</span>`;

    const aiBadge = req.ai
      ? `<span class="material-symbols-outlined ai-badge" style="font-variation-settings:'FILL' 1">auto_awesome</span>`
      : '';

    return `
      <tr class="${rowBg} ${isSelected}" data-id="${req.id}" tabindex="0" role="row" aria-selected="${req.id === selectedId}">
        <td>
          <div class="urgency-cell">
            <div class="urgency-dot ${levelClass(req.level)}"></div>
            <span class="urgency-score ${scoreClass(req.level)}">${req.urgency}</span>
          </div>
        </td>
        <td>
          <div class="need-title-cell">
            <span>${req.title}</span>
            ${aiBadge}
          </div>
        </td>
        <td><span class="cat-badge">${req.category}</span></td>
        <td>
          <div>
            <p class="ngo-cell-name">${req.ngo}</p>
            <p class="ngo-cell-loc">${req.location}</p>
          </div>
        </td>
        <td>${volunteerCell}</td>
        <td>
          <div class="status-badge ${sCls}">
            <div class="status-dot"></div>
            <span class="status-label">${sLabel}</span>
          </div>
        </td>
      </tr>`;
  }).join('');

  /* Re-attach row click events */
  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => selectRow(Number(tr.dataset.id)));
    tr.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') selectRow(Number(tr.dataset.id));
    });
  });
}

/* ── Update detail panel ── */
function updatePanel(req) {
  document.getElementById('aiConf').textContent  = req.ai_conf;
  document.getElementById('aiBody').innerHTML    = req.ai_body;
  document.getElementById('snapTime').textContent = req.created;
  document.getElementById('snapLoc').textContent  = req.snapLocation;
  document.getElementById('snapCoords').textContent = req.coords;
  document.getElementById('ngoName').textContent  = req.ngoFull;
  document.getElementById('trustScore').textContent = `Trust Score ${req.trustScore}`;
  document.getElementById('ngoLogo').textContent = req.ngoShort;
  document.getElementById('ngoLogo').style.background = req.ngoColor;

  /* Animate panel refresh */
  const panel = document.getElementById('detailPanel');
  panel.style.opacity = '0';
  panel.style.transform = 'translateY(10px)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.transition = 'opacity .3s ease, transform .3s ease';
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    });
  });
}

/* ── Select a row ── */
function selectRow(id) {
  selectedId = id;
  renderTable();
  const req = requests.find(r => r.id === id);
  if (req) updatePanel(req);
}

/* ── Tab switching ── */
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });
}

/* ── Filter chips (visual feedback only) ── */
function initFilterChips() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });
}

/* ── Action buttons ── */
function initActions() {
  document.getElementById('btnAssign').addEventListener('click', () => {
    const req = requests.find(r => r.id === selectedId);
    if (!req) return;
    if (req.volunteer) {
      showToast(`✓ Already assigned to ${req.volunteer.name}`);
    } else {
      req.volunteer = { initials: 'MS', name: 'M. Singh', class: 'va-green' };
      req.status = 'progress';
      renderTable();
      updatePanel(req);
      showToast('⚡ Volunteer assigned successfully!');
    }
  });

  document.querySelector('.btn-secondary').addEventListener('click', () => {
    const req = requests.find(r => r.id === selectedId);
    showToast(`📞 Contacting ${req ? req.ngoFull : 'NGO'}…`);
  });

  document.querySelector('.btn-danger').addEventListener('click', () => {
    const req = requests.find(r => r.id === selectedId);
    if (!req) return;
    req.status = 'resolved';
    renderTable();
    updatePanel(req);
    showToast('✗ Request closed.');
  });
}

/* ── Search bar (client-side filter) ── */
function initSearch() {
  const input = document.querySelector('.search-input');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('#tableBody tr[data-id]').forEach(tr => {
      const text = tr.textContent.toLowerCase();
      tr.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

/* ── Toast notification ── */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  updatePanel(requests.find(r => r.id === selectedId));
  initTabs();
  initFilterChips();
  initActions();
  initSearch();

  /* Nav button highlight feedback */
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});