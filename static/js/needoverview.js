/* ============================================================
   SevaSetu – app.js
   Handles: skeleton → data reveal, row selection, tab filters
   ============================================================ */

// ── DATA ─────────────────────────────────────────────────────
const requests = [
  {
    id: 1,
    urgency: 9.2,
    urgencyColor: '#ef4444',
    title: 'Emergency Medical Supplies',
    category: 'HEALTHCARE',
    catClass: 'cat-healthcare',
    ngo: 'Red Cross City Unit',
    location: 'Central Delhi',
    volunteer: null,
    status: 'URGENT',
    statusClass: 'status-urgent',
    tab: 'open',
    snapshot: {
      timeCreated: '14:20 PM (2h ago)',
      location: 'Connaught Place',
      coords: '28.6328° N, 77.2197° E',
      ngoName: 'Red Cross Unit',
      ngoInitials: 'RC',
      ngoLogoColor: '#ef4444',
      trustScore: '9.8',
    },
  },
  {
    id: 2,
    urgency: 7.4,
    urgencyColor: '#f97316',
    title: 'Weekly Ration Distribution',
    category: 'FOOD SECURITY',
    catClass: 'cat-food-security',
    ngo: 'Feeding Hands',
    location: 'North Sector',
    volunteer: { initials: 'MS', name: 'M. Singh', color: '#059669' },
    status: 'IN PROGRESS',
    statusClass: 'status-inprogress',
    tab: 'assigned',
    snapshot: {
      timeCreated: '10:45 AM (5h ago)',
      location: 'North Sector Hub',
      coords: '28.7041° N, 77.1025° E',
      ngoName: 'Feeding Hands',
      ngoInitials: 'FH',
      ngoLogoColor: '#f97316',
      trustScore: '8.5',
    },
  },
  {
    id: 3,
    urgency: 3.1,
    urgencyColor: '#22c55e',
    title: 'Digital Literacy Workshop',
    category: 'EDUCATION',
    catClass: 'cat-education',
    ngo: 'Skill Foundation',
    location: 'South Extension',
    volunteer: { initials: 'AS', name: 'A. Sharma', color: '#7c3aed' },
    status: 'PLANNED',
    statusClass: 'status-planned',
    tab: 'assigned',
    snapshot: {
      timeCreated: '09:00 AM (7h ago)',
      location: 'South Extension',
      coords: '28.5672° N, 77.2100° E',
      ngoName: 'Skill Foundation',
      ngoInitials: 'SF',
      ngoLogoColor: '#3b82f6',
      trustScore: '7.9',
    },
  },
];

// ── STATE ─────────────────────────────────────────────────────
let activeTab = 'all';
let selectedId = 1;

// ── HELPERS ───────────────────────────────────────────────────
function filteredRequests() {
  if (activeTab === 'all') return requests;
  if (activeTab === 'open')     return requests.filter(r => r.tab === 'open');
  if (activeTab === 'assigned') return requests.filter(r => r.tab === 'assigned');
  if (activeTab === 'resolved') return [];
  return requests;
}

function volunteerCell(req) {
  if (!req.volunteer) {
    return `<span class="vol-unassigned">Unassigned</span>`;
  }
  return `
    <div class="vol-cell">
      <div class="vol-avatar" style="background:${req.volunteer.color};color:#fff">${req.volunteer.initials}</div>
      <span class="vol-name">${req.volunteer.name}</span>
    </div>`;
}

function buildRow(req) {
  const tr = document.createElement('tr');
  tr.dataset.id = req.id;
  if (req.id === selectedId) tr.classList.add('selected');

  tr.innerHTML = `
    <td>
      <div class="urgency-cell">
        <span class="urgency-dot" style="background:${req.urgencyColor}"></span>
        ${req.urgency}
      </div>
    </td>
    <td><strong>${req.title}</strong></td>
    <td><span class="cat-badge ${req.catClass}">${req.category}</span></td>
    <td>
      <div class="ngo-name">${req.ngo}</div>
      <div class="ngo-loc">${req.location}</div>
    </td>
    <td>${volunteerCell(req)}</td>
    <td><span class="status-badge ${req.statusClass}">${req.status}</span></td>
  `;

  tr.addEventListener('click', () => selectRow(req.id));
  return tr;
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  const rows = filteredRequests();
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">No requests found.</td>`;
    tbody.appendChild(tr);
    return;
  }
  rows.forEach(r => tbody.appendChild(buildRow(r)));
}

function renderSnapshot(id) {
  const req = requests.find(r => r.id === id);
  if (!req) return;
  const s = req.snapshot;

  document.getElementById('snapshotGrid').innerHTML = `
    <div class="snap-item">
      <div class="snap-label">Time Created</div>
      <div class="snap-value">${s.timeCreated}</div>
    </div>
    <div class="snap-item">
      <div class="snap-label">Recipient NGO</div>
      <div class="snap-value">${s.ngoName}</div>
    </div>
    <div class="snap-item">
      <div class="snap-label">Location</div>
      <div class="snap-value">${s.location}</div>
    </div>
    <div class="snap-item">
      <div class="snap-label">Coordinates</div>
      <div class="snap-value coords">${s.coords}</div>
    </div>
  `;

  document.getElementById('ngoCard').innerHTML = `
    <div class="ngo-logo" style="background:${s.ngoLogoColor}">${s.ngoInitials}</div>
    <div>
      <div class="ngo-card-name">${s.ngoName}</div>
      <div class="ngo-trust">
        <svg viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#22c55e"/>
          <path d="M5 8l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Trust Score ${s.trustScore}
      </div>
    </div>
  `;
}

