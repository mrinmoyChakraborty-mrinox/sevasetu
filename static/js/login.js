// ─────────────────────────────────────────────
// login.js — Tab switching UI only
// All actual auth logic is in auth.js
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  const signinTab     = document.getElementById("signinTab");
  const signupTab     = document.getElementById("signupTab");
  const formTitle     = document.getElementById("formTitle");
  const formSubtext   = document.getElementById("formSubtext");
  const signinForm    = document.getElementById("emailSignInForm");
  const signupForm    = document.getElementById("emailSignUpForm");

  // ── Switch to Sign In ──
  function showSignIn() {
    signinTab.classList.add("bg-white", "shadow-sm", "text-primary");
    signinTab.classList.remove("text-slate-500", "hover:text-slate-700");
    
    signupTab.classList.remove("bg-white", "shadow-sm", "text-primary");
    signupTab.classList.add("text-slate-500", "hover:text-slate-700");

    formTitle.textContent   = "Welcome Back";
    formSubtext.textContent = "Access your community dashboard and needs.";

    signinForm.classList.remove("hidden");
    signupForm.classList.add("hidden");

    // Update submit button label if exists
    const btn = signinForm.querySelector("button[type='submit']");
    if (btn) btn.textContent = "Sign In";
  }

  // ── Switch to Sign Up ──
  function showSignUp() {
    signupTab.classList.add("bg-white", "shadow-sm", "text-primary");
    signupTab.classList.remove("text-slate-500", "hover:text-slate-700");
    
    signinTab.classList.remove("bg-white", "shadow-sm", "text-primary");
    signinTab.classList.add("text-slate-500", "hover:text-slate-700");

    formTitle.textContent   = "Join SevaSetu";
    formSubtext.textContent = "Start helping your community today.";

    signinForm.classList.add("hidden");
    signupForm.classList.remove("hidden");

    // Update submit button label if exists
    const btn = signupForm.querySelector("button[type='submit']");
    if (btn) btn.textContent = "Create My Account";
  }

  signinTab.addEventListener("click", showSignIn);
  signupTab.addEventListener("click", showSignUp);

  // ── Auto-switch to Sign Up if user came from
  //    a CTA that implies they are new
  //    (optional — remove if you don't want this)
  const params = new URLSearchParams(window.location.search);
  const role   = params.get("role");
  if (role) {
    // User clicked "I want to Volunteer" or "I represent an NGO"
    // They are likely new — default to Sign Up tab
    showSignUp();
  } else {
    showSignIn();
  }

});
