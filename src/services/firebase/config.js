import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAUgSFXIsxuUD2YjBHUrN1cIVbccDbm2eU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "qtdapp-4e93b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "qtdapp-4e93b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "qtdapp-4e93b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "461299285609",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:461299285609:web:648c9ca5d0d80cddff2cf8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3FDMQE8G3R",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
