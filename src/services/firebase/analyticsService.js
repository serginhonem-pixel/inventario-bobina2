import * as stockService from './stockService';
import * as itemService from './itemService';

// Função mock para simular o cálculo de giro de estoque (Curva ABC)
export const getStockTurnoverData = async (tenantId, schemaId) => {
  // Em um ambiente real, esta função faria um cálculo complexo baseado em vendas e estoque.
  // Aqui, simulamos dados para a visualização.
  const items = await itemService.getItemsBySchema(tenantId, schemaId);
  
  // Simulação de dados de giro (A, B, C)
  const turnoverData = [
    { name: 'Alta (A)', value: Math.floor(items.length * 0.2), color: '#10b981' }, // 20% dos itens
    { name: 'Média (B)', value: Math.floor(items.length * 0.3), color: '#f59e0b' }, // 30% dos itens
    { name: 'Baixa (C)', value: Math.floor(items.length * 0.5), color: '#ef4444' }, // 50% dos itens
  ];

  return turnoverData;
};

// Função mock para simular itens com estoque crítico
export const getCriticalStockItems = async (tenantId, schemaId) => {
  const items = await itemService.getItemsBySchema(tenantId, schemaId);
  
  // Filtra e simula itens com estoque abaixo do mínimo (ou um valor baixo)
  const criticalItems = items
    .filter(item => (item.data.quantidade || 0) < 5)
    .slice(0, 5) // Top 5
    .map(item => ({
      name: item.data.descricao || item.data.nome || `Item ${item.id.slice(0, 4)}`,
      currentQty: item.data.quantidade || 0,
      minQty: item.data.estoque_minimo || 5
    }));

  return criticalItems;
};

// Função mock para simular a distribuição de estoque por ponto
export const getStockDistributionByPoint = async (tenantId) => {
  // Em um ambiente real, isso agregaria o estoque total por ponto de estocagem.
  // Aqui, simulamos dados.
  const distributionData = [
    { name: 'Almoxarifado Principal', value: 4500, color: '#10b981' },
    { name: 'Prateleira 3A', value: 1200, color: '#3b82f6' },
    { name: 'Estoque de Segurança', value: 800, color: '#f59e0b' },
    { name: 'Área de Devolução', value: 300, color: '#ef4444' },
  ];

  return distributionData;
};
