/* =====================================================
   volunteer_dashboard.js  (patched)
   Fixes:
   ① Proper skeleton loading — static "Arjun" content
     is replaced with skeletons on init, real data
     renders only after the API responds.
   ② All-tasks modal + map modal are fully dynamic —
     populated from the same API data, no stale HTML.
   ③ Online / offline toggle actually changes visually.
   ===================================================== */

let OLA_MAPS_API_KEY = null;

async function loadOlaMapsKey() {
  try {
    const res = await fetch("/api/get_ola_maps_key");
    if (!res.ok) throw new Error("Failed to fetch key");

    const data = await res.json();
    OLA_MAPS_API_KEY = data.OLA_MAPS_API_KEY;

  } catch (err) {
    console.error("Error loading Ola Maps key:", err);
  }
}
// Store tasks globally so modals can reference them
// even when opened after initial load
let _allMatchedTasks = [];

// ─────────────────────────────────────────────
// 1. INIT — skeletons fire BEFORE any API call
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Show skeletons immediately so no static HTML is visible
  showSkeletons();
  await loadOlaMapsKey();   // 🔥 FIRST load key
  loadDashboard();
  initOnlineToggle();
  initNavDropdown();
  initKeyboardEscape();
  wireStaticModalButtons();
});


// ─────────────────────────────────────────────
// 2. MAIN DASHBOARD LOADER
// ─────────────────────────────────────────────

