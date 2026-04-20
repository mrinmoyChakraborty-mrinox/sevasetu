/* =====================================================
   volunteer_dashboard.js
   Handles: dashboard data load, stats, task cards,
            accept/decline actions, Ola Maps modal,
            online toggle, task status updates
   ===================================================== */

const OLA_MAPS_API_KEY = "cRtJZjnZnTH4ugwi0vxlaaiW436RH5LRwMNS6F7h";

// ─────────────────────────────────────────────
// 1. INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  initOnlineToggle();
  initNavDropdown();
  initKeyboardEscape();
});


// ─────────────────────────────────────────────
// 2. MAIN DASHBOARD LOADER
// ─────────────────────────────────────────────

async function loadDashboard() {
  showSkeletons();

  try {
    const res = await fetch("/api/volunteer/dashboard");

    if (res.status === 401) {
      window.location.href = "/getstarted";
      return;
    }

    if (!res.ok) throw new Error("Failed to load dashboard");

    const data = await res.json();

    renderWelcome(data.volunteer_name);
    renderStats(data.stats);
    renderTasksForYou(data.matched_tasks);
    renderAcceptedTasks(data.accepted_tasks);
    // 2. CALL THE MINIMAP FUNCTION HERE! 
    initMiniMap(data.matched_tasks);

  } catch (err) {
    console.error("Dashboard error:", err);
    showDashboardError();
  }
}


// ─────────────────────────────────────────────
// 3. WELCOME BAR
// ─────────────────────────────────────────────

function renderWelcome(name) {
  const el = document.getElementById("welcomeHeading");
  if (!el) return;
  const hour     = new Date().getHours();
  const emoji    = hour < 12 ? "🌅" : hour < 17 ? "🌱" : "🌙";
  el.textContent = `Hello, ${name || "there"}! Ready to make a difference? ${emoji}`;
}


// ─────────────────────────────────────────────
// 4. STATS ROW
// ─────────────────────────────────────────────

function renderStats(stats) {
  if (!stats) return;
  animateCounter("statMatched",   stats.tasks_matched   || 0);
  animateCounter("statCompleted", stats.tasks_completed || 0);
  setRating("statRating",         stats.rating          || 0);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const steps    = 40;
  const interval = 800 / steps;
  const inc      = target / steps;
  const timer = setInterval(() => {
    current += inc;
    if (current >= target) { el.textContent = target; clearInterval(timer); }
    else el.textContent = Math.floor(current);
  }, interval);
}

function setRating(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = Number(value).toFixed(1);
}


// ─────────────────────────────────────────────
// 5. TASKS FOR YOU (matched, pending acceptance)
// ─────────────────────────────────────────────

