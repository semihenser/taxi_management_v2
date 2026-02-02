import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ÖNEMLİ: Firebase Konsolundan aldığın 'firebaseConfig' nesnesini buraya yapıştır.
// Aşağıdaki değerleri kendi proje ayarlarındaki değerlerle değiştir.
const firebaseConfig = {
  apiKey: "AIzaSyCAdwbA5u0oLe0m6oKryKwHx1XBiDEWnrk",
  authDomain: "izbb-taxi-management.firebaseapp.com",
  projectId: "izbb-taxi-management",
  storageBucket: "izbb-taxi-management.firebasestorage.app",
  messagingSenderId: "956551883987",
  appId: "1:956551883987:web:3f6bc14aad0c026f357826",
  measurementId: "G-5H9ED02QX5"

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
