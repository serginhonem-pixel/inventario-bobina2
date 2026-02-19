import { db } from './config';
import { isLocalhost } from './mockPersistence';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { getDocsWithPagination } from './pagination';
import { saveAdjustment } from './stockService';
import { resolveItemQty } from '../../core/utils';

const ORG_COLLECTION = 'organizations';
const INVENTORY_COLLECTION = 'inventorySessions';
const COUNT_COLLECTION = 'counts';
const CHUNK_SIZE = 450;

export const getActiveInventorySession = async (tenantId, stockPointId) => {
  if (!tenantId || !stockPointId) return null;
  if (isLocalhost()) return null;
  const sessionsRef = collection(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION);
  const q = query(
    sessionsRef,
    where('stockPointId', '==', stockPointId),
    where('status', '==', 'open'),
    orderBy('startedAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};

export const startInventorySession = async (tenantId, stockPointId, items, startedBy) => {
  if (!tenantId || !stockPointId) {
    throw new Error('Dados inválidos para iniciar inventário.');
  }
  if (isLocalhost()) {
    return {
      id: `local_${Date.now()}`,
      tenantId,
      stockPointId,
      status: 'open',
      startedAt: new Date(),
      startedBy: startedBy || null,
      itemsTotal: items?.length || 0
    };
  }

  const sessionsRef = collection(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION);
  const sessionRef = doc(sessionsRef);
  const sessionPayload = {
    tenantId,
    stockPointId,
    status: 'open',
    startedAt: serverTimestamp(),
    startedBy: startedBy || null,
    itemsTotal: items?.length || 0
  };

  await setDoc(sessionRef, sessionPayload);

  const countsRef = collection(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION, sessionRef.id, COUNT_COLLECTION);
  const total = items?.length || 0;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const slice = items.slice(i, i + CHUNK_SIZE);
    slice.forEach((item) => {
      const baselineQty = resolveItemQty(item);
      const countRef = doc(countsRef, item.id);
      batch.set(countRef, {
        itemId: item.id,
        baselineQty,
        countedQty: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  }

  return { id: sessionRef.id, ...sessionPayload };
};

export const getInventoryCount = async (tenantId, sessionId, itemId) => {
  if (!tenantId || !sessionId || !itemId) return null;
  if (isLocalhost()) return null;
  const countRef = doc(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION, sessionId, COUNT_COLLECTION, itemId);
  const snap = await getDoc(countRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const saveInventoryCount = async (tenantId, sessionId, itemId, countedQty) => {
  if (!tenantId || !sessionId || !itemId) {
    throw new Error('Dados inválidos para salvar contagem.');
  }
  if (isLocalhost()) return true;
  const countRef = doc(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION, sessionId, COUNT_COLLECTION, itemId);
  await setDoc(
    countRef,
    {
      countedQty,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  return true;
};

export const closeInventorySession = async (tenantId, sessionId, payload = {}) => {
  if (!tenantId || !sessionId) return;
  if (isLocalhost()) return;
  const sessionRef = doc(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    status: 'closed',
    closedAt: serverTimestamp(),
    ...payload
  });
};

export const applyInventoryAdjustments = async (
  tenantId,
  sessionId,
  schemaId,
  stockPointId,
  options = {}
) => {
  if (!tenantId || !sessionId || !schemaId || !stockPointId) {
    throw new Error('Dados inválidos para aplicar inventário.');
  }
  if (isLocalhost()) return { updates: new Map(), applied: 0 };

  const countsRef = collection(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION, sessionId, COUNT_COLLECTION);
  const q = query(countsRef, orderBy('createdAt', 'asc'));
  const { docs } = await getDocsWithPagination(q, { pageSize: options.pageSize || 200, fetchAll: true });

  const updates = new Map();
  let applied = 0;

  for (const docSnap of docs) {
    const data = docSnap.data();
    const countedQty = data?.countedQty;
    if (countedQty === null || countedQty === undefined) continue;
    const baselineQty = Number(data?.baselineQty || 0);
    const nextQty = Number(countedQty);
    if (!Number.isFinite(nextQty)) continue;
    if (baselineQty === nextQty) continue;

    await saveAdjustment(tenantId, schemaId, data.itemId, stockPointId, {
      previousQty: baselineQty,
      newQty: nextQty,
      type: 'inventory_count',
      notes: 'Ajuste por inventário',
      timestamp: new Date().toISOString()
    });
    updates.set(data.itemId, nextQty);
    applied += 1;
  }

  return { updates, applied };
};

export const getInventorySummary = async (tenantId, sessionId, options = {}) => {
  if (!tenantId || !sessionId) return { total: 0, counted: 0, divergences: 0 };
  if (isLocalhost()) return { total: 0, counted: 0, divergences: 0 };

  const countsRef = collection(db, ORG_COLLECTION, tenantId, INVENTORY_COLLECTION, sessionId, COUNT_COLLECTION);
  const q = query(countsRef, orderBy('createdAt', 'asc'));
  const { docs } = await getDocsWithPagination(q, { pageSize: options.pageSize || 200, fetchAll: true });

  let total = 0;
  let counted = 0;
  let divergences = 0;

  for (const docSnap of docs) {
    const data = docSnap.data() || {};
    total += 1;
    if (data.countedQty !== null && data.countedQty !== undefined) {
      counted += 1;
      const baseline = Number(data.baselineQty || 0);
      const countedQty = Number(data.countedQty || 0);
      if (Number.isFinite(countedQty) && baseline !== countedQty) {
        divergences += 1;
      }
    }
  }

  return { total, counted, divergences };
};