function renderTasksForYou(tasks) {
  const container = document.getElementById("tasksForYou");
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div style="padding:32px;text-align:center;color:#6e7a71;">
        <span class="material-symbols-outlined" style="font-size:2.5rem;display:block;margin-bottom:8px;">task_alt</span>
        <p style="font-weight:600;">No new tasks matched yet.</p>
        <p style="font-size:.82rem;margin-top:4px;">Check back soon — new needs are added daily.</p>
      </div>`;
    return;
  }

  // Show 2 in dashboard, rest in modal
  container.innerHTML = tasks.slice(0, 2).map(task =>
    buildTaskCard(task)
  ).join("");

  // Wire up accept/decline on newly rendered cards
  wireTaskActions(container);

  // Populate the "View All" modal too
  populateAllTasksModal(tasks);
}

function buildTaskCard(task) {
  const uc = getUrgencyChip(task.urgency_label, task.urgency_score);
  return `
    <div class="task-card" data-task-id="${escHtml(task.id)}">
      <div class="task-top">
        <span class="urgency-chip ${uc.cls}">
          <span class="uc-dot"></span>${uc.label}
        </span>
        <span class="task-dist">
          <span class="material-symbols-outlined">distance</span>
          ${task.distance_km ? task.distance_km + " km" : "Nearby"}
        </span>
      </div>
      <div class="task-name">${escHtml(task.title)}</div>
      <div class="task-org">${escHtml(task.ngo_name || "NGO")} · ${escHtml(task.location || "")}</div>
      <div class="task-tags">
        ${(task.required_skills || []).slice(0, 3).map(s =>
          `<span class="task-tag">${escHtml(s)}</span>`
        ).join("")}
      </div>
      <div class="task-actions">
        <button class="btn-accept" data-id="${escHtml(task.id)}">Accept Task</button>
        <button class="btn-decline" data-id="${escHtml(task.id)}">Decline</button>
      </div>
    </div>`;
}

function populateAllTasksModal(tasks) {
  const container = document.getElementById("allTasksBody");
  if (!container) return;

  document.getElementById("allTasksCount").textContent =
    `${tasks.length} tasks available in your area today`;

  container.innerHTML = tasks.map(task => buildTaskCard(task)).join("");
  wireTaskActions(container);
}

function wireTaskActions(container) {
  container.querySelectorAll(".btn-accept").forEach(btn => {
    btn.addEventListener("click", () => acceptTask(btn.dataset.id, btn));
  });
  container.querySelectorAll(".btn-decline").forEach(btn => {
    btn.addEventListener("click", () => declineTask(btn.dataset.id, btn));
  });
}


// ─────────────────────────────────────────────
// 6. ACCEPTED TASKS (in progress)
// ─────────────────────────────────────────────

function renderAcceptedTasks(tasks) {
  const container = document.getElementById("acceptedTasksGrid");
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div style="padding:24px;text-align:center;color:#6e7a71;grid-column:1/-1;">
        <p style="font-weight:600;">No accepted tasks yet.</p>
        <p style="font-size:.82rem;margin-top:4px;">Accept a task above to get started.</p>
      </div>`;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const progress = task.progress_pct || 0;
    const statusCls = task.status === "in_progress" ? "sc-green" : "sc-amber";
    const statusLabel = task.status === "in_progress" ? "In Progress" : "Confirmed";
    return `
      <div class="accepted-card" data-task-id="${escHtml(task.id)}">
        <div class="accepted-top">
          <div>
            <div class="accepted-name">${escHtml(task.title)}</div>
            <div class="accepted-due">${escHtml(task.deadline_text || "")}</div>
          </div>
          <span class="status-chip ${statusCls}">${statusLabel}</span>
        </div>
        <div>
          <div class="progress-label">
            <span>${escHtml(task.phase || "In Progress")}</span>
            <span>${progress}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${progress}%;"></div>
          </div>
        </div>
        <button class="view-details-btn"
                onclick="window.location.href='/volunteer/task/${task.id}'">
          View Details
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>`;
  }).join("");
}


// ─────────────────────────────────────────────
// 7. ACCEPT / DECLINE ACTIONS
// ─────────────────────────────────────────────

async function acceptTask(taskId, btn) {
  if (!taskId) return;

  const original = btn.textContent;
  btn.disabled   = true;
  btn.textContent = "Accepting...";

  try {
    const res = await fetch(`/api/volunteer/task/${taskId}/accept`, {
      method: "POST"
    });

    if (!res.ok) throw new Error();

    btn.textContent = "✓ Accepted!";
    btn.style.background = "#059669";

    // Remove card from "Tasks For You" after short delay
    setTimeout(() => {
      const card = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
      if (card) {
        card.style.opacity    = "0";
        card.style.transition = "opacity .3s";
        setTimeout(() => {
          card.remove();
          // Reload accepted tasks section
          loadDashboard();
        }, 300);
      }
    }, 800);

    showToast("Task accepted! The NGO has been notified.", "success");

  } catch {
    btn.disabled   = false;
    btn.textContent = original;
    showToast("Failed to accept task. Please try again.", "error");
  }
}

async function declineTask(taskId, btn) {
  if (!taskId) return;

  btn.disabled   = true;
  btn.textContent = "...";

  try {
    await fetch(`/api/volunteer/task/${taskId}/decline`, { method: "POST" });
  } catch {}

  const card = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
  if (card) {
    card.style.opacity    = "0.35";
    card.style.pointerEvents = "none";
    card.style.transition = "opacity .3s";
    setTimeout(() => card.remove(), 1500);
  }
}


// ─────────────────────────────────────────────
// 8. OLA MAPS — NEEDS NEAR YOU (mini map)
// ─────────────────────────────────────────────

let miniMapInstance = null;

