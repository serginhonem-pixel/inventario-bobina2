const plansConfig = {
  trial: {
    id: 'trial',
    seatsMax: 3,
    stockPointsMax: 1,
    templatesMax: 3
  },
  pro: {
    id: 'pro',
    seatsMax: 3,
    stockPointsMax: 1,
    templatesMax: 3
  },
  business: {
    id: 'business',
    seatsMax: 10,
    stockPointsMax: 3,
    templatesMax: null
  },
  enterprise: {
    id: 'enterprise',
    seatsMax: null,
    stockPointsMax: null,
    templatesMax: null
  },
  expired: {
    id: 'expired',
    seatsMax: 1,
    stockPointsMax: 0,
    templatesMax: 0
  }
};

export const getPlanConfig = (planId = 'trial') =>
  plansConfig[planId] || plansConfig.trial;

export const isUnlimited = (value) => value === null || value === undefined;

// ── Trial helpers ──────────────────────────────────────────────────
const TRIAL_DAYS = 7;

export const getTrialInfo = (org) => {
  if (!org) return { isTrial: false, expired: false, daysLeft: 0, effectivePlanId: 'trial' };

  const status = org.status || 'active';
  const trialEndsAt = org.trialEndsAt;

  // Paid user or superAdmin — not on trial
  if (status === 'active' && !trialEndsAt) {
    return { isTrial: false, expired: false, daysLeft: 0, effectivePlanId: org.planId || 'pro' };
  }

  // Has a trial date
  if (trialEndsAt) {
    const endMs = typeof trialEndsAt.toMillis === 'function'
      ? trialEndsAt.toMillis()
      : typeof trialEndsAt.toDate === 'function'
        ? trialEndsAt.toDate().getTime()
        : typeof trialEndsAt === 'number'
          ? trialEndsAt
          : new Date(trialEndsAt).getTime();

    const now = Date.now();
    const msLeft = endMs - now;
    const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    const expired = msLeft <= 0;

    if (expired) {
      return { isTrial: false, expired: true, daysLeft: 0, effectivePlanId: 'expired' };
    }

    return { isTrial: true, expired: false, daysLeft, effectivePlanId: org.planId || 'pro' };
  }

  // Fallback
  return { isTrial: false, expired: false, daysLeft: 0, effectivePlanId: org.planId || 'pro' };
};

export const TRIAL_DURATION_DAYS = TRIAL_DAYS;

export default plansConfig;
