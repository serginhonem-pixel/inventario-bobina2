import * as stockService from './stockService';
import * as itemService from './itemService';
import * as stockPointService from './stockPointService';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

const getItemQty = (item) => {
  const data = item?.data || {};
  return (
    toNumber(data.quantidade) ||
    toNumber(data.qtd) ||
    toNumber(data.estoque) ||
    toNumber(data.quantidade_atual) ||
    toNumber(data.saldo)
  );
};

const getItemMinQty = (item, fallback = 5) => {
  const data = item?.data || {};
  const min =
    toNumber(data.estoque_minimo) ||
    toNumber(data.minimo) ||
    toNumber(data.min_qty) ||
    toNumber(data.minimo_estoque);
  return min || fallback;
};

const buildTurnoverABC = (items) => {
  const withQty = items
    .map((item) => ({ item, qty: getItemQty(item) }))
    .sort((a, b) => b.qty - a.qty);

  const totalQty = withQty.reduce((acc, curr) => acc + curr.qty, 0);
  if (totalQty <= 0) {
    const totalItems = items.length;
    return [
      { name: 'Alta (A)', value: Math.floor(totalItems * 0.2), color: '#10b981' },
      { name: 'Média (B)', value: Math.floor(totalItems * 0.3), color: '#f59e0b' },
      { name: 'Baixa (C)', value: Math.max(0, totalItems - Math.floor(totalItems * 0.2) - Math.floor(totalItems * 0.3)), color: '#ef4444' }
    ];
  }

  let countA = 0;
  let countB = 0;
  let countC = 0;
  let cumulative = 0;

  withQty.forEach(({ qty }) => {
    cumulative += qty;
    const share = cumulative / totalQty;
    if (share <= 0.8) countA += 1;
    else if (share <= 0.95) countB += 1;
    else countC += 1;
  });

  return [
    { name: 'Alta (A)', value: countA, color: '#10b981' },
    { name: 'Média (B)', value: countB, color: '#f59e0b' },
    { name: 'Baixa (C)', value: countC, color: '#ef4444' }
  ];
};

// Função mock para simular o cálculo de giro de estoque (Curva ABC)
export const getStockTurnoverData = async (tenantId, schemaId) => {
  const items = await itemService.getItemsBySchema(tenantId, schemaId);
  return buildTurnoverABC(items);
};

// Função mock para simular itens com estoque crítico
export const getCriticalStockItems = async (tenantId, schemaId) => {
  const items = await itemService.getItemsBySchema(tenantId, schemaId);
  return items
    .map((item) => {
      const currentQty = getItemQty(item);
      const minQty = getItemMinQty(item, 5);
      return {
        name: item.data.descricao || item.data.nome || `Item ${item.id.slice(0, 4)}`,
        currentQty,
        minQty
      };
    })
    .filter((item) => item.currentQty <= item.minQty)
    .sort((a, b) => a.currentQty - b.currentQty)
    .slice(0, 8);
};

// Função mock para simular a distribuição de estoque por ponto
export const getStockDistributionByPoint = async (tenantId, schemaId) => {
  const [items, stockPoints] = await Promise.all([
    itemService.getItemsBySchema(tenantId, schemaId),
    stockPointService.getStockPointsByTenant(tenantId)
  ]);

  const nameById = new Map(stockPoints.map((p) => [p.id, p.name]));
  const totals = new Map();
  items.forEach((item) => {
    const key = item.stockPointId || 'no-point';
    const next = (totals.get(key) || 0) + getItemQty(item);
    totals.set(key, next);
  });

  const palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#06b6d4'];
  return Array.from(totals.entries())
    .map(([id, value], idx) => ({
      name: nameById.get(id) || (id === 'no-point' ? 'Sem ponto' : 'Ponto desconhecido'),
      value,
      color: palette[idx % palette.length]
    }))
    .sort((a, b) => b.value - a.value);
};

const getItemName = (item) => {
  const data = item?.data || {};
  return data.descricao || data.nome || data.produto || data.item || `Item ${(item?.id || '').slice(0, 6)}`;
};

const getItemCode = (item) => {
  const data = item?.data || {};
  return data.codigo || data.sku || data.cod || data.code || '-';
};

export const getDashboardInsights = async (tenantId, schemaId) => {
  const [items, stockPoints, stockLogs] = await Promise.all([
    itemService.getItemsBySchema(tenantId, schemaId),
    stockPointService.getStockPointsByTenant(tenantId),
    stockService.getStockLogsByTenant ? stockService.getStockLogsByTenant(tenantId) : Promise.resolve([])
  ]);

  const totalItems = items.length;
  const totalQty = items.reduce((acc, item) => acc + getItemQty(item), 0);
  const criticalCount = items.filter((item) => getItemQty(item) <= getItemMinQty(item, 5)).length;
  const pointCount = new Set(items.map((item) => item.stockPointId || 'no-point')).size;

  const turnover = buildTurnoverABC(items);

  const critical = items
    .map((item) => ({
      id: item.id,
      code: getItemCode(item),
      name: getItemName(item),
      currentQty: getItemQty(item),
      minQty: getItemMinQty(item, 5)
    }))
    .filter((item) => item.currentQty <= item.minQty)
    .sort((a, b) => a.currentQty - b.currentQty)
    .slice(0, 10);

  const distribution = await getStockDistributionByPoint(tenantId, schemaId);

  // Top 10 SKUs por quantidade em estoque
  const topSkus = items
    .map((item) => ({
      code: getItemCode(item),
      name: getItemName(item),
      qty: getItemQty(item)
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // Itens sem movimentação (parados) - itens que não aparecem nos logs recentes
  const itemIdsWithMovement = new Set(stockLogs.map((log) => log.itemId));
  const stagnantItems = items
    .filter((item) => !itemIdsWithMovement.has(item.id))
    .map((item) => ({
      code: getItemCode(item),
      name: getItemName(item),
      qty: getItemQty(item)
    }))
    .slice(0, 10);

  // Últimas movimentações
  const recentMovements = stockLogs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
    .map((log) => {
      const item = items.find((i) => i.id === log.itemId);
      return {
        itemName: item ? getItemName(item) : `ID: ${(log.itemId || '').slice(0, 6)}`,
        type: log.type || (log.difference > 0 ? 'entrada' : 'saida'),
        difference: log.difference || 0,
        timestamp: log.timestamp,
        notes: log.notes || ''
      };
    });

  // Resumo de entradas e saídas
  const movementSummary = stockLogs.reduce(
    (acc, log) => {
      const diff = log.difference || 0;
      if (diff > 0) {
        acc.totalEntradas += diff;
        acc.countEntradas += 1;
      } else if (diff < 0) {
        acc.totalSaidas += Math.abs(diff);
        acc.countSaidas += 1;
      }
      return acc;
    },
    { totalEntradas: 0, countEntradas: 0, totalSaidas: 0, countSaidas: 0 }
  );

  // Itens zerados (ruptura)
  const zeroStockItems = items
    .filter((item) => getItemQty(item) <= 0)
    .map((item) => ({
      code: getItemCode(item),
      name: getItemName(item)
    }))
    .slice(0, 10);

  return {
    summary: {
      totalItems,
      totalQty,
      criticalCount,
      pointCount,
      zeroStockCount: zeroStockItems.length,
      ...movementSummary
    },
    turnover,
    critical,
    distribution,
    topSkus,
    stagnantItems,
    recentMovements,
    zeroStockItems
  };
};
