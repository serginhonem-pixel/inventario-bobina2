import { db } from './config';
import { getPlanConfig } from '../../core/plansConfig';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  increment
} from 'firebase/firestore';

const ORG_COLLECTION = 'organizations';
const USER_COLLECTION = 'users';

export const getOrganizationById = async (orgId) => {
  if (!orgId) return null;
  const orgRef = doc(db, ORG_COLLECTION, orgId);
  const orgSnap = await getDoc(orgRef);
  return orgSnap.exists() ? { id: orgSnap.id, ...orgSnap.data() } : null;
};

export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const userRef = doc(db, USER_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
};

export const ensureUserOrganization = async (user, defaultPlanId = 'free') => {
  if (!user?.uid) return null;
  const plan = getPlanConfig(defaultPlanId);
  const userRef = doc(db, USER_COLLECTION, user.uid);

  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      const profile = userSnap.data();
      const orgRef = doc(db, ORG_COLLECTION, profile.orgId);
      const orgSnap = await tx.get(orgRef);
      return {
        userProfile: { id: user.uid, ...profile },
        org: orgSnap.exists() ? { id: orgSnap.id, ...orgSnap.data() } : null
      };
    }

    const orgRef = doc(collection(db, ORG_COLLECTION));
    const orgData = {
      name: user.displayName || user.email || 'Nova Empresa',
      planId: defaultPlanId,
      status: 'active',
      seatsPurchased: plan.seatsMax ?? null,
      seatsUsed: 1,
      stockPointsUsed: 0,
      templatesUsed: 0,
      billingProvider: 'cartpanda',
      billingCustomerId: null,
      currentPeriodEnd: null,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    tx.set(orgRef, orgData);
    tx.set(userRef, {
      orgId: orgRef.id,
      email: user.email || '',
      role: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    tx.set(doc(db, ORG_COLLECTION, orgRef.id, 'members', user.uid), {
      email: user.email || '',
      role: 'admin',
      status: 'active',
      createdAt: serverTimestamp()
    });

    return {
      userProfile: { id: user.uid, orgId: orgRef.id, email: user.email || '', role: 'admin' },
      org: { id: orgRef.id, ...orgData }
    };
  });
};

export const incrementOrgUsage = async (orgId, field, delta = 1) => {
  if (!orgId || !field) return;
  const orgRef = doc(db, ORG_COLLECTION, orgId);
  return runTransaction(db, async (tx) => {
    tx.update(orgRef, { [field]: increment(delta), updatedAt: serverTimestamp() });
    return true;
  });
};
