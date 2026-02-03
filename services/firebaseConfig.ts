/// <reference types="vite/client" />

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Konfigürasyon Environment Variable'lardan (VITE_...) okunur.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Basit kontrol
export const isConfigured = !!firebaseConfig.apiKey;

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;

if (isConfigured) {
  try {
    // Uygulama daha önce başlatılmış mı kontrol et (Hot Reload hatalarını önler)
    const apps = getApps();
    
    if (apps.length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = apps[0];
    }
    
    if (app) {
        dbInstance = getFirestore(app);
        console.log("Firebase başarıyla başlatıldı.");
    }
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
  }
} else {
  console.warn("Firebase yapılandırması yapılmamış. Lütfen .env dosyasını oluşturun.");
}

export const db = dbInstance;
export const firebaseApp = app;
