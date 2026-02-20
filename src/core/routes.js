/**
 * Mapa centralizado de rotas do app.
 * Cada entrada vincula o antigo "tab id" ao path real.
 */
const ROUTES = [
  { id: 'dashboard',          path: '/app',                   label: 'Dashboard' },
  { id: 'stock_points',       path: '/app/pontos',            label: 'Ponto de Estocagem' },
  { id: 'designer',           path: '/app/designer',          label: 'Engenharia de Etiquetas' },
  { id: 'operation',          path: '/app/ajuste',            label: 'Ajuste Rápido' },
  { id: 'movement_internal',  path: '/app/movimentacao',      label: 'Movimentação de Carga' },
  { id: 'reports',            path: '/app/relatorios',        label: 'Relatórios' },
  { id: 'team',               path: '/app/equipe',            label: 'Equipe' },
  { id: 'settings',           path: '/app/configuracoes',     label: 'Configurações' },
];

/** path → id */
export const pathToTabId = Object.fromEntries(ROUTES.map((r) => [r.path, r.id]));

/** id → path */
export const tabIdToPath = Object.fromEntries(ROUTES.map((r) => [r.id, r.path]));

export default ROUTES;
