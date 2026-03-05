const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();

// ── Mapeamento de subscription IDs do CartPanda → planos do app ────
const SUBSCRIPTION_MAP = {
  '3862': { planId: 'pro', billing: 'monthly' },    // Pro Mensal
  '3864': { planId: 'pro', billing: 'annual' },     // Pro Anual
  '4081': { planId: 'business', billing: 'monthly' }, // Business Mensal
  '4082': { planId: 'business', billing: 'annual' },  // Business Anual
};

// Mapeamento por nome de produto (fallback quando não temos subscription ID)
const PRODUCT_NAME_MAP = {
  'pro mensal': { planId: 'pro', billing: 'monthly' },
  'pro anual': { planId: 'pro', billing: 'annual' },
  'business mensal': { planId: 'business', billing: 'monthly' },
  'business anual': { planId: 'business', billing: 'annual' },
  'qtdapp pro mensal': { planId: 'pro', billing: 'monthly' },
  'qtdapp pro anual': { planId: 'pro', billing: 'annual' },
  'qtdapp business mensal': { planId: 'business', billing: 'monthly' },
  'qtdapp business anual': { planId: 'business', billing: 'annual' },
};

const PLAN_SEATS = {
  pro: 3,
  business: 10,
  enterprise: null,
};

// ── Buscar orgId pelo email do comprador ──────────────────────────
const findOrgByEmail = async (email) => {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Buscar na collection 'users' pelo email
  const usersSnap = await admin.firestore()
    .collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    const userData = usersSnap.docs[0].data();
    if (userData.orgId) return userData.orgId;
  }

  // 2. Fallback: buscar via Firebase Auth → doc do user
  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
    if (userRecord?.uid) {
      const userDoc = await admin.firestore().collection('users').doc(userRecord.uid).get();
      if (userDoc.exists && userDoc.data().orgId) {
        return userDoc.data().orgId;
      }
    }
  } catch { /* usuário não encontrado no Auth */ }

  return null;
};

// ── Resolver plano a partir dos dados disponíveis ─────────────────
const resolvePlan = (subscriptionId, productName, productId) => {
  // 1. Tentar pelo subscription ID
  if (subscriptionId && SUBSCRIPTION_MAP[subscriptionId]) {
    return SUBSCRIPTION_MAP[subscriptionId];
  }

  // 2. Tentar pelo product ID (mesmo mapeamento)
  if (productId && SUBSCRIPTION_MAP[productId]) {
    return SUBSCRIPTION_MAP[productId];
  }

  // 3. Tentar pelo nome do produto
  if (productName) {
    const normalized = productName.toLowerCase().trim();
    for (const [key, plan] of Object.entries(PRODUCT_NAME_MAP)) {
      if (normalized.includes(key)) return plan;
    }
    // Detecção genérica: contém "business" ou "pro"?
    if (normalized.includes('business')) {
      return { planId: 'business', billing: normalized.includes('anual') ? 'annual' : 'monthly' };
    }
    if (normalized.includes('pro')) {
      return { planId: 'pro', billing: normalized.includes('anual') ? 'annual' : 'monthly' };
    }
  }

  return null;
};

