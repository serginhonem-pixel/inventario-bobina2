import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs } from './mockPersistence';
import { getDocsWithPagination } from './pagination';
import { 
  collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc, orderBy, limit
} from 'firebase/firestore';

const SCHEMA_COLLECTION = 'schemas';

const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
};

export const saveSchema = async (tenantId, schemaData, stockPointId = null) => {
  if (isLocalhost()) {
    return await mockAddDoc(SCHEMA_COLLECTION, { ...schemaData, tenantId, stockPointId, version: 1, active: true });
  }

  try {
    const q = query(
      collection(db, SCHEMA_COLLECTION),
      where('tenantId', '==', tenantId),
      where('name', '==', schemaData.name),
      orderBy('version', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    let nextVersion = 1;
    if (!querySnapshot.empty) {
      const latest = querySnapshot.docs[0].data();
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
    const q = query(
      collection(db, SCHEMA_COLLECTION),
      where('tenantId', '==', tenantId),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const { docs, cursor } = await getDocsWithPagination(q, options);
    const schemas = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
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
    const q = query(
      collection(db, SCHEMA_COLLECTION),
      where('tenantId', '==', tenantId),
      where('stockPointId', '==', stockPointId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const schema = querySnapshot.docs[0];
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
