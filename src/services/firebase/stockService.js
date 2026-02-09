import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs, mockUpdateDoc } from './mockPersistence';
import { getDocsWithPagination } from './pagination';
import { 
  collection, query, where, orderBy, serverTimestamp, doc, runTransaction
} from 'firebase/firestore';

const STOCK_COLLECTION = 'stock_adjustments';
const ITEM_COLLECTION = 'items';

const getPendingMovements = () => {
  const pending = localStorage.getItem('pending_stock_movements');
  return pending ? JSON.parse(pending) : [];
};

const setPendingMovements = (movements) => {
  localStorage.setItem('pending_stock_movements', JSON.stringify(movements));
};

export const saveAdjustment = async (tenantId, schemaId, itemId, stockPointIdOrData, maybeAdjustmentData) => {
  let stockPointId = stockPointIdOrData ?? null;
  let adjustmentData = maybeAdjustmentData;

  if (adjustmentData === undefined && stockPointIdOrData && typeof stockPointIdOrData === 'object') {
    adjustmentData = stockPointIdOrData;
    stockPointId = null;
  }

  if (isLocalhost()) {
    const saved = await mockAddDoc(STOCK_COLLECTION, { 
      tenantId, 
      schemaId, 
      itemId, 
      stockPointId: stockPointId ?? null,
      ...adjustmentData,
      timestamp: new Date().toISOString()
    });
    const items = await mockGetDocs(ITEM_COLLECTION);
    const item = items.find((it) => it.id === itemId);
    if (item) {
      const data = { ...(item.data || {}) };
      const qtyFields = ['quantidade', 'qtd', 'estoque', 'quantidade_atual', 'saldo'];
      const existingField = qtyFields.find((field) => data[field] !== undefined && data[field] !== null);
      const targetField = existingField || 'quantidade';
      data[targetField] = adjustmentData.newQty;
      await mockUpdateDoc(ITEM_COLLECTION, itemId, { data });
    }
    return saved;
  }

  try {
    const adjustmentRef = doc(collection(db, STOCK_COLLECTION));
    const itemRef = doc(db, ITEM_COLLECTION, itemId);
    const newAdjustment = {
      tenantId,
      schemaId,
      itemId,
      stockPointId: stockPointId ?? null,
      previousQty: adjustmentData.previousQty,
      newQty: adjustmentData.newQty,
      difference: adjustmentData.newQty - adjustmentData.previousQty,
      type: adjustmentData.type,
      notes: adjustmentData.notes,
      timestamp: adjustmentData.timestamp || new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    await runTransaction(db, async (tx) => {
      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists()) {
        throw new Error('Item não encontrado para atualizar o saldo.');
      }
      const item = itemSnap.data() || {};
      const data = { ...(item.data || {}) };
      const qtyFields = ['quantidade', 'qtd', 'estoque', 'quantidade_atual', 'saldo'];
      const existingField = qtyFields.find((field) => data[field] !== undefined && data[field] !== null);
      const targetField = existingField || 'quantidade';

      data[targetField] = adjustmentData.newQty;
      tx.update(itemRef, { data, updatedAt: serverTimestamp() });
      tx.set(adjustmentRef, newAdjustment);
    });

    return { id: adjustmentRef.id, ...newAdjustment };
  } catch (error) {
    console.error("Erro ao salvar ajuste de estoque:", error);
    throw error;
  }
};

export const getStockLogs = async (itemId, tenantId, options = {}) => {
  if (isLocalhost()) {
    const logs = await mockGetDocs(STOCK_COLLECTION);
    return logs
      .filter(log => log.itemId === itemId && (!tenantId || log.tenantId === tenantId))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  try {
    const constraints = [
      where('itemId', '==', itemId),
      orderBy('createdAt', 'desc')
    ];
    if (tenantId) constraints.unshift(where('tenantId', '==', tenantId));
    const q = query(collection(db, STOCK_COLLECTION), ...constraints);
    
    const { docs, cursor } = await getDocsWithPagination(q, options);
    const logs = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (options.fetchAll === false) {
      return { logs, cursor };
    }
    return logs;
  } catch (error) {
    console.error("Erro ao buscar logs:", error);
    return [];
  }
};

export const getStockLogsByStockPoint = async (stockPointId, tenantId, options = {}) => {
  if (isLocalhost()) {
    const logs = await mockGetDocs(STOCK_COLLECTION);
    return logs
      .filter(log => log.stockPointId === stockPointId && (!tenantId || log.tenantId === tenantId))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  try {
    const constraints = [
      where('stockPointId', '==', stockPointId),
      orderBy('createdAt', 'desc')
    ];
    if (tenantId) constraints.unshift(where('tenantId', '==', tenantId));
    const q = query(collection(db, STOCK_COLLECTION), ...constraints);
    
    const { docs, cursor } = await getDocsWithPagination(q, options);
    const logs = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (options.fetchAll === false) {
      return { logs, cursor };
    }
    return logs;
  } catch (error) {
    console.error("Erro ao buscar logs por ponto de estocagem:", error);
    return [];
  }
};

export const getStockLogsByTenant = async (tenantId, options = {}) => {
  if (isLocalhost()) {
    const logs = await mockGetDocs(STOCK_COLLECTION);
    return logs
      .filter(log => log.tenantId === tenantId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  try {
    const q = query(
      collection(db, STOCK_COLLECTION),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
    const { docs, cursor } = await getDocsWithPagination(q, options);
    const logs = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (options.fetchAll === false) {
      return { logs, cursor };
    }
    return logs;
  } catch (error) {
    console.error("Erro ao buscar logs por tenant:", error);
    return [];
  }
};

export const syncPendingMovements = async () => {
  if (isLocalhost() || !navigator.onLine) {
    const pending = getPendingMovements();
    return { synced: 0, remaining: pending.length };
  }

  const pending = getPendingMovements();
  if (pending.length === 0) return { synced: 0, remaining: 0 };

  const syncedIds = [];
  for (const movement of pending) {
    try {
      await saveAdjustment(
        movement.tenantId,
        movement.schemaId,
        movement.itemId,
        movement.stockPointId,
        {
          previousQty: movement.previousQty,
          newQty: movement.newQty,
          type: movement.type,
          notes: movement.notes,
          timestamp: movement.timestamp
        }
      );
      syncedIds.push(movement.id);
    } catch (error) {
      console.error("Erro ao sincronizar movimento pendente:", error);
    }
  }

  const remaining = pending.filter(m => !syncedIds.includes(m.id));
  setPendingMovements(remaining);
  return { synced: syncedIds.length, remaining: remaining.length };
};

// Alias para compatibilidade
export const adjustStock = saveAdjustment;
export const getAdjustmentsByItem = getStockLogs;
