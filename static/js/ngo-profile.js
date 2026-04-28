document.addEventListener("DOMContentLoaded", async () => {

    // =========================
    // GET NGO ID
    // =========================
    const urlParams = new URLSearchParams(window.location.search);
    const ngoId = urlParams.get("ngoId");

    if (!ngoId) {
        console.error("NGO ID missing");
        return;
    }
    // testing 

// let finalNgoId = ngoId;

// if (!finalNgoId) {
//     console.warn("NGO ID missing → using default ID");
//     finalNgoId = "demo123"; // dummy ID
// }
    // =========================
    // SAVE ORIGINAL HTML
    // =========================
    const main = document.querySelector("main");
    const originalHTML = main.innerHTML;

    // =========================
    // SHOW SKELETON
    // =========================
    showSkeleton();
    // =========================
    // SAFE FETCH FUNCTION (FIX ISSUE 5)
    // =========================
    async function safeFetch(url) {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`API failed: ${res.status}`);
        }

        return res.json();
    }
    // =========================
    // FETCH DATA
    // =========================
    try {

        const [ngoData, needsData] = await Promise.all([
            safeFetch(`/api/ngo/${ngoId}`),
            safeFetch(`/api/needs?ngo_id=${ngoId}`)
        ]);

        // RESTORE ORIGINAL UI
        main.innerHTML = originalHTML;
        
        // =========================
        // RENDER ALL
        // =========================
        renderProfile(ngoData);
        renderSkills(needsData);
        renderStats(needsData);
        setupButtons(ngoId);

    } catch (err) {
        console.error("Error loading NGO profile:", err);
    


// =========================
        // FIX ISSUE  (SKELETON STUCK)
        // =========================
        main.innerHTML = `
            <div class="flex flex-col items-center justify-center mt-20 text-center">
                <span class="material-symbols-outlined text-red-500 text-5xl mb-4">
                    error
                </span>
                <p class="text-lg font-semibold text-red-500">
                    Failed to load profile
                </p>
                <p class="text-sm text-gray-500 mt-2">
                    Please try again later.
                </p>
            </div>
        `;
    }
    });
// testing 

// try {

//     let ngoData, needsData;

//     try {
//         // TRY REAL BACKEND
//         [ngoData, needsData] = await Promise.all([
//             safeFetch(`/api/ngo/${finalNgoId}`),
//             safeFetch(`/api/needs?ngo_id=${finalNgoId}`)
//         ]);

//     } catch (apiError) {
//         console.warn("Using dummy data (backend not ready)");

//         // ✅ FALLBACK TO DUMMY
//         ngoData = {
//             name: "SevaSetu Foundation",
//             tagline: "Bridging compassion with action",
//             image: "https://ui-avatars.com/api/?name=SevaSetu&background=16a34a&color=fff",
//             description: "<p>This NGO works for community welfare.</p>",
//             email: "contact@ngo.org",
//             phone: "+91 9876543210",
//             location: "Kolkata, India",
//             verified: true,
//             created_at: "2016-01-01"
//         };

//         needsData = [
//             {
//                 status: "open",
//                 required_skills: ["Teaching", "Medical"]
//             },
//             {
//                 status: "completed",
//                 required_skills: ["Logistics"],
//                 estimated_people: 25
//             }
//         ];
//     }

//     // RESTORE UI
//     main.innerHTML = originalHTML;

//     // ✅ RENDER ONLY ONCE
//     renderProfile(ngoData);
//     renderSkills(needsData);
//     renderStats(needsData);
//     setupButtons(finalNgoId);

// } catch (err) {
//     console.error("Error loading NGO profile:", err);

//     main.innerHTML = `
//         <p class="text-center text-red-500 mt-10">
//             Failed to load profile
//         </p>
//     `;
// }
// });
// =========================
// SKELETON UI
// =========================
function showSkeleton() {

    const main = document.querySelector("main");

    main.innerHTML = `
        <div class="animate-pulse space-y-8">

            <!-- HEADER -->
            <div class="flex gap-6 items-end">
                <div class="w-40 h-40 bg-gray-300 rounded-full"></div>

                <div class="flex-1 space-y-4">
                    <div class="h-8 bg-gray-300 rounded w-1/3"></div>
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>

                <div class="flex gap-3">
                    <div class="h-10 w-24 bg-gray-300 rounded-full"></div>
                    <div class="h-10 w-24 bg-gray-300 rounded-full"></div>
                </div>
            </div>

            <!-- ABOUT -->
            <div class="bg-gray-100 p-8 rounded-lg space-y-4">
                <div class="h-4 bg-gray-300 rounded w-1/4"></div>
                <div class="h-3 bg-gray-200 rounded w-full"></div>
                <div class="h-3 bg-gray-200 rounded w-5/6"></div>
                <div class="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>

            <!-- SKILLS -->
            <div class="bg-gray-100 p-6 rounded-lg flex gap-3 flex-wrap">
                ${Array(6).fill(`
                    <div class="h-8 w-20 bg-gray-300 rounded-full"></div>
                `).join("")}
            </div>

            <!-- STATS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${Array(3).fill(`
                    <div class="bg-gray-100 p-6 rounded-lg space-y-3">
                        <div class="h-3 bg-gray-300 w-1/3 rounded"></div>
                        <div class="h-6 bg-gray-400 w-1/2 rounded"></div>
                    </div>
                `).join("")}
            </div>

        </div>
    `;
}


