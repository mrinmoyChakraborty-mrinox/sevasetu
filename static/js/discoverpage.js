document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // GLOBAL ELEMENTS
  // =========================
  const needsContainer = document.getElementById("needsScroll");
  const volunteersContainer = document.getElementById("volunteersContainer");

  const searchInput = document.getElementById("globalSearch");
  const skillsFilter = document.getElementById("skillsFilter");
  const availabilityFilter = document.getElementById("availabilityFilter");
  const distanceFilter = document.getElementById("distanceFilter");
  const distanceValue = document.getElementById("distanceValue");

//   const role = localStorage.getItem("role") || "ngo";
let role = "guest"; // default

async function fetchUserRole() {
  try {
    const res = await fetch("/api/me"); // your auth endpoint
    if (!res.ok) throw new Error();

    const user = await res.json();
    role = ["ngo", "volunteer"].includes(user.role)
  ? user.role
  : "guest";// "ngo" or "volunteer"

  } catch (err) {
    console.warn("User not logged in");
    role = "guest";
  }
}
  let allNeeds = [];
  let allVolunteers = [];
  let selectedNeed = null;
//   let selectedSkill = "all";

  // =========================
  // SKELETON LOADING
  // =========================
  function showSkeleton() {
    needsContainer.innerHTML = `
      <div class="flex gap-4">
        ${Array(3).fill(`
          <div class="min-w-[300px] h-[220px] bg-gray-200 animate-pulse rounded-lg"></div>
        `).join("")}
      </div>
    `;

    volunteersContainer.innerHTML = `
      ${Array(6).fill(`
        <div class="h-[250px] bg-gray-200 animate-pulse rounded-lg"></div>
      `).join("")}
    `;
  }

  // =========================
  // SAFE FETCH
  // =========================
  async function safeFetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API Error");
    return res.json();
  }

  //=========================
  //INITIAL LOAD
 // =========================
  async function init() {
    showSkeleton();

    try {
      const [needsData, volunteersData] = await Promise.all([
        safeFetch("/api/needs"),
        safeFetch("/api/volunteers")
      ]);

      allNeeds = needsData;
      allVolunteers = volunteersData;

      renderNeeds(allNeeds);
      renderVolunteers(allVolunteers);

    } catch (err) {
      console.error(err);
      needsContainer.innerHTML = "Failed to load needs";
      volunteersContainer.innerHTML = "Failed to load volunteers";
    }
  }
//  testing 
// async function init() {
//   showSkeleton();

//   try {

//     // ✅ DUMMY DATA
//     const needsData = [
//       {
//         id: "n1",
//         title: "Blood Donation Camp",
//         skills: ["medical"],
//         location: "Kolkata",
//         ngo_name: "Red Cross"
//       },
//       {
//         id: "n2",
//         title: "Teaching Kids",
//         skills: ["teaching"],
//         location: "Durgapur",
//         ngo_name: "EduCare NGO"
//       },
//       {
//         id: "n3",
//         title: "Food Distribution",
//         skills: ["logistics"],
//         location: "Asansol",
//         ngo_name: "Food Help"
//       }
//     ];

//     const volunteersData = [
//       {
//         id: "v1",
//         name: "Rahul Sharma",
//         skills: ["medical", "first aid"],
//         location: "Kolkata",
//         availability: "weekends",
//         image: ""
//       },
//       {
//         id: "v2",
//         name: "Priya Das",
//         skills: ["teaching"],
//         location: "Durgapur",
//         availability: "weekdays",
//         image: ""
//       },
//       {
//         id: "v3",
//         name: "Amit Roy",
//         skills: ["logistics", "driving"],
//         location: "Asansol",
//         availability: "any",
//         image: ""
//       }
//     ];

//     // ✅ USE DUMMY
//     allNeeds = needsData;
//     allVolunteers = volunteersData;

//     renderNeeds(allNeeds);
//     renderVolunteers(allVolunteers);

