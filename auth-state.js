// auth-state.js
// Check for local admin bypass first
const isLocalBypass = localStorage.getItem('local_admin_bypass') === 'true';

if (isLocalBypass) {
    console.log("Local Admin Bypass Active");
    const fakeAdminUser = { uid: 'local_admin', email: 'Admin' };

    // Simulate auth state change
    setTimeout(() => {
        document.body.style.opacity = '1';
        const authGuard = document.getElementById('auth-guard');
        if (authGuard) authGuard.remove();

        if (typeof DB !== 'undefined' && DB.initFirestoreRealtime) {
            DB.initFirestoreRealtime(fakeAdminUser.uid);
        }
    }, 100);

} else if (auth) {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Redirect to login page if no user is signed in
            const isLoginPage = window.location.pathname.endsWith('login.html');
            if (!isLoginPage) {
                window.location.replace('login.html');
            }
        } else {
            console.log("User is authenticated:", user.email || user.displayName);
            document.body.style.opacity = '1';
            const authGuard = document.getElementById('auth-guard');
            if (authGuard) authGuard.remove();

            if (typeof DB !== 'undefined' && DB.initFirestoreRealtime) {
                // Remove local seed initialization since we're using Cloud Realtime
                DB.initFirestoreRealtime(user.uid);
            }
        }
    });
}
