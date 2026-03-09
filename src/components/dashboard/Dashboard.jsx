import React, { useState, useEffect } from 'react';
import {
  BarChart3, AlertCircle, MapPin, Loader2, TrendingUp, TrendingDown,
  Package, Clock, AlertTriangle, Activity, ArrowRight, ScanLine,
  Printer, Shield, ShieldCheck, ShieldAlert, Plus
} from 'lucide-react';
import * as analyticsService from '../../services/firebase/analyticsService';

// ── Saúde do Inventário (gauge visual) ──────────────────────────────
const HealthScore = ({ summary, criticalCount }) => {
  const { totalItems, totalQty } = summary;
  if (totalItems === 0) return null;

  // Score: penaliza itens críticos, estoque zerado, falta de movimentação
  const criticalRatio = totalItems > 0 ? criticalCount / totalItems : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - criticalRatio * 300)));

  const color = score >= 75 ? 'emerald' : score >= 45 ? 'amber' : 'rose';
  const label = score >= 75 ? 'Saudável' : score >= 45 ? 'Atenção' : 'Crítico';
  const Icon = score >= 75 ? ShieldCheck : score >= 45 ? Shield : ShieldAlert;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex items-center gap-6">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="#27272a" strokeWidth="8" />
          <circle cx="48" cy="48" r="40" fill="none"
            stroke={score >= 75 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-black text-${color}-400`}>{score}</span>
        </div>
      </div>
      <div>
        <div className={`flex items-center gap-2 text-${color}-400 mb-1`}>
          <Icon size={18} />
          <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-zinc-400 text-sm">
          {totalItems.toLocaleString('pt-BR')} itens cadastrados, {totalQty.toLocaleString('pt-BR')} un em estoque.
          {criticalCount > 0 && <span className="text-rose-400"> {criticalCount} item(ns) em nível crítico.</span>}
        </p>
      </div>
    </div>
  );
};

// ── Ações Rápidas ───────────────────────────────────────────────────
const QuickActions = ({ onNavigate }) => {
  const actions = [
    { id: 'stock_points', icon: MapPin, label: 'Ponto de Estoque', desc: 'Gerenciar locais', color: 'emerald' },
    { id: 'designer', icon: Printer, label: 'Criar Etiqueta', desc: 'Design e impressão', color: 'blue' },
    { id: 'operation', icon: ScanLine, label: 'Ajuste Rápido', desc: 'Entrada e saída', color: 'amber' },
    { id: 'reports', icon: BarChart3, label: 'Relatórios', desc: 'Análise completa', color: 'violet' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((a) => (
        <button
          key={a.id}
          onClick={() => onNavigate?.(a.id)}
          className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <a.icon size={22} className={`text-${a.color}-500 mb-3`} />
          <p className="text-sm font-bold text-white">{a.label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{a.desc}</p>
          <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 mt-2 transition-colors" />
        </button>
      ))}
    </div>
  );
};

// ── Timeline de Atividade Recente ───────────────────────────────────
const ActivityTimeline = ({ movements }) => {
  if (!movements || movements.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Activity className="text-blue-500" size={20} /> Atividade Recente
        </h3>
        <div className="text-center py-8">
          <Clock className="text-zinc-700 mx-auto mb-3" size={32} />
          <p className="text-zinc-500 text-sm">Nenhuma movimentação registrada ainda.</p>
          <p className="text-zinc-600 text-xs mt-1">As ações de entrada e saída aparecerão aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Activity className="text-blue-500" size={20} /> Atividade Recente
      </h3>
      <div className="space-y-1">
        {movements.slice(0, 5).map((mov, idx) => {
          const isEntry = mov.difference > 0;
          return (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isEntry ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                {isEntry ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{mov.itemName}</p>
                <p className="text-xs text-zinc-500">
                  {mov.timestamp ? new Date(mov.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
              <span className={`text-sm font-bold ${isEntry ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isEntry ? '+' : ''}{mov.difference}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Welcome Hero (primeiro acesso / sem dados) ──────────────────────
const WelcomeHero = ({ onNavigate }) => (
  <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/30 border border-zinc-800 rounded-3xl p-8 md:p-10">
    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
      <div className="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center flex-shrink-0">
        <Package className="text-emerald-500" size={28} />
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-black text-white mb-1">Bem-vindo ao QtdApp!</h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
          Comece criando seu primeiro <strong className="text-zinc-300">ponto de estocagem</strong>, 
          depois cadastre ou importe seus itens. Em minutos você terá seu inventário organizado 
          com etiquetas profissionais e controle total.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <button
            onClick={() => onNavigate?.('stock_points')}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
          >
            <Plus size={16} /> Criar Ponto de Estoque
          </button>
          <button
            onClick={() => onNavigate?.('designer')}
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
          >
            <Printer size={16} /> Criar Etiqueta
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── Gráfico de Curva ABC ────────────────────────────────────────────
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

// ── Itens Críticos ──────────────────────────────────────────────────
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
              <p className="text-xs text-zinc-500">Atual / Mínimo</p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

// ── Distribuição de Estoque ─────────────────────────────────────────
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

const SummaryCards = ({ summary, isReportsView: _isReportsView = false }) => (
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
      <p className="text-xs text-zinc-500">{summary.countEntradas || 0} movimentações</p>
    </div>
    <div className="bg-zinc-900 border border-rose-800/50 rounded-2xl p-5">
      <p className="text-xs text-rose-500 uppercase font-bold tracking-widest flex items-center gap-1">
        <TrendingDown size={12} /> Saídas
      </p>
      <p className="text-2xl font-black text-rose-400 mt-2">{(summary.totalSaidas || 0).toLocaleString('pt-BR')}</p>
      <p className="text-xs text-zinc-500">{summary.countSaidas || 0} movimentações</p>
    </div>
  </div>
);


const EMPTY_SUMMARY = { totalItems: 0, totalQty: 0, criticalCount: 0, pointCount: 0, totalEntradas: 0, countEntradas: 0, totalSaidas: 0, countSaidas: 0 };

const Dashboard = ({ tenantId, currentSchema, view = 'dashboard', onNavigate }) => {
  const [turnoverData, setTurnoverData] = useState([]);
  const [criticalItems, setCriticalItems] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [topSkus, setTopSkus] = useState([]);
  const [stagnantItems, setStagnantItems] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [zeroStockItems, setZeroStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

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
      setTurnoverData(insights.turnover || []);
      setCriticalItems(insights.critical || []);
      setDistributionData(insights.distribution || []);
      setSummary(insights.summary || EMPTY_SUMMARY);
      setTopSkus(insights.topSkus || []);
      setStagnantItems(insights.stagnantItems || []);
      setRecentMovements(insights.recentMovements || []);
      setZeroStockItems(insights.zeroStockItems || []);
      setDataLoaded(true);
    } catch (err) {
      console.error("Erro ao carregar dados de BI:", err);
      // Não bloqueia — renderiza o dashboard com dados vazios + ações rápidas
      setDataLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  // Sem schema: Welcome Hero
  if (!currentSchema) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <WelcomeHero onNavigate={onNavigate} />
        <QuickActions onNavigate={onNavigate} />
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

  const hasData = dataLoaded && summary.totalItems > 0;
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
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs tracking-wider">
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
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs tracking-wider">
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
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs tracking-wider">
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
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs tracking-wider">
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
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs tracking-wider">
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
            <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs tracking-wider">
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

  // Dashboard: com cards, saúde, ações rápidas, gráficos e timeline
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!hasData && (
        <WelcomeHero onNavigate={onNavigate} />
      )}

      <QuickActions onNavigate={onNavigate} />

      {hasData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SummaryCards summary={summary} isReportsView={isReportsView} />
            </div>
            <HealthScore summary={summary} criticalCount={summary.criticalCount} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TurnoverChart data={turnoverData} />
            <CriticalItemsList data={criticalItems} />
            <ActivityTimeline movements={recentMovements} />
          </div>

          {distributionData.length > 0 && (
            <DistributionChart data={distributionData} />
          )}
        </>
      )}

      {!hasData && dataLoaded && (
        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-12 text-center">
          <Package className="text-zinc-700 mx-auto mb-3" size={40} />
          <p className="text-zinc-300 font-semibold">Seu inventário está vazio.</p>
          <p className="text-zinc-500 text-sm mt-2">Cadastre itens no ponto de estoque para ver seus indicadores aqui.</p>
        </div>
      )}

      {!dataLoaded && !loading && (
        <div className="bg-zinc-900 border border-amber-800/30 rounded-3xl p-6 flex items-center gap-4">
          <AlertCircle className="text-amber-500 flex-shrink-0" size={22} />
          <div className="flex-1">
            <p className="text-zinc-300 text-sm font-semibold">Não foi possível carregar os indicadores.</p>
            <p className="text-zinc-500 text-xs">A conexão pode estar instável. Use as ações acima normalmente.</p>
          </div>
          <button onClick={loadAnalytics} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 flex-shrink-0">
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
