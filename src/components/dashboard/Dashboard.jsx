import React, { useState, useEffect } from 'react';
import { BarChart3, Package, AlertCircle, MapPin, Loader2 } from 'lucide-react';
import * as analyticsService from '../../services/firebase/analyticsService';

// Componente de Gráfico de Curva ABC (Simulado)
const TurnoverChart = ({ data }) => {
  // NOTA: Em um projeto real, você usaria uma biblioteca como Recharts ou Chart.js aqui.
  // Exemplo de uso de Recharts: <PieChart width={400} height={400}><Pie data={data} ... /></PieChart>
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <BarChart3 className="text-emerald-500" size={20} /> Giro de Estoque (Curva ABC)
      </h3>
      <div className="h-48 flex items-center justify-center bg-zinc-950 rounded-xl">
        <p className="text-zinc-500 text-sm">
          [Placeholder para Gráfico de Pizza/Barra]
        </p>
      </div>
      <div className="flex justify-around text-xs font-bold">
        {data.map(item => (
          <div key={item.name} className="text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }}></div>
            <p className="text-zinc-400">{item.name}</p>
            <p className="text-white">{item.value} Itens</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de Itens Críticos
const CriticalItemsList = ({ data }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
    <h3 className="text-lg font-bold text-white flex items-center gap-2">
      <AlertCircle className="text-rose-500" size={20} /> Itens em Estoque Crítico
    </h3>
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-4">Nenhum item em estoque crítico. Ótimo trabalho!</p>
      ) : (
        data.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <p className="text-sm text-white truncate">{item.name}</p>
            <div className="text-right">
              <p className="text-xs font-bold text-rose-500">{item.currentQty} / {item.minQty}</p>
              <p className="text-[10px] text-zinc-500">Atual / Mínimo</p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

// Componente de Distribuição de Estoque
const DistributionChart = ({ data }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
    <h3 className="text-lg font-bold text-white flex items-center gap-2">
      <MapPin className="text-blue-500" size={20} /> Distribuição de Estoque por Ponto
    </h3>
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.map((item, index) => (
        <div key={index} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm text-white">{item.name}</p>
            <p className="text-sm font-bold text-zinc-300">{item.value.toLocaleString('pt-BR')} un</p>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div 
              className="h-2 rounded-full" 
              style={{ width: `${(item.value / 5000) * 100}%`, backgroundColor: item.color }} // 5000 é um valor máximo de simulação
            ></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);


const Dashboard = ({ tenantId, currentSchema }) => {
  const [turnoverData, setTurnoverData] = useState([]);
  const [criticalItems, setCriticalItems] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentSchema) {
      loadAnalytics();
    } else {
      setLoading(false);
    }
  }, [currentSchema, tenantId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [turnover, critical, distribution] = await Promise.all([
        analyticsService.getStockTurnoverData(tenantId, currentSchema.id),
        analyticsService.getCriticalStockItems(tenantId, currentSchema.id),
        analyticsService.getStockDistributionByPoint(tenantId)
      ]);
      setTurnoverData(turnover);
      setCriticalItems(critical);
      setDistributionData(distribution);
    } catch (error) {
      console.error("Erro ao carregar dados de BI:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentSchema) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
        <p className="text-zinc-500">Selecione um catálogo para visualizar o Dashboard de BI.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TurnoverChart data={turnoverData} />
        <CriticalItemsList data={criticalItems} />
        <DistributionChart data={distributionData} />
      </div>
      
      {/* Aqui você pode adicionar mais gráficos ou relatórios */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
        <h3 className="text-xl font-bold text-white">Relatório de Produtividade (Placeholder)</h3>
        <p className="text-zinc-500 mt-2">Dados de produtividade de operadores e tempo médio de movimentação serão exibidos aqui.</p>
      </div>
    </div>
  );
};

export default Dashboard;
