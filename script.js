<script>
  // Tab switching
  const signinTab = document.getElementById('signinTab');
  const signupTab = document.getElementById('signupTab');
  const h2 = document.querySelector('.form-box h2');
  const subtext = document.querySelector('.subtext');
  const submitBtn = document.querySelector('.submit-btn');

  signinTab.addEventListener('click', () => {
    signinTab.classList.add('active');
    signupTab.classList.remove('active');
    h2.textContent = 'Welcome Back';
    subtext.textContent = 'Access your community dashboard and needs.';
    submitBtn.textContent = 'Sign In to SevaSetu';
  });

  signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    signinTab.classList.remove('active');
    h2.textContent = 'Join SevaSetu';
    subtext.textContent = 'Start helping your community today.';
    submitBtn.textContent = 'Create My Account';
  });

  // Form submit
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Login successful (demo)');
  });
</script>
