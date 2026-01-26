import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs } from './mockPersistence';
import { 
  collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, doc, getDoc
} from 'firebase/firestore';

const SCHEMA_COLLECTION = 'schemas';

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
      nextVersion = querySnapshot.docs[0].data().version + 1;
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

export const getLatestSchemas = async (tenantId) => {
  if (isLocalhost()) {
    return await mockGetDocs(SCHEMA_COLLECTION, [{ field: 'tenantId', value: tenantId }, { field: 'active', value: true }]);
  }

  try {
    const q = query(
      collection(db, SCHEMA_COLLECTION),
      where('tenantId', '==', tenantId),
      where('active', '==', true),
      orderBy('version', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const schemas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const latestOnly = [];
    const seenNames = new Set();
    
    for (const s of schemas) {
      if (!seenNames.has(s.name)) {
        latestOnly.push(s);
        seenNames.add(s.name);
      }
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
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const schemas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return schemas[0] || null;
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
