import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs, mockUpdateDoc, mockDeleteDoc } from './mockPersistence';
import { 
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

const STOCK_POINT_COLLECTION = 'stockPoints';

export const createStockPoint = async (tenantId, name) => {
  const newStockPoint = {
    tenantId,
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (isLocalhost()) {
    return await mockAddDoc(STOCK_POINT_COLLECTION, { ...newStockPoint, createdAt: new Date() });
  }

  try {
    const docRef = await addDoc(collection(db, STOCK_POINT_COLLECTION), newStockPoint);
    return { id: docRef.id, ...newStockPoint };
  } catch (error) {
    console.error("Erro ao criar ponto de estocagem:", error);
    throw error;
  }
};

export const getStockPointsByTenant = async (tenantId) => {
  if (isLocalhost()) {
    return await mockGetDocs(STOCK_POINT_COLLECTION, [
      { field: 'tenantId', value: tenantId }
    ]);
  }

  try {
    const q = query(
      collection(db, STOCK_POINT_COLLECTION),
      where('tenantId', '==', tenantId),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar pontos de estocagem:", error);
    throw error;
  }
};

export const updateStockPoint = async (stockPointId, updates) => {
  if (isLocalhost()) {
    return await mockUpdateDoc(STOCK_POINT_COLLECTION, stockPointId, { ...updates, updatedAt: new Date() });
  }

  try {
    const docRef = doc(db, STOCK_POINT_COLLECTION, stockPointId);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    return { id: stockPointId, ...updates };
  } catch (error) {
    console.error("Erro ao atualizar ponto de estocagem:", error);
    throw error;
  }
};

export const deleteStockPoint = async (stockPointId) => {
  if (isLocalhost()) {
    return await mockDeleteDoc(STOCK_POINT_COLLECTION, stockPointId);
  }

  try {
    const docRef = doc(db, STOCK_POINT_COLLECTION, stockPointId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Erro ao excluir ponto de estocagem:", error);
    throw error;
  }
};
