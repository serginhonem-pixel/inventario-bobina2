/**
 * Utilitário para simular o Firestore em Localhost
 */

export const isLocalhost = () => {
  return (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')
  );
};

const STORAGE_KEY = 'label_pro_mock_db';

const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { schemas: [], items: [], templates: [], stockPoints: [], stock_adjustments: [] };
};

const saveDb = (db) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const mockAddDoc = async (collectionName, data) => {
  console.log(`[MOCK] Adicionando ao ${collectionName}:`, data);
  const db = getDb();
  const newDoc = { 
    ...data, 
    id: `mock_${Date.now()}`,
    createdAt: { toDate: () => new Date() } // Simula timestamp do Firebase
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
  
  // Simulacao basica de filtros (tenantId, schemaId, stockPointId)
  filters.forEach(f => {
    if (f.field === 'tenantId') results = results.filter(r => r.tenantId === f.value);
    if (f.field === 'schemaId') results = results.filter(r => r.schemaId === f.value);
    if (f.field === 'stockPointId') results = results.filter(r => r.stockPointId === f.value);
    if (f.field === 'active') results = results.filter(r => r.active === f.value);
  });

  return results;
};

export const mockUpdateDoc = async (collectionName, docId, updates) => {
  console.log(`[MOCK] Atualizando ${collectionName}/${docId}:`, updates);
  const db = getDb();
  const collection = db[collectionName] || [];
  const index = collection.findIndex(doc => doc.id === docId);

  if (index !== -1) {
    collection[index] = { ...collection[index], ...updates };
    saveDb(db);
    return collection[index];
  }
  
  console.warn(`[MOCK] Documento ${docId} não encontrado para atualização.`);
  return null;
};

export const mockDeleteDoc = async (collectionName, docId) => {
  console.log(`[MOCK] Deletando ${collectionName}/${docId}`);
  const db = getDb();
  const collection = db[collectionName] || [];
  const initialLength = collection.length;
  
  db[collectionName] = collection.filter(doc => doc.id !== docId);
  saveDb(db);
  
  return db[collectionName].length < initialLength;
};
