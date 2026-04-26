/* =====================================================
   task_completion.js
   Handles volunteer task report submission
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("completionForm");
    const proofInput = document.getElementById("proofInput");
    const uploadZone = document.getElementById("uploadZone");
    const proofPreview = document.getElementById("proofPreview");
    const previewImg = document.getElementById("previewImg");
    const removeProof = document.getElementById("removeProof");
    const submitBtn = document.getElementById("submitBtn");

    // 1. Proof Preview Logic
    proofInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            proofInput.value = "";
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large. Max 10MB.");
            proofInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            proofPreview.classList.remove("hidden");
            uploadZone.classList.add("hidden");
        };
        reader.readAsDataURL(file);
    }

    removeProof.addEventListener("click", () => {
        proofInput.value = "";
        proofPreview.classList.add("hidden");
        uploadZone.classList.remove("hidden");
    });

    // 2. Form Submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const submitBtnText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting Report...";

        try {
            const res = await fetch("/api/volunteer/task/complete", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to submit report. Please try again.");
            }

            const data = await res.json();
            window.location.href = data.redirect || "/volunteer/task/success";

        } catch (err) {
            console.error("Submission error:", err);
            alert(err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtnText;
        }
    });
});
