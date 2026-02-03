import { db } from './config';
import { isLocalhost, mockAddDoc, mockGetDocs, mockUpdateDoc } from './mockPersistence';
import { 
  collection, addDoc, getDocs, query, where, serverTimestamp, doc, deleteDoc, updateDoc
} from 'firebase/firestore';

const TEMPLATE_COLLECTION = 'templates';

export const saveTemplate = async (tenantId, schemaId, schemaVersion, templateData) => {
  const { id, name, size, elements, logistics } = templateData;
  const dataToSave = {
    tenantId,
    schemaId,
    schemaVersion,
    name,
    size,
    elements,
    logistics,
    updatedAt: new Date()
  };

  if (isLocalhost()) {
    if (id) {
      // Mock update logic - salva no localStorage
      const updated = await mockUpdateDoc(TEMPLATE_COLLECTION, id, dataToSave);
      return updated || { id, ...dataToSave };
    }
    // Mock create logic
    return await mockAddDoc(TEMPLATE_COLLECTION, { ...dataToSave, createdAt: new Date() });
  }

  try {
    if (id) {
      // Atualizar template existente
      const docRef = doc(db, TEMPLATE_COLLECTION, id);
      await updateDoc(docRef, dataToSave);
      return { id, ...dataToSave };
    } else {
      // Criar novo template
      const newTemplate = {
        ...dataToSave,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, TEMPLATE_COLLECTION), newTemplate);
      return { id: docRef.id, ...newTemplate };
    }
  } catch (error) {
    console.error("Erro ao salvar template:", error);
    throw error;
  }
};

export const getTemplatesBySchema = async (tenantId, schemaId) => {
  if (isLocalhost()) {
    return await mockGetDocs(TEMPLATE_COLLECTION, [
      { field: 'tenantId', value: tenantId },
      { field: 'schemaId', value: schemaId }
    ]);
  }

  try {
    const q = query(
      collection(db, TEMPLATE_COLLECTION),
      where('tenantId', '==', tenantId),
      where('schemaId', '==', schemaId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar templates:", error);
    throw error;
  }
};

export const deleteTemplate = async (templateId) => {
  if (isLocalhost()) return true;
  const docRef = doc(db, TEMPLATE_COLLECTION, templateId);
  await deleteDoc(docRef);
  return true;
};
