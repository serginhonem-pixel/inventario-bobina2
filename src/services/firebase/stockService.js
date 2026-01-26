import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs } from './mockPersistence';
import { 
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';

const STOCK_COLLECTION = 'stock_adjustments';

export const saveAdjustment = async (tenantId, schemaId, itemId, stockPointId, adjustmentData) => {
  if (isLocalhost()) {
    return await mockAddDoc(STOCK_COLLECTION, { 
      tenantId, 
      schemaId, 
      itemId, 
      stockPointId,
      ...adjustmentData,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const newAdjustment = {
      tenantId,
      schemaId,
      itemId,
      stockPointId,
      previousQty: adjustmentData.previousQty,
      newQty: adjustmentData.newQty,
      difference: adjustmentData.newQty - adjustmentData.previousQty,
      type: adjustmentData.type,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, STOCK_COLLECTION), newAdjustment);
    return { id: docRef.id, ...newAdjustment };
  } catch (error) {
    console.error("Erro ao salvar ajuste de estoque:", error);
    throw error;
  }
};

export const getStockLogs = async (itemId) => {
  if (isLocalhost()) {
    const logs = await mockGetDocs(STOCK_COLLECTION);
    return logs
      .filter(log => log.itemId === itemId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  try {
    const q = query(
      collection(db, STOCK_COLLECTION),
      where('itemId', '==', itemId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar logs:", error);
    return [];
  }
};

export const getStockLogsByStockPoint = async (stockPointId) => {
  if (isLocalhost()) {
    const logs = await mockGetDocs(STOCK_COLLECTION);
    return logs
      .filter(log => log.stockPointId === stockPointId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  try {
    const q = query(
      collection(db, STOCK_COLLECTION),
      where('stockPointId', '==', stockPointId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar logs por ponto de estocagem:", error);
    return [];
  }
};

// Alias para compatibilidade
export const adjustStock = saveAdjustment;
export const getAdjustmentsByItem = getStockLogs;
