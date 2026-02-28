// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCvk6GXtDAjDz4hh2jzHYV-JYYi9HxzWRw",
    authDomain: "food-cost-app-9999.firebaseapp.com",
    projectId: "food-cost-app-9999",
    storageBucket: "food-cost-app-9999.firebasestorage.app",
    messagingSenderId: "760127698303",
    appId: "1:760127698303:web:6a8f14a8e9e7936cfed64a",
    measurementId: "G-D8LREP0MQR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);