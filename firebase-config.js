// firebase-config.js
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCvk6GXtDAjDz4hh2jzHYV-JYYi9HxzWRw",
    authDomain: "food-cost-app-9999.firebaseapp.com",
    projectId: "food-cost-app-9999",
    storageBucket: "food-cost-app-9999.firebasestorage.app",
    messagingSenderId: "760127698303",
    appId: "1:760127698303:web:6a8f14a8e9e7936cfed64a",
    measurementId: "G-D8LREP0MQR"
};

// Initialize Firebase (Compat mode)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}

// Global instances for the app to use
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const dbFirestore = typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null;
