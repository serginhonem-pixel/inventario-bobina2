const plansConfig = {
  free: {
    id: 'free',
    seatsMax: 3,
    stockPointsMax: 1,
    templatesMax: 1
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
  }
};

export const getPlanConfig = (planId = 'free') =>
  plansConfig[planId] || plansConfig.free;

export const isUnlimited = (value) => value === null || value === undefined;

// ── Trial helpers ──────────────────────────────────────────────────
const TRIAL_DAYS = 7;

export const getTrialInfo = (org) => {
  if (!org) return { isTrial: false, expired: false, daysLeft: 0, effectivePlanId: 'free' };

  const status = org.status || 'active';
  const trialEndsAt = org.trialEndsAt;

  // Paid user or superAdmin — not on trial
  if (status === 'active' && !trialEndsAt) {
    return { isTrial: false, expired: false, daysLeft: 0, effectivePlanId: org.planId || 'free' };
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
      return { isTrial: false, expired: true, daysLeft: 0, effectivePlanId: 'free' };
    }

    return { isTrial: true, expired: false, daysLeft, effectivePlanId: org.planId || 'pro' };
  }

  // Fallback
  return { isTrial: false, expired: false, daysLeft: 0, effectivePlanId: org.planId || 'free' };
};

export const TRIAL_DURATION_DAYS = TRIAL_DAYS;

export default plansConfig;
