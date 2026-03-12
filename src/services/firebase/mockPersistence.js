/**
 * Utilitario para simular o Firestore em Localhost.
 */

import { buildDefaultTemplate } from '../../core/defaultTemplate';
import localDemoInventory from '../../data/localDemoInventory.json';

export const isLocalhost = () => {
  // Allow forcing real Firebase even on localhost via env flag.
  if (import.meta.env.VITE_USE_FIREBASE_LOCAL === 'true') {
    return false;
  }
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')
  );
};

const STORAGE_KEY = 'label_pro_mock_db';
const DEMO_SEED_VERSION = 2;
export const LOCAL_DEMO_ORG_ID = 'demo-local-org';
export const LOCAL_DEMO_USER_ID = 'demo-local-user';

const EMPTY_DB = {
  organizations: [],
  schemas: [],
  items: [],
  templates: [],
  stockPoints: [],
  stock_adjustments: [],
};

const createLocalTimestamp = (dateString) => ({
  toDate: () => new Date(dateString),
  toMillis: () => new Date(dateString).getTime(),
});

const createSchema = (id, stockPointId, stockPointName) => ({
  id,
  tenantId: LOCAL_DEMO_ORG_ID,
  stockPointId,
  version: 1,
  active: true,
  name: `Itens - ${stockPointName}`,
  fields: [
    { key: 'codigo', label: 'Codigo', type: 'text', required: true },
    { key: 'descricao', label: 'Descricao', type: 'text', required: false },
    { key: 'quantidade', label: 'Qtd', type: 'number', required: false },
    { key: 'estoque_minimo', label: 'Estoque Minimo', type: 'number', required: false },
    { key: 'categoria', label: 'Categoria', type: 'text', required: false },
    { key: 'rua', label: 'Rua', type: 'text', required: false },
  ],
  sampleData: {
    codigo: 'CABO-001',
    descricao: 'Cabo de cobre 2,5 mm',
    quantidade: 120,
    estoque_minimo: 25,
    categoria: 'Eletrica',
    rua: 'A1',
  },
  createdAt: createLocalTimestamp('2026-03-01T08:00:00.000Z'),
});

const createItem = (id, schemaId, stockPointId, date, data) => ({
  id,
  tenantId: LOCAL_DEMO_ORG_ID,
  schemaId,
  schemaVersion: 1,
  stockPointId,
  data,
  createdAt: createLocalTimestamp(date),
  updatedAt: createLocalTimestamp(date),
});

const schemaIdByStockPoint = {
  'demo-sp-1': 'demo-schema-1',
  'demo-sp-2': 'demo-schema-2',
  'demo-sp-3': 'demo-schema-3',
};

const createAdjustment = (id, schemaId, itemId, stockPointId, date, previousQty, newQty, type, notes) => ({
  id,
  tenantId: LOCAL_DEMO_ORG_ID,
  schemaId,
  itemId,
  stockPointId,
  previousQty,
  newQty,
  difference: newQty - previousQty,
  type,
  notes,
  timestamp: date,
  createdAt: createLocalTimestamp(date),
});

