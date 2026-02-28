// login.js

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const errorMsg = document.getElementById('errorMsg');

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
}

if (loginForm && typeof auth !== 'undefined' && auth) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        // Disable inputs and show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';
        submitBtn.disabled = true;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in successfully, onAuthStateChanged will handle redirect
            })
            .catch((error) => {
                console.error(error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;

                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    showError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
                } else {
                    showError(`เกิดข้อผิดพลาด: ${error.message}`);
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
