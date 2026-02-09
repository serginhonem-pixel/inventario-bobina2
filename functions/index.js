const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();

const resolveEventType = (event = {}) =>
  event.type || event.event || event.event_type || event.name || '';

const resolveOrgId = (data = {}) =>
  data.orgId ||
  data.organizationId ||
  data.metadata?.orgId ||
  data.customer?.metadata?.orgId ||
  data.customer?.external_id ||
  null;

const resolvePlanId = (data = {}) =>
  data.planId || data.plan?.id || data.plan?.name || data.subscription?.planId || null;

const resolveSeats = (data = {}) =>
  data.seatsPurchased || data.quantity || data.items?.[0]?.quantity || null;

const resolvePeriodEnd = (data = {}) => {
  const value = data.currentPeriodEnd || data.current_period_end || data.periodEnd || data.period_end;
  if (!value) return null;
  const millis = value > 1e12 ? value : value * 1000;
  return admin.firestore.Timestamp.fromMillis(millis);
};

const statusFromEvent = (eventType = '') => {
  const type = eventType.toLowerCase();
  if (type.includes('paid') || type.includes('active')) return 'active';
  if (type.includes('canceled') || type.includes('cancelled')) return 'canceled';
  if (type.includes('failed') || type.includes('past_due') || type.includes('past-due')) return 'past_due';
  return null;
};

const verifyCartpandaSignature = (req) => {
  const secret = process.env.CARTPANDA_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: false, code: 500, message: 'Webhook secret not configured' };
  }

  const headerName = process.env.CARTPANDA_SIGNATURE_HEADER || 'x-cartpanda-signature';
  const signatureHeader =
    req.get(headerName) ||
    req.get('x-cartpanda-signature') ||
    req.get('cartpanda-signature');

  if (!signatureHeader) {
    return { ok: false, code: 401, message: 'Signature missing' };
  }

  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  const payload = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (provided.length !== expected.length) {
    return { ok: false, code: 401, message: 'Invalid signature' };
  }

  const valid = crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  if (!valid) {
    return { ok: false, code: 401, message: 'Invalid signature' };
  }

  return { ok: true };
};

exports.cartpandaWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const signatureCheck = verifyCartpandaSignature(req);
  if (!signatureCheck.ok) {
    return res.status(signatureCheck.code).send(signatureCheck.message);
  }

  const event = req.body || {};
  const eventType = resolveEventType(event);
  const data = event.data || event.payload || event.resource || {};
  const orgId = resolveOrgId(data);

  if (!orgId) {
    return res.status(400).send('orgId missing');
  }

  const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  const status = statusFromEvent(eventType);
  if (status) updates.status = status;

  const planId = resolvePlanId(data);
  if (planId) updates.planId = planId;

  const seats = resolveSeats(data);
  if (seats) updates.seatsPurchased = seats;

  const periodEnd = resolvePeriodEnd(data);
  if (periodEnd) updates.currentPeriodEnd = periodEnd;

  if (data.customer?.id || data.customer_id) {
    updates.billingCustomerId = data.customer?.id || data.customer_id;
  }

  await admin.firestore().collection('organizations').doc(orgId).set(updates, { merge: true });
  return res.status(200).send('ok');
});

// ── Super Admin via Custom Claims ──────────────────────────────────
// Callable function: marca um usuário como superAdmin.
// Só pode ser chamada por quem já é superAdmin ou, se nenhum superAdmin existir,
// o primeiro usuário autenticado pode se auto-promover (bootstrap).
exports.setSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação obrigatória.');
  }

  const targetUid = data.uid || context.auth.uid;
  const callerClaims = context.auth.token || {};

  // Se o caller já é superAdmin, pode promover qualquer uid
  if (callerClaims.superAdmin === true) {
    await admin.auth().setCustomUserClaims(targetUid, { superAdmin: true });
    return { success: true, uid: targetUid };
  }

  // Bootstrap: se está tentando se auto-promover, verifica se não existe nenhum superAdmin
  if (targetUid !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas superAdmins podem promover outros usuários.');
  }

  // Verifica se já existe algum superAdmin (checa doc de controle)
  const controlRef = admin.firestore().collection('config').doc('superAdmins');
  const controlSnap = await controlRef.get();

  if (controlSnap.exists && controlSnap.data()?.initialized) {
    throw new functions.https.HttpsError('permission-denied', 'Já existe um superAdmin. Peça a ele para te promover.');
  }

  // Primeiro superAdmin — bootstrap permitido
  await admin.auth().setCustomUserClaims(targetUid, { superAdmin: true });
  await controlRef.set({ initialized: true, bootstrapUid: targetUid, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  return { success: true, uid: targetUid, bootstrap: true };
});

// Remove superAdmin de um usuário (só superAdmin pode chamar)
exports.removeSuperAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token?.superAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas superAdmins podem remover essa permissão.');
  }

  const targetUid = data.uid;
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid é obrigatório.');
  }

  await admin.auth().setCustomUserClaims(targetUid, { superAdmin: false });
  return { success: true, uid: targetUid };
});

// ── Expirar trials automaticamente ─────────────────────────────────
// Roda todo dia às 03:00 (horário de Brasília / UTC-3 → 06:00 UTC)
// Busca orgs com status 'trialing' e trialEndsAt no passado, rebaixa para free.
exports.expireTrials = functions.pubsub
  .schedule('every day 06:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection('organizations')
      .where('status', '==', 'trialing')
      .where('trialEndsAt', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log('Nenhum trial expirado.');
      return null;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        planId: 'free',
        status: 'expired_trial',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;
    });

    await batch.commit();
    console.log(`${count} trial(s) expirado(s) e rebaixado(s) para free.`);
    return null;
  });
