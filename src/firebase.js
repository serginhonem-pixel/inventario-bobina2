// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURAÇÃO DO SEU APP ---
const firebaseConfig = {
  // ATENÇÃO: COLOQUE A CHAVE CORRETA QUE VOCÊ PEGOU NO CONSOLE
  apiKey: "AIzaSyCD0MUk6azoj-cp1v5TP5Q0QP80SKNq-ds", 
  authDomain: "inventario-bobina2.firebaseapp.com",
  projectId: "inventario-bobina2",
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