//   } catch (err) {
//     console.error(err);
//   }
// }
  // =========================
  // RENDER NEEDS
  // =========================
  function renderNeeds(needs) {
    needsContainer.innerHTML = "";

    needs.forEach(need => {
      const card = document.createElement("div");

      card.className = "need-card min-w-[300px] flex-shrink-0 bg-surface-container-lowest rounded-lg p-6 shadow border flex flex-col justify-between cursor-pointer";

      card.dataset.needId = need.id;
      card.dataset.skills = (need.skills || []).join(",");

    card.innerHTML = `
<div>

  <!-- TOP -->
  <div class="flex justify-between items-start mb-3">
    <h3 class="text-lg font-bold">${need.title}</h3>

    <span class="text-xs px-3 py-1 rounded-full bg-red-100 text-red-600 font-semibold">
      HIGH
    </span>
  </div>

  <p class="text-sm text-green-600 mb-2">
    ${need.ngo_name || "NGO"}
  </p>

  <p class="text-xs text-gray-500 mb-1">
    📍 ${need.location || "Location"}
  </p>

  <!-- SKILLS -->
  <div class="flex flex-wrap gap-2 mt-2">
    ${(need.skills || []).map(skill => `
      <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
        ${skill}
      </span>
    `).join("")}
  </div>

</div>

<!-- BUTTONS -->
<div class="flex gap-2 mt-4">

  <!-- DETAILS -->
  <button 
    class="details-btn flex-1 py-2 border border-green-600 text-green-600 rounded-full font-semibold"
    data-need-id="${need.id}"
  >
    Details
  </button>

  <!-- ACCEPT (ONLY FOR VOLUNTEER) -->
  ${
    role === "volunteer"
      ? `<button 
          class="accept-btn flex-1 py-2 bg-green-600 text-white rounded-full font-semibold"
          data-need-id="${need.id}"
        >
          Accept
        </button>`
      : ""
  }

</div>
`;

      // CLICK → FILTER VOLUNTEERS
     card.addEventListener("click", (e) => {
  if (e.target.closest("button")) return; // 🔥 prevent conflict
  selectedNeed = need;
  filterData();
});
      needsContainer.appendChild(card);
    });
  }

  // =========================
  // RENDER VOLUNTEERS
  // =========================
  function renderVolunteers(volunteers) {
    volunteersContainer.innerHTML = "";

    volunteers.forEach(vol => {
      const card = document.createElement("div");

      card.className = "volunteer-card bg-surface-container-lowest rounded-lg p-6 shadow";

      card.dataset.skills = (vol.skills || []).join(",");
      card.dataset.location = vol.location || "";
      card.dataset.availability = vol.availability || "";

      card.innerHTML = `
<div class="flex flex-col items-center text-center">

  <img 
    src="${vol.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(vol.name)}`}" 
    class="w-20 h-20 rounded-full mb-3"
  />

  <h3 class="font-bold text-lg">${vol.name}</h3>

  <!-- SKILLS -->
  <div class="flex flex-wrap justify-center gap-2 mb-4">
    ${(vol.skills || []).map(skill => `
      <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
        ${skill}
      </span>
    `).join("")}
  </div>

  <!-- LOCATION + AVAILABILITY -->
  <div class="flex justify-between w-full text-xs text-gray-500 mb-4">
    <span>📍 ${vol.location || "N/A"}</span>
    <span>🕒 ${vol.availability || "Anytime"}</span>
  </div>

  <!-- BUTTONS -->
  <div class="flex gap-2 w-full">

    <!-- VIEW PROFILE -->
    <button 
      class="profile-btn flex-1 py-2 border border-green-600 text-green-600 rounded-full font-semibold"
      data-volunteer-id="${vol.id}"
    >
      View Profile
    </button>

    <!-- REQUEST (ONLY NGO) -->
    ${
      role === "ngo"
        ? `<button 
            class="request-btn flex-1 py-2 bg-green-600 text-white rounded-full font-semibold"
            data-volunteer-id="${vol.id}"
          >
            Request
          </button>`
        : ""
    }

  </div>

</div>
`;

      volunteersContainer.appendChild(card);
    });
  }
// ADD BUTTON CLICK LOGIC
document.addEventListener("click", (e) => {

  // =========================
  // DETAILS BUTTON
  // =========================
  if (e.target.closest(".details-btn")) {
    const id = e.target.closest("button").dataset.needId;

    window.location.href = `/need-details.html?id=${id}`;
  }

  // =========================
  // ACCEPT OPPORTUNITY
  // =========================
  if (e.target.closest(".accept-btn")) {
    const id = e.target.closest("button").dataset.needId;

    console.log("Accept need:", id);

    fetch(`/api/needs/${id}/accept`, {
      method: "POST"
    });
  }

  // =========================
  // VIEW PROFILE
  // =========================
  if (e.target.closest(".profile-btn")) {
    const id = e.target.closest("button").dataset.volunteerId;

    window.location.href = `/volunteer-profile.html?id=${id}`;
  }

  // =========================
  // REQUEST CONNECTION
  // =========================
  if (e.target.closest(".request-btn")) {
    const id = e.target.closest("button").dataset.volunteerId;

    console.log("Request connection:", id);

    fetch(`/api/connection/request`, {
      method: "POST",
      body: JSON.stringify({ volunteerId: id }),
      headers: { "Content-Type": "application/json" }
    });
  }

});
  // =========================
// GLOBAL FILTER STATE
// =========================
let selectedSkills = [];   // multi-select
// let selectedNeed = null;

// =========================
// MAIN FILTER FUNCTION
// =========================
function filterData() {

  const search = searchInput.value.toLowerCase();
  const availability = availabilityFilter.value;
  const maxDistance = parseInt(distanceFilter.value || 50);

  // =========================
  // FILTER NEEDS
  // =========================
  let filteredNeeds = [...allNeeds];

  if (search) {
    filteredNeeds = filteredNeeds.filter(n =>
      (n.title || "").toLowerCase().includes(search) ||
      (n.ngo_name || "").toLowerCase().includes(search) ||
      (n.location || "").toLowerCase().includes(search) ||
      (n.skills || []).join(",").toLowerCase().includes(search)
    );
  }

  renderNeeds(filteredNeeds);

  // =========================
  // FILTER VOLUNTEERS
  // =========================
  let filteredVolunteers = [...allVolunteers];

  // 🔍 SEARCH (VERY IMPORTANT — FULL COVERAGE)
  if (search) {
    filteredVolunteers = filteredVolunteers.filter(v =>
      (v.name || "").toLowerCase().includes(search) ||
      (v.location || "").toLowerCase().includes(search) ||
      (v.skills || []).join(",").toLowerCase().includes(search)
    );
  }

  // 🎯 MULTI SKILL FILTER
  if (selectedSkills.length > 0) {
    filteredVolunteers = filteredVolunteers.filter(v =>
      selectedSkills.some(skill =>
        (v.skills || []).includes(skill)
      )
    );
  }

  // 📌 NEED BASED FILTER
  if (selectedNeed) {
    const needSkills = selectedNeed.skills || [];
    filteredVolunteers = filteredVolunteers.filter(v =>
      needSkills.some(skill =>
        (v.skills || []).includes(skill)
      )
    );
  }

  // ⏰ AVAILABILITY (WITH "ALL")
  if (availability !== "all") {
    filteredVolunteers = filteredVolunteers.filter(v =>
      (v.availability || "").toLowerCase().includes(availability)
    );
  }

  // 📍 DISTANCE (BASIC FRONTEND VERSION)
  filteredVolunteers = filteredVolunteers.filter(v => {
    if (!v.distance) return true; // if backend not providing
    return v.distance <= maxDistance;
  });

  renderVolunteers(filteredVolunteers);
}

// =========================
// EVENTS
// =========================

// 🔍 SEARCH
searchInput.addEventListener("input", filterData);

// 🎯 SKILLS (MULTI SELECT)
skillsFilter.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-skill]");
  if (!chip) return;

  const skill = chip.dataset.skill;

  // ALL RESET
  if (skill === "all") {
    selectedSkills = [];
    skillsFilter.querySelectorAll("[data-skill]")
      .forEach(c => c.classList.remove("active"));

    chip.classList.add("active");
  } else {
    chip.classList.toggle("active");

    if (selectedSkills.includes(skill)) {
      selectedSkills = selectedSkills.filter(s => s !== skill);
    } else {
      selectedSkills.push(skill);
    }

    // remove ALL active
    skillsFilter.querySelector('[data-skill="all"]')
      ?.classList.remove("active");
  }

  filterData();
});

// ⏰ AVAILABILITY
availabilityFilter.addEventListener("change", filterData);

// 📍 DISTANCE
distanceFilter.addEventListener("input", () => {
  distanceValue.textContent = `${distanceFilter.value} KM`;
  filterData();
});
  // =========================
  // INIT
  // =========================
  async function startApp() {
  await fetchUserRole();   // 🔥 IMPORTANT
  await init();
}

startApp();

});