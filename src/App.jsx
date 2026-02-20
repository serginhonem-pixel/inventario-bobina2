import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import LandingPage from "./landing";
const LabelManagement = lazy(() => import("./pages/LabelManagement"));
import useNetworkStatus from "./hooks/useNetworkStatus";
import { auth } from "./services/firebase/config";
import { ensureUserOrganization } from "./services/firebase/orgService";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  getIdTokenResult
} from "firebase/auth";
import ToastHost from "./components/ui/ToastHost";
import { toast } from "./components/ui/toast";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const App = () => {
  const [user, setUser] = useState(null);
  const [, setShowLanding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState("");
  const [org, setOrg] = useState(null);
  const { isOnline, pendingMovementsCount, updatePendingCount } = useNetworkStatus();
  useEffect(() => {
    let unsubscribe = () => {};
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            const normalized = (currentUser.email || "").toLowerCase();
            if (!normalized) {
              setAuthError("Acesso restrito. Seu e-mail não está autorizado.");
              signOut(auth).catch(() => {});
              setUser(null);
              setLoading(false);
              return;
            }
            // Ler custom claims e anexar ao objeto do usuário
            try {
              const tokenResult = await getIdTokenResult(currentUser);
              currentUser.superAdmin = tokenResult.claims.superAdmin === true;
            } catch {
              currentUser.superAdmin = false;
            }
          }
          setUser(currentUser);
          setLoading(false);
        });
      })
      .catch((error) => {
        console.error("Erro ao configurar persistência:", error);
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
      });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setOrg(null);
      setOrgError("");
      setOrgLoading(false);
      return;
    }

    setOrgLoading(true);
    setOrgError("");
    ensureUserOrganization(user)
      .then((result) => {
        setOrg(result?.org || null);
      })
      .catch((error) => {
        console.error("Erro ao carregar organização:", error);
        setOrgError("Erro ao carregar organização.");
      })
      .finally(() => setOrgLoading(false));
  }, [user]);

  const navigate = useNavigate();

  const handleStart = async () => {
    setShowLanding(false);
    navigate("/login");
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

  const handlePasswordReset = async () => {
    if (!email) {
      toast("Digite seu e-mail para recuperar a senha.", { type: "warning" });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast("Enviamos um link de recuperação para o seu e-mail.", { type: "success" });
    } catch (error) {
      console.error("Erro ao enviar recuperação de senha:", error);
      toast("Não foi possível enviar o e-mail de recuperação.", { type: "error" });
    }
  };

const Spinner = () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
    </div>
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      setUser(null);
      setShowLanding(true);
      setOrg(null);
      navigate("/");
    }
  };

  // ---------- Tela de Auth (login/register) ----------
  const AuthScreen = () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">
              {authMode === "login" ? "Entrar" : "Criar conta"}
            </h1>
            <p className="text-zinc-400 text-sm">
              Acesse sua conta para continuar.
            </p>
          </div>
          <img src="/logo.png" alt="QtdApp" className="h-10 w-auto opacity-80" />
        </div>

        <button
          onClick={() => { setShowLanding(true); navigate("/"); }}
          className="mb-4 text-xs text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
        >
          ← Voltar à página inicial
        </button>

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

        {authMode === "login" && (
          <button
            type="button"
            onClick={handlePasswordReset}
            className="mt-3 w-full text-xs text-emerald-400 hover:text-emerald-300"
          >
            Esqueci minha senha
          </button>
        )}

        <button
          onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          className="mt-4 w-full text-xs text-zinc-400 hover:text-white"
        >
          {authMode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );

  // ---------- Erro de org ----------
  const OrgErrorScreen = () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-xl font-black text-white mb-2">Erro</h1>
        <p className="text-zinc-400 text-sm">{orgError}</p>
        <button
          onClick={() => signOut(auth)}
          className="mt-6 w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold transition-all"
        >
          Sair
        </button>
      </div>
    </div>
  );

  // ---------- Guard: redireciona para /login se não autenticado ----------
  const RequireAuth = ({ children }) => {
    if (loading || orgLoading) return <Spinner />;
    if (orgError) return <OrgErrorScreen />;
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  // Redireciona user autenticado para /app quando acessa /login
  const redirectIfLogged = user && !loading && !orgLoading && !orgError;

  return (
    <>
      <Routes>
        {/* Páginas legais */}
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfUse />} />

        {/* Landing */}
        <Route path="/" element={<LandingPage onEnter={handleStart} />} />

        {/* Auth */}
        <Route
          path="/login"
          element={
            loading || orgLoading ? <Spinner /> :
            redirectIfLogged ? <Navigate to="/app" replace /> :
            <AuthScreen />
          }
        />

        {/* App protegido — aceita /app e qualquer sub-rota /app/* */}
        <Route
          path="/app/*"
          element={
            <RequireAuth>
              <div className="min-h-screen bg-zinc-950 text-zinc-100">
                <Suspense fallback={<Spinner />}>
                  <LabelManagement
                    user={user}
                    tenantId={org?.id || user?.uid}
                    org={org}
                    onLogout={handleLogout}
                    isOnline={isOnline}
                    pendingMovementsCount={pendingMovementsCount}
                    updatePendingCount={updatePendingCount}
                  />
                </Suspense>
              </div>
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </>
  );
};

export default App;


