import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs, mockUpdateDoc, mockDeleteDoc } from './mockPersistence';
import { getDocsWithPagination } from './pagination';
import { 
  collection, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, runTransaction, increment
} from 'firebase/firestore';

const STOCK_POINT_COLLECTION = 'stockPoints';
const ORG_COLLECTION = 'organizations';

export const createStockPoint = async (tenantId, name) => {
  const newStockPoint = {
    tenantId,
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (isLocalhost()) {
    const saved = await mockAddDoc(STOCK_POINT_COLLECTION, { ...newStockPoint, createdAt: new Date() });
    const orgs = await mockGetDocs(ORG_COLLECTION);
    const org = orgs.find((item) => item.id === tenantId);
    if (org) {
      const current = org.stockPointsUsed || 0;
      await mockUpdateDoc(ORG_COLLECTION, tenantId, { stockPointsUsed: current + 1 });
    }
    return saved;
  }

  try {
    const orgRef = doc(db, ORG_COLLECTION, tenantId);
    const stockPointRef = doc(collection(db, STOCK_POINT_COLLECTION));
    await runTransaction(db, async (tx) => {
      const orgSnap = await tx.get(orgRef);
      if (!orgSnap.exists()) {
        throw new Error('Organização não encontrada.');
      }
      tx.set(stockPointRef, newStockPoint);
      tx.update(orgRef, { stockPointsUsed: increment(1), updatedAt: serverTimestamp() });
    });
    return { id: stockPointRef.id, ...newStockPoint };
  } catch (error) {
    console.error("Erro ao criar ponto de estocagem:", error);
    throw error;
  }
};

export const getStockPointsByTenant = async (tenantId, options = {}) => {
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
    
    const { docs, cursor } = await getDocsWithPagination(q, options);
    const stockPoints = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (options.fetchAll === false) {
      return { stockPoints, cursor };
    }
    return stockPoints;
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
    const stockPointRef = doc(db, STOCK_POINT_COLLECTION, stockPointId);
    await runTransaction(db, async (tx) => {
      const stockPointSnap = await tx.get(stockPointRef);
      if (!stockPointSnap.exists()) {
        return;
      }
      const tenantId = stockPointSnap.data()?.tenantId;
      tx.delete(stockPointRef);
      if (tenantId) {
        const orgRef = doc(db, ORG_COLLECTION, tenantId);
        const orgSnap = await tx.get(orgRef);
        if (orgSnap.exists()) {
          const current = orgSnap.data()?.stockPointsUsed ?? 0;
          tx.update(orgRef, { stockPointsUsed: Math.max(0, current - 1), updatedAt: serverTimestamp() });
        }
      }
    });
    return true;
  } catch (error) {
    console.error("Erro ao excluir ponto de estocagem:", error);
    throw error;
  }
};
