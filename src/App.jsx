// src/App.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import appLogo from "../logo.png";
import "./App.css";
import LandingPage from "./landing";
import { auth, db } from "./firebase";
import { initialInventoryCatalog } from "./inventoryCatalog";
// IMPORTANTE: Importamos o novo catlogo que acabamos de criar
import { profilesCatalog } from "./profilesCatalog";
import { buildCatalogModel, searchCatalog } from "./catalogUtils";
import LabelEditor from "./LabelEditor";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
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
            src={appLogo}
            alt="QtdApp"
            className="h-[220px] w-[220px] object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-emerald-300 mb-6 text-center tracking-wide">Identificao</h2>
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
  const [status, setStatus] = useState("Iniciando cmera...");

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
        detector = new window.BarcodeDetector({
          formats: [
            "qr_code",
            "code_128",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
          ],
        });
      } catch (err) {
        setStatus("No foi possvel iniciar o leitor.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (err) {
        setStatus("Permisso de cmera negada.");
        return;
      }

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", true);

      try {
        await videoRef.current.play();
      } catch (err) {
        setStatus("No foi possvel iniciar o vdeo.");
        return;
      }

      setStatus("Aponte a cmera para o QR code ou cdigo de barras.");

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
  
  // ESTADO PARA O TIPO DE INVENTRIO (Bobina ou Perfil)
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
  const [barcodeCache, setBarcodeCache] = useState({});
  const [labelBatchName, setLabelBatchName] = useState("");
  const [savedLabelBatches, setSavedLabelBatches] = useState([]);
  const [selectedSavedBatchId, setSelectedSavedBatchId] = useState("");
  const [labelLayoutName, setLabelLayoutName] = useState("");
  const [savedLabelLayouts, setSavedLabelLayouts] = useState([]);
  const [selectedSavedLayoutId, setSelectedSavedLayoutId] = useState("");
  const [labelSettings, setLabelSettings] = useState({
    preset: "60x40",
    widthCm: 10,
    heightCm: 15,
    qrCm: 6,
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
    headerBoxXcm: 0,
    headerBoxYcm: 0,
    headerBoxWcm: 10,
    headerBoxHcm: 1.8,
    footerBoxXcm: 0,
    footerBoxYcm: 0,
    footerBoxWcm: 10,
    footerBoxHcm: 1.6,
    headerLogoXcm: 0,
    headerLogoYcm: 0,
    headerLogoWcm: 2.5,
    headerLogoHcm: 1.4,
    headerRows: 2,
    headerBorder: false,
    headerBorderColor: "#1f2937",
    footerLogoXcm: 0,
    footerLogoYcm: 0,
    footerLogoWcm: 2.2,
    footerLogoHcm: 1.2,
    footerRows: 2,
    footerBorder: false,
    footerBorderColor: "#1f2937",
    testCode: "CODIGO TESTE",
    testDescription: "Descricao de teste",
    testQty: "1",
    testWeight: "0",
    testLocation: "A1",
    customFieldValues: {},
    fontTitle: 18,
    fontDesc: 13,
    fontMeta: 11,
    fontLabel: 12,
  });
  const [labelLayout, setLabelLayout] = useState({
    align: "center",
    gridSizeCm: 0.5,
    blocks: {},
  });
  const [removedBlocks, setRemovedBlocks] = useState([]);
  const [selectedBlockKey, setSelectedBlockKey] = useState(null);
  const [draggingBlockKey, setDraggingBlockKey] = useState(null);
  const [selectedHeaderSection, setSelectedHeaderSection] = useState(null);
  const gridRef = useRef(null);
  const dragStateRef = useRef(null);
  const suppressClickRef = useRef(false);
  const defaultLabelFields = [
    { key: "qr", label: "QR Code", enabled: true, showLabel: false, emphasize: false, highlight: false, highlightColor: "#e5e7eb", labelFontSize: 10, valueFontSize: null, boldLabel: true, boldValue: false, align: "center" },
    { key: "barcode", label: "Codigo Barras", enabled: true, showLabel: false, emphasize: false, highlight: false, highlightColor: "#e5e7eb", labelFontSize: 10, valueFontSize: null, boldLabel: true, boldValue: false, align: "center" },
    { key: "id", label: "Codigo", enabled: true, showLabel: false, emphasize: true, highlight: false, highlightColor: "#e5e7eb", labelFontSize: 10, valueFontSize: null, boldLabel: true, boldValue: true, align: "center" },
    { key: "description", label: "Descricao", enabled: true, showLabel: false, emphasize: false, highlight: false, highlightColor: "#e5e7eb", labelFontSize: 10, valueFontSize: null, boldLabel: true, boldValue: false, align: "left" },
    { key: "qty", label: "Quantidade", enabled: true, showLabel: true, emphasize: false, highlight: false, highlightColor: "#e5e7eb", labelFontSize: 10, valueFontSize: null, boldLabel: true, boldValue: false, align: "left" },
    { key: "weight", label: "Peso", enabled: true, showLabel: true, emphasize: false, highlight: false, highlightColor: "#e5e7eb", labelFontSize: 10, valueFontSize: null, boldLabel: true, boldValue: false, align: "left" },
    { key: "location", label: "Local", enabled: true, showLabel: true, emphasize: false, highlight: false, highlightColor: "#e5e7eb", labelFontSize: 10, valueFontSize: null, boldLabel: true, boldValue: false, align: "left" },
  ];
  const [labelFields, setLabelFields] = useState(defaultLabelFields);
  const [labelFieldInput, setLabelFieldInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [qrCache, setQrCache] = useState({});
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [isBatchStale, setIsBatchStale] = useState(false);
  const labelInitRef = useRef(true);
  const [extraFields, setExtraFields] = useState([]);
  const importInputRef = useRef(null);
  const [previewQr, setPreviewQr] = useState("");
  const [previewBarcode, setPreviewBarcode] = useState("");

  const appId = "inventario-bobina2";

  // LOGIN ANNIMO
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

  // LISTA DE LAYOUTS DE ETIQUETA SALVOS
  useEffect(() => {
    if (!isAuthReady || !uid) return;

    const layoutsPath = `artifacts/${appId}/users/${uid}/label_layouts`;
    const q = query(
      collection(db, layoutsPath),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      }));
      setSavedLabelLayouts(docs);
    });

    return () => unsub();
  }, [uid, isAuthReady]);

  // LISTA DE LOTES DE ETIQUETAS SALVOS
  useEffect(() => {
    if (!isAuthReady || !uid) return;

    const batchesPath = `artifacts/${appId}/users/${uid}/label_batches`;
    const q = query(
      collection(db, batchesPath),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      }));
      setSavedLabelBatches(docs);
    });

    return () => unsub();
  }, [uid, isAuthReady]);

  // RESETAR SELEO AO MUDAR DE ABA
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
    setBarcodeCache({});
    setIsBatchStale(false);
    setLabelBatchName("");
    setSelectedSavedBatchId("");
    setLabelLayoutName("");
    setSelectedSavedLayoutId("");
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

  const resolveFieldAlign = (value, fallback) => {
    if (value === "left" || value === "center" || value === "right") return value;
    return fallback;
  };
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
      highlightColor:
        typeof field.highlightColor === "string" && field.highlightColor.length > 0
          ? field.highlightColor
          : "#e5e7eb",
      boldLabel: field.boldLabel ?? true,
      boldValue: field.boldValue ?? false,
      align: resolveFieldAlign(field.align, labelLayout.align),
      valueFontSize: Number.isFinite(Number(field.valueFontSize))
        ? Number(field.valueFontSize)
        : null,
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

  useEffect(() => {
    const testValue = labelSettings.testCode || "CODIGO TESTE";
    setPreviewBarcode(generateBarcodeDataUrl(testValue));
  }, [labelSettings.testCode]);

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
      pushMessage(`Lanado: ${numeric} (${item.id})`, "success", 1500);
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
      pushMessage("Valor invlido.", "error", 2500);
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
    const header = "Data;Tipo;ID;Descrio;Peso/Qtd;Usurio\n";
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

  // FILTRO INTELIGENTE (Define qual catlogo usar)
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
  const batchExtraFields = useMemo(() => {
    const customFields = labelFields
      .filter((field) => field.key.startsWith("custom:"))
      .map((field) => ({ key: field.key, label: field.label }));
    const map = new Map();
    extraFields.forEach((field) => map.set(field.key, field));
    customFields.forEach((field) => {
      if (!map.has(field.key)) map.set(field.key, field);
    });
    return Array.from(map.values());
  }, [extraFields, labelFields]);

  const buildSavedLabelItems = (items) =>
    (items || []).map((item) => ({
      id: item.id,
      description: item.description || "",
      qty: item.qty ?? "",
      weight: item.weight ?? "",
      location: item.location ?? "",
      printQty: item.printQty ?? item.qty ?? 1,
      extraFields: item.extraFields || {},
    }));

  const hydrateSavedLabelItems = (items) =>
    (items || [])
      .map((saved) => {
        const id = (saved.id || "").toString().trim().toUpperCase();
        if (!id) return null;
        const itemIndex = activeCatalogModel.byId.get(id);
        const base =
          itemIndex === undefined
            ? { id, description: saved.description || "" }
            : activeCatalogModel.items[itemIndex];
        return {
          ...base,
          qty: saved.qty ?? "",
          weight: saved.weight ?? "",
          location: saved.location ?? "",
          printQty: saved.printQty ?? saved.qty ?? 1,
          extraFields: saved.extraFields || {},
        };
      })
      .filter(Boolean);

  const formatSavedBatchLabel = (batch) => {
    const createdAt = batch?.createdAt
      ? batch.createdAt.toLocaleString("pt-BR")
      : "sem data";
    const name = (batch?.name || "").toString().trim();
    return name ? `${name} (${createdAt})` : `Lote ${createdAt}`;
  };

  const formatSavedLayoutLabel = (layout) => {
    const createdAt = layout?.createdAt
      ? layout.createdAt.toLocaleString("pt-BR")
      : "sem data";
    const name = (layout?.name || "").toString().trim();
    return name ? `${name} (${createdAt})` : `Layout ${createdAt}`;
  };

  const handleSaveLabelLayout = async () => {
    if (!uid) {
      pushMessage("Usuario nao autenticado.", "error", 2500);
      return;
    }

    const name = labelLayoutName.trim();
    const payload = {
      name: name || null,
      settings: labelSettings,
      layout: labelLayout,
      fields: labelFields,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(
        collection(db, `artifacts/${appId}/users/${uid}/label_layouts`),
        payload
      );
      setLabelLayoutName("");
      pushMessage("Layout salvo no Firebase.", "success", 2000);
    } catch (err) {
      pushMessage("Erro ao salvar layout.", "error", 2500);
    }
  };

  const handleLoadSavedLayout = (layoutId) => {
    const saved = savedLabelLayouts.find((entry) => entry.id === layoutId);
    if (!saved) return;
    if (saved.settings) setLabelSettings(saved.settings);
    if (saved.layout) setLabelLayout(saved.layout);
    if (saved.fields) setLabelFields(sanitizeLabelFields(saved.fields));
    pushMessage("Layout carregado.", "success", 2000);
  };

  const handleDeleteSavedLayout = async (layoutId) => {
    if (!uid || !layoutId) return;
    try {
      await deleteDoc(
        doc(db, `artifacts/${appId}/users/${uid}/label_layouts`, layoutId)
      );
      if (selectedSavedLayoutId === layoutId) {
        setSelectedSavedLayoutId("");
      }
      pushMessage("Layout removido.", "success", 2000);
    } catch (err) {
      pushMessage("Erro ao excluir layout.", "error", 2500);
    }
  };

  const handleSaveLabelBatch = async () => {
    if (!uid) {
      pushMessage("Usuario nao autenticado.", "error", 2500);
      return;
    }
    if (!labelItems.length) {
      pushMessage("Nenhum item no lote para salvar.", "error", 2500);
      return;
    }

    const name = labelBatchName.trim();
    const payload = {
      name: name || null,
      items: buildSavedLabelItems(labelItems),
      extraFields,
      inventoryType,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(
        collection(db, `artifacts/${appId}/users/${uid}/label_batches`),
        payload
      );
      setLabelBatchName("");
      pushMessage("Lote salvo no Firebase.", "success", 2000);
    } catch (err) {
      pushMessage("Erro ao salvar lote.", "error", 2500);
    }
  };

  const handleLoadSavedBatch = (batchId) => {
    const batch = savedLabelBatches.find((entry) => entry.id === batchId);
    if (!batch) return;
    if (batch.inventoryType && batch.inventoryType !== inventoryType) {
      pushMessage(
        `Lote salvo para ${batch.inventoryType === "coil" ? "bobina" : "perfil"}.`,
        "info",
        3000
      );
    }

    setLabelItems(hydrateSavedLabelItems(batch.items));
    setExtraFields(batch.extraFields || []);
    setLabelBatch([]);
    setIsBatchStale(true);
    pushMessage("Lote carregado.", "success", 2000);
  };

  const handleDeleteSavedBatch = async (batchId) => {
    if (!uid || !batchId) return;
    try {
      await deleteDoc(
        doc(db, `artifacts/${appId}/users/${uid}/label_batches`, batchId)
      );
      if (selectedSavedBatchId === batchId) {
        setSelectedSavedBatchId("");
      }
      pushMessage("Lote removido.", "success", 2000);
    } catch (err) {
      pushMessage("Erro ao excluir lote.", "error", 2500);
    }
  };

  const handleQrDetected = async (payload) => {
    const parsed = parseQrPayload(payload);
    if (!parsed || !parsed.id) {
      pushMessage("QR invlido.", "error", 2500);
      return;
    }

    const itemIndex = activeCatalogModel.byId.get(parsed.id);
    if (itemIndex === undefined) {
      pushMessage(`Item no encontrado: ${parsed.id}`, "error", 2500);
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
        const currentPrintQty = next[index].printQty ?? next[index].qty ?? 1;
        next[index] = { ...next[index], printQty: currentPrintQty + qty };
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
          qty: 1,
          printQty: qty,
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
        item.id === id ? { ...item, printQty: numericQty } : item
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
  const buildBarcodePayload = (item) => buildQrPayload(item);

  const generateBarcodeDataUrl = (value) => {
    if (!value) return "";
    try {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, value.toString(), {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 60,
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      return "";
    }
  };

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

  const ensureBarcodeForItems = async (items) => {
    const missing = items.filter((item) => !barcodeCache[item.id]);
    if (!missing.length) return;
    setIsGeneratingLabels(true);
    try {
      const results = missing.map((item) =>
        generateBarcodeDataUrl(buildBarcodePayload(item))
      );
      setBarcodeCache((prev) => {
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
    await ensureBarcodeForItems(labelItems);

    const nextBatch = labelItems.flatMap((item) => {
      const count = item.printQty ?? item.qty ?? 1;
      return Array.from({ length: count }).map(() => item);
    });
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
            qty: qty,
            printQty: (existing.printQty ?? existing.qty ?? 1) + qty,
            weight: weight || existing.weight || "",
            location: location || existing.location || "",
          });
        } else {
          map.set(item.id, { ...item, qty, printQty: qty, weight, location });
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
          printQty: qty,
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
      case "barcode":
        return "BARCODE";
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
          const itemValue = item.extraFields?.[field.key];
          const customValue = labelSettings.customFieldValues?.[field.key];
          return itemValue || customValue || "-";
        }
        return "";
    }
  };

  const renderLabelBlockContent = (field, item, qrSrc, barcodeSrc, blockSizeCm, align) => {
    const rawValue = getFieldValue(field, item);
    const hasValue = rawValue !== null && rawValue !== undefined && rawValue !== "";
    if (!hasValue) return null;
    const labelFontSize = getLabelFontSize(field);
    const valueFontSize =
      Number.isFinite(Number(field.valueFontSize)) && Number(field.valueFontSize) > 0
        ? Number(field.valueFontSize)
        : null;
    const fieldAlign = resolveFieldAlign(align, labelLayout.align);
    const textAlignClass =
      fieldAlign === "left" ? "text-left" : fieldAlign === "right" ? "text-right" : "text-center";
    const labelPrefix = (
      <span
        className={`text-black ${field.boldLabel ? "font-semibold" : "font-normal"} ${textAlignClass}`}
        style={{ fontSize: `${labelFontSize}px` }}
      >
        {field.label}:
      </span>
    );
    if (field.key === "qr") {
      const qrSize = Math.min(blockSizeCm.widthCm, blockSizeCm.heightCm);
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="rounded-lg bg-white p-2">
            {qrSrc ? (
              <img
                src={qrSrc}
                alt="QR"
                style={{ width: `${qrSize}cm`, height: `${qrSize}cm` }}
              />
            ) : (
              <div
                className="flex items-center justify-center text-xs text-zinc-500"
                style={{ width: `${qrSize}cm`, height: `${qrSize}cm` }}
              >
                QR
              </div>
            )}
          </div>
        </div>
      );
    }
    if (field.key === "barcode") {
      const barcodeWidth = blockSizeCm.widthCm;
      const barcodeHeight = Math.max(1, Math.min(blockSizeCm.heightCm, 2.2));
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="rounded bg-white px-2 py-1">
            {barcodeSrc ? (
              <img
                src={barcodeSrc}
                alt="Codigo de barras"
                style={{ width: `${barcodeWidth}cm`, height: `${barcodeHeight}cm` }}
              />
            ) : (
              <div
                className="flex items-center justify-center text-[10px] text-zinc-500"
                style={{ width: `${barcodeWidth}cm`, height: `${barcodeHeight}cm` }}
              >
                BARCODE
              </div>
            )}
          </div>
        </div>
      );
    }
    const emphasizeClass = field.emphasize ? "rounded px-2 py-1" : "";
    const highlightClass = field.highlight ? "rounded px-2 py-1" : "";
    const valueWeightClass = field.boldValue ? "font-semibold text-black" : "font-normal text-zinc-700";
    if (field.key === "id") {
      return (
        <p
          className={`w-full ${field.boldValue ? "font-semibold" : "font-normal"} text-black ${emphasizeClass} ${highlightClass} ${textAlignClass}`}
          style={{ ...labelTitleStyle, ...(valueFontSize ? { fontSize: `${valueFontSize}px` } : {}) }}
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
          className={`w-full ${valueWeightClass} ${emphasizeClass} ${highlightClass} ${textAlignClass}`}
          style={{ ...labelDescStyle, ...(valueFontSize ? { fontSize: `${valueFontSize}px` } : {}) }}
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
        className={`w-full ${valueWeightClass} ${emphasizeClass} ${highlightClass} ${textAlignClass}`}
        style={{ ...labelMetaStyle, ...(valueFontSize ? { fontSize: `${valueFontSize}px` } : {}) }}
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
  };

  const renderLabelLayout = (item, qrSrc, barcodeSrc, options = {}) => {
    const {
      showGuides = false,
      highlightKey = null,
      onBlockClick,
      onGridClick,
      gridRef: gridElementRef,
      onGridPointerMove,
      onGridPointerUp,
      onBlockPointerDown,
      onDrop,
    } = options;
    const layout = normalizeLabelLayout(labelLayout, labelFields);
    const metrics = getLabelGridMetrics(layout.gridSizeCm);
    const gridWidthCm = metrics.cols * metrics.cellWidthCm;
    const gridHeightCm = metrics.rows * metrics.rowHeightCm;
    const resolveAlignClass = (align) =>
      align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
    const resolveTextClass = (align) =>
      align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
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
    const headerRowClass = resolveAlignClass(labelSettings.headerLogoAlign);
    const footerRowClass = resolveAlignClass(labelSettings.footerLogoAlign);
    const headerTextClass = resolveTextClass(labelSettings.headerTextAlign);
    const footerTextClass = resolveTextClass(labelSettings.footerTextAlign);
    const gridCellWidthPx = Math.max(1, Math.round(metrics.cellWidthPx));
    const gridRowHeightPx = Math.max(1, Math.round(metrics.rowHeightPx));
    const gridBackground = showGuides
      ? {
          backgroundImage:
            "linear-gradient(to right, rgba(15, 23, 42, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.12) 1px, transparent 1px)",
          backgroundSize: `${gridCellWidthPx}px ${gridRowHeightPx}px`,
          backgroundPosition: "0 0",
        }
      : {};
    return (
      <div className="flex flex-col h-full">
        <div
          ref={gridElementRef}
          className={`relative ${onGridClick ? "cursor-crosshair" : ""} touch-none`}
          style={{
            width: `${gridWidthCm}cm`,
            height: `${gridHeightCm}cm`,
            ...gridBackground,
          }}
          onClick={(event) => {
            if (onGridClick) onGridClick(event);
            if (suppressClickRef.current) return;
            if (event.target === event.currentTarget) {
              if (highlightKey && onBlockClick) onBlockClick(null);
              setSelectedHeaderSection(null);
            }
          }}
          onPointerMove={onGridPointerMove}
          onPointerUp={onGridPointerUp}
          onPointerLeave={onGridPointerUp}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {showHeader && (
            <div
              className={`absolute overflow-hidden cursor-pointer ${selectedHeaderSection === "header" ? "ring-2 ring-emerald-400 bg-emerald-200/20" : ""}`}
              style={{
                left: `0cm`,
                top: `0cm`,
                width: `${metrics.innerWidthCm}cm`,
                height: `${labelSettings.headerBoxHcm}cm`,
                border: labelSettings.headerBorder
                  ? `1px solid ${labelSettings.headerBorderColor || "#1f2937"}`
                  : "none",
              }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedHeaderSection("header");
                setSelectedBlockKey(null);
              }}
            >
              {labelSettings.logoDataUrl && labelSettings.headerLogoEnabled && (
                <div
                  className={`absolute ${headerRowClass}`}
                  style={{
                    left: `${labelSettings.headerLogoXcm}cm`,
                    top: `${labelSettings.headerLogoYcm}cm`,
                    width: `${labelSettings.headerLogoWcm}cm`,
                    height: `${labelSettings.headerLogoHcm}cm`,
                  }}
                >
                  <img
                    src={labelSettings.logoDataUrl}
                    alt="Logo"
                    className="object-contain w-full h-full"
                  />
                </div>
              )}
              {labelSettings.headerText && (
                <p
                  className={`text-black font-semibold ${headerTextClass}`}
                  style={headerFooterTextStyle}
                >
                  {labelSettings.headerText}
                </p>
              )}
            </div>
          )}
          {labelFields
            .filter((field) => field.enabled)
            .filter((field) => field.key !== "test" && normalizeKey(field.label || "") !== "texto_teste")
            .map((field) => {
              const block = layout.blocks?.[field.key];
              if (!block) return null;
              const blockSizeCm = {
                widthCm: block.w * metrics.cellWidthCm,
                heightCm: block.h * metrics.rowHeightCm,
              };
              const fieldAlign = resolveFieldAlign(field.align, labelLayout.align);
              const alignItemsClass =
                fieldAlign === "left"
                  ? "justify-start"
                  : fieldAlign === "right"
                  ? "justify-end"
                  : "justify-center";
              const blockHighlightStyle = field.highlight
                ? { backgroundColor: field.highlightColor || "#e5e7eb" }
                : {};
              const blockBorderStyle = field.emphasize
                ? { border: "1px solid rgba(15, 23, 42, 0.55)" }
                : {};
              return (
                <div
                  key={field.key}
                  className={`absolute ${labelContentClass} ${showGuides ? "border border-dashed border-zinc-400/60" : ""} ${
                    highlightKey === field.key ? "ring-2 ring-emerald-400" : ""
                  } flex items-center overflow-hidden ${alignItemsClass} ${onBlockClick ? "cursor-pointer" : ""}`}
                  style={{
                    left: `${block.x * metrics.cellWidthCm}cm`,
                    top: `${block.y * metrics.rowHeightCm}cm`,
                    width: `${block.w * metrics.cellWidthCm}cm`,
                    height: `${block.h * metrics.rowHeightCm}cm`,
                    ...blockHighlightStyle,
                    ...blockBorderStyle,
                  }}
                  onClick={(event) => {
                    if (onBlockClick) {
                      event.stopPropagation();
                      onBlockClick(field.key);
                    }
                  }}
                  onPointerDown={(event) => {
                    if (onBlockPointerDown) {
                      onBlockPointerDown(event, field.key);
                    }
                  }}
                >
                  <div className="w-full h-full flex items-center px-1">
                    {renderLabelBlockContent(field, item, qrSrc, barcodeSrc, blockSizeCm, field.align)}
                  </div>
                </div>
              );
            })}
          {highlightKey && (() => {
            const activeField = labelFields.find((field) => field.key === highlightKey);
            const activeBlock = layout.blocks?.[highlightKey];
            if (!activeField || !activeBlock) return null;
            const panelWidthCm = 3.8;
            const blockLeftCm = activeBlock.x * metrics.cellWidthCm;
            const blockTopCm = activeBlock.y * metrics.rowHeightCm;
            const panelLeft = Math.min(
              gridWidthCm - panelWidthCm,
              Math.max(0, blockLeftCm)
            );
            const panelTop = Math.max(0, blockTopCm - 0.9);
            const alignValue = resolveFieldAlign(activeField.align, labelLayout.align);
            return (
              <div
                className="absolute z-10 rounded-lg border border-zinc-300 bg-white/95 shadow-md px-2 py-1 flex items-center gap-1"
                style={{
                  left: `${panelLeft}cm`,
                  top: `${panelTop}cm`,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  title="Mostrar titulo"
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${activeField.showLabel ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                  onClick={() => toggleFieldOption(activeField.key, "showLabel")}
                >
                  T
                </button>
                <button
                  type="button"
                  title="Negrito titulo"
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${activeField.boldLabel ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                  onClick={() => toggleFieldOption(activeField.key, "boldLabel")}
                >
                  BL
                </button>
                <button
                  type="button"
                  title="Negrito valor"
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${activeField.boldValue ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                  onClick={() => toggleFieldOption(activeField.key, "boldValue")}
                >
                  BV
                </button>
                <button
                  type="button"
                  title="Borda"
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${activeField.emphasize ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                  onClick={() => toggleFieldOption(activeField.key, "emphasize")}
                >
                  []
                </button>
                <button
                  type="button"
                  title="Fundo"
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${activeField.highlight ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                  onClick={() => {
                    if (!activeField.highlight) {
                      updateLabelFieldHighlightColor(
                        activeField.key,
                        activeField.highlightColor || "#e5e7eb"
                      );
                    }
                    toggleFieldOption(activeField.key, "highlight");
                  }}
                >
                  BG
                </button>
                <input
                  type="color"
                  title="Cor do fundo"
                  className="h-5 w-5 border border-zinc-300 rounded"
                  value={activeField.highlightColor || "#e5e7eb"}
                  onChange={(event) =>
                    updateLabelFieldHighlightColor(activeField.key, event.target.value)
                  }
                />
                <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                  <button
                    type="button"
                    title="Esquerda"
                    className={`text-[10px] px-1 py-0.5 rounded border ${alignValue === "left" ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                    onClick={() => updateLabelFieldAlign(activeField.key, "left")}
                  >
                    E
                  </button>
                  <button
                    type="button"
                    title="Centro"
                    className={`text-[10px] px-1 py-0.5 rounded border ${alignValue === "center" ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                    onClick={() => updateLabelFieldAlign(activeField.key, "center")}
                  >
                    C
                  </button>
                  <button
                    type="button"
                    title="Direita"
                    className={`text-[10px] px-1 py-0.5 rounded border ${alignValue === "right" ? "border-emerald-400 text-emerald-700" : "border-zinc-300 text-zinc-500"}`}
                    onClick={() => updateLabelFieldAlign(activeField.key, "right")}
                  >
                    D
                  </button>
                </div>
                <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                  <span className="text-[10px] text-zinc-500">F</span>
                  <input
                    type="number"
                    min="6"
                    className="w-12 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                    value={activeField.valueFontSize ?? activeField.labelFontSize ?? labelSettings.fontLabel}
                    onChange={(e) =>
                      updateLabelFieldValueSize(
                        activeField.key,
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                  />
                </div>
                {activeField.showLabel && (
                  <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                    <span className="text-[10px] text-zinc-500">FT</span>
                    <input
                      type="number"
                      min="6"
                      className="w-12 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                      value={activeField.labelFontSize ?? labelSettings.fontLabel}
                      onChange={(e) =>
                        updateLabelFieldTitleSize(
                          activeField.key,
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </div>
                )}
                <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                  <span className="text-[10px] text-zinc-500">W</span>
                  <input
                    type="number"
                    min="1"
                    className="w-8 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                    value={activeBlock.w}
                    onChange={(e) =>
                      updateLabelBlock(activeField.key, {
                        w: parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                  <span className="text-[10px] text-zinc-500">H</span>
                  <input
                    type="number"
                    min="1"
                    className="w-8 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                    value={activeBlock.h}
                    onChange={(e) =>
                      updateLabelBlock(activeField.key, {
                        h: parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                  <span className="text-[10px] text-zinc-500">Pos</span>
                  <span className="text-[10px] text-zinc-400">
                    {activeBlock.x},{activeBlock.y}
                  </span>
                </div>
                {activeField.key.startsWith("custom:") && (
                  <button
                    type="button"
                    title="Remover"
                    className="text-[10px] px-1.5 py-0.5 rounded border border-rose-300 text-rose-500"
                    onClick={() => removeLabelField(activeField.key)}
                  >
                    X
                  </button>
                )}
              </div>
            );
          })()}
          {selectedHeaderSection && (() => {
            const isHeader = selectedHeaderSection === "header";
            const boxX = 0;
            const boxY = isHeader ? 0 : Math.max(0, metrics.innerHeightCm - labelSettings.footerBoxHcm);
            const boxW = metrics.innerWidthCm;
            const boxH = isHeader ? labelSettings.headerBoxHcm : labelSettings.footerBoxHcm;
            const logoX = isHeader ? labelSettings.headerLogoXcm : labelSettings.footerLogoXcm;
            const logoY = isHeader ? labelSettings.headerLogoYcm : labelSettings.footerLogoYcm;
            const logoW = isHeader ? labelSettings.headerLogoWcm : labelSettings.footerLogoWcm;
            const logoH = isHeader ? labelSettings.headerLogoHcm : labelSettings.footerLogoHcm;
            const panelWidthCm = 4.6;
            const panelHeightCm = 0.8;
            const panelLeft = Math.min(
              gridWidthCm - panelWidthCm,
              Math.max(0, boxX)
            );
            const panelTop = Math.max(0, boxY - 0.9);
            return (
              <div
                className="absolute z-10 rounded-lg border border-zinc-300 bg-white/95 shadow-md px-2 py-1 flex items-center gap-1"
                style={{
                  left: `${panelLeft}cm`,
                  top: `${panelTop}cm`,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <span className="text-[10px] text-zinc-500">{isHeader ? "H" : "R"}</span>
                <span className="text-[10px] text-zinc-500">H</span>
                <input
                  type="number"
                  min="1"
                  className="w-10 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                  value={isHeader ? labelSettings.headerRows : labelSettings.footerRows}
                  onChange={(e) =>
                    updateLabelSetting(
                      isHeader ? "headerRows" : "footerRows",
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                />
                <span className="text-[10px] text-zinc-500">Lin</span>
                <span className="text-[10px] text-zinc-400">
                  {isHeader ? labelSettings.headerRows : labelSettings.footerRows}
                </span>
                <span className="text-[10px] text-zinc-500">Lx</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-10 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                  value={logoX}
                  onChange={(e) =>
                    updateLabelSetting(
                      isHeader ? "headerLogoXcm" : "footerLogoXcm",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
                <span className="text-[10px] text-zinc-500">Ly</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-10 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                  value={logoY}
                  onChange={(e) =>
                    updateLabelSetting(
                      isHeader ? "headerLogoYcm" : "footerLogoYcm",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
                <span className="text-[10px] text-zinc-500">Lw</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-10 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                  value={logoW}
                  onChange={(e) =>
                    updateLabelSetting(
                      isHeader ? "headerLogoWcm" : "footerLogoWcm",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
                <span className="text-[10px] text-zinc-500">Lh</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-10 text-[10px] border border-zinc-300 rounded px-1 py-0.5 text-zinc-700"
                  value={logoH}
                  onChange={(e) =>
                    updateLabelSetting(
                      isHeader ? "headerLogoHcm" : "footerLogoHcm",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
                <button
                  type="button"
                  title="Borda"
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    isHeader
                      ? labelSettings.headerBorder
                        ? "border-emerald-400 text-emerald-700"
                        : "border-zinc-300 text-zinc-500"
                      : labelSettings.footerBorder
                      ? "border-emerald-400 text-emerald-700"
                      : "border-zinc-300 text-zinc-500"
                  }`}
                  onClick={() =>
                    updateLabelSetting(
                      isHeader ? "headerBorder" : "footerBorder",
                      isHeader ? !labelSettings.headerBorder : !labelSettings.footerBorder
                    )
                  }
                >
                  []
                </button>
              </div>
            );
          })()}
          {showFooter && (
            <div
              className={`absolute overflow-hidden cursor-pointer ${selectedHeaderSection === "footer" ? "ring-2 ring-emerald-400 bg-emerald-200/20" : ""}`}
              style={{
                left: `0cm`,
                top: `${Math.max(0, metrics.innerHeightCm - labelSettings.footerBoxHcm)}cm`,
                width: `${innerWidthCm}cm`,
                height: `${labelSettings.footerBoxHcm}cm`,
                border: labelSettings.footerBorder
                  ? `1px solid ${labelSettings.footerBorderColor || "#1f2937"}`
                  : "none",
              }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedHeaderSection("footer");
                setSelectedBlockKey(null);
              }}
            >
              {labelSettings.footerText && (
                <p className={`text-black font-semibold ${footerTextClass}`} style={footerTextStyle}>
                  {labelSettings.footerText}
                </p>
              )}
              {labelSettings.logoDataUrl && labelSettings.footerLogoEnabled && (
                <div
                  className={`absolute ${footerRowClass}`}
                  style={{
                    left: `${labelSettings.footerLogoXcm}cm`,
                    top: `${labelSettings.footerLogoYcm}cm`,
                    width: `${labelSettings.footerLogoWcm}cm`,
                    height: `${labelSettings.footerLogoHcm}cm`,
                  }}
                >
                  <img
                    src={labelSettings.logoDataUrl}
                    alt="Logo"
                    className="object-contain w-full h-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
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
    "40x20": { widthCm: 4, heightCm: 2, qrCm: 1.8, paddingXCm: 0.2, paddingYCm: 0.2, gridSizeCm: 0.4 },
    "50x30": { widthCm: 5, heightCm: 3, qrCm: 2.4, paddingXCm: 0.3, paddingYCm: 0.3, gridSizeCm: 0.5 },
    "60x40": { widthCm: 6, heightCm: 4, qrCm: 3, paddingXCm: 0.4, paddingYCm: 0.4, gridSizeCm: 0.6 },
    "70x30": { widthCm: 7, heightCm: 3, qrCm: 2.8, paddingXCm: 0.4, paddingYCm: 0.3, gridSizeCm: 0.5 },
    "80x50": { widthCm: 8, heightCm: 5, qrCm: 4, paddingXCm: 0.5, paddingYCm: 0.5, gridSizeCm: 0.7 },
    "100x50": { widthCm: 10, heightCm: 5, qrCm: 4.5, paddingXCm: 0.6, paddingYCm: 0.4, gridSizeCm: 0.8 },
    "100x100": { widthCm: 10, heightCm: 10, qrCm: 5.5, paddingXCm: 0.7, paddingYCm: 0.7, gridSizeCm: 1.0 },
    "100x150": { widthCm: 10, heightCm: 15, qrCm: 6, paddingXCm: 0.8, paddingYCm: 1.0, gridSizeCm: 1.2 },
    personalizado: { widthCm: 6, heightCm: 4, qrCm: 3, paddingXCm: 0.4, paddingYCm: 0.4, gridSizeCm: 0.6 },
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
  const adjustBlocksForSize = (preset) => {
    const presetData = labelPresets[preset];
    if (!presetData) return;
    const { widthCm, heightCm, paddingXCm = 0.4, paddingYCm = 0.4, gridSizeCm = 0.5 } = presetData;
    const innerWidthCm = widthCm - paddingXCm * 2;
    const innerHeightCm = heightCm - paddingYCm * 2;
    const cols = Math.floor(innerWidthCm / gridSizeCm);
    const rows = Math.floor(innerHeightCm / gridSizeCm);

    setLabelLayout((prev) => {
      const blocks = { ...prev.blocks };
      const toRemove = [];
      Object.entries(blocks).forEach(([key, block]) => {
        if (key !== 'qr' && (block.x + block.w > cols || block.y + block.h > rows)) {
          delete blocks[key];
          toRemove.push(key);
        }
      });
      setRemovedBlocks(toRemove);
      return { ...prev, blocks };
    });
  };
  const applyLabelPreset = (preset) => {
    const presetData = labelPresets[preset];
    if (!presetData) return;
    const { widthCm, heightCm, paddingXCm = 0.4, paddingYCm = 0.4, gridSizeCm = 0.5 } = presetData;
    const innerWidthCm = widthCm - paddingXCm * 2;
    const innerHeightCm = heightCm - paddingYCm * 2;
    const cols = Math.floor(innerWidthCm / gridSizeCm);
    const rows = Math.floor(innerHeightCm / gridSizeCm);

    // Layouts automáticos baseados no tamanho
    let autoBlocks = {};
    if (preset === "40x20") {
      // Pequeno: apenas qr
      autoBlocks = {
        qr: { x: 0, y: 0, w: 2, h: 2 },
      };
    } else if (preset === "50x30") {
      autoBlocks = {
        id: { x: 0, y: 0, w: 3, h: 1 },
        description: { x: 0, y: 1, w: 3, h: 1 },
        qr: { x: 3, y: 0, w: 2, h: 3 },
        qty: { x: 0, y: 2, w: 2, h: 1 },
        weight: { x: 2, y: 2, w: 2, h: 1 },
      };
    } else if (preset === "60x40") {
      autoBlocks = {
        id: { x: 0, y: 0, w: 4, h: 1 },
        description: { x: 0, y: 1, w: 4, h: 1 },
        qr: { x: 4, y: 0, w: 3, h: 4 },
        qty: { x: 0, y: 2, w: 2, h: 1 },
        weight: { x: 2, y: 2, w: 2, h: 1 },
      };
    } else if (preset === "70x30") {
      autoBlocks = {
        id: { x: 0, y: 0, w: 5, h: 1 },
        description: { x: 0, y: 1, w: 5, h: 1 },
        qr: { x: 5, y: 0, w: 2, h: 3 },
        qty: { x: 0, y: 2, w: 3, h: 1 },
        weight: { x: 3, y: 2, w: 3, h: 1 },
      };
    } else if (preset === "80x50") {
      autoBlocks = {
        id: { x: 0, y: 0, w: 5, h: 1 },
        description: { x: 0, y: 1, w: 5, h: 1 },
        qr: { x: 5, y: 0, w: 3, h: 4 },
        qty: { x: 0, y: 2, w: 3, h: 1 },
        weight: { x: 3, y: 2, w: 3, h: 1 },
        location: { x: 0, y: 3, w: 5, h: 1 },
      };
    } else if (preset === "100x50") {
      autoBlocks = {
        id: { x: 0, y: 0, w: 7, h: 1 },
        description: { x: 0, y: 1, w: 7, h: 1 },
        qr: { x: 7, y: 0, w: 3, h: 4 },
        qty: { x: 0, y: 2, w: 4, h: 1 },
        weight: { x: 4, y: 2, w: 4, h: 1 },
        location: { x: 0, y: 3, w: 7, h: 1 },
      };
    } else if (preset === "100x100") {
      autoBlocks = {
        id: { x: 0, y: 0, w: 6, h: 1 },
        description: { x: 0, y: 1, w: 6, h: 1 },
        qr: { x: 6, y: 0, w: 4, h: 6 },
        qty: { x: 0, y: 2, w: 3, h: 1 },
        weight: { x: 3, y: 2, w: 3, h: 1 },
        location: { x: 0, y: 3, w: 6, h: 1 },
        // Espaço para mais campos
      };
    } else if (preset === "100x150") {
      autoBlocks = {
        id: { x: 0, y: 0, w: 5, h: 1 },
        description: { x: 0, y: 1, w: 5, h: 1 },
        qr: { x: 5, y: 0, w: 5, h: 10 }, // QR maior e separado
        qty: { x: 0, y: 2, w: 3, h: 1 },
        weight: { x: 3, y: 2, w: 2, h: 1 },
        location: { x: 0, y: 3, w: 5, h: 1 },
        // Espaço para cabeçalho/rodapé
      };
    }

    // Aplicar os blocos automáticos ao layout, garantindo blocos para todos os campos enabled
    const allBlocks = {};
    labelFields.forEach((field) => {
      if (field.enabled) {
        allBlocks[field.key] = autoBlocks[field.key] || { x: 0, y: 0, w: 1, h: 1 }; // Bloco padrão se não definido
      }
    });
    setLabelLayout((prev) => ({
      ...prev,
      blocks: { ...prev.blocks, ...allBlocks },
    }));

    // Após definir, ajustar blocos que não cabem
    setTimeout(() => {
      adjustBlocksForSize(preset);
    }, 0);
  };
  const updateLabelSetting = (field, value) => {
    setLabelSettings((prev) => {
      const paddingX = prev.paddingXCm ?? prev.paddingCm;
      const paddingY = prev.paddingYCm ?? prev.paddingCm;
      const innerWidthCm = Math.max(0.5, prev.widthCm - paddingX * 2);
      const innerHeightCm = Math.max(0.5, prev.heightCm - paddingY * 2);
      const next = {
        ...prev,
        preset: "personalizado",
        [field]: value,
      };
      if (field === "headerEnabled" && value) {
        next.headerBoxXcm = 0;
        next.headerBoxYcm = 0;
        next.headerBoxWcm = innerWidthCm;
        next.headerBoxHcm = 1.8;
        next.headerLogoXcm = 0;
        next.headerLogoYcm = 0;
        next.headerLogoWcm = 2.5;
        next.headerLogoHcm = 1.4;
        next.headerRows = Math.max(1, next.headerRows || 2);
      }
      if (field === "footerEnabled" && value) {
        next.footerBoxXcm = 0;
        next.footerBoxYcm = Math.max(0, innerHeightCm - 1.6);
        next.footerBoxWcm = innerWidthCm;
        next.footerBoxHcm = 1.6;
        next.footerLogoXcm = 0;
        next.footerLogoYcm = 0;
        next.footerLogoWcm = 2.2;
        next.footerLogoHcm = 1.2;
        next.footerRows = Math.max(1, next.footerRows || 2);
      }
      if (field === "headerBoxHcm") {
        next.headerBoxYcm = 0;
      }
      if (field === "footerBoxHcm") {
        next.footerBoxYcm = Math.max(0, innerHeightCm - (value || 0));
      }
      return next;
    });
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
  const normalizeGridSizeCm = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0.5;
    return Math.min(2, Math.max(0.2, Math.round(parsed * 10) / 10));
  };
  const getLabelGridMetrics = (gridSizeCm) => {
    const sizeCm = normalizeGridSizeCm(gridSizeCm ?? labelLayout.gridSizeCm);
    const paddingX = labelSettings.paddingXCm ?? labelSettings.paddingCm;
    const paddingY = labelSettings.paddingYCm ?? labelSettings.paddingCm;
    const innerWidthCm = Math.max(0.5, labelSettings.widthCm - paddingX * 2);
    const innerHeightCm = Math.max(0.5, labelSettings.heightCm - paddingY * 2);
    const cols = 3;
    const cellWidthCm = innerWidthCm / cols;
    const maxFontPx = Math.max(
      8,
      labelSettings.fontTitle || 0,
      labelSettings.fontDesc || 0,
      labelSettings.fontMeta || 0,
      labelSettings.fontLabel || 0,
      labelSettings.headerFont || 0,
      labelSettings.footerFont || 0,
      labelSettings.headerFooterFont || 0
    );
    const minRowHeightCm = (maxFontPx * 2.2) / 37.795;
    const rowHeightCm = Math.max(sizeCm, minRowHeightCm);
    const rows = Math.max(1, Math.round(innerHeightCm / rowHeightCm));
    const cellWidthPx = cmToPx(cellWidthCm);
    const rowHeightPx = cmToPx(rowHeightCm);
    return {
      gridSizeCm: sizeCm,
      cols,
      rows,
      cellWidthCm,
      rowHeightCm,
      cellWidthPx,
      rowHeightPx,
      innerWidthCm,
      innerHeightCm,
    };
  };
  const clampBlockToGrid = (block, cols, rows) => {
    const w = Math.max(1, Math.min(cols, Math.round(block.w || 1)));
    const h = Math.max(1, Math.min(rows, Math.round(block.h || 1)));
    const x = Math.max(0, Math.min(cols - w, Math.round(block.x || 0)));
    const y = Math.max(0, Math.min(rows - h, Math.round(block.y || 0)));
    return { x, y, w, h };
  };
  const blocksOverlap = (a, b) =>
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
  const getReservedRects = (metrics) => {
    const canUseHeaderFooterLocal =
      Math.min(labelSettings.widthCm, labelSettings.heightCm) >= 10 &&
      Math.max(labelSettings.widthCm, labelSettings.heightCm) >= 15;
    const rects = [];
    if (canUseHeaderFooterLocal && labelSettings.headerEnabled) {
      const x = Math.max(0, Math.floor(labelSettings.headerBoxXcm / metrics.cellWidthCm));
      const y = Math.max(0, Math.floor(labelSettings.headerBoxYcm / metrics.rowHeightCm));
      const w = Math.max(1, Math.ceil(labelSettings.headerBoxWcm / metrics.cellWidthCm));
      const h = Math.max(1, Math.ceil(labelSettings.headerBoxHcm / metrics.rowHeightCm));
      rects.push({ x, y, w, h });
    }
    if (canUseHeaderFooterLocal && labelSettings.footerEnabled) {
      const x = Math.max(0, Math.floor(labelSettings.footerBoxXcm / metrics.cellWidthCm));
      const y = Math.max(0, Math.floor(labelSettings.footerBoxYcm / metrics.rowHeightCm));
      const w = Math.max(1, Math.ceil(labelSettings.footerBoxWcm / metrics.cellWidthCm));
      const h = Math.max(1, Math.ceil(labelSettings.footerBoxHcm / metrics.rowHeightCm));
      rects.push({ x, y, w, h });
    }
    return rects;
  };
  const overlapsReserved = (block, reserved) =>
    reserved.some((rect) => blocksOverlap(block, rect));
  const findFreeSpotForBlock = (block, blocks, cols, rows, reserved, ignoreKeys = []) => {
    if (!block) return null;
    const maxX = Math.max(0, cols - block.w);
    const maxY = Math.max(0, rows - block.h);
    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= maxX; x += 1) {
        const candidate = { ...block, x, y };
        if (overlapsReserved(candidate, reserved)) continue;
        const collision = Object.entries(blocks).some(([blockKey, other]) => {
          if (!other || ignoreKeys.includes(blockKey)) return false;
          return blocksOverlap(candidate, other);
        });
        if (!collision) return { x, y };
      }
    }
    return null;
  };
  const hasBlockCollision = (nextBlock, blocks, key, reserved = []) => {
    if (!blocks) return false;
    if (overlapsReserved(nextBlock, reserved)) return true;
    return Object.entries(blocks).some(([blockKey, block]) => {
      if (blockKey === key || !block) return false;
      return blocksOverlap(nextBlock, block);
    });
  };
  const getDefaultBlockSize = (key, cols, gridSizeCm) => {
    const cmToCells = (cm) => Math.max(1, Math.round(cm / gridSizeCm));
    if (key === "qr") {
      const size = Math.max(2, cmToCells(labelSettings.qrCm));
      return { w: Math.min(cols, size), h: Math.min(cols, size) };
    }
    if (key === "barcode") {
      return { w: cols, h: Math.max(1, cmToCells(1.6)) };
    }
    if (key === "id") {
      return { w: cols, h: Math.max(2, cmToCells(1)) };
    }
    if (key === "description") {
      return { w: cols, h: Math.max(2, cmToCells(1)) };
    }
    return { w: cols, h: Math.max(1, cmToCells(0.6)) };
  };
  const buildDefaultBlocks = (fields, cols, rows, gridSizeCm, reserved = []) => {
    const blocks = {};
    let cursorY = 0;
    const findFreeSpot = (size, startY = 0) => {
      const maxX = Math.max(0, cols - size.w);
      const maxY = Math.max(0, rows - size.h);
      for (let y = Math.max(0, startY); y <= maxY; y += 1) {
        for (let x = 0; x <= maxX; x += 1) {
          const candidate = { x, y, w: size.w, h: size.h };
          if (overlapsReserved(candidate, reserved)) continue;
          const collision = Object.values(blocks).some((block) =>
            blocksOverlap(candidate, block)
          );
          if (!collision) return candidate;
        }
      }
      return { x: 0, y: maxY, w: size.w, h: size.h };
    };
    fields.forEach((field) => {
      if (field.key === "qr") {
        const size = getDefaultBlockSize("qr", cols, gridSizeCm);
        const centered = {
          x: Math.max(0, Math.floor((cols - size.w) / 2)),
          y: 0,
          w: size.w,
          h: size.h,
        };
        const fallback = findFreeSpot(size, 0) || centered;
        blocks[field.key] = clampBlockToGrid(fallback, cols, rows);
        cursorY = Math.min(rows - 1, centered.h + 1);
      }
    });
    fields
      .filter((field) => !["qr"].includes(field.key))
      .forEach((field) => {
        const size = getDefaultBlockSize(field.key, cols, gridSizeCm);
        const next = findFreeSpot(size, cursorY);
        blocks[field.key] = clampBlockToGrid(next, cols, rows);
        cursorY = Math.min(rows, next.y + size.h + 1);
      });
    return blocks;
  };
  const buildNiceTemplateBlocks = (fields, metrics, reserved = []) => {
    const blocks = {};
    const cols = metrics.cols;
    const rows = metrics.rows;
    const placeBlock = (key, block) => {
      if (!fields.some((field) => field.key === key)) return;
      const clamped = clampBlockToGrid(block, cols, rows);
      if (!overlapsReserved(clamped, reserved) && !hasBlockCollision(clamped, blocks, key, reserved)) {
        blocks[key] = clamped;
        return;
      }
      const spot = findFreeSpotForBlock(clamped, blocks, cols, rows, reserved, [key]);
      blocks[key] = spot ? { ...clamped, ...spot } : clamped;
    };
    const safeTop = reserved.reduce((acc, rect) => Math.max(acc, rect.y + rect.h), 0);
    const safeBottom = reserved.reduce((acc, rect) => Math.min(acc, rect.y), rows);
    const contentTop = Math.min(rows - 1, Math.max(0, safeTop));
    const contentBottom = Math.max(contentTop + 1, Math.min(rows, safeBottom));
    const contentRows = Math.max(1, contentBottom - contentTop);

    const qrW = Math.min(2, cols);
    const qrH = Math.min(5, Math.max(3, Math.round(contentRows * 0.25)));
    const qrX = Math.max(0, Math.floor((cols - qrW) / 2));
    const qrY = contentTop;
    placeBlock("qr", { x: qrX, y: qrY, w: qrW, h: qrH });

    const titleY = Math.min(rows - 1, qrY + qrH + 1);
    placeBlock("id", { x: 0, y: titleY, w: cols, h: 2 });
    placeBlock("description", { x: 0, y: titleY + 2, w: cols, h: 2 });

    const metaY = Math.min(rows - 1, titleY + 4);
    placeBlock("qty", { x: 0, y: metaY, w: 1, h: 1 });
    placeBlock("weight", { x: 1, y: metaY, w: 1, h: 1 });
    placeBlock("location", { x: 2, y: metaY, w: 1, h: 1 });
    placeBlock("barcode", { x: 0, y: Math.min(rows - 1, metaY + 2), w: cols, h: 2 });
    fields
      .filter(
        (field) =>
          !["id", "description", "qr", "barcode", "qty", "weight", "location"].includes(field.key)
      )
      .forEach((field) => {
        const next = findFreeSpotForBlock(
          { x: 0, y: metaY + 1, w: cols, h: 1 },
          blocks,
          cols,
          rows,
          reserved,
          [field.key]
        );
        if (next) {
          blocks[field.key] = { x: next.x, y: next.y, w: cols, h: 1 };
        }
      });
    return blocks;
  };
  const normalizeLabelLayout = (layout, fields) => {
    const safeLayout = layout && typeof layout === "object" ? layout : {};
    const metrics = getLabelGridMetrics(safeLayout.gridSizeCm);
    const reserved = getReservedRects(metrics);
    const blocks = { ...(safeLayout.blocks || {}) };
    const normalizedFields = Array.isArray(fields) ? fields : [];
    const defaults = buildDefaultBlocks(
      normalizedFields,
      metrics.cols,
      metrics.rows,
      metrics.gridSizeCm,
      reserved
    );
    normalizedFields.forEach((field) => {
      const current = blocks[field.key];
      const candidate = clampBlockToGrid(
        current || defaults[field.key],
        metrics.cols,
        metrics.rows
      );
      if (overlapsReserved(candidate, reserved)) {
        const spot = findFreeSpotForBlock(candidate, blocks, metrics.cols, metrics.rows, reserved, [field.key]);
        blocks[field.key] = spot ? { ...candidate, ...spot } : candidate;
      } else {
        blocks[field.key] = candidate;
      }
    });
    return {
      align: safeLayout.align || "center",
      gridSizeCm: metrics.gridSizeCm,
      blocks,
    };
  };
  const updateLabelBlock = (key, patch, options = {}) => {
    const { silent = false, allowSwap = false } = options;
    setLabelLayout((prev) => {
      const metrics = getLabelGridMetrics(prev.gridSizeCm);
      const reserved = getReservedRects(metrics);
      const blocks = { ...(prev.blocks || {}) };
      const current =
        blocks[key] ||
        buildDefaultBlocks(labelFields, metrics.cols, metrics.rows, metrics.gridSizeCm, reserved)[key];
      const next = clampBlockToGrid({ ...current, ...patch }, metrics.cols, metrics.rows);
      // Permitir redimensionamento (w/h) mesmo com colisão, mas não movimento (x/y)
      const isOnlyResize = Object.keys(patch).every(k => k === 'w' || k === 'h');
      if (!isOnlyResize && hasBlockCollision(next, blocks, key, reserved)) {
        if (allowSwap) {
          const collidingKeys = Object.entries(blocks)
            .filter(([blockKey, block]) => blockKey !== key && block && blocksOverlap(next, block))
            .map(([blockKey]) => blockKey);
          if (collidingKeys.length === 1) {
            // Trocar posições diretamente com o bloco conflitante
            const collidedKey = collidingKeys[0];
            const collidedBlock = blocks[collidedKey];
            const currentBlock = blocks[key];
            const nextBlocks = {
              ...blocks,
              [key]: { ...next },
              [collidedKey]: { ...collidedBlock, x: currentBlock.x, y: currentBlock.y }
            };
            return {
              ...prev,
              gridSizeCm: metrics.gridSizeCm,
              blocks: nextBlocks,
            };
          } else {
            // Múltiplas colisões, tentar encontrar spots livres
            const nextBlocks = { ...blocks, [key]: next };
            let resolved = true;
            collidingKeys.forEach((collidedKey) => {
              if (!resolved) return;
              const collidedBlock = nextBlocks[collidedKey];
              const spot = findFreeSpotForBlock(
                collidedBlock,
                nextBlocks,
                metrics.cols,
                metrics.rows,
                reserved,
                [key, collidedKey]
              );
              if (!spot) {
                resolved = false;
                return;
              }
              nextBlocks[collidedKey] = {
                ...collidedBlock,
                x: spot.x,
                y: spot.y,
              };
            });
            if (resolved) {
              return {
                ...prev,
                gridSizeCm: metrics.gridSizeCm,
                blocks: nextBlocks,
              };
            }
          }
        }
        if (!silent) {
          pushMessage("Posicao ocupada por outro bloco.", "error", 1800);
        }
        return prev;
      }
      if (allowSwap) {
        const updatedBlocks = { ...blocks, [key]: next };
        const allKeys = Object.keys(updatedBlocks);
        let moved = true;
        const maxIterations = allKeys.length * 4;
        let iterations = 0;
        while (moved && iterations < maxIterations) {
          moved = false;
          iterations += 1;
          for (let i = 0; i < allKeys.length; i += 1) {
            for (let j = i + 1; j < allKeys.length; j += 1) {
              const keyA = allKeys[i];
              const keyB = allKeys[j];
              const blockA = updatedBlocks[keyA];
              const blockB = updatedBlocks[keyB];
              if (!blockA || !blockB) continue;
              if (blocksOverlap(blockA, blockB)) {
                const spot = findFreeSpotForBlock(
                  blockB,
                  updatedBlocks,
                  metrics.cols,
                  metrics.rows,
                  reserved,
                  [keyA, keyB]
                );
                if (spot) {
                  updatedBlocks[keyB] = { ...blockB, x: spot.x, y: spot.y };
                  moved = true;
                } else {
                  return prev;
                }
              }
            }
          }
        }
        return {
          ...prev,
          gridSizeCm: metrics.gridSizeCm,
          blocks: updatedBlocks,
        };
      }
      return {
        ...prev,
        gridSizeCm: metrics.gridSizeCm,
        blocks: { ...blocks, [key]: next },
      };
    });
  };
  const handleGridPlacement = () => {
    // Click-to-place disabled; drag-and-drop only.
  };
  const handleBlockPointerDown = (event, key) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockKey(key);
    setSelectedHeaderSection(null);
    suppressClickRef.current = true;
    if (!gridRef.current) return;
    gridRef.current.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      key,
      pointerId: event.pointerId,
      rect: gridRef.current.getBoundingClientRect(),
      moved: false,
      lastX: null,
      lastY: null,
    };
    setDraggingBlockKey(key);
  };
  const handleGridPointerMove = (event) => {
    if (!dragStateRef.current) return;
    if (event.pointerId !== dragStateRef.current.pointerId) return;
    const metrics = getLabelGridMetrics(labelLayout.gridSizeCm);
    const rect = dragStateRef.current.rect;
    const x = Math.floor((event.clientX - rect.left) / metrics.cellWidthPx);
    const y = Math.floor((event.clientY - rect.top) / metrics.rowHeightPx);
    if (dragStateRef.current.lastX === x && dragStateRef.current.lastY === y) {
      return;
    }
    dragStateRef.current.lastX = x;
    dragStateRef.current.lastY = y;
    dragStateRef.current.moved = true;
    updateLabelBlock(dragStateRef.current.key, { x, y }, { silent: true, allowSwap: false });
  };
  const handleGridPointerUp = (event) => {
    if (!dragStateRef.current) return;
    if (event.pointerId !== dragStateRef.current.pointerId) return;
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    if (dragStateRef.current.moved) {
      updateLabelBlock(
        dragStateRef.current.key,
        { x: dragStateRef.current.lastX, y: dragStateRef.current.lastY },
        { silent: true, allowSwap: true }
      );
    }
    dragStateRef.current = null;
    setDraggingBlockKey(null);
    if (gridRef.current) {
      gridRef.current.releasePointerCapture(event.pointerId);
    }
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
  const updateLabelFieldAlign = (key, align) => {
    setLabelFields((prev) =>
      prev.map((field) =>
        field.key === key ? { ...field, align: resolveFieldAlign(align, "left") } : field
      )
    );
  };
  const updateLabelFieldHighlightColor = (key, color) => {
    if (!color) return;
    setLabelFields((prev) =>
      prev.map((field) =>
        field.key === key ? { ...field, highlightColor: color } : field
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
  const updateLabelFieldValueSize = (key, value) => {
    const nextValue = Number.isNaN(value) ? 0 : Math.max(0, value);
    setLabelFields((prev) =>
      prev.map((field) =>
        field.key === key ? { ...field, valueFontSize: nextValue } : field
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
          highlightColor: "#e5e7eb",
          boldLabel: true,
          boldValue: false,
          align: "left",
          valueFontSize: null,
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
  // Adicione esta função logo após a função moveLabelField existente
  const reorderLabelFields = (oldIndex, newIndex) => {
    setLabelFields((prev) => {
      const result = [...prev];
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      return result;
    });
  };
  const cmToPx = (cm) => Math.round(cm * 37.795);
  const labelPaddingX = labelSettings.paddingXCm ?? labelSettings.paddingCm;
  const labelPaddingY = labelSettings.paddingYCm ?? labelSettings.paddingCm;
  const innerWidthCm = Math.max(0.5, labelSettings.widthCm - labelPaddingX * 2);
  const innerHeightCm = Math.max(0.5, labelSettings.heightCm - labelPaddingY * 2);

  const labelCount = labelItems.reduce((acc, item) => {
    const count = item.printQty ?? item.qty ?? 1;
    return acc + count;
  }, 0);
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
  const previewBarcodeFallback =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 40' shape-rendering='crispEdges'>" +
    "<rect width='120' height='40' fill='white'/>" +
    "<rect x='4' y='6' width='2' height='28' fill='black'/>" +
    "<rect x='9' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='13' y='6' width='3' height='28' fill='black'/>" +
    "<rect x='19' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='23' y='6' width='2' height='28' fill='black'/>" +
    "<rect x='28' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='32' y='6' width='3' height='28' fill='black'/>" +
    "<rect x='38' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='42' y='6' width='2' height='28' fill='black'/>" +
    "<rect x='47' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='51' y='6' width='3' height='28' fill='black'/>" +
    "<rect x='57' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='61' y='6' width='2' height='28' fill='black'/>" +
    "<rect x='66' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='70' y='6' width='3' height='28' fill='black'/>" +
    "<rect x='76' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='80' y='6' width='2' height='28' fill='black'/>" +
    "<rect x='85' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='89' y='6' width='3' height='28' fill='black'/>" +
    "<rect x='95' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='99' y='6' width='2' height='28' fill='black'/>" +
    "<rect x='104' y='6' width='1' height='28' fill='black'/>" +
    "<rect x='108' y='6' width='3' height='28' fill='black'/>" +
    "</svg>";
  const previewBarcodeSrc = previewBarcode || previewBarcodeFallback;
  const labelContentClass =
    labelLayout.align === "left"
      ? "text-left"
      : labelLayout.align === "right"
      ? "text-right"
      : "text-center";
  const resolvedLayout = normalizeLabelLayout(labelLayout, labelFields);
  const canUseHeaderFooter =
    Math.min(labelSettings.widthCm, labelSettings.heightCm) >= 10 &&
    Math.max(labelSettings.widthCm, labelSettings.heightCm) >= 15;
  useEffect(() => {
    const normalized = normalizeLabelLayout(labelLayout, labelFields);
    const current = JSON.stringify(labelLayout);
    const next = JSON.stringify(normalized);
    if (current !== next) {
      setLabelLayout(normalized);
    }
  }, [
    labelFields,
    labelSettings.widthCm,
    labelSettings.heightCm,
    labelSettings.qrCm,
    labelSettings.paddingCm,
    labelSettings.paddingXCm,
    labelSettings.paddingYCm,
    labelSettings.fontTitle,
    labelSettings.fontDesc,
    labelSettings.fontMeta,
    labelSettings.fontLabel,
    labelSettings.headerFont,
    labelSettings.footerFont,
    labelSettings.headerFooterFont,
    labelLayout.gridSizeCm,
  ]);
  useEffect(() => {
    if (activeMenu !== "label-editor") return;
    setLabelLayout((prev) => {
      if (prev.blocks && Object.keys(prev.blocks).length > 0) return prev;
      const metrics = getLabelGridMetrics(prev.gridSizeCm);
      const reserved = getReservedRects(metrics);
      const blocks = buildNiceTemplateBlocks(labelFields, metrics, reserved);
      return { ...prev, blocks };
    });
  }, [
    activeMenu,
    labelFields,
    labelSettings.widthCm,
    labelSettings.heightCm,
    labelSettings.paddingCm,
    labelSettings.paddingXCm,
    labelSettings.paddingYCm,
    labelSettings.qrCm,
  ]);
  useEffect(() => {
    if (!canUseHeaderFooter) return;
    setLabelSettings((prev) => {
      const paddingX = prev.paddingXCm ?? prev.paddingCm;
      const paddingY = prev.paddingYCm ?? prev.paddingCm;
      const nextInnerWidth = Math.max(0.5, prev.widthCm - paddingX * 2);
      const nextInnerHeight = Math.max(0.5, prev.heightCm - paddingY * 2);
      const metrics = getLabelGridMetrics(prev.gridSizeCm ?? labelLayout.gridSizeCm);
      let changed = false;
      const next = { ...prev };
      if (prev.headerEnabled) {
        if (next.headerBoxWcm !== nextInnerWidth) {
          next.headerBoxWcm = nextInnerWidth;
          changed = true;
        }
        if (next.headerBoxYcm !== 0) {
          next.headerBoxYcm = 0;
          changed = true;
        }
        const headerRows = Math.max(1, prev.headerRows || 2);
        const headerHeight = headerRows * metrics.rowHeightCm;
        if (Math.abs(next.headerBoxHcm - headerHeight) > 0.01) {
          next.headerBoxHcm = headerHeight;
          changed = true;
        }
      }
      if (prev.footerEnabled) {
        if (next.footerBoxWcm !== nextInnerWidth) {
          next.footerBoxWcm = nextInnerWidth;
          changed = true;
        }
        const footerRows = Math.max(1, prev.footerRows || 2);
        const footerHeight = footerRows * metrics.rowHeightCm;
        if (Math.abs(next.footerBoxHcm - footerHeight) > 0.01) {
          next.footerBoxHcm = footerHeight;
          changed = true;
        }
        const nextFooterY = Math.max(0, nextInnerHeight - footerHeight);
        if (next.footerBoxYcm !== nextFooterY) {
          next.footerBoxYcm = nextFooterY;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [
    canUseHeaderFooter,
    labelSettings.widthCm,
    labelSettings.heightCm,
    labelSettings.paddingCm,
    labelSettings.paddingXCm,
    labelSettings.paddingYCm,
    labelSettings.headerEnabled,
    labelSettings.footerEnabled,
    labelSettings.headerBoxHcm,
    labelSettings.footerBoxHcm,
    labelSettings.headerRows,
    labelSettings.footerRows,
  ]);
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
              src={appLogo}
              alt="QtdApp"
              className="h-[180px] w-[180px] sm:h-[240px] sm:w-[240px] object-contain"
            />
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 break-words text-center">
            Usurio: <strong>{userName}</strong>
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
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeMenu === "inventory"
                ? "bg-emerald-500 text-black"
                : "bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/70"
            }`}
            onClick={() => setActiveMenu("inventory")}
          >
            Inventrio
          </button>
          <button
            type="button"
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
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
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
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
      <div className="w-full max-w-none sm:max-w-6xl lg:max-w-7xl mx-auto mb-4 sm:mb-6 flex justify-center">
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

      <main className="w-full max-w-none sm:max-w-6xl lg:max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">

        {isSelecting && !isQrOpen && (
          <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-bold text-emerald-300 mb-2">Catlogo de {inventoryType === "coil" ? "Bobinas" : "Perfis"} ({filteredCatalog.length})</h2>

            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                className="text-xs text-emerald-300 underline hover:text-emerald-200"
                onClick={() => setIsQrOpen((open) => !open)}
              >
                {isQrOpen ? "Fechar leitor QR/Barra" : "Ler QR/Barra"}
              </button>
            </div>

            <input
              className="w-full border border-zinc-800 bg-zinc-900/70 p-2 rounded-lg mb-3 text-zinc-100 placeholder:text-zinc-500"
              placeholder={`Buscar cdigo ou descrio...`}
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
                Ler QR/Barra
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
                  type="text" // Mantemos text para permitir vrgula fcil
                  inputMode="decimal" // Teclado numrico no celular
                  placeholder={inventoryType === "coil" ? "Ex: 1250,5" : "Ex: 50"}
                  className="w-full border border-zinc-800 bg-zinc-900/70 p-3 rounded-xl text-lg text-zinc-100 placeholder:text-zinc-500"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
              </div>

              <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black p-4 rounded-xl shadow font-bold text-lg">CONFIRMAR LANAMENTO</button>
            </form>
          )}
        </div>

      </main>

      {isQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950/90 border border-zinc-800/80 p-4 shadow-2xl sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-emerald-300">Leitor de QR/Barra</h3>
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
                Lanamento OK
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
        <LabelEditor
          labelSettings={labelSettings}
          updateLabelSetting={updateLabelSetting}
          labelLayout={labelLayout}
          updateLabelLayout={updateLabelLayout}
          labelFields={labelFields}
          toggleLabelField={toggleLabelField}
          toggleFieldOption={toggleFieldOption}
          moveLabelField={moveLabelField}
          reorderLabelFields={reorderLabelFields}
          updateLabelFieldTitleSize={updateLabelFieldTitleSize}
          updateLabelBlock={updateLabelBlock}
          addLabelField={addLabelField}
          removeLabelField={removeLabelField}
          labelFieldInput={labelFieldInput}
          setLabelFieldInput={setLabelFieldInput}
          updateCustomFieldValue={updateCustomFieldValue}
          savedLabelLayouts={savedLabelLayouts}
          labelLayoutName={labelLayoutName}
          setLabelLayoutName={setLabelLayoutName}
          handleSaveLabelLayout={handleSaveLabelLayout}
          selectedSavedLayoutId={selectedSavedLayoutId}
          setSelectedSavedLayoutId={setSelectedSavedLayoutId}
          handleLoadSavedLayout={handleLoadSavedLayout}
          handleDeleteSavedLayout={handleDeleteSavedLayout}
          formatSavedLayoutLabel={formatSavedLayoutLabel}
          labelItems={labelItems}
          previewQrSrc={previewQrSrc}
          previewBarcodeSrc={previewBarcodeSrc}
          renderLabelLayout={renderLabelLayout}
          previewLabelStyle={previewLabelStyle}
          showGuides={showGuides}
          setShowGuides={setShowGuides}
          selectedBlockKey={selectedBlockKey}
          setSelectedBlockKey={setSelectedBlockKey}
          gridRef={gridRef}
          handleGridPointerMove={handleGridPointerMove}
          handleGridPointerUp={handleGridPointerUp}
          handleBlockPointerDown={handleBlockPointerDown}
          showPrintPreview={showPrintPreview}
          setShowPrintPreview={setShowPrintPreview}
          handleLogoUpload={handleLogoUpload}
          canUseHeaderFooter={canUseHeaderFooter}
          resolvedLayout={resolvedLayout}
          applyLabelPreset={applyLabelPreset}
          removedBlocks={removedBlocks}
          setRemovedBlocks={setRemovedBlocks}
        />
      )}

      {activeMenu === "inventory" && (
      <section className="w-full max-w-none sm:max-w-6xl lg:max-w-7xl mx-auto mt-6 sm:mt-8 bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-emerald-300 text-lg">Histrico de Lanamentos</h2>

          <button
            onClick={handleExport}
            className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-sm hover:bg-emerald-400"
          >
            Exportar CSV
          </button>
        </div>

        {!inventoryLaunches.length ? (
          <p className="text-zinc-400 text-center py-4 bg-zinc-900/60 border border-zinc-800 rounded-lg">Nenhum lanamento realizado ainda.</p>
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
      <section className="w-full max-w-none sm:max-w-6xl lg:max-w-7xl mx-auto mt-6 sm:mt-8 bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
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
                  <option value="medio">Mdio (6x4cm)</option>
                  <option value="grande">Grande (8x5cm)</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 mb-4">
              <p className="text-xs text-zinc-400 mb-2">Salvar lote no Firebase</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  className="flex-1 min-w-[180px] bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                  placeholder="Nome do lote (opcional)"
                  value={labelBatchName}
                  onChange={(e) => setLabelBatchName(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-emerald-500/90 text-black px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-400"
                  onClick={handleSaveLabelBatch}
                >
                  Salvar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={selectedSavedBatchId}
                  onChange={(e) => setSelectedSavedBatchId(e.target.value)}
                  className="flex-1 min-w-[200px] bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-2"
                >
                  <option value="">Carregar lote salvo</option>
                  {savedLabelBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {formatSavedBatchLabel(batch)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-lg text-xs font-semibold"
                  onClick={() => handleLoadSavedBatch(selectedSavedBatchId)}
                  disabled={!selectedSavedBatchId}
                >
                  Carregar
                </button>
                <button
                  type="button"
                  className="border border-rose-700/70 text-rose-200 bg-rose-900/20 hover:bg-rose-900/40 px-3 py-2 rounded-lg text-xs font-semibold"
                  onClick={() => handleDeleteSavedBatch(selectedSavedBatchId)}
                  disabled={!selectedSavedBatchId}
                >
                  Excluir
                </button>
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
                          className="w-24 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                          placeholder="Quantidade"
                          value={item.qty || ""}
                          onChange={(e) =>
                            updateLabelField(item.id, "qty", e.target.value)
                          }
                        />
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
                        {batchExtraFields.map((field) => (
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
                        value={item.printQty ?? item.qty ?? 1}
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
                Visualizar impresso
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
                    className="rounded-xl border border-zinc-300 bg-white p-3 text-center"
                    style={previewLabelStyle}
                  >
                    {renderLabelLayout(item, qrCache[item.id] || previewQrFallback, barcodeCache[item.id] || previewBarcodeFallback)}
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
              {renderLabelLayout(item, qrCache[item.id], barcodeCache[item.id])}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default App;

























