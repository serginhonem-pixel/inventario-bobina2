// Hierarquia de planos (índice define o nível de acesso)
const PLAN_HIERARCHY = ['expired', 'trial', 'pro', 'business', 'enterprise'];

const plansConfig = {
  trial: {
    id: 'trial',
    seatsMax: 3,
    stockPointsMax: 1,
    templatesMax: 3,
    features: ['labels', 'inventory', 'qrcode']
  },
  pro: {
    id: 'pro',
    seatsMax: 3,
    stockPointsMax: 1,
    templatesMax: 3,
    features: ['labels', 'inventory', 'qrcode']
  },
  business: {
    id: 'business',
    seatsMax: 10,
    stockPointsMax: 3,
    templatesMax: null,
    features: ['labels', 'inventory', 'qrcode', 'stock_adjust', 'stock_movement', 'multi_stock_points', 'reports']
  },
  enterprise: {
    id: 'enterprise',
    seatsMax: null,
    stockPointsMax: null,
    templatesMax: null,
    features: ['labels', 'inventory', 'qrcode', 'stock_adjust', 'stock_movement', 'multi_stock_points', 'reports', 'custom_branding']
  },
  expired: {
    id: 'expired',
    seatsMax: 1,
    stockPointsMax: 0,
    templatesMax: 0,
    features: []
  }
};

export const getPlanConfig = (planId = 'trial') =>
  plansConfig[planId] || plansConfig.trial;

export const isUnlimited = (value) => value === null || value === undefined;

/**
 * Verifica se o plano atual tem acesso a uma feature.
 * @param {string} planId  – id do plano efetivo
 * @param {string} feature – chave da feature (ex: 'stock_adjust')
 */
export const hasFeature = (planId, feature) => {
  const plan = plansConfig[planId] || plansConfig.trial;
  return (plan.features || []).includes(feature);
};

/**
 * Verifica se o plano atual atende ao nível mínimo exigido.
 * @param {string} currentPlanId – plano do usuário
 * @param {string} requiredPlanId – plano mínimo necessário
 */
export const meetsMinPlan = (currentPlanId, requiredPlanId) => {
  const current = PLAN_HIERARCHY.indexOf(currentPlanId);
  const required = PLAN_HIERARCHY.indexOf(requiredPlanId);
  if (current === -1 || required === -1) return false;
  return current >= required;
};

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

export { PLAN_HIERARCHY };
export default plansConfig;
