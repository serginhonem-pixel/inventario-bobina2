// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURAÇÃO DO SEU APP ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "inventario-bobina2.appspot.com",
  messagingSenderId: "628276135464",
  appId: "1:628276135464:web:e33c84479c8fccb0c7171d",
  measurementId: "G-TZS89ZE0TS", // opcional, mas pode ficar
};

// --- Inicializa o app ---
const app = initializeApp(firebaseConfig);

// --- Serviços que você usa: Auth e Firestore ---
const auth = getAuth(app);
const db = getFirestore(app);

// Exports para App.jsx
export { app, auth, db };