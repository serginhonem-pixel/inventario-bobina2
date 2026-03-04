import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs } from './mockPersistence';
import { getDocsWithPagination } from './pagination';
import { 
  collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc, orderBy, limit
} from 'firebase/firestore';

const SCHEMA_COLLECTION = 'schemas';

const isMissingIndexError = (error) =>
  error?.code === 'failed-precondition'
  || /requires an index/i.test(error?.message || '');

export const saveSchema = async (tenantId, schemaData, stockPointId = null) => {
  if (isLocalhost()) {
    return await mockAddDoc(SCHEMA_COLLECTION, { ...schemaData, tenantId, stockPointId, version: 1, active: true });
  }

  try {
    let querySnapshot;
    try {
      const q = query(
        collection(db, SCHEMA_COLLECTION),
        where('tenantId', '==', tenantId),
        where('name', '==', schemaData.name),
        orderBy('version', 'desc'),
        limit(1)
      );
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;
      const fallbackQ = query(
        collection(db, SCHEMA_COLLECTION),
        where('tenantId', '==', tenantId),
        where('name', '==', schemaData.name)
      );
      querySnapshot = await getDocs(fallbackQ);
    }

    const docs = [...querySnapshot.docs].sort((a, b) => {
      const av = a.data()?.version || 0;
      const bv = b.data()?.version || 0;
      return bv - av;
    });
    let nextVersion = 1;
    if (docs.length > 0) {
      const latest = docs[0].data();
      const currentVersion = latest?.version || 1;
      nextVersion = currentVersion + 1;
    }

    const newSchema = {
      ...schemaData,
      tenantId,
      stockPointId,
      version: nextVersion,
      active: true,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, SCHEMA_COLLECTION), newSchema);
    return { id: docRef.id, ...newSchema };
  } catch (error) {
    console.error("Erro ao salvar schema:", error);
    throw error;
  }
};

export const getLatestSchemas = async (tenantId, options = {}) => {
  if (isLocalhost()) {
    return await mockGetDocs(SCHEMA_COLLECTION, [{ field: 'tenantId', value: tenantId }, { field: 'active', value: true }]);
  }

  try {
    let schemas = [];
    let cursor = null;

    try {
      const q = query(
        collection(db, SCHEMA_COLLECTION),
        where('tenantId', '==', tenantId),
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );

      const result = await getDocsWithPagination(q, options);
      schemas = result.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cursor = result.cursor;
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;
      const fallbackQ = query(
        collection(db, SCHEMA_COLLECTION),
        where('tenantId', '==', tenantId),
        where('active', '==', true)
      );
      const snapshot = await getDocs(fallbackQ);
      schemas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      schemas.sort((a, b) => {
        const aMs = a?.createdAt?.toMillis?.() || 0;
        const bMs = b?.createdAt?.toMillis?.() || 0;
        return bMs - aMs;
      });
    }
    
    const latestOnly = [];
    const seenNames = new Set();
    
    const sortedByVersion = [...schemas].sort((a, b) => (b.version || 0) - (a.version || 0));
    for (const s of sortedByVersion) {
      if (!seenNames.has(s.name)) {
        latestOnly.push(s);
        seenNames.add(s.name);
      }
    }
    
    if (options.fetchAll === false) {
      return { schemas: latestOnly, cursor };
    }
    return latestOnly;
  } catch (error) {
    console.error("Erro ao buscar schemas:", error);
    throw error;
  }
};

export const getSchemaByStockPoint = async (tenantId, stockPointId) => {
  if (isLocalhost()) {
    const all = await mockGetDocs(SCHEMA_COLLECTION, [
      { field: 'tenantId', value: tenantId },
      { field: 'stockPointId', value: stockPointId }
    ]);
    return all[0] || null;
  }

  try {
    let docs = [];
    try {
      const q = query(
        collection(db, SCHEMA_COLLECTION),
        where('tenantId', '==', tenantId),
        where('stockPointId', '==', stockPointId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      docs = querySnapshot.docs;
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;
      const fallbackQ = query(
        collection(db, SCHEMA_COLLECTION),
        where('tenantId', '==', tenantId),
        where('stockPointId', '==', stockPointId)
      );
      const snapshot = await getDocs(fallbackQ);
      docs = snapshot.docs.sort((a, b) => {
        const aMs = a.data()?.createdAt?.toMillis?.() || 0;
        const bMs = b.data()?.createdAt?.toMillis?.() || 0;
        return bMs - aMs;
      }).slice(0, 1);
    }

    if (!docs.length) return null;
    const schema = docs[0];
    return { id: schema.id, ...schema.data() };
  } catch (error) {
    console.error("Erro ao buscar schema por ponto de estocagem:", error);
    return null;
  }
};

export const getSchemaById = async (schemaId) => {
  if (isLocalhost()) {
    const all = await mockGetDocs(SCHEMA_COLLECTION);
    return all.find(s => s.id === schemaId);
  }
  const docRef = doc(db, SCHEMA_COLLECTION, schemaId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};
