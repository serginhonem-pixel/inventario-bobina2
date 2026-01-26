import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs } from './mockPersistence';
import { 
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

const ITEM_COLLECTION = 'items';

export const createItem = async (tenantId, schemaId, schemaVersion, itemData) => {
  if (isLocalhost()) {
    return await mockAddDoc(ITEM_COLLECTION, { tenantId, schemaId, schemaVersion, data: itemData });
  }

  try {
    const newItem = {
      tenantId,
      schemaId,
      schemaVersion,
      data: itemData,
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

export const getItemsBySchema = async (tenantId, schemaId) => {
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
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    throw error;
  }
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
