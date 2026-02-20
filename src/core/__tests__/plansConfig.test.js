import { describe, it, expect } from 'vitest';
import plansConfig, {
  getPlanConfig,
  isUnlimited,
  getTrialInfo,
  TRIAL_DURATION_DAYS
} from '../plansConfig';

// ── getPlanConfig ───────────────────────────────────────────────────

describe('getPlanConfig', () => {
  it('retorna plano free como padrão', () => {
    const plan = getPlanConfig();
    expect(plan.id).toBe('free');
    expect(plan.seatsMax).toBe(3);
    expect(plan.stockPointsMax).toBe(1);
    expect(plan.templatesMax).toBe(1);
  });

  it('retorna plano correto por ID', () => {
    expect(getPlanConfig('pro').id).toBe('pro');
    expect(getPlanConfig('pro').templatesMax).toBe(3);

    expect(getPlanConfig('business').id).toBe('business');
    expect(getPlanConfig('business').seatsMax).toBe(10);
    expect(getPlanConfig('business').stockPointsMax).toBe(3);

    expect(getPlanConfig('enterprise').id).toBe('enterprise');
    expect(getPlanConfig('enterprise').seatsMax).toBeNull();
  });

  it('retorna free para ID inválido', () => {
    expect(getPlanConfig('invalid').id).toBe('free');
    expect(getPlanConfig('').id).toBe('free');
    expect(getPlanConfig(null).id).toBe('free');
  });

  it('enterprise tem todos os limites null (ilimitado)', () => {
    const plan = getPlanConfig('enterprise');
    expect(plan.seatsMax).toBeNull();
    expect(plan.stockPointsMax).toBeNull();
    expect(plan.templatesMax).toBeNull();
  });
});

// ── isUnlimited ─────────────────────────────────────────────────────

describe('isUnlimited', () => {
  it('retorna true para null e undefined', () => {
    expect(isUnlimited(null)).toBe(true);
    expect(isUnlimited(undefined)).toBe(true);
  });

  it('retorna false para valores numéricos', () => {
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(1)).toBe(false);
    expect(isUnlimited(10)).toBe(false);
  });

  it('retorna false para outros tipos', () => {
    expect(isUnlimited('')).toBe(false);
    expect(isUnlimited(false)).toBe(false);
  });
});

// ── TRIAL_DURATION_DAYS ─────────────────────────────────────────────

describe('TRIAL_DURATION_DAYS', () => {
  it('é 7 dias', () => {
    expect(TRIAL_DURATION_DAYS).toBe(7);
  });
});

// ── plansConfig object ──────────────────────────────────────────────

describe('plansConfig', () => {
  it('contém os 4 planos', () => {
    expect(Object.keys(plansConfig)).toHaveLength(4);
    expect(plansConfig).toHaveProperty('free');
    expect(plansConfig).toHaveProperty('pro');
    expect(plansConfig).toHaveProperty('business');
    expect(plansConfig).toHaveProperty('enterprise');
  });

  it('planos pagos têm limites >= planos anteriores', () => {
    expect(plansConfig.pro.templatesMax).toBeGreaterThanOrEqual(plansConfig.free.templatesMax);
    expect(plansConfig.business.seatsMax).toBeGreaterThan(plansConfig.pro.seatsMax);
  });
});

// ── getTrialInfo ────────────────────────────────────────────────────

describe('getTrialInfo', () => {
  it('retorna estado padrão para org nula', () => {
    const info = getTrialInfo(null);
    expect(info).toEqual({
      isTrial: false,
      expired: false,
      daysLeft: 0,
      effectivePlanId: 'free'
    });
  });

  it('retorna estado padrão para undefined', () => {
    const info = getTrialInfo(undefined);
    expect(info.effectivePlanId).toBe('free');
    expect(info.isTrial).toBe(false);
  });

  it('retorna plano ativo sem trial quando status=active e sem trialEndsAt', () => {
    const info = getTrialInfo({ status: 'active', planId: 'business' });
    expect(info).toEqual({
      isTrial: false,
      expired: false,
      daysLeft: 0,
      effectivePlanId: 'business'
    });
  });

  it('retorna free quando status=active sem planId e sem trial', () => {
    expect(getTrialInfo({ status: 'active' }).effectivePlanId).toBe('free');
  });

  it('detecta trial ativo com trialEndsAt no futuro (número)', () => {
    const futureMs = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 dias
    const info = getTrialInfo({
      status: 'trialing',
      planId: 'pro',
      trialEndsAt: futureMs
    });
    expect(info.isTrial).toBe(true);
    expect(info.expired).toBe(false);
    expect(info.daysLeft).toBeGreaterThanOrEqual(2);
    expect(info.daysLeft).toBeLessThanOrEqual(3);
    expect(info.effectivePlanId).toBe('pro');
  });

  it('detecta trial expirado com trialEndsAt no passado', () => {
    const pastMs = Date.now() - 24 * 60 * 60 * 1000; // 1 dia atrás
    const info = getTrialInfo({
      status: 'trialing',
      planId: 'pro',
      trialEndsAt: pastMs
    });
    expect(info.isTrial).toBe(false);
    expect(info.expired).toBe(true);
    expect(info.daysLeft).toBe(0);
    expect(info.effectivePlanId).toBe('free');
  });

  it('lida com trialEndsAt como objeto Firestore (toMillis)', () => {
    const futureMs = Date.now() + 5 * 24 * 60 * 60 * 1000;
    const firestoreTs = { toMillis: () => futureMs };
    const info = getTrialInfo({
      status: 'trialing',
      planId: 'pro',
      trialEndsAt: firestoreTs
    });
    expect(info.isTrial).toBe(true);
    expect(info.daysLeft).toBeGreaterThanOrEqual(4);
  });

  it('lida com trialEndsAt como objeto com toDate()', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const firestoreTs = { toDate: () => futureDate };
    const info = getTrialInfo({
      status: 'trialing',
      planId: 'pro',
      trialEndsAt: firestoreTs
    });
    expect(info.isTrial).toBe(true);
    expect(info.daysLeft).toBeGreaterThanOrEqual(1);
  });

  it('lida com trialEndsAt como ISO string', () => {
    const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const info = getTrialInfo({
      status: 'trialing',
      planId: 'pro',
      trialEndsAt: futureDate.toISOString()
    });
    expect(info.isTrial).toBe(true);
    expect(info.daysLeft).toBeGreaterThanOrEqual(3);
  });

  it('retorna effectivePlanId "pro" se planId não definido em trial ativo', () => {
    const futureMs = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const info = getTrialInfo({ status: 'trialing', trialEndsAt: futureMs });
    expect(info.effectivePlanId).toBe('pro');
  });

  it('fallback retorna planId da org ou free', () => {
    const info = getTrialInfo({ status: 'canceled', planId: 'business' });
    expect(info.effectivePlanId).toBe('business');
  });
});
