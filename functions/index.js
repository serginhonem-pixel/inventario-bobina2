const functions = require('firebase-functions');
const admin = require('firebase-admin');

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

exports.cartpandaWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // TODO: validar assinatura do webhook Cartpanda usando o secret.
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
