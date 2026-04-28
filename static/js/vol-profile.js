document.addEventListener("DOMContentLoaded", async () => {

    // =========================
    // GET VOLUNTEER ID
    // =========================
    const urlParams = new URLSearchParams(window.location.search);
    const volunteerId = urlParams.get("volunteerId");

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
        renderAssignments(data.assignments || []);
        setupButtons(volunteerId);

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
// ASSIGNMENTS
// =========================
function renderAssignments(list) {

    const container = document.getElementById("assignmentList");
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
// BUTTONS
// =========================
function setupButtons(volunteerId) {

    const messageBtn = document.getElementById("messageBtn");

    if (messageBtn) {
        messageBtn.addEventListener("click", () => {
            window.location.href = `/chat?volunteerId=${volunteerId}`;
        });
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