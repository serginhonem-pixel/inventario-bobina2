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

export default plansConfig;
