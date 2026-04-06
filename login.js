// login.js

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

// --- Language Handling for Login ---
function updateLoginI18n() {
    if (typeof t !== 'function') return;

    // Update Elements
    const subText = document.getElementById('loginSubText');
    if (subText) subText.textContent = t('login_title_system');

    if (emailInput) emailInput.placeholder = t('login_email_placeholder');
    if (passwordInput) passwordInput.placeholder = t('login_password_placeholder');

    if (forgotPasswordBtn) forgotPasswordBtn.textContent = t('login_forgot_pwd');

    const submitBtn = document.getElementById('loginSubmitBtn');
    if (submitBtn && submitBtn.textContent !== 'กำลังเข้าสู่ระบบ...') {
        submitBtn.textContent = t('login_btn');
    }

    const orText = document.getElementById('loginOrText');
    if (orText) orText.textContent = t('login_or');

    const googleText = document.getElementById('loginGoogleText');
    if (googleText) googleText.textContent = t('login_google');

    // Update Language Buttons Active State
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('lang-btn-' + (_settings.lang || 'th'));
    if (activeBtn) activeBtn.classList.add('active');
}

window.changeLoginLang = function(lang) {
    _settings.lang = lang;
    if (typeof saveSettings === 'function') saveSettings(_settings);
    updateLoginI18n();
};

// Apply language on load
document.addEventListener('DOMContentLoaded', () => {
    // Retry if i18n logic is slightly delayed
    setTimeout(updateLoginI18n, 50);
});
// ------------------------------------

// Check if user is already logged in
if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // If already logged in, redirect to main app
            window.location.href = 'index.html';
        }
    });
}

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    if(successMsg) successMsg.style.display = 'none';
}

function showSuccess(message) {
    if(successMsg) {
        successMsg.textContent = message;
        successMsg.style.display = 'block';
    }
    errorMsg.style.display = 'none';
}

if (loginForm && typeof auth !== 'undefined' && auth) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        // --- Local Admin Bypass ---
        const isLocal = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:' ||
            window.location.hostname === '';

        if (isLocal && email === 'Admin' && password === 'Naents0000') {
            // Set a flag to bypass auth in auth-state.js
            localStorage.setItem('local_admin_bypass', 'true');
            window.location.href = 'index.html';
            return;
        }

        // Disable inputs and show loading state
        const submitBtn = document.getElementById('loginSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '...';
        submitBtn.disabled = true;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in successfully, onAuthStateChanged will handle redirect
            })
            .catch((error) => {
                console.error(error);
                submitBtn.textContent = typeof t === 'function' ? t('login_btn') : originalText;
                submitBtn.disabled = false;

                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    showError(typeof t === 'function' && _settings.lang !== 'th' ? 'Invalid email or password' : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
                } else if (error.code === 'auth/invalid-email') {
                    showError(typeof t === 'function' && _settings.lang !== 'th' ? 'Invalid email format' : 'รูปแบบอีเมลไม่ถูกต้อง');
                } else {
                    showError(`Error: ${error.message}`);
                }
            });
    });
}

if (forgotPasswordBtn && typeof auth !== 'undefined' && auth) {
    forgotPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();

        if (!email) {
            showError(typeof t === 'function' ? t('login_reset_pwd_err_empty') : 'กรุณากรอกอีเมลของคุณเพื่อทำการรีเซ็ตรหัสผ่าน');
            return;
        }

        auth.sendPasswordResetEmail(email)
            .then(() => {
                showSuccess(typeof t === 'function' ? t('login_reset_pwd_msg') : 'ระบบได้ทำการส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว');
            })
            .catch((error) => {
                console.error(error);
                if (error.code === 'auth/invalid-email') {
                    showError(typeof t === 'function' && _settings.lang !== 'th' ? 'Invalid email format' : 'รูปแบบอีเมลไม่ถูกต้อง');
                } else if (error.code === 'auth/user-not-found') {
                    // For security, usually pretend it worked, but Firebase can return this.
                    showError(typeof t === 'function' && _settings.lang !== 'th' ? 'User not found' : 'ไม่พบบัญชีผู้ใช้นี้');
                } else {
                    showError(`Error: ${error.message}`);
                }
            });
    });
}

if (googleLoginBtn && typeof auth !== 'undefined' && auth) {
    googleLoginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                // Signed in successfully
            })
            .catch((error) => {
                console.error(error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showError(`Google Sign-In failed: ${error.message}`);
                }
            });
    });
}
