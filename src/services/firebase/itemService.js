import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs } from './mockPersistence';
import { getDocsWithPagination } from './pagination';
import { 
  collection, addDoc, query, where, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, orderBy
} from 'firebase/firestore';

const ITEM_COLLECTION = 'items';

export const createItem = async (tenantId, schemaId, schemaVersion, itemData, stockPointId = null) => {
  if (isLocalhost()) {
    return await mockAddDoc(ITEM_COLLECTION, { tenantId, schemaId, schemaVersion, stockPointId, data: itemData });
  }

  try {
    const newItem = {
      tenantId,
      schemaId,
      schemaVersion,
      data: itemData,
      stockPointId: stockPointId ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, ITEM_COLLECTION), newItem);
    return { id: docRef.id, ...newItem };
  } catch (error) {
    console.error("Erro ao criar item:", error);
    throw error;
  }
};

export const getItemsBySchema = async (tenantId, schemaId, options = {}) => {
  if (isLocalhost()) {
    return await mockGetDocs(ITEM_COLLECTION, [
      { field: 'tenantId', value: tenantId },
      { field: 'schemaId', value: schemaId }
    ]);
  }

  try {
    const q = query(
      collection(db, ITEM_COLLECTION),
      where('tenantId', '==', tenantId),
      where('schemaId', '==', schemaId),
      orderBy('createdAt', 'desc')
    );
    
    const { docs, cursor } = await getDocsWithPagination(q, options);
    const items = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (options.fetchAll === false) {
      return { items, cursor };
    }
    return items;
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    throw error;
  }
};

export const getItemsByStockPoint = async (tenantId, stockPointId, options = {}) => {
  if (isLocalhost()) {
    return await mockGetDocs(ITEM_COLLECTION, [
      { field: 'tenantId', value: tenantId },
      { field: 'stockPointId', value: stockPointId }
    ]);
  }

  try {
    const q = query(
      collection(db, ITEM_COLLECTION),
      where('tenantId', '==', tenantId),
      where('stockPointId', '==', stockPointId),
      orderBy('createdAt', 'desc')
    );
    
    const { docs, cursor } = await getDocsWithPagination(q, options);
    const items = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (options.fetchAll === false) {
      return { items, cursor };
    }
    return items;
  } catch (error) {
    console.error("Erro ao buscar itens por ponto de estocagem:", error);
    throw error;
  }
};

export const createItemsBulk = async (tenantId, schemaId, schemaVersion, stockPointId, itemsData) => {
  if (isLocalhost()) {
    const created = [];
    for (const itemData of itemsData) {
      const item = await createItem(tenantId, schemaId, schemaVersion, itemData, stockPointId);
      created.push(item);
    }
    return created;
  }

  const created = [];
  const chunkSize = 450;
  for (let i = 0; i < itemsData.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = itemsData.slice(i, i + chunkSize);
    const pending = [];

    slice.forEach((itemData) => {
      const docRef = doc(collection(db, ITEM_COLLECTION));
      const payload = {
        tenantId,
        schemaId,
        schemaVersion,
        data: itemData,
        stockPointId: stockPointId ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      batch.set(docRef, payload);
      pending.push({ id: docRef.id, ...payload });
    });

    await batch.commit();
    created.push(...pending);
  }

  return created;
};

export const updateItem = async (itemId, itemData) => {
  if (isLocalhost()) return true; // Mock simplificado
  const docRef = doc(db, ITEM_COLLECTION, itemId);
  await updateDoc(docRef, { data: itemData, updatedAt: serverTimestamp() });
  return true;
};

export const deleteItem = async (itemId) => {
  if (isLocalhost()) return true; // Mock simplificado
  const docRef = doc(db, ITEM_COLLECTION, itemId);
  await deleteDoc(docRef);
  return true;
};


