import { db } from './config';
import { getDocsWithPagination } from './pagination';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

const ORG_COLLECTION = 'organizations';
const USER_COLLECTION = 'users';

export const getOrgMembers = async (orgId, options = {}) => {
  if (!orgId) return [];
  const membersRef = query(
    collection(db, ORG_COLLECTION, orgId, 'members'),
    orderBy('createdAt', 'desc')
  );
  const { docs, cursor } = await getDocsWithPagination(membersRef, options);
  const members = docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (options.fetchAll === false) {
    return { members, cursor };
  }
  return members;
};

export const getMemberRole = async (orgId, uid) => {
  if (!orgId || !uid) return null;
  const memberRef = doc(db, ORG_COLLECTION, orgId, 'members', uid);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) return null;
  return snap.data()?.role || null;
};

export const addMemberByEmail = async (orgId, email, role = 'member') => {
  if (!orgId || !email) throw new Error('Dados inválidos.');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const usersQuery = query(
    collection(db, USER_COLLECTION),
    where('email', '==', normalizedEmail),
    limit(1)
  );
  const userSnapshot = await getDocs(usersQuery);
  if (userSnapshot.empty) {
    throw new Error('Usuário não encontrado. Peça para criar a conta primeiro.');
  }
  const userDoc = userSnapshot.docs[0];
  const uid = userDoc.id;

  const orgRef = doc(db, ORG_COLLECTION, orgId);
  const memberRef = doc(db, ORG_COLLECTION, orgId, 'members', uid);

  await runTransaction(db, async (tx) => {
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists()) {
      throw new Error('Organização não encontrada.');
    }
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists()) {
      throw new Error('Usuário já faz parte da equipe.');
    }
    const orgData = orgSnap.data();
    const seatsUsed = orgData?.seatsUsed ?? 0;
    tx.update(orgRef, {
      seatsUsed: seatsUsed + 1,
      updatedAt: serverTimestamp()
    });
    tx.set(memberRef, {
      email: normalizedEmail,
      role,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
};

export const updateMemberRole = async (orgId, uid, role) => {
  if (!orgId || !uid || !role) return;
  const memberRef = doc(db, ORG_COLLECTION, orgId, 'members', uid);
  await updateDoc(memberRef, { role, updatedAt: serverTimestamp() });
};

export const removeMember = async (orgId, uid) => {
  if (!orgId || !uid) return;
  const orgRef = doc(db, ORG_COLLECTION, orgId);
  const memberRef = doc(db, ORG_COLLECTION, orgId, 'members', uid);
  await runTransaction(db, async (tx) => {
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists()) return;
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) return;
    const seatsUsed = orgSnap.data()?.seatsUsed ?? 0;
    tx.update(orgRef, {
      seatsUsed: Math.max(0, seatsUsed - 1),
      updatedAt: serverTimestamp()
    });
    tx.delete(memberRef);
  });
};
