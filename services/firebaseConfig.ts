import * as firebaseAppModule from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Workaround for TypeScript errors where firebase/app exports are not detected correctly.
// We cast the module to any to access the named exports that exist at runtime in Firebase v9+.
const { initializeApp, getApps } = firebaseAppModule as any;

// Define a local type alias for FirebaseApp to avoid import errors
type FirebaseApp = any;

// Use explicit cast for import.meta.env as vite/client types might be missing in this context
const env = (import.meta as any).env;

// Konfigürasyon Environment Variable'lardan (VITE_...) okunur.
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Basit kontrol
export const isConfigured = !!firebaseConfig.apiKey;

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;

if (isConfigured) {
  try {
    // Uygulama daha önce başlatılmış mı kontrol et (Hot Reload hatalarını önler)
    const apps = getApps ? getApps() : [];
    
    if (apps.length === 0) {
        if (initializeApp) {
            app = initializeApp(firebaseConfig);
        } else {
            console.error("Firebase initializeApp bulunamadı.");
        }
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