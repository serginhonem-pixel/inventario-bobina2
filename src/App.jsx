import React, { useState, useEffect } from "react";
import "./App.css";
import LandingPage from "./landing"; // Mantém sua landing original
import LabelManagement from "./pages/LabelManagement"; // Novo sistema refatorado
import useNetworkStatus from "./hooks/useNetworkStatus";
import { auth } from "./services/firebase/config";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

const App = () => {
  const [user, setUser] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [loading, setLoading] = useState(true);
  const { isOnline, pendingMovementsCount, updatePendingCount } = useNetworkStatus();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStart = async () => {
    // Se estiver em localhost, pula a autenticação do Firebase para evitar erros
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
      console.log("[MOCK] Acesso local liberado sem Firebase Auth");
      setShowLanding(false);
      return;
    }

    try {
      if (!user) {
        await signInAnonymously(auth);
      }
      setShowLanding(false);
    } catch (error) {
      console.error("Erro ao entrar:", error);
      alert("Erro ao acessar o sistema. Verifique sua conexão ou chaves do Firebase.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  // Se showLanding for true, mostra sua landing page original
  // Passamos a prop onEnter que é o que a sua landing.jsx espera
  if (showLanding) {
    return <LandingPage onEnter={handleStart} />;
  }

  // Após o "Começar", mostra o novo sistema de etiquetas refatorado
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <LabelManagement 
        user={user} 
        onLogout={() => {
          // Lógica de logout
          setUser(null);
          setShowLanding(true);
        }}
        isOnline={isOnline}
        pendingMovementsCount={pendingMovementsCount}
        updatePendingCount={updatePendingCount}
      />
    </div>
  );
};

export default App;
