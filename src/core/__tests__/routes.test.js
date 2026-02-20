import { describe, it, expect } from 'vitest';
import ROUTES, { pathToTabId, tabIdToPath } from '../routes';

describe('routes config', () => {
  it('exporta array com pelo menos 7 rotas', () => {
    expect(Array.isArray(ROUTES)).toBe(true);
    expect(ROUTES.length).toBeGreaterThanOrEqual(7);
  });

  it('cada rota tem id, path e label', () => {
    ROUTES.forEach((route) => {
      expect(route).toHaveProperty('id');
      expect(route).toHaveProperty('path');
      expect(route).toHaveProperty('label');
      expect(route.path).toMatch(/^\/app/);
    });
  });

  it('pathToTabId mapeia path → id corretamente', () => {
    expect(pathToTabId['/app']).toBe('dashboard');
    expect(pathToTabId['/app/pontos']).toBe('stock_points');
    expect(pathToTabId['/app/designer']).toBe('designer');
    expect(pathToTabId['/app/ajuste']).toBe('operation');
    expect(pathToTabId['/app/movimentacao']).toBe('movement_internal');
    expect(pathToTabId['/app/relatorios']).toBe('reports');
    expect(pathToTabId['/app/equipe']).toBe('team');
    expect(pathToTabId['/app/configuracoes']).toBe('settings');
  });

  it('tabIdToPath mapeia id → path corretamente', () => {
    expect(tabIdToPath['dashboard']).toBe('/app');
    expect(tabIdToPath['stock_points']).toBe('/app/pontos');
    expect(tabIdToPath['designer']).toBe('/app/designer');
    expect(tabIdToPath['operation']).toBe('/app/ajuste');
    expect(tabIdToPath['movement_internal']).toBe('/app/movimentacao');
    expect(tabIdToPath['reports']).toBe('/app/relatorios');
    expect(tabIdToPath['team']).toBe('/app/equipe');
    expect(tabIdToPath['settings']).toBe('/app/configuracoes');
  });

  it('pathToTabId e tabIdToPath são inversos', () => {
    ROUTES.forEach((route) => {
      expect(pathToTabId[tabIdToPath[route.id]]).toBe(route.id);
      expect(tabIdToPath[pathToTabId[route.path]]).toBe(route.path);
    });
  });
});
