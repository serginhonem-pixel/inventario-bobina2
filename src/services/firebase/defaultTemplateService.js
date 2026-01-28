import { db } from './config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const COLLECTION = 'defaultTemplates';

export const getDefaultTemplate = async (planId = 'free') => {
  const ref = doc(db, COLLECTION, planId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const saveDefaultTemplate = async (planId = 'free', template = {}) => {
  const payload = {
    name: template.name || 'Etiqueta Padrao',
    size: template.size || { width: 100, height: 50 },
    elements: template.elements || [],
    logistics: template.logistics || { street: '', shelf: '', level: '' },
    updatedAt: serverTimestamp()
  };

  const ref = doc(db, COLLECTION, planId);
  await setDoc(ref, payload, { merge: true });
  return { id: planId, ...payload };
};
