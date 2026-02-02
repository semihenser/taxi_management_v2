import * as firebase from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Sağladığınız doğru bilgileri buraya ekledim.
const firebaseConfig = {
  apiKey: "AIzaSyCAdwbA5u0oLe0m6oKryKwHx1XBiDEWnrk",
  authDomain: "izbb-taxi-management.firebaseapp.com",
  projectId: "izbb-taxi-management",
  storageBucket: "izbb-taxi-management.firebasestorage.app",
  messagingSenderId: "956551883987",
  appId: "1:956551883987:web:3f6bc14aad0c026f357826",
};

// DÜZELTME: Artık kontrolü placeholder (yer tutucu) metne göre yapıyoruz.
// Sizin girdiğiniz anahtar 'BURAYA_API_KEY_GELECEK' olmadığı sürece sistem çalışacaktır.
export const isConfigured = firebaseConfig.apiKey !== "BURAYA_API_KEY_GELECEK";

let app;
let dbInstance;

if (isConfigured) {
  try {
    app = firebase.initializeApp(firebaseConfig);
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