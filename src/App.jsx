// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import { initialInventoryCatalog } from "./inventoryCatalog";
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
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
          Identificação
        </h2>

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
// APP PRINCIPAL
// ===============================
const App = () => {
  const [userName, setUserName] = useState(null);
  const [uid, setUid] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [weight, setWeight] = useState("");
  const [message, setMessage] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
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
      limit(50)
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

  // ENVIAR PESO
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      setMessage("Selecione a bobina.");
      return;
    }
    if (!weight) {
      setMessage("Informe o peso.");
      return;
    }

    const numeric = parseFloat(weight.replace(",", "."));
    if (isNaN(numeric) || numeric <= 0) {
      setMessage("Peso inválido.");
      return;
    }

    try {
      await addDoc(
        collection(db, `artifacts/${appId}/users/${uid}/cyclic_inventory_weight`),
        {
          itemId: selectedItem.id,
          description: selectedItem.description,
          weightKg: numeric,
          timestamp: serverTimestamp(),
          userName,
          uid,
        }
      );

      setWeight("");
      setIsSelecting(false);
      setMessage(`Lançado: ${numeric} kg (${selectedItem.id})`);
    } catch (err) {
      setMessage("Erro ao salvar no Firestore.");
    }
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

    const header = "Data;ID;Descrição;Peso (kg);Usuário\n";
    const rows = inventoryLaunches
      .map((l) =>
        [
          l.timestamp.toLocaleString("pt-BR"),
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
    link.download = "inventario.csv";
    link.click();
  };

  // FILTRO
  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return initialInventoryCatalog;

    const s = searchTerm.toLowerCase();

    return initialInventoryCatalog.filter(
      (i) =>
        i.id.toLowerCase().includes(s) ||
        i.description.toLowerCase().includes(s)
    );
  }, [searchTerm]);


  if (!userName) return <LoginComponent setUserName={setUserName} />;

  return (
    <div className="min-h-screen p-4 bg-gray-100">

      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold text-indigo-700">
          Inventário Cíclico — Bobina 2
        </h1>
        <p className="text-sm text-gray-500">
          Usuário: <strong>{userName}</strong>
        </p>

        {message && (
          <div className="mt-3 bg-indigo-100 text-indigo-700 p-2 rounded-lg">
            {message}
          </div>
        )}
      </header>


      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

        {isSelecting && (
          <div className="bg-white p-6 rounded-xl shadow-xl">
            <h2 className="text-lg font-bold text-indigo-600 mb-2">
              Catálogo de Bobinas ({initialInventoryCatalog.length})
            </h2>

            <input
              className="w-full border p-2 rounded mb-3"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="max-h-[60vh] overflow-y-auto space-y-2">
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

        <div className="bg-white p-6 rounded-xl shadow-xl">
          {!selectedItem ? (
            <button
              className="w-full bg-indigo-600 text-white p-3 rounded-xl shadow"
              onClick={() => setIsSelecting(true)}
            >
              Selecionar Bobina
            </button>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="bg-indigo-50 p-3 rounded-lg">
                <p className="text-sm text-indigo-700 font-bold">
                  {selectedItem.id} — {selectedItem.description}
                </p>
                <button
                  type="button"
                  className="text-xs text-red-600 mt-1"
                  onClick={() => {
                    setSelectedItem(null);
                    setWeight("");
                    setIsSelecting(true);
                  }}
                >
                  Trocar
                </button>
              </div>

              <input
                type="text"
                placeholder="Peso (kg)"
                className="w-full border p-3 rounded-lg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />

              <button className="w-full bg-green-600 text-white p-3 rounded-xl shadow">
                Lançar Peso
              </button>
            </form>
          )}
        </div>

      </main>


      <section className="max-w-5xl mx-auto mt-8 bg-white p-6 rounded-xl shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-indigo-600 text-lg">
            Últimos Lançamentos
          </h2>

          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-xl"
          >
            Exportar CSV
          </button>
        </div>

        {!inventoryLaunches.length ? (
          <p className="text-gray-500 text-center py-4">Nenhum lançamento.</p>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {inventoryLaunches.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-green-50 border-l-4 border-green-600 rounded flex justify-between"
              >
                <div>
                  <p className="font-bold text-sm">{item.description}</p>
                  <p className="text-xs">
                    {item.itemId} —{" "}
                    <strong>{item.weightKg.toFixed(2)} kg</strong>
                    <span className="text-gray-500">
                      {" "}
                      por {item.userName}
                    </span>
                  </p>
                </div>

                <button
                  className="text-red-600 text-sm"
                  onClick={() => handleDelete(item.id)}
                >
                  excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default App;