function initMiniMap(needs) {
  const el = document.getElementById("miniMap");
  if (!el || typeof OlaMaps === "undefined") return;

  const olaMaps = new OlaMaps({ apiKey: OLA_MAPS_API_KEY });

  miniMapInstance = olaMaps.init({
    style:       "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
    container:   "miniMap",
    center:      [77.5946, 12.9716],  // default Bengaluru
    zoom:        12,
    interactive: false   // mini map — not interactive
  });

  miniMapInstance.on("load", () => {
    // Add need pins
    (needs || []).filter(n => n.lat && n.lng).forEach(need => {
      const color = need.urgency_score >= 8 ? "#a83639"
                  : need.urgency_score >= 5 ? "#855300"
                  : "#006c44";

      const pinEl = document.createElement("div");
      pinEl.style.cssText = `
        width:22px;height:22px;background:${color};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.2);
      `;

      olaMaps
        .addMarker({ element: pinEl })
        .setLngLat([need.lng, need.lat])
        .addTo(miniMapInstance);
    });

    // Centre on user location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        miniMapInstance.setCenter([pos.coords.longitude, pos.coords.latitude]);
        updateLocationLabel(pos.coords.latitude, pos.coords.longitude);
      }, () => {});
    }
  });
}

async function updateLocationLabel(lat, lng) {
  try {
    const res  = await fetch(
      `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`
    );
    const data = await res.json();
    const results = data.results || [];
    if (results.length > 0) {
      const addr = results[0].formatted_address || "";
      const part = addr.split(",")[0];
      const el   = document.getElementById("currentLocation");
      if (el) el.textContent = part;
    }
  } catch {}
}


// ─────────────────────────────────────────────
// 9. OLA MAPS — FULL MAP MODAL
// ─────────────────────────────────────────────

let fullMapInstance  = null;
let fullMapInitialized = false;

