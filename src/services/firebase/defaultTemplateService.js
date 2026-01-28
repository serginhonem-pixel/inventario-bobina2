import { db } from './config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { isLocalhost } from './mockPersistence';

const STORAGE_KEY = 'default_templates';
const COLLECTION = 'defaultTemplates';

const getLocalDefaults = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
};

const setLocalDefaults = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getDefaultTemplate = async (planId = 'free') => {
  if (isLocalhost()) {
    const all = getLocalDefaults();
    return all[planId] || null;
  }
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

  if (isLocalhost()) {
    const all = getLocalDefaults();
    all[planId] = { id: planId, ...payload, updatedAt: new Date().toISOString() };
    setLocalDefaults(all);
    return all[planId];
  }

  const ref = doc(db, COLLECTION, planId);
  await setDoc(ref, payload, { merge: true });
  return { id: planId, ...payload };
};
