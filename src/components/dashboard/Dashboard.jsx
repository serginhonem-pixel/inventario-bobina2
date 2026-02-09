import React, { useState, useEffect } from 'react';
import { BarChart3, AlertCircle, MapPin, Loader2, TrendingUp, TrendingDown, Package, Clock, AlertTriangle } from 'lucide-react';
import * as analyticsService from '../../services/firebase/analyticsService';

// Componente de Gráfico de Curva ABC
const TurnoverChart = ({ data }) => {
  const total = data.reduce((acc, item) => acc + (item.value || 0), 0);
  const hasData = total > 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <BarChart3 className="text-emerald-500" size={20} /> Giro de Estoque (Curva ABC)
      </h3>
      <div className="h-48 flex flex-col items-center justify-center bg-zinc-950 rounded-xl px-4">
        {hasData ? (
          <div className="w-full space-y-4">
            <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden flex">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="h-full"
                  style={{ width: `${((item.value || 0) / total) * 100}%`, backgroundColor: item.color }}
                  title={`${item.name}: ${item.value}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-zinc-400">
              {data.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                  <span className="ml-auto text-white font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-zinc-400 text-sm font-semibold">Sem dados suficientes para o gráfico.</p>
            <p className="text-zinc-600 text-xs mt-2">Adicione itens e registre movimentações para gerar a curva ABC.</p>
          </div>
        )}
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
const DistributionChart = ({ data }) => {
  const maxValue = Math.max(1, ...data.map(item => item.value || 0));
  return (
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
              style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  </div>
  );
};

const SummaryCards = ({ summary, isReportsView = false }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Total de Itens</p>
      <p className="text-2xl font-black text-white mt-2">{summary.totalItems.toLocaleString('pt-BR')}</p>
    </div>
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Quantidade Total</p>
      <p className="text-2xl font-black text-white mt-2">{summary.totalQty.toLocaleString('pt-BR')}</p>
    </div>
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Itens Críticos</p>
      <p className="text-2xl font-black text-rose-400 mt-2">{summary.criticalCount.toLocaleString('pt-BR')}</p>
    </div>
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Pontos com Estoque</p>
      <p className="text-2xl font-black text-white mt-2">{summary.pointCount.toLocaleString('pt-BR')}</p>
    </div>
    <div className="bg-zinc-900 border border-emerald-800/50 rounded-2xl p-5">
      <p className="text-xs text-emerald-500 uppercase font-bold tracking-widest flex items-center gap-1">
        <TrendingUp size={12} /> Entradas
      </p>
      <p className="text-2xl font-black text-emerald-400 mt-2">{(summary.totalEntradas || 0).toLocaleString('pt-BR')}</p>
      <p className="text-[10px] text-zinc-500">{summary.countEntradas || 0} movimentações</p>
    </div>
    <div className="bg-zinc-900 border border-rose-800/50 rounded-2xl p-5">
      <p className="text-xs text-rose-500 uppercase font-bold tracking-widest flex items-center gap-1">
        <TrendingDown size={12} /> Saídas
      </p>
      <p className="text-2xl font-black text-rose-400 mt-2">{(summary.totalSaidas || 0).toLocaleString('pt-BR')}</p>
      <p className="text-[10px] text-zinc-500">{summary.countSaidas || 0} movimentações</p>
    </div>
  </div>
);


const Dashboard = ({ tenantId, currentSchema, view = 'dashboard' }) => {
  const [turnoverData, setTurnoverData] = useState([]);
  const [criticalItems, setCriticalItems] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, totalQty: 0, criticalCount: 0, pointCount: 0, totalEntradas: 0, countEntradas: 0, totalSaidas: 0, countSaidas: 0 });
  const [topSkus, setTopSkus] = useState([]);
  const [stagnantItems, setStagnantItems] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [zeroStockItems, setZeroStockItems] = useState([]);
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
      const insights = await analyticsService.getDashboardInsights(tenantId, currentSchema.id);
      setTurnoverData(insights.turnover);
      setCriticalItems(insights.critical);
      setDistributionData(insights.distribution);
      setSummary(insights.summary);
      setTopSkus(insights.topSkus || []);
      setStagnantItems(insights.stagnantItems || []);
      setRecentMovements(insights.recentMovements || []);
      setZeroStockItems(insights.zeroStockItems || []);
    } catch (error) {
      console.error("Erro ao carregar dados de BI:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentSchema) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
        <p className="text-zinc-300 font-semibold">Seu dashboard está pronto para receber dados.</p>
        <p className="text-zinc-500 text-sm mt-2">Selecione um ponto de estocagem e importe itens para começar.</p>
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

  const isReportsView = view === 'reports';

  // Relatórios: somente tabelas e insights, sem cards e gráficos
  if (isReportsView) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Métricas em linha simples */}
        <div className="flex flex-wrap gap-4 text-sm text-zinc-400 border-b border-zinc-800 pb-4">
          <span><strong className="text-white">{summary.totalItems.toLocaleString('pt-BR')}</strong> itens cadastrados</span>
          <span className="text-zinc-600">|</span>
          <span><strong className="text-white">{summary.totalQty.toLocaleString('pt-BR')}</strong> unidades em estoque</span>
          <span className="text-zinc-600">|</span>
          <span><strong className="text-rose-400">{summary.criticalCount}</strong> itens críticos</span>
          <span className="text-zinc-600">|</span>
          <span><strong className="text-emerald-400">+{summary.totalEntradas || 0}</strong> entradas</span>
          <span className="text-zinc-600">|</span>
          <span><strong className="text-rose-400">-{summary.totalSaidas || 0}</strong> saídas</span>
        </div>

        {/* Top 10 SKUs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Package size={16} className="text-emerald-500" /> Top 10 SKUs em Estoque
          </h3>
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {topSkus.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-zinc-500">Sem dados.</td></tr>
              ) : topSkus.map((row, idx) => (
                <tr key={`sku-${idx}`} className="hover:bg-zinc-800/50">
                  <td className="p-3 text-zinc-500">{idx + 1}</td>
                  <td className="p-3 text-emerald-400 font-mono text-xs">{row.code}</td>
                  <td className="p-3 text-zinc-100">{row.name}</td>
                  <td className="p-3 text-right font-bold">{row.qty.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Itens Críticos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500" /> Itens em Estoque Crítico ({criticalItems.length})
          </h3>
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Atual</th>
                <th className="p-3 text-right">Mínimo</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {criticalItems.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-emerald-500">Nenhum item crítico. Ótimo!</td></tr>
              ) : criticalItems.map((item, idx) => (
                <tr key={`crit-${idx}`} className="hover:bg-zinc-800/50">
                  <td className="p-3 text-emerald-400 font-mono text-xs">{item.code || '-'}</td>
                  <td className="p-3 text-zinc-100">{item.name}</td>
                  <td className="p-3 text-right text-rose-400 font-bold">{item.currentQty}</td>
                  <td className="p-3 text-right">{item.minQty}</td>
                  <td className="p-3 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${item.currentQty <= 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {item.currentQty <= 0 ? 'Ruptura' : 'Baixo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Distribuição por Ponto */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" /> Distribuição por Ponto de Estocagem
          </h3>
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Ponto</th>
                <th className="p-3 text-right">Quantidade</th>
                <th className="p-3 text-right">% do Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {distributionData.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-zinc-500">Sem dados.</td></tr>
              ) : distributionData.map((row, idx) => (
                <tr key={`dist-${idx}`} className="hover:bg-zinc-800/50">
                  <td className="p-3 text-zinc-100">{row.name}</td>
                  <td className="p-3 text-right">{row.value.toLocaleString('pt-BR')} un</td>
                  <td className="p-3 text-right">{summary.totalQty > 0 ? ((row.value / summary.totalQty) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Últimas Movimentações */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" /> Últimas Movimentações
          </h3>
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Quantidade</th>
                <th className="p-3 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {recentMovements.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-zinc-500">Nenhuma movimentação registrada.</td></tr>
              ) : recentMovements.map((mov, idx) => (
                <tr key={`mov-${idx}`} className="hover:bg-zinc-800/50">
                  <td className="p-3 text-zinc-100">{mov.itemName}</td>
                  <td className="p-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${mov.difference > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {mov.difference > 0 ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-bold ${mov.difference > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {mov.difference > 0 ? '+' : ''}{mov.difference}
                  </td>
                  <td className="p-3 text-right text-zinc-500 text-xs">{mov.timestamp ? new Date(mov.timestamp).toLocaleDateString('pt-BR') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Itens Parados */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Itens Parados (Sem Movimentação)
          </h3>
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Qtd em Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {stagnantItems.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-emerald-500">Todos os itens tiveram movimentação.</td></tr>
              ) : stagnantItems.map((item, idx) => (
                <tr key={`stag-${idx}`} className="hover:bg-zinc-800/50">
                  <td className="p-3 text-amber-400 font-mono text-xs">{item.code}</td>
                  <td className="p-3 text-zinc-100">{item.name}</td>
                  <td className="p-3 text-right">{item.qty.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Itens em Ruptura */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500" /> Itens em Ruptura (Zerados)
          </h3>
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {zeroStockItems.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-emerald-500">Nenhum item zerado. Ótimo!</td></tr>
              ) : zeroStockItems.map((item, idx) => (
                <tr key={`zero-${idx}`} className="hover:bg-zinc-800/50">
                  <td className="p-3 text-rose-400 font-mono text-xs">{item.code}</td>
                  <td className="p-3 text-zinc-100">{item.name}</td>
                  <td className="p-3 text-right">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-rose-500/20 text-rose-400">Ruptura</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Dashboard: com cards e gráficos
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <SummaryCards summary={summary} isReportsView={isReportsView} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TurnoverChart data={turnoverData} />
        <CriticalItemsList data={criticalItems} />
        <DistributionChart data={distributionData} />
      </div>
    </div>
  );
};

export default Dashboard;
