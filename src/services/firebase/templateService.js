import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs, mockUpdateDoc, mockDeleteDoc } from './mockPersistence';
import { getDocsWithPagination } from './pagination';
import { 
  collection, query, where, serverTimestamp, doc, updateDoc, runTransaction, increment, orderBy, addDoc
} from 'firebase/firestore';

const TEMPLATE_COLLECTION = 'templates';
const ORG_COLLECTION = 'organizations';

const isMissingIndexError = (error) =>
  error?.code === 'failed-precondition'
  || /requires an index/i.test(error?.message || '');

export const saveTemplate = async (tenantId, schemaId, schemaVersion, templateData) => {
  const { id, name, size, padding, elements, logistics } = templateData;
  const baseParts = {
    tenantId,
    schemaId,
    schemaVersion,
    name,
    size,
    padding: padding ?? 0,
    elements,
    logistics,
  };

  // Para mock local usa Date; para Firestore usa serverTimestamp
  const dataToSave = isLocalhost()
    ? { ...baseParts, updatedAt: new Date() }
    : { ...baseParts, updatedAt: serverTimestamp() };

  if (isLocalhost()) {
    if (id) {
      // Mock update logic - salva no localStorage
      const updated = await mockUpdateDoc(TEMPLATE_COLLECTION, id, dataToSave);
      return updated || { id, ...dataToSave };
    }
    // Mock create logic
    const saved = await mockAddDoc(TEMPLATE_COLLECTION, { ...dataToSave, createdAt: new Date() });
    const orgs = await mockGetDocs(ORG_COLLECTION);
    const org = orgs.find((item) => item.id === tenantId);
    if (org) {
      const current = org.templatesUsed || 0;
      await mockUpdateDoc(ORG_COLLECTION, tenantId, { templatesUsed: current + 1 });
    }
    return saved;
  }

  try {
    if (id) {
      // Atualizar template existente
      const docRef = doc(db, TEMPLATE_COLLECTION, id);
      await updateDoc(docRef, dataToSave);
      return { id, ...dataToSave };
    } else {
      // Criar novo template
      const orgRef = doc(db, ORG_COLLECTION, tenantId);
      const templateRef = doc(collection(db, TEMPLATE_COLLECTION));
      const newTemplate = {
        ...dataToSave,
        createdAt: serverTimestamp()
      };
      await runTransaction(db, async (tx) => {
        const orgSnap = await tx.get(orgRef);
        if (!orgSnap.exists()) {
          throw new Error('Organização não encontrada.');
        }
        tx.set(templateRef, newTemplate);
        tx.update(orgRef, { templatesUsed: increment(1), updatedAt: serverTimestamp() });
      });
      return { id: templateRef.id, ...newTemplate };
    }
  } catch (error) {
    console.error("Erro ao salvar template:", error);
    throw error;
  }
};

export const getTemplatesBySchema = async (tenantId, schemaId, options = {}) => {
  if (isLocalhost()) {
    return await mockGetDocs(TEMPLATE_COLLECTION, [
      { field: 'tenantId', value: tenantId },
      { field: 'schemaId', value: schemaId }
    ]);
  }

  try {
    let templates = [];
    let cursor = null;

    try {
      const q = query(
        collection(db, TEMPLATE_COLLECTION),
        where('tenantId', '==', tenantId),
        where('schemaId', '==', schemaId),
        orderBy('createdAt', 'desc')
      );

      const result = await getDocsWithPagination(q, options);
      templates = result.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cursor = result.cursor;
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;
      const fallbackQ = query(
        collection(db, TEMPLATE_COLLECTION),
        where('tenantId', '==', tenantId),
        where('schemaId', '==', schemaId)
      );
      const snapshot = await getDocsWithPagination(fallbackQ, { ...options, fetchAll: true });
      templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      templates.sort((a, b) => {
        const aMs = a?.createdAt?.toMillis?.() || 0;
        const bMs = b?.createdAt?.toMillis?.() || 0;
        return bMs - aMs;
      });
    }

    if (options.fetchAll === false) {
      return { templates, cursor };
    }
    return templates;
  } catch (error) {
    console.error("Erro ao buscar templates:", error);
    throw error;
  }
};

export const deleteTemplate = async (templateId, tenantId) => {
  if (isLocalhost()) {
    // Mock: remove do localStorage via mockPersistence
    if (typeof mockDeleteDoc === 'function') {
      await mockDeleteDoc(TEMPLATE_COLLECTION, templateId);
    }
    // Decrementa usage na org mock
    const orgs = await mockGetDocs(ORG_COLLECTION);
    const org = orgs.find((item) => item.id === tenantId);
    if (org) {
      const current = org.templatesUsed || 0;
      await mockUpdateDoc(ORG_COLLECTION, tenantId, { templatesUsed: Math.max(0, current - 1) });
    }
    return true;
  }
  try {
    const templateRef = doc(db, TEMPLATE_COLLECTION, templateId);
    await runTransaction(db, async (tx) => {
      const templateSnap = await tx.get(templateRef);
      if (!templateSnap.exists()) return;
      const resolvedTenantId = tenantId || templateSnap.data()?.tenantId;
      tx.delete(templateRef);
      if (resolvedTenantId) {
        const orgRef = doc(db, ORG_COLLECTION, resolvedTenantId);
        const orgSnap = await tx.get(orgRef);
        if (orgSnap.exists()) {
          const current = orgSnap.data()?.templatesUsed ?? 0;
          tx.update(orgRef, { templatesUsed: Math.max(0, current - 1), updatedAt: serverTimestamp() });
        }
      }
    });
    return true;
  } catch (error) {
    console.error("Erro ao excluir template:", error);
    throw error;
  }
};
