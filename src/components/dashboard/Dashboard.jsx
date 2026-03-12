import React, { useState, useEffect } from 'react';
import {
  BarChart3, AlertCircle, MapPin, Loader2, TrendingUp, TrendingDown,
  Package, Clock, AlertTriangle, Activity, ArrowRight, ScanLine,
  Printer, Shield, ShieldCheck, ShieldAlert, Plus, FileSpreadsheet, FileText
} from 'lucide-react';
import * as analyticsService from '../../services/firebase/analyticsService';
import { exportTableToExcel, exportTableToPDF } from '../../services/export/exportService';

const ExportButtons = ({ onExcel, onPdf }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={onExcel}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500/20"
    >
      <FileSpreadsheet size={13} /> Excel
    </button>
    <button
      type="button"
      onClick={onPdf}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-400 transition hover:bg-rose-500/20"
    >
      <FileText size={13} /> PDF
    </button>
  </div>
);

const ReportHero = ({ summary, onExcel, onPdf }) => (
  <div className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-6 md:p-7">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300">
          <BarChart3 size={12} /> Central Analitica
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
          Relatorios prontos para operacao, auditoria e apresentacao.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Consolide estoque, rupturas e movimentacoes em um painel com exportacao imediata para Excel e PDF.
        </p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-black/25 p-4 md:min-w-[320px]">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Itens</p>
            <p className="mt-1 text-2xl font-black text-white">{summary.totalItems.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Volume</p>
            <p className="mt-1 text-2xl font-black text-white">{summary.totalQty.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs">
          <span className="text-zinc-500">Panorama consolidado</span>
          <span className="font-bold text-emerald-400">+{summary.totalEntradas || 0}</span>
          <span className="font-bold text-rose-400">-{summary.totalSaidas || 0}</span>
        </div>
        <ExportButtons onExcel={onExcel} onPdf={onPdf} />
      </div>
    </div>
  </div>
);

const ReportMetricCard = ({ label, value, tone = 'zinc', hint, icon: Icon }) => {
  const toneClasses = {
    emerald: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300',
    rose: 'border-rose-500/20 bg-rose-500/8 text-rose-300',
    amber: 'border-amber-500/20 bg-amber-500/8 text-amber-300',
    blue: 'border-sky-500/20 bg-sky-500/8 text-sky-300',
    zinc: 'border-zinc-800 bg-zinc-900 text-zinc-200',
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone] || toneClasses.zinc}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
          {hint ? <p className="mt-2 text-xs text-zinc-400">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-xl border border-current/10 bg-black/20 p-2.5">
            <Icon size={16} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ReportSection = ({ eyebrow, title, description, actions, children, accent = 'emerald' }) => {
  const accentMap = {
    emerald: 'from-emerald-500/18 to-transparent border-emerald-500/15',
    rose: 'from-rose-500/18 to-transparent border-rose-500/15',
    blue: 'from-sky-500/18 to-transparent border-sky-500/15',
    amber: 'from-amber-500/18 to-transparent border-amber-500/15',
  };

  return (
    <section className={`rounded-[26px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),linear-gradient(135deg,var(--tw-gradient-stops))] ${accentMap[accent] || accentMap.emerald} bg-zinc-900/88 p-5 md:p-6`}>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">{eyebrow}</p>
          <h3 className="mt-2 text-lg font-black text-white">{title}</h3>
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
};

const ReportsTable = ({ columns, rows, emptyMessage, rowKey, compact = false }) => (
  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/25">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm text-zinc-300">
        <thead className="bg-zinc-950/95 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-zinc-500">
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row, index) : index} className="transition hover:bg-white/[0.03]">
              {columns.map((column) => {
                const content = typeof column.render === 'function'
                  ? column.render(row, index)
                  : row?.[column.key];
                return (
                  <td key={column.label} className={`px-4 ${compact ? 'py-3' : 'py-3.5'} ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

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
  const reportMeta = {
    Relatorio: currentSchema?.name || 'QtdApp',
    GeradoEm: new Date().toLocaleString('pt-BR'),
  };
  const topSkuColumns = [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Descricao' },
    { key: 'qty', label: 'Quantidade' },
  ];
  const criticalColumns = [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Descricao' },
    { key: 'currentQty', label: 'Atual' },
    { key: 'minQty', label: 'Minimo' },
    { label: 'Status', value: (row) => (row.currentQty <= 0 ? 'Ruptura' : 'Baixo') },
  ];
  const distributionColumns = [
    { key: 'name', label: 'Ponto' },
    { key: 'value', label: 'Quantidade' },
    { label: '% do Total', value: (row) => `${summary.totalQty > 0 ? ((row.value / summary.totalQty) * 100).toFixed(1) : '0.0'}%` },
  ];
  const movementColumns = [
    { key: 'itemName', label: 'Item' },
    { label: 'Tipo', value: (row) => (row.difference > 0 ? 'Entrada' : 'Saída') },
    { key: 'difference', label: 'Quantidade' },
    { label: 'Data', value: (row) => (row.timestamp ? new Date(row.timestamp).toLocaleDateString('pt-BR') : '-') },
  ];
  const stagnantColumns = [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Descricao' },
    { key: 'qty', label: 'Qtd em Estoque' },
  ];
  const zeroColumns = [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Descricao' },
    { label: 'Status', value: () => 'Ruptura' },
  ];
  const consolidatedRows = [
    ...topSkus.map((row) => ({ secao: 'Top SKUs', ...row })),
    ...criticalItems.map((row) => ({ secao: 'Itens Criticos', ...row })),
    ...distributionData.map((row) => ({ secao: 'Distribuicao', ...row })),
    ...recentMovements.map((row) => ({ secao: 'Movimentacoes', ...row })),
  ];
  const consolidatedColumns = [
    { key: 'secao', label: 'Secao' },
    { label: 'Ref', value: (row) => row.code || row.name || '-' },
    { label: 'Descricao', value: (row) => row.itemName || row.name || '-' },
    { label: 'Valor 1', value: (row) => row.qty ?? row.currentQty ?? row.value ?? row.difference ?? '-' },
    { label: 'Valor 2', value: (row) => row.minQty ?? (row.timestamp ? new Date(row.timestamp).toLocaleDateString('pt-BR') : '-') },
  ];

  // Relatórios: somente tabelas e insights, sem cards e gráficos
  if (isReportsView) {
    const topSkuRows = topSkus.map((row, idx) => ({ ...row, rank: idx + 1 }));
    const criticalRows = criticalItems.map((item) => ({
      ...item,
      status: item.currentQty <= 0 ? 'Ruptura' : 'Baixo',
    }));
    const distributionRows = distributionData.map((row) => ({
      ...row,
      share: `${summary.totalQty > 0 ? ((row.value / summary.totalQty) * 100).toFixed(1) : '0.0'}%`,
    }));
    const movementRows = recentMovements.map((row) => ({
      ...row,
      flow: row.difference > 0 ? 'Entrada' : 'Saida',
      dateLabel: row.timestamp ? new Date(row.timestamp).toLocaleDateString('pt-BR') : '-',
    }));
    const stagnantRows = stagnantItems;
    const zeroRows = zeroStockItems.map((row) => ({ ...row, status: 'Ruptura' }));

    const topSkuTableColumns = [
      { label: '#', render: (row) => <span className="text-zinc-500">{row.rank}</span> },
      { label: 'Codigo', render: (row) => <span className="font-mono text-xs font-bold text-emerald-400">{row.code}</span> },
      { label: 'Descricao', render: (row) => <span className="font-medium text-zinc-100">{row.name}</span> },
      { label: 'Quantidade', align: 'right', render: (row) => <span className="font-bold text-white">{row.qty.toLocaleString('pt-BR')}</span> },
    ];
    const criticalTableColumns = [
      { label: 'Codigo', render: (row) => <span className="font-mono text-xs font-bold text-rose-300">{row.code || '-'}</span> },
      { label: 'Descricao', render: (row) => <span className="font-medium text-zinc-100">{row.name}</span> },
      { label: 'Atual', align: 'right', render: (row) => <span className="font-bold text-rose-400">{row.currentQty}</span> },
      { label: 'Minimo', align: 'right', render: (row) => <span className="text-zinc-300">{row.minQty}</span> },
      {
        label: 'Status',
        align: 'right',
        render: (row) => (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${row.status === 'Ruptura' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>
            {row.status}
          </span>
        )
      },
    ];
    const distributionTableColumns = [
      { label: 'Ponto', render: (row) => <span className="font-medium text-zinc-100">{row.name}</span> },
      { label: 'Quantidade', align: 'right', render: (row) => <span className="font-bold text-white">{row.value.toLocaleString('pt-BR')} un</span> },
      { label: '% do Total', align: 'right', render: (row) => <span className="text-sky-300">{row.share}</span> },
    ];
    const movementTableColumns = [
      { label: 'Item', render: (row) => <span className="font-medium text-zinc-100">{row.itemName}</span> },
      {
        label: 'Fluxo',
        render: (row) => (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${row.flow === 'Entrada' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
            {row.flow}
          </span>
        )
      },
      { label: 'Quantidade', align: 'right', render: (row) => <span className={row.difference > 0 ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'}>{row.difference > 0 ? '+' : ''}{row.difference}</span> },
      { label: 'Data', align: 'right', render: (row) => <span className="text-zinc-400">{row.dateLabel}</span> },
    ];
    const stagnantTableColumns = [
      { label: 'Codigo', render: (row) => <span className="font-mono text-xs font-bold text-amber-300">{row.code}</span> },
      { label: 'Descricao', render: (row) => <span className="font-medium text-zinc-100">{row.name}</span> },
      { label: 'Qtd em Estoque', align: 'right', render: (row) => <span className="font-bold text-white">{row.qty.toLocaleString('pt-BR')}</span> },
    ];
    const zeroTableColumns = [
      { label: 'Codigo', render: (row) => <span className="font-mono text-xs font-bold text-rose-300">{row.code}</span> },
      { label: 'Descricao', render: (row) => <span className="font-medium text-zinc-100">{row.name}</span> },
      { label: 'Status', align: 'right', render: (row) => <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-300">{row.status}</span> },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <ReportHero
          summary={summary}
          onExcel={() => exportTableToExcel(consolidatedRows, consolidatedColumns, 'relatorio_geral_qtdapp.csv', reportMeta)}
          onPdf={() => exportTableToPDF(consolidatedRows, consolidatedColumns, 'Relatorio Geral QtdApp', reportMeta)}
        />

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <ReportMetricCard label="Itens cadastrados" value={summary.totalItems.toLocaleString('pt-BR')} hint="Base ativa para analise" icon={Package} />
          <ReportMetricCard label="Volume em estoque" value={summary.totalQty.toLocaleString('pt-BR')} hint="Unidades consolidadas" icon={BarChart3} tone="blue" />
          <ReportMetricCard label="Itens criticos" value={summary.criticalCount.toLocaleString('pt-BR')} hint="Abaixo do minimo" icon={AlertCircle} tone="rose" />
          <ReportMetricCard label="Entradas" value={`+${(summary.totalEntradas || 0).toLocaleString('pt-BR')}`} hint={`${summary.countEntradas || 0} movimentacoes`} icon={TrendingUp} tone="emerald" />
          <ReportMetricCard label="Saidas" value={`-${(summary.totalSaidas || 0).toLocaleString('pt-BR')}`} hint={`${summary.countSaidas || 0} movimentacoes`} icon={TrendingDown} tone="amber" />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7 space-y-6">
            <ReportSection
              eyebrow="Performance de estoque"
              title="Top 10 SKUs em estoque"
              description="Itens com maior peso operacional no saldo atual."
              accent="emerald"
              actions={<ExportButtons onExcel={() => exportTableToExcel(topSkus, topSkuColumns, 'top_skus_estoque.csv', reportMeta)} onPdf={() => exportTableToPDF(topSkus, topSkuColumns, 'Top 10 SKUs em Estoque', reportMeta)} />}
            >
              <ReportsTable columns={topSkuTableColumns} rows={topSkuRows} emptyMessage="Sem dados." rowKey={(row) => row.code} />
            </ReportSection>

            <ReportSection
              eyebrow="Monitoramento"
              title={`Ultimas movimentacoes`}
              description="Leitura rapida das entradas e saidas mais recentes."
              accent="blue"
              actions={<ExportButtons onExcel={() => exportTableToExcel(recentMovements, movementColumns, 'ultimas_movimentacoes.csv', reportMeta)} onPdf={() => exportTableToPDF(recentMovements, movementColumns, 'Ultimas Movimentacoes', reportMeta)} />}
            >
              <ReportsTable columns={movementTableColumns} rows={movementRows} emptyMessage="Nenhuma movimentacao registrada." rowKey={(_, index) => index} />
            </ReportSection>

            <ReportSection
              eyebrow="Capacidade por local"
              title="Distribuicao por ponto de estocagem"
              description="Participacao de cada ponto sobre o volume total armazenado."
              accent="blue"
              actions={<ExportButtons onExcel={() => exportTableToExcel(distributionData, distributionColumns, 'distribuicao_por_ponto.csv', reportMeta)} onPdf={() => exportTableToPDF(distributionData, distributionColumns, 'Distribuicao por Ponto de Estocagem', reportMeta)} />}
            >
              <ReportsTable columns={distributionTableColumns} rows={distributionRows} emptyMessage="Sem dados." rowKey={(row) => row.name} compact />
            </ReportSection>
          </div>

          <div className="xl:col-span-5 space-y-6">
            <ReportSection
              eyebrow="Risco"
              title={`Itens em estoque critico (${criticalItems.length})`}
              description="Produtos abaixo do minimo configurado e com risco de ruptura."
              accent="rose"
              actions={<ExportButtons onExcel={() => exportTableToExcel(criticalItems, criticalColumns, 'itens_criticos.csv', reportMeta)} onPdf={() => exportTableToPDF(criticalItems, criticalColumns, 'Itens em Estoque Critico', reportMeta)} />}
            >
              <ReportsTable columns={criticalTableColumns} rows={criticalRows} emptyMessage="Nenhum item critico. Otimo." rowKey={(row) => `${row.code}-${row.name}`} compact />
            </ReportSection>

            <ReportSection
              eyebrow="Inercia operacional"
              title="Itens parados"
              description="SKUs sem movimentacao recente e com capital imobilizado."
              accent="amber"
              actions={<ExportButtons onExcel={() => exportTableToExcel(stagnantItems, stagnantColumns, 'itens_parados.csv', reportMeta)} onPdf={() => exportTableToPDF(stagnantItems, stagnantColumns, 'Itens Parados', reportMeta)} />}
            >
              <ReportsTable columns={stagnantTableColumns} rows={stagnantRows} emptyMessage="Todos os itens tiveram movimentacao." rowKey={(row) => row.code} compact />
            </ReportSection>

            <ReportSection
              eyebrow="Ruptura"
              title="Itens zerados"
              description="Itens sem saldo disponivel no momento."
              accent="rose"
              actions={<ExportButtons onExcel={() => exportTableToExcel(zeroStockItems, zeroColumns, 'itens_ruptura.csv', reportMeta)} onPdf={() => exportTableToPDF(zeroStockItems, zeroColumns, 'Itens em Ruptura', reportMeta)} />}
            >
              <ReportsTable columns={zeroTableColumns} rows={zeroRows} emptyMessage="Nenhum item zerado. Otimo." rowKey={(row) => row.code} compact />
            </ReportSection>
          </div>
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
