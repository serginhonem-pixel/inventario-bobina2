import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs, mockUpdateDoc, mockDeleteDoc } from './mockPersistence';
import { getDocsWithPagination } from './pagination';
import { 
  collection, query, where, serverTimestamp, doc, updateDoc, runTransaction, increment, orderBy
} from 'firebase/firestore';

const TEMPLATE_COLLECTION = 'templates';
const ORG_COLLECTION = 'organizations';

const isMissingIndexError = (error) =>
  error?.code === 'failed-precondition'
  || /requires an index/i.test(error?.message || '');

const getTimestampMs = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const saveTemplate = async (tenantId, schemaId, schemaVersion, templateData) => {
  const { id, name, size, padding, elements, logistics, stockPointId = null } = templateData;
  const baseParts = {
    tenantId,
    schemaId,
    schemaVersion,
    stockPointId,
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
    console.info('[templateService.saveTemplate] saving', {
      mode: isLocalhost() ? 'mock' : 'firestore',
      tenantId,
      schemaId,
      schemaVersion,
      stockPointId,
      templateId: id || null,
      name,
      elementsCount: Array.isArray(elements) ? elements.length : 0,
    });
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
    console.error('[templateService.saveTemplate] error', {
      tenantId,
      schemaId,
      schemaVersion,
      stockPointId,
      templateId: id || null,
      name,
      code: error?.code,
      message: error?.message,
      error
    });
    throw error;
  }
};

export const getTemplatesBySchema = async (tenantId, schemaId, options = {}) => {
  const { stockPointId = null } = options;
  if (isLocalhost()) {
    const byStockPoint = stockPointId
      ? await mockGetDocs(TEMPLATE_COLLECTION, [
          { field: 'tenantId', value: tenantId },
          { field: 'stockPointId', value: stockPointId }
        ])
      : [];
    const bySchema = schemaId
      ? await mockGetDocs(TEMPLATE_COLLECTION, [
          { field: 'tenantId', value: tenantId },
          { field: 'schemaId', value: schemaId }
        ])
      : [];
    const merged = [...byStockPoint, ...bySchema].filter(
      (template, index, all) => all.findIndex((candidate) => candidate.id === template.id) === index
    );
    return [...merged].sort((a, b) => {
      const aMs = Math.max(getTimestampMs(a?.updatedAt), getTimestampMs(a?.createdAt));
      const bMs = Math.max(getTimestampMs(b?.updatedAt), getTimestampMs(b?.createdAt));
      return bMs - aMs;
    });
  }

  try {
    console.info('[templateService.getTemplatesBySchema] loading', {
      mode: isLocalhost() ? 'mock' : 'firestore',
      tenantId,
      schemaId,
      stockPointId
    });
    const runTemplateQuery = async (filters) => {
      try {
        const q = query(
          collection(db, TEMPLATE_COLLECTION),
          ...filters.map(({ field, value }) => where(field, '==', value)),
          orderBy('createdAt', 'desc')
        );

        const result = await getDocsWithPagination(q, options);
        return {
          templates: result.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          cursor: result.cursor
        };
      } catch (error) {
        if (!isMissingIndexError(error)) throw error;
        const fallbackQ = query(
          collection(db, TEMPLATE_COLLECTION),
          ...filters.map(({ field, value }) => where(field, '==', value))
        );
        const snapshot = await getDocsWithPagination(fallbackQ, { ...options, fetchAll: true });
        const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        templates.sort((a, b) => {
          const aMs = Math.max(getTimestampMs(a?.updatedAt), getTimestampMs(a?.createdAt));
          const bMs = Math.max(getTimestampMs(b?.updatedAt), getTimestampMs(b?.createdAt));
          return bMs - aMs;
        });
        return { templates, cursor: null };
      }
    };

    const queryGroups = [];
    if (stockPointId) {
      queryGroups.push([
        { field: 'tenantId', value: tenantId },
        { field: 'stockPointId', value: stockPointId }
      ]);
    }
    if (schemaId) {
      queryGroups.push([
        { field: 'tenantId', value: tenantId },
        { field: 'schemaId', value: schemaId }
      ]);
    }

    const results = await Promise.all(queryGroups.map((filters) => runTemplateQuery(filters)));
    const templates = results
      .flatMap((result) => result.templates)
      .filter((template, index, all) => all.findIndex((candidate) => candidate.id === template.id) === index)
      .sort((a, b) => {
        const aMs = Math.max(getTimestampMs(a?.updatedAt), getTimestampMs(a?.createdAt));
        const bMs = Math.max(getTimestampMs(b?.updatedAt), getTimestampMs(b?.createdAt));
        return bMs - aMs;
      });
    const cursor = results[0]?.cursor ?? null;

    if (options.fetchAll === false) {
      return { templates, cursor };
    }
    console.info('[templateService.getTemplatesBySchema] loaded', {
      tenantId,
      schemaId,
      stockPointId,
      total: templates.length,
      templateIds: templates.map((template) => template.id)
    });
    return templates;
  } catch (error) {
    console.error('[templateService.getTemplatesBySchema] error', {
      tenantId,
      schemaId,
      stockPointId,
      code: error?.code,
      message: error?.message,
      error
    });
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
