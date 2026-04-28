document.addEventListener("DOMContentLoaded", async () => {

    // Get volunteer ID from server-injected global (clean URL) or fallback to query param
    const volunteerId = window.PROFILE_UID || new URLSearchParams(window.location.search).get("volunteerId");

    if (!volunteerId) {
        console.error("Volunteer ID missing");
        return;
    }
    //  testing 
// let volunteerId = urlParams.get("volunteerId");

// if (!volunteerId) {
//     console.warn("Volunteer ID missing → using demo ID");
//     volunteerId = "demo123";
// }
    const main = document.querySelector("main");
    const originalHTML = main.innerHTML;

    showSkeleton();

    // =========================
    // SAFE FETCH
    // =========================
    async function safeFetch(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    }

    // try {

    //     // =========================
    //     // FETCH DATA
    //     // =========================
    //      const data = await safeFetch(`/api/volunteer/${volunteerId}`);
        //   testing
// let data;

// try {
//     data = await safeFetch(`/api/volunteer/${volunteerId}`);
// } catch (err) {
//     console.warn("Using dummy data");

//     data = {
//         name: "Arjun Sharma",
//         bio: "Helping communities with education and relief.",
//         image: "https://ui-avatars.com/api/?name=Arjun",
//         skills: ["Teaching", "Medical", "Logistics"],
//         availability: {
//             schedule: "Weekends",
//             radius: "10km",
//             urgent: true
//         },
//         hours_helped: 120,
//         tasks_completed: 35,
//         ngos_assisted: 8,
//         assignments: [
//             {
//                 title: "Teaching Session",
//                 ngo: "ABC NGO",
//                 time: "2 hours ago",
//                 status: "completed",
//                 points: "+30"
//             },
//             {
//                 title: "Medical Camp",
//                 ngo: "Health NGO",
//                 time: "Yesterday",
//                 status: "completed",
//                 points: "+50"
//             }
//         ]
//     };
// }
// =========================
// FETCH DATA (ONLY DATA HERE)
// =========================
let data;

try {
    data = await safeFetch(`/api/volunteer/${volunteerId}`);
} catch (err) {
    console.error(err);

    main.innerHTML = `
        <div class="text-center mt-20 text-red-500">
            Failed to load profile
        </div>
    `;
    return; 
}
        // =========================
        // RESTORE UI
        // =========================
        main.innerHTML = originalHTML;

        // =========================
        // RENDER ALL
        // =========================
        renderProfile(data);
        renderSkills(data.skills || []);
        renderAvailability(data.availability || {});
        renderStats(data);
        renderContributions(data.contributions || []);
        setupButtons(volunteerId, data);

//     } catch (err) {
//         console.error(err);

//         main.innerHTML = `
//             <div class="text-center mt-20 text-red-500">
//                 Failed to load profile
//             </div>
//         `;
//     }
// });


// =========================
// PROFILE
// =========================
function renderProfile(data) {

    document.getElementById("volunteerName").textContent =
        data.name || "N/A";

    document.getElementById("volunteerBio").textContent =
        data.bio || "No description available";

    document.getElementById("volunteerImage").src =
        data.image || "https://ui-avatars.com/api/?name=User";
}


// =========================
// SKILLS
// =========================
function renderSkills(skills) {

    const container = document.getElementById("skillsContainer");
    container.innerHTML = "";

    if (!skills.length) {
        container.innerHTML = `<p class="text-sm text-gray-400">No skills</p>`;
        return;
    }

    skills.forEach(skill => {
        const span = document.createElement("span");
        span.className = "bg-primary-fixed/30 text-on-primary-fixed-variant px-4 py-1.5 rounded-full text-sm font-medium";
        span.textContent = skill;
        container.appendChild(span);
    });
}


// =========================
// AVAILABILITY
// =========================
function renderAvailability(data) {

    document.getElementById("availabilitySchedule").textContent =
        data.schedule || "N/A";

    document.getElementById("availabilityRadius").textContent =
        data.radius || "N/A";

    const urgentEl = document.getElementById("availabilityUrgent");

    if (data.urgent) {
        urgentEl.innerHTML = `
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Available
        `;
    } else {
        urgentEl.textContent = "Not Available";
    }
}


// =========================
// STATS
// =========================
function renderStats(data) {

    document.getElementById("hoursHelped").textContent =
        data.hours_helped || 0;

    document.getElementById("tasksCompleted").textContent =
        data.tasks_completed || 0;

    document.getElementById("ngosAssisted").textContent =
        data.ngos_assisted || 0;
}


// =========================
// CONTRIBUTIONS
// =========================
function renderContributions(list) {

    const container = document.getElementById("contributionList");
    container.innerHTML = "";

    if (!list.length) {
        container.innerHTML = `<p class="text-sm text-gray-400">No assignments yet</p>`;
        return;
    }

    list.forEach(task => {

        const statusColor =
            task.status === "completed" ? "bg-green-200 text-green-800" :
            task.status === "upcoming" ? "bg-yellow-200 text-yellow-800" :
            "bg-blue-200 text-blue-800";

        const card = document.createElement("div");

        card.className = "bg-surface-container-low p-5 rounded-xl flex justify-between items-center";

        card.innerHTML = `
            <div>
                <h4 class="font-bold">${task.title}</h4>
                <p class="text-xs text-gray-500">${task.ngo} • ${task.time}</p>
            </div>

            <div class="text-right">
                <span class="text-xs px-3 py-1 rounded-full ${statusColor}">
                    ${task.status}
                </span>
                <p class="text-xs mt-1">${task.points || ""}</p>
            </div>
        `;

        container.appendChild(card);
    });
}


// =========================
// BUTTONS & EDIT MODAL
// =========================
let currentSkills = [];

function setupButtons(volunteerId, data) {
    // 1. MESSAGE BUTTON
    const messageBtn = document.getElementById("messageBtn");
    if (messageBtn) {
        messageBtn.addEventListener("click", async () => {
            const auth = await fetch("/api/check-auth").then(r => r.json()).catch(() => ({}));
            if (!auth.authenticated) { window.location.href = "/getstarted"; return; }
            const res = await fetch("/api/chat/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ other_uid: volunteerId })
            });
            const d = await res.json();
            if (d.conversation_id) window.location.href = `/inbox?conv_id=${d.conversation_id}`;
        });
    }

    // 2. EDIT BUTTON (Only if owner)
    const editBtn = document.getElementById("editProfileBtn");
    if (data.is_owner && editBtn) {
        editBtn.classList.remove("hidden");
        editBtn.addEventListener("click", () => openEditModal(data));
    }

    // 3. MODAL CONTROLS
    const modal = document.getElementById("editProfileModal");
    const closeBtn = document.getElementById("closeEditModal");
    const saveBtn = document.getElementById("saveProfileBtn");
    const addSkillBtn = document.getElementById("addSkillBtn");

    if (closeBtn) closeBtn.onclick = () => modal.classList.add("hidden");
    if (addSkillBtn) addSkillBtn.onclick = addSkillFromInput;
    if (saveBtn) saveBtn.onclick = () => saveProfile(volunteerId);

    // 4. IMAGE PREVIEW
    const imageInput = document.getElementById("imageInput");
    if (imageInput) {
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById("editImagePreview").src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function openEditModal(data) {
    const modal = document.getElementById("editProfileModal");
    modal.classList.remove("hidden");

    document.getElementById("editBio").value = data.bio || "";
    document.getElementById("editSchedule").value = data.availability?.schedule || "Anytime";
    document.getElementById("editRadius").value = data.availability?.radius || 10;
    document.getElementById("editImagePreview").src = data.image || "https://ui-avatars.com/api/?name=User";

    currentSkills = [...(data.skills || [])];
    renderEditSkills();
}

function renderEditSkills() {
    const list = document.getElementById("editSkillsList");
    list.innerHTML = "";
    currentSkills.forEach((s, idx) => {
        const chip = document.createElement("div");
        chip.className = "bg-surface-container-high px-4 py-2 rounded-full flex items-center gap-2 text-sm";
        chip.innerHTML = `
            <span>${s}</span>
            <button onclick="removeSkill(${idx})" class="material-symbols-outlined text-sm text-error hover:scale-125 transition-transform">close</button>
        `;
        list.appendChild(chip);
    });
}

window.removeSkill = (idx) => {
    currentSkills.splice(idx, 1);
    renderEditSkills();
};

function addSkillFromInput() {
    const input = document.getElementById("newSkillInput");
    const val = input.value.trim();
    if (val && !currentSkills.includes(val)) {
        currentSkills.push(val);
        renderEditSkills();
        input.value = "";
    }
}

async function saveProfile(volunteerId) {
    const saveBtn = document.getElementById("saveProfileBtn");
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const formData = new FormData();
    formData.append("bio", document.getElementById("editBio").value);
    formData.append("skills", JSON.stringify(currentSkills));
    formData.append("schedule", document.getElementById("editSchedule").value);
    formData.append("radius", document.getElementById("editRadius").value);

    const imageInput = document.getElementById("imageInput");
    if (imageInput.files[0]) {
        formData.append("photo", imageInput.files[0]);
    }

    try {
        const res = await fetch("/api/volunteer/update", {
            method: "POST",
            body: formData
        });
        if (res.ok) {
            window.location.reload();
        } else {
            alert("Failed to save changes");
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    } catch (err) {
        console.error(err);
        alert("Error saving profile");
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}


// =========================
// SKELETON LOADING
// =========================
function showSkeleton() {

    const main = document.querySelector("main");

    main.innerHTML = `
        <div class="animate-pulse space-y-6">

            <div class="h-40 bg-gray-200 rounded-xl"></div>

            <div class="grid grid-cols-3 gap-4">
                <div class="h-24 bg-gray-200 rounded-xl"></div>
                <div class="h-24 bg-gray-200 rounded-xl"></div>
                <div class="h-24 bg-gray-200 rounded-xl"></div>
            </div>

            <div class="h-40 bg-gray-200 rounded-xl"></div>

        </div>
    `;
}
});