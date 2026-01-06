// src/App.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import { initialInventoryCatalog } from "./inventoryCatalog";
// IMPORTANTE: Importamos o novo catálogo que acabamos de criar
import { profilesCatalog } from "./profilesCatalog";
import { buildCatalogModel, searchCatalog } from "./catalogUtils";

import {
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
  doc,
} from "firebase/firestore";

// ===============================
// COMPONENTE DE LOGIN
// ===============================
const LoginComponent = ({ setUserName }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError("Digite um nome com pelo menos 3 letras.");
      return;
    }
    setUserName(name.trim());
    localStorage.setItem("inventoryUserName", name.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm bg-zinc-950/80 border border-zinc-800/80 p-8 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur">
        <h2 className="text-2xl font-bold text-emerald-300 mb-6 text-center tracking-wide">Identificação</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Seu nome"
            className="w-full border border-zinc-800 bg-zinc-900/60 p-3 rounded-xl text-zinc-100 placeholder:text-zinc-500 shadow-inner"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <button className="w-full bg-emerald-500/90 text-black p-3 rounded-xl font-bold shadow hover:bg-emerald-400">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

// ===============================
// LEITOR QR CODE (BarcodeDetector)
// ===============================
const QrScanner = ({ isOpen, onDetected, onClose }) => {
  const videoRef = useRef(null);
  const lastScanRef = useRef({ value: "", time: 0 });
  const [status, setStatus] = useState("Iniciando câmera...");

  useEffect(() => {
    if (!isOpen) return undefined;

    let stream = null;
    let detector = null;
    let rafId = null;
    let active = true;

    const start = async () => {
      if (!("BarcodeDetector" in window)) {
        setStatus("Navegador sem suporte a leitor de QR.");
        return;
      }

      try {
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch (err) {
        setStatus("Não foi possível iniciar o leitor.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (err) {
        setStatus("Permissão de câmera negada.");
        return;
      }

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", true);

      try {
        await videoRef.current.play();
      } catch (err) {
        setStatus("Não foi possível iniciar o vídeo.");
        return;
      }

      setStatus("Aponte a câmera para o QR code.");

      const scan = async () => {
        if (!active || !videoRef.current) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length) {
            const rawValue = barcodes[0].rawValue || barcodes[0].data;
            const now = Date.now();
            if (
              rawValue &&
              (rawValue !== lastScanRef.current.value ||
                now - lastScanRef.current.time > 1500)
            ) {
              lastScanRef.current = { value: rawValue, time: now };
              onDetected(rawValue);
            }
          }
        } catch (err) {
          // Ignora erros de leitura intermitentes.
        }

        rafId = requestAnimationFrame(scan);
      };

      rafId = requestAnimationFrame(scan);
    };

    start();

    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, onDetected]);

  if (!isOpen) return null;

  return (
    <div className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-zinc-400">{status}</p>
        <button
          type="button"
          className="text-xs text-rose-300 underline hover:text-rose-200"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
      <div className="relative w-full aspect-[4/3] min-h-[240px] sm:min-h-[320px] overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-4 border-2 border-dashed border-emerald-400/60 pointer-events-none" />
      </div>
    </div>
  );
};

// ===============================
// APP PRINCIPAL
// ===============================
const App = () => {
  const [userName, setUserName] = useState(null);
  const [uid, setUid] = useState(null);
  
  // ESTADO PARA O TIPO DE INVENTÁRIO (Bobina ou Perfil)
  const [inventoryType, setInventoryType] = useState("coil"); // 'coil' ou 'profile'

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [weight, setWeight] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [isSelecting, setIsSelecting] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [inventoryLaunches, setInventoryLaunches] = useState([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const messageTimerRef = useRef(null);

  const appId = "inventario-bobina2";

  // LOGIN ANÔNIMO
  useEffect(() => {
    const saved = localStorage.getItem("inventoryUserName");
    if (saved) setUserName(saved);

    signInAnonymously(auth).catch(() =>
      pushMessage("Erro ao autenticar no Firebase.", "error", 3000)
    );

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      setIsAuthReady(true);
    });

    return () => unsub();
  }, []);

  // LISTENER FIRESTORE
  useEffect(() => {
    if (!isAuthReady || !uid) return;

    const inventoryPath = `artifacts/${appId}/users/${uid}/cyclic_inventory_weight`;

    const q = query(
      collection(db, inventoryPath),
      orderBy("timestamp", "desc"),
      limit(5000)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() ?? new Date(),
      }));
      setInventoryLaunches(docs);
    });

    return () => unsub();
  }, [uid, isAuthReady]);

  // RESETAR SELEÇÃO AO MUDAR DE ABA
  useEffect(() => {
    setSelectedItem(null);
    setSearchTerm("");
    setIsSelecting(false);
    setIsQrOpen(false);
  }, [inventoryType]);

  const pushMessage = (text, type = "info", timeoutMs = 2000) => {
    setMessage(text);
    setMessageType(type);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    if (timeoutMs) {
      messageTimerRef.current = setTimeout(() => {
        setMessage("");
      }, timeoutMs);
    }
  };

  const parseNumericValue = (value) => {
    if (!value) return null;
    const numeric = parseFloat(value.toString().replace(",", "."));
    if (Number.isNaN(numeric) || numeric <= 0) return null;
    return numeric;
  };

    const parseQrPayload = (payload) => {
    if (!payload) return null;
    const text = payload.toString().trim();
    if (!text) return null;

    if (text.startsWith("{") && text.endsWith("}")) {
      try {
        const data = JSON.parse(text);
        const id = (data.code || data.id || "").toString().trim().toUpperCase();
        const qtyRaw = (data.qtd || data.qty || data.peso || "").toString();
        const numeric = parseNumericValue(qtyRaw.replace(/[^0-9,.-]/g, ""));
        return { id, numeric };
      } catch (err) {
        // Continua para parser simples.
      }
    }

    const parts = text.split(/[;|,]/).map((part) => part.trim()).filter(Boolean);
    const id = parts[0]?.toUpperCase();
    const numeric = parseNumericValue(parts[1]);

    return { id, numeric };
  };

  const submitLaunch = async (item, numeric, options = {}) => {
    const { keepSelecting = false } = options;
    if (!item) {
      pushMessage("Selecione o item.", "error", 2500);
      return;
    }
    if (!numeric) {
      pushMessage("Informe o valor.", "error", 2500);
      return;
    }

    try {
      await addDoc(
        collection(db, `artifacts/${appId}/users/${uid}/cyclic_inventory_weight`),
        {
          itemId: item.id,
          description: item.description,
          weightKg: numeric, // Mantemos o nome weightKg para compatibilidade, mas pode ser qtd
          type: inventoryType, // Salvamos se 'coil' ou 'profile'
          timestamp: serverTimestamp(),
          userName,
          uid,
        }
      );

      setWeight("");
      if (!keepSelecting) {
        setIsSelecting(false);
      }
      pushMessage(`Lançado: ${numeric} (${item.id})`, "success", 1500);
      if (navigator.vibrate) navigator.vibrate(80);
    } catch (err) {
      pushMessage("Erro ao salvar no Firestore.", "error", 3000);
    }
  };

  // ENVIAR PESO
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      pushMessage("Selecione o item.", "error", 2500);
      return;
    }
    if (!weight) {
      pushMessage("Informe o valor.", "error", 2500);
      return;
    }

    const numeric = parseNumericValue(weight);
    if (!numeric) {
      pushMessage("Valor inválido.", "error", 2500);
      return;
    }

    await submitLaunch(selectedItem, numeric);
  };

  // EXCLUIR
  const handleDelete = async (id) => {
    try {
      await deleteDoc(
        doc(db, `artifacts/${appId}/users/${uid}/cyclic_inventory_weight`, id)
      );
    } catch (err) {
      pushMessage("Erro ao excluir.", "error", 3000);
    }
  };

  // CSV
  const handleExport = () => {
    if (!inventoryLaunches.length) return;

    // Adicionamos a coluna "Tipo" no CSV
    const header = "Data;Tipo;ID;Descrição;Peso/Qtd;Usuário\n";
    const rows = inventoryLaunches
      .map((l) =>
        [
          l.timestamp.toLocaleString("pt-BR"),
          l.type === "profile" ? "Perfil" : "Bobina", // Traduz o tipo
          l.itemId,
          l.description,
          l.weightKg.toFixed(2).replace(".", ","),
          l.userName,
        ].join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventario_completo.csv";
    link.click();
  };

  // FILTRO INTELIGENTE (Define qual catálogo usar)
  const coilCatalogModel = useMemo(
    () => buildCatalogModel(initialInventoryCatalog, "bobinas"),
    []
  );
  const profileCatalogModel = useMemo(
    () => buildCatalogModel(profilesCatalog, "perfis"),
    []
  );

  const activeCatalogModel =
    inventoryType === "coil" ? coilCatalogModel : profileCatalogModel;

  const filteredCatalog = useMemo(
    () => searchCatalog(activeCatalogModel, searchTerm),
    [activeCatalogModel, searchTerm]
  );

  const handleQrDetected = async (payload) => {
    const parsed = parseQrPayload(payload);
    if (!parsed || !parsed.id) {
      pushMessage("QR inválido.", "error", 2500);
      return;
    }

    const itemIndex = activeCatalogModel.byId.get(parsed.id);
    if (itemIndex === undefined) {
      pushMessage(`Item não encontrado: ${parsed.id}`, "error", 2500);
      return;
    }

    const item = activeCatalogModel.items[itemIndex];
    setWeight("");
    if (parsed.numeric) {
      await submitLaunch(item, parsed.numeric, { keepSelecting: true });
      setSelectedItem(null);
      return;
    }

    setSelectedItem(item);
    pushMessage(`Selecionado via QR: ${item.id}`, "info", 1500);
  };

  const messageStyle =
    messageType === "success"
      ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
      : messageType === "error"
      ? "bg-rose-500/15 text-rose-200 border border-rose-500/30"
      : "bg-cyan-500/10 text-cyan-200 border border-cyan-500/30";

  if (!userName) return <LoginComponent setUserName={setUserName} />;

  return (
    <div className="min-h-screen px-2 py-3 sm:p-4 text-zinc-100">

      <header className="text-center mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-wide">Inventário Cíclico</h1>
        <p className="text-sm text-zinc-400">
          Usuário: <strong>{userName}</strong>
        </p>

        {message && (
          <div className={`mt-3 p-2 rounded-lg text-sm ${messageStyle}`}>
            {message}
          </div>
        )}
      </header>

      {/* SELETOR DE ABAS (BOBINAS vs PERFIS) */}
      <div className="w-full max-w-none sm:max-w-5xl mx-auto mb-4 sm:mb-6 flex justify-center">
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-1 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex space-x-1">
          <button
            onClick={() => setInventoryType("coil")}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              inventoryType === "coil"
                ? "bg-emerald-500 text-black shadow-[0_8px_18px_rgba(16,185,129,0.4)]"
                : "text-zinc-400 hover:bg-zinc-800/60"
            }`}
          >
            Bobinas
          </button>
          <button
            onClick={() => setInventoryType("profile")}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              inventoryType === "profile"
                ? "bg-emerald-500 text-black shadow-[0_8px_18px_rgba(16,185,129,0.4)]"
                : "text-zinc-400 hover:bg-zinc-800/60"
            }`}
          >
            Perfis (P.A.)
          </button>
        </div>
      </div>

      <main className="w-full max-w-none sm:max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">

        {isSelecting && !isQrOpen && (
          <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-bold text-emerald-300 mb-2">Catálogo de {inventoryType === "coil" ? "Bobinas" : "Perfis"} ({filteredCatalog.length})</h2>

            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                className="text-xs text-emerald-300 underline hover:text-emerald-200"
                onClick={() => setIsQrOpen((open) => !open)}
              >
                {isQrOpen ? "Fechar leitor QR" : "Ler QR code"}
              </button>
            </div>

            <input
              className="w-full border border-zinc-800 bg-zinc-900/70 p-2 rounded-lg mb-3 text-zinc-100 placeholder:text-zinc-500"
              placeholder={`Buscar código ou descrição...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-zinc-900/60 hover:bg-zinc-800/70 border border-zinc-800 rounded-lg cursor-pointer"
                  onClick={() => {
                    setSelectedItem(item);
                    setIsSelecting(false);
                    pushMessage(`Selecionado: ${item.id}`, "info", 1500);
                  }}
                >
                  <p className="font-bold text-sm">{item.id}</p>
                  <p className="text-xs">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)] h-fit">
          {!selectedItem ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-4">O que vamos contar agora?</p>
              <button
                className="w-full bg-emerald-500/90 text-black p-4 rounded-xl shadow-[0_12px_30px_rgba(16,185,129,0.35)] text-lg font-semibold hover:bg-emerald-400"
                onClick={() => setIsSelecting(true)}
              >
                Selecionar {inventoryType === "coil" ? "Bobina" : "Perfil"}
              </button>
              <button
                className="w-full mt-3 border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 p-3 rounded-xl text-sm font-semibold"
                onClick={() => {
                  setIsSelecting(true);
                  setIsQrOpen(true);
                }}
              >
                Ler QR code
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="bg-zinc-900/70 p-4 rounded-lg border border-zinc-800">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                  {inventoryType === "coil" ? "Bobina Selecionada" : "Perfil Selecionado"}
                </span>
                <p className="text-lg text-zinc-100 font-bold mt-1">
                  {selectedItem.id}
                </p>
                <p className="text-sm text-zinc-300">
                  {selectedItem.description}
                </p>
                <button
                  type="button"
                  className="text-xs text-rose-300 underline hover:text-rose-200 mt-2"
                  onClick={() => {
                    setSelectedItem(null);
                    setWeight("");
                    setIsSelecting(true);
                  }}
                >
                  Trocar Item
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  {inventoryType === "coil" ? "Peso (kg)" : "Quantidade ou Peso"}
                </label>
                <input
                  type="text" // Mantemos text para permitir vírgula fácil
                  inputMode="decimal" // Teclado numérico no celular
                  placeholder={inventoryType === "coil" ? "Ex: 1250,5" : "Ex: 50"}
                  className="w-full border border-zinc-800 bg-zinc-900/70 p-3 rounded-xl text-lg text-zinc-100 placeholder:text-zinc-500"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
              </div>

              <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black p-4 rounded-xl shadow font-bold text-lg">CONFIRMAR LANÇAMENTO</button>
            </form>
          )}
        </div>

      </main>

      {isQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950/90 border border-zinc-800/80 p-4 shadow-2xl sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-emerald-300">Leitor de QR</h3>
              <button
                type="button"
                className="text-sm text-rose-300 underline hover:text-rose-200"
                onClick={() => setIsQrOpen(false)}
              >
                Fechar
              </button>
            </div>
            {message && messageType === "success" && (
              <div className="mb-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-3 text-center text-sm font-bold text-emerald-200">
                Lançamento OK
              </div>
            )}
            <QrScanner
              isOpen={isQrOpen}
              onDetected={handleQrDetected}
              onClose={() => setIsQrOpen(false)}
            />
          </div>
        </div>
      )}

      <section className="w-full max-w-none sm:max-w-5xl mx-auto mt-6 sm:mt-8 bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-emerald-300 text-lg">Histórico de Lançamentos</h2>

          <button
            onClick={handleExport}
            className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-sm hover:bg-emerald-400"
          >
            Exportar CSV
          </button>
        </div>

        {!inventoryLaunches.length ? (
          <p className="text-zinc-400 text-center py-4 bg-zinc-900/60 border border-zinc-800 rounded-lg">Nenhum lançamento realizado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {inventoryLaunches.map((item) => (
              <div
                key={item.id}
                className={`p-3 border-l-4 rounded flex justify-between items-center ${
                  item.type === "profile" 
                    ? "bg-cyan-500/10 border-cyan-400/50" // Cor diferente para perfil
                    : "bg-emerald-500/10 border-emerald-400/50" // Cor original para bobina
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-black ${
                      item.type === "profile" ? "bg-cyan-400/80 text-black" : "bg-emerald-400/80 text-black"
                    }`}>
                      {item.type === "profile" ? "PERFIL" : "BOBINA"}
                    </span>
                    <span className="font-bold text-sm text-zinc-100">{item.itemId}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>
                  <p className="text-xs mt-1">
                    <strong>{item.weightKg.toFixed(2).replace('.', ',')}</strong>
                    <span className="text-zinc-500"> - {item.userName}</span>
                  </p>
                </div>

                <button
                  className="text-rose-300 hover:text-rose-200 text-sm px-2 py-1"
                  onClick={() => handleDelete(item.id)}
                >Excluir</button>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default App;