const createDemoDb = () => {
  const stockPoints = [
    {
      id: 'demo-sp-1',
      tenantId: LOCAL_DEMO_ORG_ID,
      name: 'CD Principal',
      createdAt: createLocalTimestamp('2026-03-01T08:00:00.000Z'),
      updatedAt: createLocalTimestamp('2026-03-01T08:00:00.000Z'),
    },
    {
      id: 'demo-sp-2',
      tenantId: LOCAL_DEMO_ORG_ID,
      name: 'Loja Centro',
      createdAt: createLocalTimestamp('2026-03-01T08:05:00.000Z'),
      updatedAt: createLocalTimestamp('2026-03-01T08:05:00.000Z'),
    },
    {
      id: 'demo-sp-3',
      tenantId: LOCAL_DEMO_ORG_ID,
      name: 'Obra Alpha',
      createdAt: createLocalTimestamp('2026-03-01T08:10:00.000Z'),
      updatedAt: createLocalTimestamp('2026-03-01T08:10:00.000Z'),
    },
  ];

  const schemas = [
    createSchema('demo-schema-1', 'demo-sp-1', 'CD Principal'),
    createSchema('demo-schema-2', 'demo-sp-2', 'Loja Centro'),
    createSchema('demo-schema-3', 'demo-sp-3', 'Obra Alpha'),
  ];

  const items = localDemoInventory.map((entry) =>
    createItem(
      entry.id,
      schemaIdByStockPoint[entry.stockPointId],
      entry.stockPointId,
      entry.date,
      {
        codigo: entry.codigo,
        descricao: entry.descricao,
        quantidade: entry.quantidade,
        estoque_minimo: entry.estoque_minimo,
        categoria: entry.categoria,
        rua: entry.rua,
      }
    )
  );

  const templates = schemas.map((schema, index) => ({
    id: `demo-template-${index + 1}`,
    tenantId: LOCAL_DEMO_ORG_ID,
    schemaId: schema.id,
    schemaVersion: 1,
    stockPointId: schema.stockPointId,
    ...buildDefaultTemplate(schema),
    createdAt: createLocalTimestamp(`2026-03-0${index + 2}T12:00:00.000Z`),
    updatedAt: createLocalTimestamp(`2026-03-0${index + 2}T12:00:00.000Z`),
  }));

  const stock_adjustments = [
    createAdjustment('demo-adj-1', 'demo-schema-1', 'demo-item-1', 'demo-sp-1', '2026-03-10T13:20:00.000Z', 160, 180, 'entry', 'Reposicao do fornecedor'),
    createAdjustment('demo-adj-2', 'demo-schema-1', 'demo-item-3', 'demo-sp-1', '2026-03-10T15:40:00.000Z', 14, 9, 'saida', 'Separacao para pedido urgente'),
    createAdjustment('demo-adj-3', 'demo-schema-2', 'demo-item-4', 'demo-sp-2', '2026-03-11T09:10:00.000Z', 42, 37, 'saida', 'Venda no balcao'),
    createAdjustment('demo-adj-4', 'demo-schema-3', 'demo-item-7', 'demo-sp-3', '2026-03-11T11:25:00.000Z', 40, 52, 'entry', 'Recebimento da obra'),
    createAdjustment('demo-adj-5', 'demo-schema-2', 'demo-item-13', 'demo-sp-2', '2026-03-11T17:05:00.000Z', 12, 0, 'saida', 'Consumo total da frente de servico'),
    createAdjustment('demo-adj-6', 'demo-schema-1', 'demo-item-7', 'demo-sp-1', '2026-03-11T18:00:00.000Z', 250, 210, 'saida', 'Expedicao para filial'),
    createAdjustment('demo-adj-7', 'demo-schema-2', 'demo-item-18', 'demo-sp-2', '2026-03-12T08:15:00.000Z', 70, 95, 'entry', 'Compra reposicao revestimento'),
    createAdjustment('demo-adj-8', 'demo-schema-3', 'demo-item-22', 'demo-sp-3', '2026-03-12T09:05:00.000Z', 20, 14, 'saida', 'Aplicacao em campo'),
  ];

  return {
    ...EMPTY_DB,
    __meta: { demoSeedVersion: DEMO_SEED_VERSION },
    organizations: [
      {
        id: LOCAL_DEMO_ORG_ID,
        name: 'QtdApp Demo Local',
        planId: 'business',
        status: 'active',
        seatsPurchased: 10,
        seatsUsed: 3,
        stockPointsUsed: stockPoints.length,
        templatesUsed: templates.length,
        ownerId: LOCAL_DEMO_USER_ID,
        createdAt: createLocalTimestamp('2026-03-01T08:00:00.000Z'),
        updatedAt: createLocalTimestamp('2026-03-01T08:00:00.000Z'),
      },
    ],
    schemas,
    items,
    templates,
    stockPoints,
    stock_adjustments,
  };
};

const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { ...EMPTY_DB };
};

const saveDb = (db) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