// ══════════════════════════════════════════════════════════════════
// ENDPOINT PRINCIPAL — Suporta 2 formatos:
//
// 1. S2S Postback (GET) — CartPanda envia query params
//    URL configurada no CartPanda:
//    https://...cloudfunctions.net/cartpandaWebhook?email={email}&product={product_name}&product_id={product_id}&type={order_type}
//
// 2. Webhook POST (JSON body) — formato padrão de webhook
// ══════════════════════════════════════════════════════════════════
exports.cartpandaWebhook = functions.https.onRequest(async (req, res) => {
  // Aceita GET (S2S postback) e POST (webhook)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // ── Autenticação — token secreto obrigatório ────────────────────
  // Configure no CartPanda a URL com &secret=SEU_TOKEN
  // ou envie o header X-Webhook-Secret no POST.
  // Defina o segredo no arquivo functions/.env: CARTPANDA_WEBHOOK_SECRET=SEU_TOKEN
  const expectedSecret = process.env.CARTPANDA_WEBHOOK_SECRET;
  const receivedSecret = req.query.secret || req.headers['x-webhook-secret'] || '';

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    console.warn('[webhook] Autenticação falhou — secret inválido ou ausente.');
    return res.status(401).send('Unauthorized');
  }

  console.log(`[webhook] ${req.method} recebido — email: ${(req.query.email || req.body?.email || 'N/A')}`);

  // ── Extrair dados (funciona para GET e POST) ────────────────────
  const q = req.query || {};
  const b = req.body || {};
  const data = b.data || b.payload || b.resource || b;

  const email = (
    q.email || q.client_email ||
    data.customer?.email || data.buyer?.email || data.email || b.email ||
    ''
  ).toLowerCase().trim() || null;

  const productName = q.product || q.product_name || data.product_name || b.product_name || '';
  const productId = q.product_id || data.product_id || b.product_id || '';
  const subscriptionId = q.subscription_id || q.subscription ||
    String(data.subscription_id || data.subscription?.id || data.plan_id || b.subscription_id || '');
  const orderType = q.type || q.order_type || data.type || b.type ||
    data.event || b.event || b.event_type || '';

  console.log(`[webhook] Email: ${email}, Produto: ${productName}, ProdID: ${productId}, SubID: ${subscriptionId}, Tipo: ${orderType}`);

  // ── Precisa do email ────────────────────────────────────────────
  if (!email) {
    console.warn('[webhook] Email não encontrado.');
    await admin.firestore().collection('webhook_logs').add({
      source: 'cartpanda',
      method: req.method,
      query: q,
      body: req.method === 'POST' ? b : null,
      status: 'email_missing',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).send('ok — email missing, logged');
  }

  // ── Encontrar a organização ─────────────────────────────────────
  const orgId = await findOrgByEmail(email);
  if (!orgId) {
    console.warn(`[webhook] Org não encontrada para: ${email}`);
    await admin.firestore().collection('webhook_logs').add({
      source: 'cartpanda',
      method: req.method,
      email,
      productName,
      subscriptionId,
      status: 'org_not_found',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).send('ok — org not found, logged');
  }

  // ── Resolver o plano ────────────────────────────────────────────
  const planMapping = resolvePlan(subscriptionId, productName, productId);

  // ── Montar atualizações ─────────────────────────────────────────
  const updates = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    billingProvider: 'cartpanda',
    billingEmail: email,
  };

  if (planMapping) {
    updates.planId = planMapping.planId;
    updates.billingCycle = planMapping.billing;
    updates.seatsPurchased = PLAN_SEATS[planMapping.planId] ?? null;
  }

  // S2S Postback do CartPanda envia no evento "initial_sale" → ativar o plano
  const type = orderType.toLowerCase();
  if (type === 'initial_sale' || type.includes('paid') || type.includes('active') ||
      type.includes('confirmed') || type.includes('approved') || type === '') {
    // Se orderType está vazio (CartPanda pode não enviar), e temos um plano, assumimos ativação
    updates.status = 'active';
    updates.trialEndsAt = admin.firestore.FieldValue.delete();
  } else if (type.includes('cancel') || type.includes('refund')) {
    updates.status = 'canceled';
  } else if (type.includes('failed') || type.includes('past_due') || type.includes('overdue')) {
    updates.status = 'past_due';
  }

  // ── Aplicar no Firestore ────────────────────────────────────────
  await admin.firestore().collection('organizations').doc(orgId).set(updates, { merge: true });

  // ── Log ─────────────────────────────────────────────────────────
  await admin.firestore().collection('webhook_logs').add({
    source: 'cartpanda',
    method: req.method,
    email,
    orgId,
    orderType,
    productName,
    productId,
    subscriptionId,
    planMapping: planMapping || null,
    statusApplied: updates.status || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[webhook] Org ${orgId} atualizada → planId=${planMapping?.planId}, status=${updates.status}`);
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

    const BATCH_LIMIT = 450;
    const docs = snapshot.docs;
    let count = 0;

    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const slice = docs.slice(i, i + BATCH_LIMIT);
      slice.forEach((doc) => {
        batch.update(doc.ref, {
          planId: 'expired',
          status: 'expired_trial',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      count += slice.length;
    }
    console.log(`${count} trial(s) expirado(s).`);
    return null;
  });
