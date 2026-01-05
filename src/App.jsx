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
    <div className="flex items-center justify-center min-h-screen bg-indigo-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">Identificação</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Seu nome"
            className="w-full border p-3 rounded-lg shadow-sm"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-indigo-600 text-white p-3 rounded-xl shadow hover:bg-indigo-700">
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
    <div className="mt-3 rounded-xl border bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-600">{status}</p>
        <button
          type="button"
          className="text-xs text-red-500 underline"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
      <div className="relative w-full overflow-hidden rounded-lg border bg-black">
        <video ref={videoRef} className="w-full h-56 object-cover" muted />
        <div className="absolute inset-4 border-2 border-dashed border-indigo-300 pointer-events-none" />
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
  const [isSelecting, setIsSelecting] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [inventoryLaunches, setInventoryLaunches] = useState([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const appId = "inventario-bobina2";

  // LOGIN ANÔNIMO
  useEffect(() => {
    const saved = localStorage.getItem("inventoryUserName");
    if (saved) setUserName(saved);

    signInAnonymously(auth).catch(() =>
      setMessage("Erro ao autenticar no Firebase.")
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

    const parts = text.split(/[;|,]/).map((part) => part.trim()).filter(Boolean);
    const id = parts[0]?.toUpperCase();
    const numeric = parseNumericValue(parts[1]);

    return { id, numeric };
  };

  const submitLaunch = async (item, numeric) => {
    if (!item) {
      setMessage("Selecione o item.");
      return;
    }
    if (!numeric) {
      setMessage("Informe o valor.");
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
      setIsSelecting(false);
      setMessage(`Lançado: ${numeric} (${item.id})`);
    } catch (err) {
      setMessage("Erro ao salvar no Firestore.");
    }
  };

  // ENVIAR PESO
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      setMessage("Selecione o item.");
      return;
    }
    if (!weight) {
      setMessage("Informe o valor.");
      return;
    }

    const numeric = parseNumericValue(weight);
    if (!numeric) {
      setMessage("Valor inválido.");
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
      setMessage("Erro ao excluir.");
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
      setMessage("QR inválido.");
      return;
    }

    const itemIndex = activeCatalogModel.byId.get(parsed.id);
    if (itemIndex === undefined) {
      setMessage(`Item não encontrado: ${parsed.id}`);
      return;
    }

    const item = activeCatalogModel.items[itemIndex];
    setWeight("");
    setSelectedItem(item);
    setIsSelecting(false);
    setIsQrOpen(false);

    if (parsed.numeric) {
      await submitLaunch(item, parsed.numeric);
    } else {
      setMessage(`Selecionado via QR: ${item.id}`);
    }
  };


  if (!userName) return <LoginComponent setUserName={setUserName} />;

  return (
    <div className="min-h-screen p-4 bg-gray-100">

      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700">Inventário Cíclico</h1>
        <p className="text-sm text-gray-500">
          Usuário: <strong>{userName}</strong>
        </p>

        {message && (
          <div className="mt-3 bg-indigo-100 text-indigo-700 p-2 rounded-lg text-sm">
            {message}
          </div>
        )}
      </header>

      {/* SELETOR DE ABAS (BOBINAS vs PERFIS) */}
      <div className="max-w-5xl mx-auto mb-6 flex justify-center">
        <div className="bg-white p-1 rounded-xl shadow flex space-x-1">
          <button
            onClick={() => setInventoryType("coil")}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              inventoryType === "coil"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Bobinas
          </button>
          <button
            onClick={() => setInventoryType("profile")}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              inventoryType === "profile"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Perfis (P.A.)
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

        {isSelecting && (
          <div className="bg-white p-6 rounded-xl shadow-xl">
            <h2 className="text-lg font-bold text-indigo-600 mb-2">Catálogo de {inventoryType === "coil" ? "Bobinas" : "Perfis"} ({filteredCatalog.length})</h2>

            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                className="text-xs text-indigo-600 underline"
                onClick={() => setIsQrOpen((open) => !open)}
              >
                {isQrOpen ? "Fechar leitor QR" : "Ler QR code"}
              </button>
            </div>

            <QrScanner
              isOpen={isQrOpen}
              onDetected={handleQrDetected}
              onClose={() => setIsQrOpen(false)}
            />
            <input
              className="w-full border p-2 rounded mb-3"
              placeholder={`Buscar código ou descrição...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 hover:bg-indigo-50 border rounded-lg cursor-pointer"
                  onClick={() => {
                    setSelectedItem(item);
                    setIsSelecting(false);
                    setMessage(`Selecionado: ${item.id}`);
                  }}
                >
                  <p className="font-bold text-sm">{item.id}</p>
                  <p className="text-xs">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-xl h-fit">
          {!selectedItem ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">O que vamos contar agora?</p>
              <button
                className="w-full bg-indigo-600 text-white p-4 rounded-xl shadow text-lg font-semibold animate-pulse"
                onClick={() => setIsSelecting(true)}
              >
                Selecionar {inventoryType === "coil" ? "Bobina" : "Perfil"}
              </button>
              <button
                className="w-full mt-3 border border-indigo-200 text-indigo-700 p-3 rounded-xl text-sm font-semibold"
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
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  {inventoryType === "coil" ? "Bobina Selecionada" : "Perfil Selecionado"}
                </span>
                <p className="text-lg text-indigo-800 font-bold mt-1">
                  {selectedItem.id}
                </p>
                <p className="text-sm text-indigo-600">
                  {selectedItem.description}
                </p>
                <button
                  type="button"
                  className="text-xs text-red-500 underline mt-2 hover:text-red-700"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {inventoryType === "coil" ? "Peso (kg)" : "Quantidade ou Peso"}
                </label>
                <input
                  type="text" // Mantemos text para permitir vírgula fácil
                  inputMode="decimal" // Teclado numérico no celular
                  placeholder={inventoryType === "coil" ? "Ex: 1250,5" : "Ex: 50"}
                  className="w-full border p-3 rounded-lg text-lg"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
              </div>

              <button className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl shadow font-bold text-lg">CONFIRMAR LANÇAMENTO</button>
            </form>
          )}
        </div>

      </main>

      <section className="max-w-5xl mx-auto mt-8 bg-white p-6 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-indigo-600 text-lg">Histórico de Lançamentos</h2>

          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700"
          >
            Exportar CSV
          </button>
        </div>

        {!inventoryLaunches.length ? (
          <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">Nenhum lançamento realizado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {inventoryLaunches.map((item) => (
              <div
                key={item.id}
                className={`p-3 border-l-4 rounded flex justify-between items-center ${
                  item.type === "profile" 
                    ? "bg-blue-50 border-blue-500" // Cor diferente para perfil
                    : "bg-green-50 border-green-500" // Cor original para bobina
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${
                      item.type === "profile" ? "bg-blue-400" : "bg-green-400"
                    }`}>
                      {item.type === "profile" ? "PERFIL" : "BOBINA"}
                    </span>
                    <span className="font-bold text-sm text-gray-800">{item.itemId}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                  <p className="text-xs mt-1">
                    <strong>{item.weightKg.toFixed(2).replace('.', ',')}</strong>
                    <span className="text-gray-400"> - {item.userName}</span>
                  </p>
                </div>

                <button
                  className="text-red-400 hover:text-red-600 text-sm px-2 py-1"
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