function selectRow(id) {
  selectedId = id;
  // Update row highlights
  document.querySelectorAll('#tableBody tr').forEach(tr => {
    tr.classList.toggle('selected', parseInt(tr.dataset.id) === id);
  });
  renderSnapshot(id);
}

// ── TABS ──────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTable();

    // If selected row is not in view, auto-select first visible
    const visible = filteredRequests();
    if (visible.length && !visible.find(r => r.id === selectedId)) {
      selectRow(visible[0].id);
    }
  });
});

const volunteers = [
  { id: 'v1', initials: 'MS', name: 'M. Singh', color: '#059669', dist: '1.2 km', cert: 'Medical First-Responder' },
  { id: 'v2', initials: 'AS', name: 'A. Sharma', color: '#7c3aed', dist: '2.4 km', cert: 'Field Coordinator' },
  { id: 'v3', initials: 'RK', name: 'R. Kumar',  color: '#f97316', dist: '3.1 km', cert: 'Logistics' },
];

let selectedVolunteerId = null;

document.getElementById('forceBtn').addEventListener('click', () => {
  const modal = document.getElementById('assignModal');
  const list  = document.getElementById('volunteerList');
  selectedVolunteerId = null;

  list.innerHTML = volunteers.map(v => `
    <div class="vol-option" data-vid="${v.id}">
      <div class="vol-avatar" style="background:${v.color};color:#fff">${v.initials}</div>
      <div>
        <div class="vol-option-name">${v.name}</div>
        <div class="vol-option-meta">${v.dist} · ${v.cert}</div>
      </div>
      <div class="vol-check" id="check-${v.id}"></div>
    </div>
  `).join('');

  list.querySelectorAll('.vol-option').forEach(el => {
    el.addEventListener('click', () => {
      list.querySelectorAll('.vol-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedVolunteerId = el.dataset.vid;
    });
  });

  modal.style.display = 'flex';
});

document.getElementById('confirmAssign').addEventListener('click', () => {
  if (!selectedVolunteerId) {
    alert('Please select a volunteer first.');
    return;
  }
  const vol = volunteers.find(v => v.id === selectedVolunteerId);
  const req = requests.find(r => r.id === selectedId);
  req.volunteer = { initials: vol.initials, name: vol.name, color: vol.color };
  req.status = 'IN PROGRESS';
  req.statusClass = 'status-inprogress';
  req.tab = 'assigned';

  document.getElementById('assignModal').style.display = 'none';
  renderTable();
  renderSnapshot(selectedId);
  showToast(`${vol.name} assigned successfully!`);
});

['closeAssignModal', 'cancelAssign'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById('assignModal').style.display = 'none';
  });
});
document.querySelector('.btn-secondary').addEventListener('click', () => {
  document.getElementById('contactModal').style.display = 'flex';
});

document.getElementById('sendContact').addEventListener('click', () => {
  const msg = document.getElementById('contactMessage').value.trim();
  if (!msg) { alert('Please type a message.'); return; }
  document.getElementById('contactModal').style.display = 'none';
  document.getElementById('contactMessage').value = '';
  showToast('Message sent to NGO!');
});

['closeContactModal', 'cancelContact'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById('contactModal').style.display = 'none';
  });
});
document.querySelector('.btn-danger').addEventListener('click', () => {
  document.getElementById('closeModal').style.display = 'flex';
});

document.getElementById('confirmClose').addEventListener('click', () => {
  const idx = requests.findIndex(r => r.id === selectedId);
  if (idx !== -1) {
    requests[idx].status = 'RESOLVED';
    requests[idx].statusClass = 'status-planned'; // green styling
    requests[idx].tab = 'resolved';
  }
  document.getElementById('closeModal').style.display = 'none';
  renderTable();
  showToast('Request closed successfully.');
  // Auto-select next available request
  const next = filteredRequests()[0];
  if (next) selectRow(next.id);
});

['dismissCloseModal', 'cancelClose'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById('closeModal').style.display = 'none';
  });
});
function showToast(message) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-show'));
  setTimeout(() => {
    t.classList.remove('toast-show');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}
// ── SKELETON → CONTENT ────────────────────────────────────────
function revealContent() {
  // Hide skeletons
  document.getElementById('skeletonTable').style.display = 'none';
  document.getElementById('skeletonSnapshot').style.display = 'none';

  // Render real data
  renderTable();
  renderSnapshot(selectedId);

  // Show real content
  document.getElementById('dataTable').style.display = 'table';
  document.getElementById('snapshotContent').style.display = 'block';
}

// Simulate a 1.8s data load
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(revealContent, 1800);
});