// =========================
// RENDER PROFILE
// =========================
function renderProfile(data) {

    document.getElementById("ngoName").textContent = data.name || "NGO";
    document.getElementById("ngoTagline").textContent = data.tagline || "";

    document.getElementById("ngoImage").src =
        data.image || "https://via.placeholder.com/150";

    document.getElementById("ngoDescription").innerHTML =
        data.description || "<p>No description available</p>";

    document.getElementById("ngoEmail").textContent =
        data.email || "Not available";

    document.getElementById("ngoPhone").textContent =
        data.phone || "Not available";

    document.getElementById("ngoLocation").textContent =
        data.location || "Location not specified";

    // VERIFIED
    if (data.verified) {
        document.getElementById("verifiedBadge").classList.remove("hidden");
    }

    // YEARS
    if (data.created_at) {
        const year = new Date(data.created_at).getFullYear();
        const currentYear = new Date().getFullYear();

        document.getElementById("yearsOfService").textContent =
            currentYear - year;

        document.getElementById("estYear").textContent =
            `Est. ${year}`;
    }
}


// =========================
// RENDER SKILLS
// =========================
function renderSkills(needs) {

    const container = document.getElementById("skillsContainer");
    const emptyText = document.getElementById("noSkillsText");

    let skillSet = new Set();

    needs.forEach(n => {
        if (n.status === "open" && n.required_skills) {
            n.required_skills.forEach(skill => skillSet.add(skill));
        }
    });

    const skills = Array.from(skillSet);

    container.innerHTML = "";

    if (skills.length === 0) {
        emptyText.classList.remove("hidden");
        return;
    }

    emptyText.classList.add("hidden");

    skills.forEach(skill => {
        const tag = document.createElement("span");
        tag.className = "px-5 py-2 bg-surface-container-lowest rounded-full text-sm font-medium text-primary shadow-sm";
        tag.textContent = skill;
        container.appendChild(tag);
    });
}


// =========================
// RENDER STATS
// =========================
function renderStats(needs) {

    let needsMet = 0;
    let activeNeeds = 0;
    let totalPeopleHelped = 0;

    needs.forEach(n => {

        // COMPLETED NEEDS → IMPACT
        if (n.status === "completed") {
            needsMet += 1;
            totalPeopleHelped += n.estimated_people || 0;
        }

        // ACTIVE NEEDS
        if (n.status === "open") {
            activeNeeds += 1;
        }
    });

    // =========================
    // UI UPDATE
    // =========================

    // Needs Met → show completed count
    document.getElementById("needsMet").textContent = needsMet;

    // Growth (simple placeholder)
    document.getElementById("needsGrowth").textContent =
        totalPeopleHelped > 0 ? `+${totalPeopleHelped}` : "+0";

    // Active Volunteers → proxy = active needs
    document.getElementById("activeVolunteers").textContent = activeNeeds;

    document.getElementById("volunteerStatus").textContent =
        activeNeeds > 0 ? "Engaged" : "Idle";
}

// =========================
// BUTTONS
// =========================
function setupButtons(ngoId) {

   
    // =========================
    // MESSAGE BUTTON
    // =========================
    const messageBtn = document.getElementById("messageBtn");

    if (messageBtn) {
        messageBtn.addEventListener("click", () => {
            window.location.href = `/chat?ngoId=${ngoId}`;
        });
    }

    // =========================
    // FOLLOW BUTTON (TEMP SIMPLE)
    // =========================
   const followBtn = document.getElementById("followBtn");

    if (followBtn) {
        followBtn.addEventListener("click", async () => {

            try {
                const res = await fetch(`/api/ngo/${ngoId}/follow`, {
                    method: "POST"
                });

                if (res.ok) {
                    alert("Followed NGO");
                } else {
                    alert("Failed to follow NGO");
                }

            } catch (err) {
                console.error(err);
                alert("Network error");
            }

    });
}
}