// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAt0x0oot9XmVVpiVhUd5Via-SjbgODEoM",
  authDomain: "vehiclefleettracking-2e69e.firebaseapp.com",
  projectId: "vehiclefleettracking-2e69e",
  storageBucket: "vehiclefleettracking-2e69e.firebasestorage.app",
  messagingSenderId: "973033114992",
  appId: "1:973033114992:web:0c1ba9b0e541a67891d3b5",
  measurementId: "G-CPDHH6SK2W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);