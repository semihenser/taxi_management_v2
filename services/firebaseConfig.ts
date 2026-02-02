import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// ÖNEMLİ: Firebase Konsolundan aldığın 'firebaseConfig' nesnesini buraya yapıştır.
// Aşağıdaki değerleri kendi proje ayarlarındaki değerlerle değiştirmezseniz veritabanı ÇALIŞMAZ.
const firebaseConfig = {
  apiKey: "AIzaSyCAdwbA5u0oLe0m6oKryKwHx1XBiDEWnrk",
  authDomain: "izbb-taxi-management.firebaseapp.com",
  projectId: "izbb-taxi-management",
  storageBucket: "izbb-taxi-management.firebasestorage.app",
  messagingSenderId: "956551883987",
  appId: "1:956551883987:web:3f6bc14aad0c026f357826",
};

// Basit kontrol: Değerler varsayılan mı?
export const isConfigured = firebaseConfig.apiKey !== "AIzaSyCAdwbA5u0oLe0m6oKryKwHx1XBiDEWnrk";

let app;
let dbInstance: Firestore;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  } catch (error) {
    console.error("Firebase başlatma hatası:", error);
  }
} else {
  console.warn("Firebase yapılandırması yapılmamış. Uygulama demo modunda veya hatalı çalışabilir.");
}

// db undefined olabilir, bunu kullanan yerlerde kontrol edeceğiz
export const db = dbInstance!;