function initFullMap(needs) {
  const el = document.getElementById("fullMapContainer");
  if (!el || typeof OlaMaps === "undefined") return;
  if (fullMapInitialized) return;
  fullMapInitialized = true;

  const olaMaps = new OlaMaps({ apiKey: OLA_MAPS_API_KEY });

  fullMapInstance = olaMaps.init({
    style:     "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
    container: "fullMapContainer",
    center:    [77.5946, 12.9716],
    zoom:      13
  });

  fullMapInstance.on("load", () => {
    (needs || []).filter(n => n.lat && n.lng).forEach(need => {
      const color = need.urgency_score >= 8 ? "#a83639"
                  : need.urgency_score >= 5 ? "#855300"
                  : "#006c44";

      const pinEl = document.createElement("div");
      pinEl.style.cssText = `
        width:28px;height:28px;background:${color};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,.25);
        cursor:pointer;
      `;

      const popup = olaMaps
        .addPopup({ closeButton: false, offset: [0, -32] })
        .setHTML(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:160px;">
            <p style="font-weight:700;font-size:.82rem;margin:0 0 4px;">${escHtml(need.title)}</p>
            <p style="font-size:.73rem;color:#3e4942;margin:0;">${escHtml(need.ngo_name || "")} · ${escHtml(need.distance_km || "")} km</p>
          </div>`);

      olaMaps
        .addMarker({ element: pinEl })
        .setLngLat([need.lng, need.lat])
        .addTo(fullMapInstance)
        .on("click", () => popup.setLngLat([need.lng, need.lat]).addTo(fullMapInstance));
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        fullMapInstance.setCenter([pos.coords.longitude, pos.coords.latitude]);
        updateLocationLabel(pos.coords.latitude, pos.coords.longitude);
      }, () => {});
    }
  });
}


// ─────────────────────────────────────────────
// 10. MODAL HELPERS
// ─────────────────────────────────────────────

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("open");
  document.body.style.overflow = "hidden";

  // Init full map when modal opens (lazy)
  if (id === "map-modal") {
    setTimeout(() => {
      fullMapInstance?.resize?.();
      if (!fullMapInitialized) initFullMap(window._dashNeeds || []);
    }, 150);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("open");
  document.body.style.overflow = "";
}

function closeOnBackdrop(event, id) {
  if (event.target === document.getElementById(id)) closeModal(id);
}

// Buttons already in HTML using onclick — expose globally
window.openModal  = openModal;
window.closeModal = closeModal;
window.closeOnBackdrop = closeOnBackdrop;

document.getElementById("view-all-btn")?.addEventListener("click",    () => openModal("all-tasks-modal"));
document.getElementById("close-tasks-modal")?.addEventListener("click",() => closeModal("all-tasks-modal"));
document.getElementById("find-task-btn")?.addEventListener("click",   () => openModal("map-modal"));
document.getElementById("close-map-modal")?.addEventListener("click", () => closeModal("map-modal"));


// ─────────────────────────────────────────────
// 11. ONLINE / OFFLINE TOGGLE
// ─────────────────────────────────────────────

function initOnlineToggle() {
  const track  = document.querySelector(".toggle-track");
  const label  = document.querySelector(".status-label");
  if (!track) return;

  let isOnline = true;

  track.addEventListener("click", async () => {
    isOnline = !isOnline;
    track.classList.toggle("offline", !isOnline);
    if (label) label.textContent = isOnline ? "Online" : "Offline";

    try {
      await fetch("/api/volunteer/status", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ online: isOnline })
      });
    } catch {}
  });
}


// ─────────────────────────────────────────────
// 12. NAV DROPDOWN
// ─────────────────────────────────────────────

function initNavDropdown() {
  const menuWrap = document.querySelector(".menu-wrap");
  const navDd    = document.getElementById("nav-dd");
  if (!menuWrap || !navDd) return;

  document.querySelector(".menu-btn")?.addEventListener("click", () => {
    navDd.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!menuWrap.contains(e.target)) navDd.classList.remove("open");
  });
}


// ─────────────────────────────────────────────
// 13. KEYBOARD ESCAPE
// ─────────────────────────────────────────────

function initKeyboardEscape() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal("all-tasks-modal");
      closeModal("map-modal");
    }
  });
}


// ─────────────────────────────────────────────
// 14. SKELETON LOADERS
// ─────────────────────────────────────────────

function showSkeletons() {
  ["statMatched","statCompleted"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = "—"; el.classList.add("animate-pulse"); }
  });

  const tfy = document.getElementById("tasksForYou");
  if (tfy) {
    tfy.innerHTML = [1,2].map(() => `
      <div class="task-card" style="opacity:.5;">
        <div style="height:14px;background:#e5e7eb;border-radius:6px;width:40%;margin-bottom:10px;"></div>
        <div style="height:18px;background:#e5e7eb;border-radius:6px;width:80%;margin-bottom:8px;"></div>
        <div style="height:12px;background:#e5e7eb;border-radius:6px;width:60%;margin-bottom:12px;"></div>
        <div style="height:36px;background:#e5e7eb;border-radius:9999px;"></div>
      </div>`).join("");
  }
}


// ─────────────────────────────────────────────
// 15. TOAST
// ─────────────────────────────────────────────

function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position:fixed;bottom:80px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    background:white;
    border-left:4px solid ${type === "success" ? "#006c44" : "#a83639"};
    border-radius:.75rem;padding:14px 18px;
    box-shadow:0 8px 32px rgba(0,0,0,.12);
    font-size:.875rem;font-weight:500;max-width:300px;
    cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;color:#121c2a;
  `;
  toast.textContent = message;
  toast.addEventListener("click", () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity   = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all .3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}


// ─────────────────────────────────────────────
// 16. ERROR STATE
// ─────────────────────────────────────────────

function showDashboardError() {
  const el = document.getElementById("tasksForYou");
  if (el) {
    el.innerHTML = `
      <div style="padding:24px;text-align:center;">
        <p style="font-weight:700;color:#a83639;">Failed to load tasks</p>
        <button onclick="loadDashboard()"
                style="margin-top:12px;padding:8px 20px;background:#006c44;color:white;
                       border:none;border-radius:9999px;font-weight:700;cursor:pointer;">
          Retry
        </button>
      </div>`;
  }
}


// ─────────────────────────────────────────────
// 17. HELPERS
// ─────────────────────────────────────────────

function getUrgencyChip(label, score) {
  const l = (label || "").toUpperCase();
  const s = score || 0;
  if (l === "CRITICAL" || s >= 8) return { cls: "uc-high",  label: "High Urgency" };
  if (l === "HIGH"     || s >= 6) return { cls: "uc-high",  label: "High Urgency" };
  if (l === "MEDIUM"   || s >= 4) return { cls: "uc-mid",   label: "Medium Urgency" };
  return                                  { cls: "uc-low",   label: "Low Urgency" };
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}