const mergeById = (existing = [], incoming = []) => {
  const merged = [...existing];
  incoming.forEach((entry) => {
    if (!merged.some((current) => current?.id === entry?.id)) {
      merged.push(entry);
    }
  });
  return merged;
};

export const ensureLocalDemoData = () => {
  if (!isLocalhost() || typeof window === 'undefined') return null;

  const currentDb = getDb();
  const demoDb = createDemoDb();
  const alreadySeeded = currentDb?.__meta?.demoSeedVersion === DEMO_SEED_VERSION;
  const hasDemoData =
    Array.isArray(currentDb.stockPoints) && currentDb.stockPoints.some((entry) => entry?.tenantId === LOCAL_DEMO_ORG_ID) &&
    Array.isArray(currentDb.items) && currentDb.items.some((entry) => entry?.tenantId === LOCAL_DEMO_ORG_ID) &&
    Array.isArray(currentDb.schemas) && currentDb.schemas.some((entry) => entry?.tenantId === LOCAL_DEMO_ORG_ID);

  if (alreadySeeded && hasDemoData) {
    return currentDb;
  }

  const upgradedDb = {
    ...EMPTY_DB,
    ...currentDb,
    organizations: mergeById(currentDb.organizations, demoDb.organizations),
    schemas: mergeById(currentDb.schemas, demoDb.schemas),
    items: mergeById(currentDb.items, demoDb.items),
    templates: mergeById(currentDb.templates, demoDb.templates),
    stockPoints: mergeById(currentDb.stockPoints, demoDb.stockPoints),
    stock_adjustments: mergeById(currentDb.stock_adjustments, demoDb.stock_adjustments),
    __meta: { ...(currentDb.__meta || {}), demoSeedVersion: DEMO_SEED_VERSION },
  };
  saveDb(upgradedDb);

  try {
    const selectedPointKey = `qtdapp_sp_${LOCAL_DEMO_ORG_ID}`;
    if (!localStorage.getItem(selectedPointKey)) {
      localStorage.setItem(selectedPointKey, 'demo-sp-1');
    }
  } catch {
    // noop
  }

  return upgradedDb;
};

export const mockAddDoc = async (collectionName, data) => {
  console.log(`[MOCK] Adicionando ao ${collectionName}:`, data);
  const db = getDb();
  const newDoc = {
    ...data,
    id: `mock_${Date.now()}`,
    createdAt: { toDate: () => new Date() },
  };
  if (!db[collectionName]) {
    db[collectionName] = [];
  }
  db[collectionName].push(newDoc);
  saveDb(db);
  return newDoc;
};

export const mockGetDocs = async (collectionName, filters = []) => {
  console.log(`[MOCK] Buscando de ${collectionName}`);
  const db = getDb();
  let results = db[collectionName] || [];

  filters.forEach((f) => {
    if (f.field === 'tenantId') results = results.filter((r) => r.tenantId === f.value);
    if (f.field === 'schemaId') results = results.filter((r) => r.schemaId === f.value);
    if (f.field === 'stockPointId') results = results.filter((r) => r.stockPointId === f.value);
    if (f.field === 'active') results = results.filter((r) => r.active === f.value);
  });

  return results;
};

export const mockUpdateDoc = async (collectionName, docId, updates) => {
  console.log(`[MOCK] Atualizando ${collectionName}/${docId}:`, updates);
  const db = getDb();
  const collection = db[collectionName] || [];
  const index = collection.findIndex((doc) => doc.id === docId);

  if (index !== -1) {
    collection[index] = { ...collection[index], ...updates };
    saveDb(db);
    return collection[index];
  }

  console.warn(`[MOCK] Documento ${docId} nao encontrado para atualizacao.`);
  return null;
};

export const mockDeleteDoc = async (collectionName, docId) => {
  console.log(`[MOCK] Deletando ${collectionName}/${docId}`);
  const db = getDb();
  const collection = db[collectionName] || [];
  const initialLength = collection.length;

  db[collectionName] = collection.filter((doc) => doc.id !== docId);
  saveDb(db);

  return db[collectionName].length < initialLength;
};
