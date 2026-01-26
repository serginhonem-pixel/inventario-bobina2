import React, { useState, useEffect } from "react";
import "./App.css";
import LandingPage from "./landing"; // Mantém sua landing original
import LabelManagement from "./pages/LabelManagement"; // Novo sistema refatorado
import useNetworkStatus from "./hooks/useNetworkStatus";
import { auth } from "./services/firebase/config";
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

const App = () => {
  const [user, setUser] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const { isOnline, pendingMovementsCount, updatePendingCount } = useNetworkStatus();
  const allowedEmails = ["pcp@metalosa.com.br"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const normalized = (currentUser.email || "").toLowerCase();
        if (!normalized || (allowedEmails.length > 0 && !allowedEmails.includes(normalized))) {
          setAuthError("Acesso restrito. Seu e-mail não está autorizado.");
          signOut(auth).catch(() => {});
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStart = async () => {
    setShowLanding(false);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Erro ao autenticar:", error);
      setAuthError(error?.message || "Erro ao autenticar.");
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro ao autenticar com Google:", error);
      setAuthError(error?.message || "Erro ao autenticar com Google.");
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

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-black text-white mb-2">
            {authMode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-zinc-400 text-sm mb-6">
            Acesso restrito. Use seu e-mail autorizado.
          </p>

          {authError && (
            <div className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              {authError}
            </div>
          )}

          <button
            onClick={handleGoogleAuth}
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-emerald-500 text-white py-3 rounded-xl font-bold transition-all"
          >
            Entrar com Google
          </button>

          <div className="my-5 text-center text-xs text-zinc-500">ou</div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Seu email"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:border-emerald-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Sua senha"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:border-emerald-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold transition-all"
            >
              {authMode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            className="mt-4 w-full text-xs text-zinc-400 hover:text-white"
          >
            {authMode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
        </div>
      </div>
    );
  }

  // Após o "Começar", mostra o novo sistema de etiquetas refatorado
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <LabelManagement 
        user={user} 
        onLogout={async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.error("Erro ao sair:", error);
          } finally {
            setUser(null);
            setShowLanding(true);
          }
        }}
        isOnline={isOnline}
        pendingMovementsCount={pendingMovementsCount}
        updatePendingCount={updatePendingCount}
      />
    </div>
  );
};

export default App;
