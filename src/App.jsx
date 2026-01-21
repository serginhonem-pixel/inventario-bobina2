// src/App.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import { initialInventoryCatalog } from "./inventoryCatalog";
// IMPORTANTE: Importamos o novo catálogo que acabamos de criar
import { profilesCatalog } from "./profilesCatalog";
import { buildCatalogModel, searchCatalog } from "./catalogUtils";
import QRCode from "qrcode";
import * as XLSX from "xlsx";

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
// PAGINA INICIAL
// ===============================
const LandingPage = ({ onEnter }) => {
  return (
    <div className="min-h-screen px-4 py-6 sm:p-8 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <img
              src="/logo.png"
              alt="QtdApp"
              className="h-[260px] w-[260px] object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-zinc-100 sm:text-3xl">
                Estoque inteligente, pronto para imprimir.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Centralize catalogo, lancamentos e etiquetas QR em um fluxo rapido
                para o time do chao de fabrica.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-emerald-500/90 px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
              onClick={onEnter}
            >
              Entrar no QtdApp
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
            <h2 className="text-lg font-semibold text-emerald-200">
              Controle em tempo real
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Registre bobinas e perfis com leitura QR, exporte CSV e mantenha
              o historico organizado.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
            <h2 className="text-lg font-semibold text-emerald-200">
              Etiquetas sob medida
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Gere lotes com peso, local e campos extras. Imprima 1 etiqueta por
              item com preview imediato.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

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
        <div className="flex items-center justify-center gap-3 mb-4">
          <img
            src="/logo.png"
            alt="QtdApp"
            className="h-[220px] w-[220px] object-contain"
          />
        </div>
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
  const [showLanding, setShowLanding] = useState(true);
  const [activeMenu, setActiveMenu] = useState("inventory");
  
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
  const [labelSearch, setLabelSearch] = useState("");
  const [labelItems, setLabelItems] = useState([]);
  const [labelBatch, setLabelBatch] = useState([]);
  const [labelSettings, setLabelSettings] = useState({
    preset: "60x40",
    widthCm: 6,
    heightCm: 4,
    qrCm: 3,
    paddingCm: 0.4,
    paddingXCm: 0.4,
    paddingYCm: 0.4,
    headerEnabled: false,
    footerEnabled: false,
    headerText: "",
    footerText: "",
    logoDataUrl: "",
    headerFooterFont: 12,
    headerFont: 12,
    footerFont: 12,
    headerTextAlign: "left",
    footerTextAlign: "left",
    headerLogoAlign: "left",
    footerLogoAlign: "right",
    headerLogoEnabled: true,
    footerLogoEnabled: false,
    testCode: "CODIGO TESTE",
    testDescription: "Descricao de teste",
    testQty: "1",
    testWeight: "0",
    testLocation: "A1",
    customFieldValues: {},
    fontTitle: 12,
    fontDesc: 9,
    fontMeta: 8,
    fontLabel: 10,
  });
  const [labelLayout, setLabelLayout] = useState({
    qrPosition: "top",
    align: "center",
  });
  const defaultLabelFields = [
    { key: "qr", label: "QR Code", enabled: true, showLabel: false, emphasize: false, highlight: false, labelFontSize: 10, boldLabel: true, boldValue: false },
    { key: "id", label: "Codigo", enabled: true, showLabel: false, emphasize: true, highlight: false, labelFontSize: 10, boldLabel: true, boldValue: true },
    { key: "description", label: "Descricao", enabled: true, showLabel: false, emphasize: false, highlight: false, labelFontSize: 10, boldLabel: true, boldValue: false },
    { key: "qty", label: "Quantidade", enabled: true, showLabel: true, emphasize: false, highlight: false, labelFontSize: 10, boldLabel: true, boldValue: false },
    { key: "weight", label: "Peso", enabled: true, showLabel: true, emphasize: false, highlight: false, labelFontSize: 10, boldLabel: true, boldValue: false },
    { key: "location", label: "Local", enabled: true, showLabel: true, emphasize: false, highlight: false, labelFontSize: 10, boldLabel: true, boldValue: false },
  ];
  const [labelFields, setLabelFields] = useState(defaultLabelFields);
  const [labelFieldInput, setLabelFieldInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [qrCache, setQrCache] = useState({});
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [isBatchStale, setIsBatchStale] = useState(false);
  const labelInitRef = useRef(true);
  const [extraFields, setExtraFields] = useState([]);
  const importInputRef = useRef(null);
  const [previewQr, setPreviewQr] = useState("");

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
    setLabelSearch("");
    setLabelItems([]);
    setLabelBatch([]);
    setBulkInput("");
    setQrCache({});
    setIsBatchStale(false);
  }, [inventoryType]);

  useEffect(() => {
    if (labelInitRef.current) {
      labelInitRef.current = false;
      return;
    }
    setIsBatchStale(true);
  }, [labelItems, labelSettings]);

  useEffect(() => {
    if (!extraFields.length) return;
    setLabelItems((prev) =>
      prev.map((item) => {
        const existing = item.extraFields || {};
        let changed = false;
        const nextExtras = { ...existing };
        extraFields.forEach((field) => {
          if (!(field.key in nextExtras)) {
            nextExtras[field.key] = "";
            changed = true;
          }
        });
        return changed ? { ...item, extraFields: nextExtras } : item;
      })
    );
  }, [extraFields]);

  const sanitizeLabelFields = (fields) => {
    const base = [...defaultLabelFields];
    if (!Array.isArray(fields)) return base;
    const filtered = fields.filter(
      (field) =>
        field &&
        field.key &&
        field.key !== "extras" &&
        field.key !== "test" &&
        normalizeKey(field.label || "") !== "texto_teste"
    ).map((field) => ({
      ...field,
      showLabel: field.showLabel ?? true,
      emphasize: field.emphasize ?? false,
      highlight: field.highlight ?? false,
      boldLabel: field.boldLabel ?? true,
      boldValue: field.boldValue ?? false,
      labelFontSize: Number.isFinite(Number(field.labelFontSize))
        ? Number(field.labelFontSize)
        : labelSettings.fontLabel,
    }));
    const existing = new Set(filtered.map((field) => field.key));
    base.forEach((field) => {
      if (!existing.has(field.key)) {
        filtered.push(field);
      }
    });
    return filtered;
  };

  useEffect(() => {
    const saved = localStorage.getItem("qtdapp_label_editor");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.settings) setLabelSettings(data.settings);
      if (data.layout) setLabelLayout(data.layout);
      if (data.fields) setLabelFields(sanitizeLabelFields(data.fields));
    } catch (err) {
      // Ignora erro de parsing local.
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({
      settings: labelSettings,
      layout: labelLayout,
      fields: labelFields,
    });
    localStorage.setItem("qtdapp_label_editor", payload);
  }, [labelSettings, labelLayout, labelFields]);

  useEffect(() => {
    let active = true;
    const content = "QR CODE TESTE";
    QRCode.toDataURL(content, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    })
      .then((dataUrl) => {
        if (active) setPreviewQr(dataUrl);
      })
      .catch(() => {
        if (active) setPreviewQr("");
      });
    return () => {
      active = false;
    };
  }, []);

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
    link.download = "qtdapp_lancamentos.csv";
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

  const labelFilteredCatalog = useMemo(
    () => searchCatalog(activeCatalogModel, labelSearch),
    [activeCatalogModel, labelSearch]
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

  const addLabelItem = (item, qty = 1) => {
    setLabelItems((prev) => {
      const next = [...prev];
      const index = next.findIndex((entry) => entry.id === item.id);
      if (index >= 0) {
        next[index] = { ...next[index], qty: next[index].qty + qty };
        return next;
      }
      const extraValues = extraFields.reduce((acc, field) => {
        acc[field.key] = "";
        return acc;
      }, {});
      return [
        ...next,
        {
          ...item,
          qty,
          weight: "",
          location: "",
          extraFields: extraValues,
        },
      ];
    });
  };

  const updateLabelQty = (id, qty) => {
    const numericQty = Number.isNaN(qty) ? 1 : Math.max(1, qty);
    setLabelItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: numericQty } : item
      )
    );
  };

  const updateLabelField = (id, field, value) => {
    setLabelItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const updateLabelExtraField = (id, key, value) => {
    setLabelItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              extraFields: {
                ...(item.extraFields || {}),
                [key]: value,
              },
            }
          : item
      )
    );
  };

  const removeLabelItem = (id) => {
    setLabelItems((prev) => prev.filter((item) => item.id !== id));
  };

  const normalizeKey = (value) =>
    value
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const handleAddExtraField = () => {
    const entries = extraFieldInput
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!entries.length) return;

    setExtraFields((prev) => {
      const next = [...prev];
      entries.forEach((label) => {
        const key = normalizeKey(label);
        if (!key || next.some((field) => field.key === key)) return;
        next.push({ key, label });
      });
      return next;
    });
    setExtraFieldInput("");
  };

  const buildQrPayload = (item) =>
    JSON.stringify({
      id: item.id,
      type: inventoryType === "coil" ? "coil" : "profile",
      qtd: item.qty,
      peso: item.weight || "",
      local: item.location || "",
      extras: item.extraFields || {},
    });

  const ensureQrForItems = async (items) => {
    const missing = items.filter((item) => !qrCache[item.id]);
    if (!missing.length) return;

    setIsGeneratingLabels(true);
    try {
      const results = await Promise.all(
        missing.map((item) =>
          QRCode.toDataURL(buildQrPayload(item), {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 320,
          })
        )
      );

      setQrCache((prev) => {
        const next = { ...prev };
        missing.forEach((item, index) => {
          next[item.id] = results[index];
        });
        return next;
      });
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!labelItems.length) {
      pushMessage("Selecione itens para gerar etiquetas.", "error", 2500);
      return;
    }

    await ensureQrForItems(labelItems);

    const nextBatch = labelItems.flatMap((item) =>
      Array.from({ length: item.qty }).map(() => item)
    );
    setLabelBatch(nextBatch);
    setIsBatchStale(false);
    pushMessage(`Lote gerado: ${nextBatch.length} etiquetas.`, "success", 2000);
  };

  const handleClearBatch = () => {
    setLabelBatch([]);
    setIsBatchStale(false);
  };

  const handlePrintBatch = () => {
    if (!labelBatch.length) {
      pushMessage("Gere o lote antes de imprimir.", "error", 2500);
      return;
    }
    window.print();
  };

  const handleBulkAdd = () => {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      pushMessage("Informe uma lista de IDs.", "error", 2500);
      return;
    }

    let added = 0;
    const missing = [];

    setLabelItems((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));

      lines.forEach((line) => {
        const parts = line.split(/[;|,]/).map((part) => part.trim());
        const id = parts[0]?.toUpperCase();
        if (!id) return;

        const qty = Math.max(1, parseInt(parts[1] || "1", 10) || 1);
        const weight = parts[2] || "";
        const location = parts[3] || "";
        const itemIndex = activeCatalogModel.byId.get(id);
        if (itemIndex === undefined) {
          missing.push(id);
          return;
        }

        const item = activeCatalogModel.items[itemIndex];
        const existing = map.get(item.id);
        if (existing) {
          map.set(item.id, {
            ...existing,
            qty: existing.qty + qty,
            weight: weight || existing.weight || "",
            location: location || existing.location || "",
          });
        } else {
          map.set(item.id, { ...item, qty, weight, location });
        }
        added += qty;
      });

      return Array.from(map.values());
    });

    setBulkInput("");

    if (added) {
      pushMessage(`Adicionados ${added} itens ao lote.`, "success", 2000);
    }
    if (missing.length) {
      pushMessage(
        `Nao encontrados: ${missing.slice(0, 3).join(", ")}`,
        "error",
        3000
      );
    }
  };

  const handleImportExcel = async (file) => {
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (!rows.length) {
        pushMessage("Arquivo vazio.", "error", 2500);
        return;
      }

      const headers = rows[0].map((header) => header.toString().trim());
      const headerKeys = headers.map((header) => normalizeKey(header));
      const defaultMap = {
        id: ["id", "codigo", "cod", "code", "item", "produto"],
        description: ["descricao", "description", "desc"],
        qty: ["qtd", "quantidade", "qty", "quant"],
        weight: ["peso", "weight"],
        location: ["local", "localizacao", "location", "estoque"],
      };

      const findHeaderIndex = (aliases) =>
        headerKeys.findIndex((key) => aliases.includes(key));

      const indexMap = {
        id: findHeaderIndex(defaultMap.id),
        description: findHeaderIndex(defaultMap.description),
        qty: findHeaderIndex(defaultMap.qty),
        weight: findHeaderIndex(defaultMap.weight),
        location: findHeaderIndex(defaultMap.location),
      };

      const dynamicExtras = headerKeys
        .map((key, index) => ({ key, label: headers[index] }))
        .filter(
          (entry) =>
            entry.key &&
            !Object.values(indexMap).includes(headerKeys.indexOf(entry.key))
        );

      const combinedExtras = [...extraFields];
      dynamicExtras.forEach((entry) => {
        if (!entry.key || combinedExtras.some((field) => field.key === entry.key)) return;
        combinedExtras.push({ key: entry.key, label: entry.label });
      });
      setExtraFields(combinedExtras);

      const newItems = rows.slice(1).reduce((acc, row) => {
        const idValue =
          indexMap.id >= 0 ? row[indexMap.id].toString().trim().toUpperCase() : "";
        if (!idValue) return acc;

        const itemIndex = activeCatalogModel.byId.get(idValue);
        const catalogItem =
          itemIndex === undefined
            ? { id: idValue, description: "" }
            : activeCatalogModel.items[itemIndex];

        const qtyRaw = indexMap.qty >= 0 ? row[indexMap.qty] : "";
        const qty = Math.max(1, parseInt(qtyRaw || "1", 10) || 1);
        const weight = indexMap.weight >= 0 ? row[indexMap.weight].toString().trim() : "";
        const location =
          indexMap.location >= 0 ? row[indexMap.location].toString().trim() : "";
        const description =
          indexMap.description >= 0
            ? row[indexMap.description].toString().trim()
            : catalogItem.description;

        const extraValues = {};
        combinedExtras.forEach((entry) => {
          const columnIndex = headerKeys.indexOf(entry.key);
          const value = columnIndex >= 0 ? row[columnIndex].toString().trim() : "";
          extraValues[entry.key] = value;
        });

        acc.push({
          ...catalogItem,
          description,
          qty,
          weight,
          location,
          extraFields: extraValues,
        });
        return acc;
      }, []);

      if (!newItems.length) {
        pushMessage("Nenhum item valido encontrado no arquivo.", "error", 3000);
        return;
      }

      setLabelItems(newItems);
      setLabelBatch([]);
      setQrCache({});
      setIsBatchStale(false);
      pushMessage(`Importado: ${newItems.length} itens.`, "success", 2500);
    } catch (err) {
      pushMessage("Erro ao importar Excel.", "error", 3000);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "ID",
      "Descricao",
      "Qtd",
      "Peso",
      "Local",
      "Lote",
      "Cor",
    ];
    const sample = [
      "85500",
      "BOB 2 PERFIL US 45X17X1,50",
      "3",
      "1250,5",
      "A1",
      "LT-2025",
      "Prata",
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sample]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    XLSX.writeFile(workbook, "modelo_importacao_qtdapp.xlsx");
  };

  const formatExtraInfo = (item) => {
    if (!extraFields.length || !item.extraFields) return "";
    const entries = extraFields
      .map((field) => {
        const value = item.extraFields[field.key];
        return value ? `${field.label}: ${value}` : "";
      })
      .filter(Boolean);
    return entries.join(" | ");
  };

  const getFieldValue = (field, item) => {
    if (!item) return "";
    switch (field.key) {
      case "qr":
        return "QR";
      case "id":
        return item.id || labelSettings.testCode || "CODIGO";
      case "description":
        return item.description || labelSettings.testDescription || "Descricao do item";
      case "qty":
        return item.qty || labelSettings.testQty || 1;
      case "weight":
        return item.weight || labelSettings.testWeight || "-";
      case "location":
        return item.location || labelSettings.testLocation || "-";
      default:
        if (field.key.startsWith("custom:")) {
          const customValue = labelSettings.customFieldValues?.[field.key];
          return customValue || "-";
        }
        return "";
    }
  };

  const renderLabelFields = (item, qrSrc, options = {}) => {
    const { includeQr = true } = options;
    return labelFields
      .filter((field) => field.enabled)
      .filter((field) => field.key !== "test" && normalizeKey(field.label || "") !== "texto_teste")
      .filter((field) => (includeQr ? true : field.key !== "qr"))
      .map((field) => {
      const rawValue = getFieldValue(field, item);
      const hasValue = rawValue !== null && rawValue !== undefined && rawValue !== "";
      if (!hasValue) return null;
      const labelFontSize = getLabelFontSize(field);
      const labelPrefix = (
        <span
          className={`text-black ${field.boldLabel ? "font-semibold" : "font-normal"}`}
          style={{ fontSize: `${labelFontSize}px` }}
        >
          {field.label}:
        </span>
      );
      if (field.key === "qr") {
        return (
          <div key={field.key} className="flex justify-center">
            <div className="rounded-lg bg-white p-2">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="QR"
                  style={{ width: qrImageSize, height: qrImageSize }}
                />
              ) : (
                <div
                  className="flex items-center justify-center text-xs text-zinc-500"
                  style={{ width: qrImageSize, height: qrImageSize }}
                >
                  QR
                </div>
              )}
            </div>
          </div>
        );
      }
      const emphasizeClass = field.emphasize ? "border border-black/40 rounded px-2 py-1" : "";
      const highlightClass = field.highlight ? "bg-[#e5e7eb] rounded px-2 py-1" : "";
      const valueWeightClass = field.boldValue ? "font-semibold text-black" : "font-normal text-zinc-700";
      if (field.key === "id") {
        return (
          <p
            key={field.key}
            className={`${field.boldValue ? "font-semibold" : "font-normal"} text-black ${emphasizeClass} ${highlightClass}`}
            style={labelTitleStyle}
          >
            {field.showLabel ? (
              <>
                {labelPrefix} {rawValue}
              </>
            ) : (
              rawValue
            )}
          </p>
        );
      }
      if (field.key === "description") {
        return (
          <p
            key={field.key}
            className={`${valueWeightClass} ${emphasizeClass} ${highlightClass}`}
            style={labelDescStyle}
          >
            {field.showLabel ? (
              <>
                {labelPrefix} {rawValue}
              </>
            ) : (
              rawValue
            )}
          </p>
        );
      }
      return (
        <p
          key={field.key}
          className={`${valueWeightClass} ${emphasizeClass} ${highlightClass}`}
          style={labelMetaStyle}
        >
          {field.showLabel ? (
            <>
              {labelPrefix}{" "}
              {rawValue}
            </>
          ) : (
            rawValue
          )}
        </p>
      );
    });
  };

  const renderLabelLayout = (item, qrSrc) => {
    const alignItems =
      labelLayout.align === "left"
        ? "items-start"
        : labelLayout.align === "right"
        ? "items-end"
        : "items-center";
    const showHeader = canUseHeaderFooter && labelSettings.headerEnabled;
    const showFooter = canUseHeaderFooter && labelSettings.footerEnabled;
    const headerFooterTextStyle = {
      fontSize: `${Math.max(
        8,
        labelSettings.headerFont ?? labelSettings.headerFooterFont ?? labelSettings.fontLabel
      )}px`,
    };
    const footerTextStyle = {
      fontSize: `${Math.max(
        8,
        labelSettings.footerFont ?? labelSettings.headerFooterFont ?? labelSettings.fontLabel
      )}px`,
    };
    const resolveAlignClass = (align) =>
      align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
    const resolveTextClass = (align) =>
      align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
    const headerRowClass = resolveAlignClass(labelSettings.headerLogoAlign);
    const footerRowClass = resolveAlignClass(labelSettings.footerLogoAlign);
    const headerTextClass = resolveTextClass(labelSettings.headerTextAlign);
    const footerTextClass = resolveTextClass(labelSettings.footerTextAlign);
    return (
      <div className={`flex flex-col ${alignItems} h-full`}>
        {showHeader && (
          <div className="w-full space-y-1 mb-1">
            {labelSettings.logoDataUrl && labelSettings.headerLogoEnabled && (
              <div className={`flex ${headerRowClass} w-full`}>
                <img
                  src={labelSettings.logoDataUrl}
                  alt="Logo"
                  className="object-contain"
                  style={{ height: "1.4cm" }}
                />
              </div>
            )}
            {labelSettings.headerText && (
              <p className={`text-black font-semibold ${headerTextClass}`} style={headerFooterTextStyle}>
                {labelSettings.headerText}
              </p>
            )}
          </div>
        )}
        <div className={`flex flex-col ${alignItems} space-y-1`}>
          {renderLabelFields(item, qrSrc, { includeQr: true })}
        </div>
        {showFooter && (
          <div className="w-full space-y-1 pt-1 mt-auto">
            {labelSettings.footerText && (
              <p className={`text-black font-semibold ${footerTextClass}`} style={footerTextStyle}>
                {labelSettings.footerText}
              </p>
            )}
            {labelSettings.logoDataUrl && labelSettings.footerLogoEnabled && (
              <div className={`flex ${footerRowClass} w-full`}>
                <img
                  src={labelSettings.logoDataUrl}
                  alt="Logo"
                  className="object-contain"
                  style={{ height: "1.2cm" }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const messageStyle =
    messageType === "success"
      ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
      : messageType === "error"
      ? "bg-rose-500/15 text-rose-200 border border-rose-500/30"
      : "bg-cyan-500/10 text-cyan-200 border border-cyan-500/30";

  const labelPresets = {
    "50x30": { widthCm: 5, heightCm: 3, qrCm: 2.4 },
    "60x40": { widthCm: 6, heightCm: 4, qrCm: 3 },
    "80x50": { widthCm: 8, heightCm: 5, qrCm: 4 },
    "100x100": { widthCm: 10, heightCm: 10, qrCm: 5.5 },
    "100x150": { widthCm: 10, heightCm: 15, qrCm: 6 },
    personalizado: { widthCm: 6, heightCm: 4, qrCm: 3 },
  };
  const applyAutoSizing = (widthCm, heightCm) => {
    const base = Math.min(widthCm, heightCm);
    const qrCm = Math.max(1.6, Math.round(base * 0.55 * 10) / 10);
    const fontTitle = Math.max(9, Math.round(base * 2.4));
    const fontDesc = Math.max(7, Math.round(base * 1.7));
    const fontMeta = Math.max(6, Math.round(base * 1.4));
    setLabelSettings((prev) => ({
      ...prev,
      qrCm,
      fontTitle,
      fontDesc,
      fontMeta,
    }));
  };
  const applyLabelPreset = (preset) => {
    if (!labelPresets[preset]) return;
    const next = { ...labelPresets[preset] };
    setLabelSettings((prev) => ({
      ...prev,
      preset,
      ...next,
    }));
    applyAutoSizing(next.widthCm, next.heightCm);
  };
  const updateLabelSetting = (field, value) => {
    setLabelSettings((prev) => ({
      ...prev,
      preset: "personalizado",
      [field]: value,
    }));
    if (field === "widthCm" || field === "heightCm") {
      const nextWidth = field === "widthCm" ? value : labelSettings.widthCm;
      const nextHeight = field === "heightCm" ? value : labelSettings.heightCm;
      applyAutoSizing(nextWidth, nextHeight);
    }
  };
  const updateLabelLayout = (field, value) => {
    setLabelLayout((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const toggleLabelField = (key) => {
    setLabelFields((prev) =>
      prev.map((field) =>
        field.key === key ? { ...field, enabled: !field.enabled } : field
      )
    );
  };
  const toggleFieldOption = (key, option) => {
    setLabelFields((prev) =>
      prev.map((field) =>
        field.key === key ? { ...field, [option]: !field[option] } : field
      )
    );
  };
  const updateLabelFieldTitleSize = (key, value) => {
    const nextValue = Number.isNaN(value) ? 0 : Math.max(0, value);
    setLabelFields((prev) =>
      prev.map((field) =>
        field.key === key ? { ...field, labelFontSize: nextValue } : field
      )
    );
  };
  const addLabelField = () => {
    const label = labelFieldInput.trim();
    if (!label) return;
    const key = `custom:${normalizeKey(label)}`;
    setLabelFields((prev) => {
      if (prev.some((field) => field.key === key)) return prev;
      return [
        ...prev,
        {
          key,
          label,
          enabled: true,
          showLabel: true,
          emphasize: false,
          highlight: false,
          boldLabel: true,
          boldValue: false,
          labelFontSize: labelSettings.fontLabel,
        },
      ];
    });
    setLabelSettings((prev) => ({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [key]: "",
      },
    }));
    setLabelFieldInput("");
  };
  const removeLabelField = (key) => {
    if (!key.startsWith("custom:")) return;
    setLabelFields((prev) => prev.filter((field) => field.key !== key));
    setLabelSettings((prev) => {
      const next = { ...prev.customFieldValues };
      delete next[key];
      return { ...prev, customFieldValues: next };
    });
  };
  const updateCustomFieldValue = (key, value) => {
    setLabelSettings((prev) => ({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [key]: value,
      },
    }));
  };
  const moveLabelField = (key, direction) => {
    setLabelFields((prev) => {
      const index = prev.findIndex((field) => field.key === key);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };
  const cmToPx = (cm) => Math.round(cm * 37.795);
  const labelWidthPx = cmToPx(labelSettings.widthCm);
  const labelHeightPx = cmToPx(labelSettings.heightCm);
  const labelPaddingX = labelSettings.paddingXCm ?? labelSettings.paddingCm;
  const labelPaddingY = labelSettings.paddingYCm ?? labelSettings.paddingCm;
  const qrLimitCm = Math.min(
    labelSettings.widthCm - labelPaddingX * 2,
    labelSettings.heightCm - labelPaddingY * 2
  );
  const qrSizeCm = Math.max(1, Math.min(labelSettings.qrCm, qrLimitCm));
  const qrImageSize = `${qrSizeCm}cm`;

  const labelCount = labelItems.reduce((acc, item) => acc + item.qty, 0);
  const labelGridStyle = {
    gridTemplateColumns: `repeat(auto-fit, minmax(${labelSettings.widthCm}cm, 1fr))`,
  };
  const previewLabelStyle = {
    width: `${labelSettings.widthCm}cm`,
    height: `${labelSettings.heightCm}cm`,
    padding: `${labelPaddingY}cm ${labelPaddingX}cm`,
  };
  const printLabelStyle = {
    width: `${labelSettings.widthCm}cm`,
    height: `${labelSettings.heightCm}cm`,
    padding: `${labelPaddingY}cm ${labelPaddingX}cm`,
  };
  const labelTitleStyle = { fontSize: `${labelSettings.fontTitle}px` };
  const labelDescStyle = { fontSize: `${labelSettings.fontDesc}px` };
  const labelMetaStyle = { fontSize: `${labelSettings.fontMeta}px` };
  const getLabelFontSize = (field) => {
    const parsed = Number(field?.labelFontSize);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : labelSettings.fontLabel;
  };
  const previewQrFallback =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 21 21' shape-rendering='crispEdges'>" +
    "<rect width='21' height='21' fill='white'/>" +
    "<rect x='0' y='0' width='7' height='7' fill='black'/>" +
    "<rect x='1' y='1' width='5' height='5' fill='white'/>" +
    "<rect x='2' y='2' width='3' height='3' fill='black'/>" +
    "<rect x='14' y='0' width='7' height='7' fill='black'/>" +
    "<rect x='15' y='1' width='5' height='5' fill='white'/>" +
    "<rect x='16' y='2' width='3' height='3' fill='black'/>" +
    "<rect x='0' y='14' width='7' height='7' fill='black'/>" +
    "<rect x='1' y='15' width='5' height='5' fill='white'/>" +
    "<rect x='2' y='16' width='3' height='3' fill='black'/>" +
    "<rect x='9' y='4' width='1' height='1' fill='black'/>" +
    "<rect x='11' y='4' width='1' height='1' fill='black'/>" +
    "<rect x='8' y='9' width='1' height='1' fill='black'/>" +
    "<rect x='10' y='9' width='1' height='1' fill='black'/>" +
    "<rect x='12' y='9' width='1' height='1' fill='black'/>" +
    "<rect x='9' y='12' width='1' height='1' fill='black'/>" +
    "<rect x='11' y='12' width='1' height='1' fill='black'/>" +
    "<rect x='13' y='12' width='1' height='1' fill='black'/>" +
    "<rect x='8' y='16' width='1' height='1' fill='black'/>" +
    "<rect x='10' y='16' width='1' height='1' fill='black'/>" +
    "<rect x='12' y='16' width='1' height='1' fill='black'/>" +
    "</svg>";
  const previewQrSrc = previewQr || previewQrFallback;
  const labelContentClass =
    labelLayout.align === "left"
      ? "text-left"
      : labelLayout.align === "right"
      ? "text-right"
      : "text-center";
  const canUseHeaderFooter =
    Math.min(labelSettings.widthCm, labelSettings.heightCm) >= 10 &&
    Math.max(labelSettings.widthCm, labelSettings.heightCm) >= 15;
  const handleLogoUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLabelSettings((prev) => ({ ...prev, logoDataUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }
  if (!userName) return <LoginComponent setUserName={setUserName} />;

  return (
    <div className="min-h-screen px-2 py-3 sm:p-4 text-zinc-100">
      <div className="no-print">
        <header className="text-center mb-4 sm:mb-6">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/logo.png"
              alt="QtdApp"
              className="h-[240px] w-[240px] object-contain"
            />
          </div>
          <p className="text-sm text-zinc-400 whitespace-nowrap">
            Usuário: <strong>{userName}</strong>
          </p>

          {message && (
            <div className={`mt-3 p-2 rounded-lg text-sm ${messageStyle}`}>
              {message}
            </div>
          )}
        </header>

        <nav className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeMenu === "inventory"
                ? "bg-emerald-500 text-black"
                : "bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/70"
            }`}
            onClick={() => setActiveMenu("inventory")}
          >
            Inventário
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeMenu === "label-editor"
                ? "bg-emerald-500 text-black"
                : "bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/70"
            }`}
            onClick={() => setActiveMenu("label-editor")}
          >
            Criacao de etiqueta
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeMenu === "labels"
                ? "bg-emerald-500 text-black"
                : "bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/70"
            }`}
            onClick={() => setActiveMenu("labels")}
          >
            Lote de etiquetas
          </button>
        </nav>

      {activeMenu === "inventory" && (
        <>
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

        </>
      )}

      {activeMenu === "label-editor" && (
        <section className="w-full max-w-none sm:max-w-5xl mx-auto mt-6 sm:mt-8 bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <h2 className="font-bold text-emerald-300 text-lg">Criacao de etiqueta</h2>
              <p className="text-xs text-zinc-400">
                Ajuste tamanhos, posicao do QR e campos da etiqueta.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tamanho padrão</label>
                <select
                  value={labelSettings.preset}
                  onChange={(e) => applyLabelPreset(e.target.value)}
                  className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2"
                >
                  <option value="50x30">50x30 mm</option>
                  <option value="60x40">60x40 mm</option>
                  <option value="80x50">80x50 mm</option>
                  <option value="100x100">100x100 mm</option>
                  <option value="100x150">100x150 mm</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Largura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.widthCm}
                    onChange={(e) =>
                      updateLabelSetting("widthCm", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.heightCm}
                    onChange={(e) =>
                      updateLabelSetting("heightCm", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">QR (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.qrCm}
                    onChange={(e) =>
                      updateLabelSetting("qrCm", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Padding horizontal (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.paddingXCm}
                    onChange={(e) =>
                      updateLabelSetting("paddingXCm", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Padding vertical (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.paddingYCm}
                    onChange={(e) =>
                      updateLabelSetting("paddingYCm", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Alinhamento texto</label>
                  <select
                    value={labelLayout.align}
                    onChange={(e) => updateLabelLayout("align", e.target.value)}
                    className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full"
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centro</option>
                    <option value="right">Direita</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 border border-zinc-800 rounded-xl p-3 bg-zinc-950/60">
                <p className="text-xs text-zinc-400 mb-2">Cabecalho e rodape</p>
                {!canUseHeaderFooter ? (
                  <p className="text-[11px] text-zinc-500">
                    Disponivel apenas para etiquetas a partir de 100x150mm.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-xs text-zinc-200">
                        <input
                          type="checkbox"
                          checked={labelSettings.headerEnabled}
                          onChange={() =>
                            updateLabelSetting("headerEnabled", !labelSettings.headerEnabled)
                          }
                        />
                        Cabecalho
                      </label>
                      <label className="flex items-center gap-2 text-xs text-zinc-200">
                        <input
                          type="checkbox"
                          checked={labelSettings.footerEnabled}
                          onChange={() =>
                            updateLabelSetting("footerEnabled", !labelSettings.footerEnabled)
                          }
                        />
                        Rodape
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-xs text-zinc-200">
                        <input
                          type="checkbox"
                          checked={labelSettings.headerLogoEnabled}
                          onChange={() =>
                            updateLabelSetting(
                              "headerLogoEnabled",
                              !labelSettings.headerLogoEnabled
                            )
                          }
                        />
                        Logo no cabecalho
                      </label>
                      <label className="flex items-center gap-2 text-xs text-zinc-200">
                        <input
                          type="checkbox"
                          checked={labelSettings.footerLogoEnabled}
                          onChange={() =>
                            updateLabelSetting(
                              "footerLogoEnabled",
                              !labelSettings.footerLogoEnabled
                            )
                          }
                        />
                        Logo no rodape
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                        placeholder="Texto do cabecalho"
                        value={labelSettings.headerText}
                        onChange={(e) => updateLabelSetting("headerText", e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                        placeholder="Texto do rodape"
                        value={labelSettings.footerText}
                        onChange={(e) => updateLabelSetting("footerText", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Fonte cabecalho (px)
                        </label>
                        <input
                          type="number"
                          className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                          value={labelSettings.headerFont}
                          onChange={(e) =>
                            updateLabelSetting(
                              "headerFont",
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Fonte rodape (px)
                        </label>
                        <input
                          type="number"
                          className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                          value={labelSettings.footerFont}
                          onChange={(e) =>
                            updateLabelSetting(
                              "footerFont",
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Texto cabecalho
                        </label>
                        <select
                          value={labelSettings.headerTextAlign}
                          onChange={(e) => updateLabelSetting("headerTextAlign", e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Texto rodape
                        </label>
                        <select
                          value={labelSettings.footerTextAlign}
                          onChange={(e) => updateLabelSetting("footerTextAlign", e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Logo cabecalho
                        </label>
                        <select
                          value={labelSettings.headerLogoAlign}
                          onChange={(e) => updateLabelSetting("headerLogoAlign", e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Logo rodape
                        </label>
                        <select
                          value={labelSettings.footerLogoAlign}
                          onChange={(e) => updateLabelSetting("footerLogoAlign", e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="text-xs text-zinc-400"
                        onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                      />
                      {labelSettings.logoDataUrl && (
                        <button
                          type="button"
                          className="text-xs text-rose-300 hover:text-rose-200"
                          onClick={() => updateLabelSetting("logoDataUrl", "")}
                        >
                          Remover logo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte código (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontTitle}
                    onChange={(e) =>
                      updateLabelSetting("fontTitle", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte descrição (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontDesc}
                    onChange={(e) =>
                      updateLabelSetting("fontDesc", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte infos (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontMeta}
                    onChange={(e) =>
                      updateLabelSetting("fontMeta", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte titulo (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontLabel}
                    onChange={(e) =>
                      updateLabelSetting("fontLabel", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-400 mb-2">Campos e ordem</p>
                <div className="space-y-2">
                  {labelFields
                    .filter((field) => field.key !== "test" && normalizeKey(field.label || "") !== "texto_teste")
                    .map((field) => (
                    <div
                      key={field.key}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-zinc-200">
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={() => toggleLabelField(field.key)}
                          />
                          {field.label}
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => toggleFieldOption(field.key, "showLabel")}
                          >
                            {field.showLabel ? "Ocultar titulo" : "Mostrar titulo"}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => toggleFieldOption(field.key, "boldLabel")}
                          >
                            {field.boldLabel ? "Titulo normal" : "Titulo negrito"}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => toggleFieldOption(field.key, "boldValue")}
                          >
                            {field.boldValue ? "Valor normal" : "Valor negrito"}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => toggleFieldOption(field.key, "emphasize")}
                          >
                            {field.emphasize ? "Sem borda" : "Borda"}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => toggleFieldOption(field.key, "highlight")}
                          >
                            {field.highlight ? "Sem fundo" : "Fundo"}
                          </button>
                          {field.key.startsWith("custom:") && (
                            <button
                              type="button"
                              className="text-xs text-rose-300 hover:text-rose-200"
                              onClick={() => removeLabelField(field.key)}
                            >
                              Remover
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => moveLabelField(field.key, "up")}
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => moveLabelField(field.key, "down")}
                          >
                            Descer
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span>Titulo (px)</span>
                          <input
                            type="number"
                            className="w-20 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                            value={field.labelFontSize ?? labelSettings.fontLabel}
                            onChange={(e) =>
                              updateLabelFieldTitleSize(
                                field.key,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                          />
                        </div>
                        {field.key === "id" && (
                          <input
                            type="text"
                            className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                            placeholder="Codigo de teste"
                            value={labelSettings.testCode}
                            onChange={(e) => updateLabelSetting("testCode", e.target.value)}
                          />
                        )}
                        {field.key === "description" && (
                          <input
                            type="text"
                            className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                            placeholder="Descricao de teste"
                            value={labelSettings.testDescription}
                            onChange={(e) =>
                              updateLabelSetting("testDescription", e.target.value)
                            }
                          />
                        )}
                        {field.key === "qty" && (
                          <input
                            type="text"
                            className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                            placeholder="Quantidade de teste"
                            value={labelSettings.testQty}
                            onChange={(e) => updateLabelSetting("testQty", e.target.value)}
                          />
                        )}
                        {field.key === "weight" && (
                          <input
                            type="text"
                            className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                            placeholder="Peso de teste"
                            value={labelSettings.testWeight}
                            onChange={(e) => updateLabelSetting("testWeight", e.target.value)}
                          />
                        )}
                        {field.key === "location" && (
                          <input
                            type="text"
                            className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                            placeholder="Local de teste"
                            value={labelSettings.testLocation}
                            onChange={(e) => updateLabelSetting("testLocation", e.target.value)}
                          />
                        )}
                        {field.key.startsWith("custom:") && (
                          <input
                            type="text"
                            className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                            placeholder={`Valor de ${field.label}`}
                            value={labelSettings.customFieldValues[field.key] || ""}
                            onChange={(e) =>
                              updateCustomFieldValue(field.key, e.target.value)
                            }
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    type="text"
                    className="flex-1 min-w-[180px] bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    placeholder="Adicionar campo (ex: Lote, Espessura)"
                    value={labelFieldInput}
                    onChange={(e) => setLabelFieldInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-lg text-xs font-semibold"
                    onClick={addLabelField}
                  >
                    Adicionar campo
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 lg:sticky lg:top-6 self-start lg:justify-self-end w-fit max-w-none">
              <p className="text-xs text-zinc-400 mb-1">Preview da etiqueta</p>
              <p className="text-[11px] text-zinc-500 mb-3">
                {labelSettings.widthCm}x{labelSettings.heightCm}cm
              </p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 overflow-visible">
                    <div className={`rounded-xl border border-zinc-300 bg-white ${labelContentClass}`} style={previewLabelStyle}>
                  {renderLabelLayout(labelItems[0] || {}, previewQrSrc)}
                </div>
            </div>
            </div>
          </div>
        </section>
      )}

      {activeMenu === "inventory" && (
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
      )}

      {activeMenu === "labels" && (
      <section className="w-full max-w-none sm:max-w-5xl mx-auto mt-6 sm:mt-8 bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="font-bold text-emerald-300 text-lg">Lote de etiquetas</h2>
            <p className="text-xs text-zinc-400">Monte listas e imprima etiquetas para aplicacao rapida.</p>
          </div>
          <div className="text-xs text-zinc-400">
            Total selecionado: <strong className="text-zinc-200">{labelCount}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-200">Selecionar itens</h3>
              <button
                type="button"
                className="text-xs text-emerald-300 underline hover:text-emerald-200"
                onClick={handleGenerateBatch}
              >
                Gerar lote
              </button>
            </div>

            <input
              className="w-full border border-zinc-800 bg-zinc-900/70 p-2 rounded-lg mb-3 text-zinc-100 placeholder:text-zinc-500"
              placeholder="Buscar codigo ou descricao..."
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
            />

            <div className="max-h-[42vh] overflow-y-auto space-y-2">
              {labelFilteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm text-zinc-100">{item.id}</p>
                    <p className="text-xs text-zinc-400">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs bg-emerald-400/90 text-black px-3 py-1 rounded-lg hover:bg-emerald-300"
                    onClick={() => addLabelItem(item)}
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-400 mb-2">
                Adicionar por lista (CODIGO;QTD;PESO;LOCAL)
              </p>
              <textarea
                className="w-full min-h-[110px] border border-zinc-800 bg-zinc-900/70 p-2 rounded-lg text-zinc-100 placeholder:text-zinc-500 text-xs"
                placeholder={`85500;3;1250,5;A1\n85501;2;980,0;B2`}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
              />
              <button
                type="button"
                className="mt-2 border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-lg text-xs font-semibold"
                onClick={handleBulkAdd}
              >
                Importar lista
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-xs text-zinc-400 mb-2">
                Importar Excel (colunas com cabecalho)
              </p>
              <button
                type="button"
                className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-lg text-xs font-semibold"
                onClick={() => importInputRef.current?.click()}
              >
                Importar Excel
              </button>
              <button
                type="button"
                className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-lg text-xs font-semibold"
                onClick={handleDownloadTemplate}
              >
                Baixar modelo
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleImportExcel(e.target.files?.[0])}
              />
              <p className="mt-2 text-[11px] text-zinc-500">
                Colunas reconhecidas: ID, Descricao, Qtd, Peso, Local. Outras viram campos extras.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-200">Lote pronto para imprimir</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400">Preset</label>
                <select
                  value={labelSettings.preset}
                  onChange={(e) => applyLabelPreset(e.target.value)}
                  className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1"
                >
                  <option value="pequeno">Pequeno (4x4cm)</option>
                  <option value="medio">Médio (6x4cm)</option>
                  <option value="grande">Grande (8x5cm)</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
            </div>

            {!labelItems.length ? (
              <p className="text-xs text-zinc-400 text-center py-6">Nenhum item selecionado.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {labelItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border border-zinc-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{item.id}</p>
                      <p className="text-xs text-zinc-400">{item.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          type="text"
                          className="w-20 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                          placeholder="Peso"
                          value={item.weight || ""}
                          onChange={(e) =>
                            updateLabelField(item.id, "weight", e.target.value)
                          }
                        />
                        <input
                          type="text"
                          className="w-24 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                          placeholder="Local"
                          value={item.location || ""}
                          onChange={(e) =>
                            updateLabelField(item.id, "location", e.target.value)
                          }
                        />
                        {extraFields.map((field) => (
                          <input
                            key={field.key}
                            type="text"
                            className="w-24 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                            placeholder={field.label}
                            value={item.extraFields?.[field.key] || ""}
                            onChange={(e) =>
                              updateLabelExtraField(item.id, field.key, e.target.value)
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        className="w-16 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                        value={item.qty}
                        onChange={(e) => updateLabelQty(item.id, parseInt(e.target.value, 10))}
                      />
                      <button
                        type="button"
                        className="text-xs text-rose-300 hover:text-rose-200"
                        onClick={() => removeLabelItem(item.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                className="bg-emerald-500/90 text-black px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-400"
                onClick={handleGenerateBatch}
              >
                {isGeneratingLabels ? "Gerando..." : "Gerar lote"}
              </button>
              <button
                type="button"
                className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-xl text-xs font-semibold"
                onClick={handlePrintBatch}
              >
                Visualizar impressão
              </button>
              <button
                type="button"
                className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-xl text-xs font-semibold"
                onClick={handlePrintBatch}
              >
                Imprimir
              </button>
              <button
                type="button"
                className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-xl text-xs font-semibold"
                onClick={handleClearBatch}
              >
                Limpar lote
              </button>
              {isBatchStale && labelBatch.length > 0 && (
                <span className="text-xs text-amber-200">Atualize o lote para refletir alteracoes.</span>
              )}
            </div>

            {labelBatch.length > 0 && (
              <div className="grid gap-3" style={labelGridStyle}>
                {labelBatch.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-center"
                    style={previewLabelStyle}
                  >
                    {renderLabelLayout(item, qrCache[item.id] || previewQrFallback)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      </div>

      <div className="print-only px-8 py-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Etiquetas QR</h2>
          <p className="text-xs text-zinc-600">Gerado em {new Date().toLocaleString("pt-BR")}</p>
        </div>
        <div className="print-grid grid" style={labelGridStyle}>
          {labelBatch.map((item, index) => (
            <div
              key={`print-${item.id}-${index}`}
              className="print-label text-center"
              style={printLabelStyle}
            >
              {renderLabelLayout(item, qrCache[item.id])}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default App;