async function loadDashboard() {
  try {
    const res = await fetch("/api/volunteer/dashboard");

    if (res.status === 401) {
      window.location.href = "/getstarted";
      return;
    }

    if (!res.ok) throw new Error("Failed to load dashboard");

    const data = await res.json();

    // Store globally for lazy modal usage
    _allMatchedTasks = data.matched_tasks || [];

    renderWelcome(data.volunteer_name);
    renderStats(data.stats);
    renderTasksForYou(_allMatchedTasks);
    renderAcceptedTasks(data.accepted_tasks);
    initMiniMap(_allMatchedTasks);

    // Pre-populate the all-tasks modal body NOW (lazy — hidden)
    populateAllTasksModal(_allMatchedTasks);

    // Update the location bar in map modal
    updateMapModalBar(_allMatchedTasks.length);

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
  const hour  = new Date().getHours();
  const emoji = hour < 12 ? "🌅" : hour < 17 ? "🌱" : "🌙";
  el.textContent = `Hello, ${name || "there"}! Ready to make a difference? ${emoji}`;

  const sub = document.getElementById("welcomeSub");
  if (sub && _allMatchedTasks.length > 0) {
    sub.textContent = `There are ${_allMatchedTasks.length} new requests in your neighbourhood today.`;
  }
}


// ─────────────────────────────────────────────
// 4. STATS ROW
// ─────────────────────────────────────────────

function renderStats(stats) {
  if (!stats) return;

  // Remove skeleton pulse once data arrives
  ["statMatched","statCompleted","statRating"].forEach(id => {
    document.getElementById(id)?.classList.remove("skel-pulse");
  });

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
// 5. TASKS FOR YOU
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

  // Show first 2 on main page
  container.innerHTML = tasks.slice(0, 2).map(task => buildTaskCard(task)).join("");
  wireTaskActions(container);
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

// ── "View All" modal — populated dynamically ──────────────

function populateAllTasksModal(tasks) {
  const container = document.getElementById("allTasksBody");
  if (!container) return;

  const countEl = document.getElementById("allTasksCount");

  if (!tasks || tasks.length === 0) {
    if (countEl) countEl.textContent = "No tasks available in your area right now.";
    container.innerHTML = `
      <div style="padding:32px;text-align:center;color:#6e7a71;">
        <span class="material-symbols-outlined" style="font-size:2.5rem;display:block;margin-bottom:8px;">search_off</span>
        <p style="font-weight:600;">Nothing matched yet.</p>
        <p style="font-size:.82rem;margin-top:4px;">Check back soon!</p>
      </div>`;
    return;
  }

  if (countEl) countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? "s" : ""} available in your area today`;
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
// 6. ACCEPTED TASKS
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
    const progress    = task.progress_pct || 0;
    const statusCls   = task.status === "in_progress" ? "sc-green" : "sc-amber";
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
                onclick="window.location.href='/volunteer/task/${escHtml(task.id)}'">
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

  const original  = btn.textContent;
  btn.disabled    = true;
  btn.textContent = "Accepting...";

  try {
    const res = await fetch(`/api/volunteer/task/${taskId}/accept`, { method: "POST" });
    if (!res.ok) throw new Error();

    btn.textContent       = "✓ Accepted!";
    btn.style.background  = "#059669";

    // Remove ALL cards with this id (main + modal)
    setTimeout(() => {
      document.querySelectorAll(`.task-card[data-task-id="${taskId}"]`).forEach(card => {
        card.style.opacity    = "0";
        card.style.transition = "opacity .3s";
        setTimeout(() => card.remove(), 300);
      });
      // Remove from global list and repopulate modal
      _allMatchedTasks = _allMatchedTasks.filter(t => t.id !== taskId);
      populateAllTasksModal(_allMatchedTasks);
      loadDashboard();
    }, 800);

    showToast("Task accepted! The NGO has been notified.", "success");

  } catch {
    btn.disabled    = false;
    btn.textContent = original;
    showToast("Failed to accept task. Please try again.", "error");
  }
}

async function declineTask(taskId, btn) {
  if (!taskId) return;

  btn.disabled    = true;
  btn.textContent = "...";

  try {
    await fetch(`/api/volunteer/task/${taskId}/decline`, { method: "POST" });
  } catch {}

  // Remove ALL matching cards (main + modal) 
  document.querySelectorAll(`.task-card[data-task-id="${taskId}"]`).forEach(card => {
    card.style.opacity       = "0.35";
    card.style.pointerEvents = "none";
    card.style.transition    = "opacity .3s";
    setTimeout(() => card.remove(), 1500);
  });

  // Remove from global list and update modal count
  _allMatchedTasks = _allMatchedTasks.filter(t => t.id !== taskId);
  const countEl = document.getElementById("allTasksCount");
  if (countEl) countEl.textContent = `${_allMatchedTasks.length} tasks available in your area today`;
}


// ─────────────────────────────────────────────
// 8. OLA MAPS — MINI MAP
// ─────────────────────────────────────────────

let miniMapInstance = null;

function initMiniMap(needs) {
  const el = document.getElementById("miniMap");
  if (!el || typeof OlaMaps === "undefined") return;

  const olaMaps = new OlaMaps({ apiKey: OLA_MAPS_API_KEY });

  miniMapInstance = olaMaps.init({
    style:       "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
    container:   "miniMap",
    center:      [77.5946, 12.9716],
    zoom:        12,
    interactive: false
  });

  miniMapInstance.on("load", () => {
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

      olaMaps.addMarker({ element: pinEl })
             .setLngLat([need.lng, need.lat])
             .addTo(miniMapInstance);
    });

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
      // Also update map modal location bar
      const barEl = document.getElementById("mapModalLocation");
      if (barEl) barEl.textContent = part;
    }
  } catch {}
}


// ─────────────────────────────────────────────
// 9. OLA MAPS — FULL MAP MODAL
// ─────────────────────────────────────────────

let fullMapInstance    = null;
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

      const popup = olaMaps.addPopup({ closeButton: false, offset: [0, -32] })
        .setHTML(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:160px;">
            <p style="font-weight:700;font-size:.82rem;margin:0 0 4px;">${escHtml(need.title)}</p>
            <p style="font-size:.73rem;color:#3e4942;margin:0;">${escHtml(need.ngo_name || "")} · ${need.distance_km ? need.distance_km + " km" : "Nearby"}</p>
          </div>`);

      olaMaps.addMarker({ element: pinEl })
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

function updateMapModalBar(count) {
  const countEl = document.getElementById("mapModalTaskCount");
  if (countEl) countEl.textContent = `${count} task${count !== 1 ? "s" : ""} nearby`;
}


// ─────────────────────────────────────────────
// 10. MODAL HELPERS
// ─────────────────────────────────────────────

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("open");
  document.body.style.overflow = "hidden";

  // Lazy-init full map only when map modal first opens
  if (id === "map-modal") {
    setTimeout(() => {
      fullMapInstance?.resize?.();
      if (!fullMapInitialized) initFullMap(_allMatchedTasks);
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

window.openModal       = openModal;
window.closeModal      = closeModal;
window.closeOnBackdrop = closeOnBackdrop;

function wireStaticModalButtons() {
  document.getElementById("view-all-btn")?.addEventListener("click",    () => openModal("all-tasks-modal"));
  document.getElementById("close-tasks-modal")?.addEventListener("click",() => closeModal("all-tasks-modal"));
  document.getElementById("find-task-btn")?.addEventListener("click",   () => openModal("map-modal"));
  document.getElementById("close-map-modal")?.addEventListener("click", () => closeModal("map-modal"));
}


// ─────────────────────────────────────────────
// 11. ONLINE / OFFLINE TOGGLE  ← FIXED
// The toggle needs:
//   • .toggle-track   — the pill background
//   • .toggle-thumb   — the white circle
//   • .status-label   — "Online" / "Offline" text
//   • .status-toggle  — outer wrapper (gets "offline" class for colour)
// ─────────────────────────────────────────────

function initOnlineToggle() {
  const track  = document.querySelector(".toggle-track");
  const thumb  = document.querySelector(".toggle-thumb");
  const label  = document.querySelector(".status-label");
  const wrapper = document.querySelector(".status-toggle");
  if (!track) return;

  // Start as online
  let isOnline = true;
  applyToggleState(isOnline, track, thumb, label, wrapper);

  track.addEventListener("click", async () => {
    isOnline = !isOnline;
    applyToggleState(isOnline, track, thumb, label, wrapper);

    try {
      await fetch("/api/volunteer/status", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ online: isOnline })
      });
    } catch {}
  });
}

function applyToggleState(isOnline, track, thumb, label, wrapper) {
  if (isOnline) {
    // Green pill, thumb right
    track.style.background    = "#006c44";
    track.style.justifyContent = "flex-end";
    if (thumb) {
      thumb.style.background = "#ffffff";
      thumb.style.transform  = "translateX(0)";
    }
    if (label) {
      label.textContent = "Online";
      label.style.color = "#006c44";
    }
    wrapper?.classList.remove("offline");
  } else {
    // Grey pill, thumb left
    track.style.background    = "#bdcabf";
    track.style.justifyContent = "flex-start";
    if (thumb) {
      thumb.style.background = "#ffffff";
      thumb.style.transform  = "translateX(0)";
    }
    if (label) {
      label.textContent = "Offline";
      label.style.color = "#6e7a71";
    }
    wrapper?.classList.add("offline");
  }
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
// 14. SKELETON LOADERS — replaces all static HTML
// ─────────────────────────────────────────────

function showSkeletons() {
  // Welcome bar
  const heading = document.getElementById("welcomeHeading");
  if (heading) {
    heading.innerHTML = `<span class="skel-line" style="width:55%;height:28px;display:inline-block;border-radius:6px;background:#e2e8f0;animation:skelPulse 1.4s ease infinite;"></span>`;
  }
  const sub = document.getElementById("welcomeSub");
  if (sub) {
    sub.innerHTML = `<span class="skel-line" style="width:40%;height:16px;display:inline-block;border-radius:6px;background:#e2e8f0;animation:skelPulse 1.4s ease infinite;"></span>`;
  }

  // Stats
  ["statMatched","statCompleted","statRating"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<span style="display:inline-block;width:44px;height:32px;background:#e2e8f0;border-radius:6px;animation:skelPulse 1.4s ease infinite;"></span>`;
    }
  });

  // Tasks for you — skeleton cards
  const tfy = document.getElementById("tasksForYou");
  if (tfy) {
    tfy.innerHTML = [1,2].map(() => `
      <div class="task-card" style="pointer-events:none;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="width:110px;height:22px;background:#e2e8f0;border-radius:99px;display:inline-block;animation:skelPulse 1.4s ease infinite;"></span>
          <span style="width:60px;height:18px;background:#e2e8f0;border-radius:6px;display:inline-block;animation:skelPulse 1.4s ease infinite;"></span>
        </div>
        <div style="width:80%;height:20px;background:#e2e8f0;border-radius:6px;margin-bottom:8px;animation:skelPulse 1.4s ease infinite;"></div>
        <div style="width:55%;height:14px;background:#e2e8f0;border-radius:6px;margin-bottom:14px;animation:skelPulse 1.4s ease infinite;"></div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <span style="width:70px;height:24px;background:#e2e8f0;border-radius:99px;animation:skelPulse 1.4s ease infinite;display:inline-block;"></span>
          <span style="width:70px;height:24px;background:#e2e8f0;border-radius:99px;animation:skelPulse 1.4s ease infinite;display:inline-block;"></span>
        </div>
        <div style="height:40px;background:#e2e8f0;border-radius:99px;animation:skelPulse 1.4s ease infinite;"></div>
      </div>`).join("");
  }

  // Accepted tasks grid — skeleton
  const atg = document.getElementById("acceptedTasksGrid");
  if (atg) {
    atg.innerHTML = [1,2].map(() => `
      <div class="accepted-card" style="pointer-events:none;">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div style="flex:1;">
            <div style="width:70%;height:18px;background:#e2e8f0;border-radius:6px;margin-bottom:8px;animation:skelPulse 1.4s ease infinite;"></div>
            <div style="width:40%;height:13px;background:#e2e8f0;border-radius:6px;animation:skelPulse 1.4s ease infinite;"></div>
          </div>
          <span style="width:80px;height:24px;background:#e2e8f0;border-radius:99px;animation:skelPulse 1.4s ease infinite;display:inline-block;"></span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:99px;margin-bottom:14px;animation:skelPulse 1.4s ease infinite;"></div>
        <div style="height:36px;background:#e2e8f0;border-radius:10px;animation:skelPulse 1.4s ease infinite;"></div>
      </div>`).join("");
  }

  // Also blank-out the all-tasks modal body (already has static HTML in file)
  const allBody = document.getElementById("allTasksBody");
  if (allBody) {
    allBody.innerHTML = [1,2,3].map(() => `
      <div class="task-card" style="pointer-events:none;">
        <div style="width:120px;height:22px;background:#e2e8f0;border-radius:99px;margin-bottom:12px;animation:skelPulse 1.4s ease infinite;"></div>
        <div style="width:75%;height:18px;background:#e2e8f0;border-radius:6px;margin-bottom:8px;animation:skelPulse 1.4s ease infinite;"></div>
        <div style="width:50%;height:13px;background:#e2e8f0;border-radius:6px;margin-bottom:16px;animation:skelPulse 1.4s ease infinite;"></div>
        <div style="height:38px;background:#e2e8f0;border-radius:99px;animation:skelPulse 1.4s ease infinite;"></div>
      </div>`).join("");
  }
  const allCount = document.getElementById("allTasksCount");
  if (allCount) allCount.textContent = "Loading tasks…";

  // Inject keyframe animation once if not already present
  if (!document.getElementById("skel-style")) {
    const s = document.createElement("style");
    s.id = "skel-style";
    s.textContent = `
      @keyframes skelPulse {
        0%,100% { opacity:1; }
        50%      { opacity:.45; }
      }
    `;
    document.head.appendChild(s);
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
    toast.style.opacity    = "0";
    toast.style.transform  = "translateX(100%)";
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
  if (l === "CRITICAL" || s >= 8) return { cls: "uc-high", label: "High Urgency" };
  if (l === "HIGH"     || s >= 6) return { cls: "uc-high", label: "High Urgency" };
  if (l === "MEDIUM"   || s >= 4) return { cls: "uc-mid",  label: "Medium Urgency" };
  return                                  { cls: "uc-low",  label: "Low Urgency" };
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}