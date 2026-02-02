import { initializeApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Konfigürasyon öncelikle Environment Variable'lardan (VITE_...) okunur.
// Eğer tanımlı değilse, geliştirme ortamı için aşağıdaki hardcoded değerler kullanılır.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCAdwbA5u0oLe0m6oKryKwHx1XBiDEWnrk",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "izbb-taxi-management.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "izbb-taxi-management",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "izbb-taxi-management.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "956551883987",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:956551883987:web:3f6bc14aad0c026f357826",
};

// Basit kontrol
export const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "BURAYA_API_KEY_GELECEK";

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;

if (isConfigured) {
  try {
    // Uygulama daha önce başlatılmış mı kontrol et (Hot Reload hatalarını önler)
    // firebase namespace'i üzerinden erişerek import hatalarını önlüyoruz
    const apps = getApps();
    if (apps.length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = apps[0];
    }
    
    dbInstance = getFirestore(app);
    console.log("Firebase başarıyla başlatıldı.");
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
  }
} else {
  console.warn("Firebase yapılandırması yapılmamış.");
}

export const db = dbInstance;
export const firebaseApp = app;