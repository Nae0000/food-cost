// auth-state.js
// Check if auth is available
if (auth) {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Redirect to login page if no user is signed in
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage !== 'login.html') {
                window.location.href = 'login.html';
            }
        } else {
            console.log("User is authenticated:", user.email || user.displayName);
            if (typeof DB !== 'undefined' && DB.initFirestoreRealtime) {
                // Remove local seed initialization since we're using Cloud Realtime
                DB.initFirestoreRealtime(user.uid);
            }
        }
    });
}
