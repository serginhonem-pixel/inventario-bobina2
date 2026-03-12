import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Loader2, CheckCircle2, X, ArrowDownCircle, ArrowUpCircle, Clock, Package } from 'lucide-react';
import * as stockPointService from '../../services/firebase/stockPointService';
import * as stockService from '../../services/firebase/stockService';
import { isUnlimited } from '../../core/plansConfig';
import ConfirmModal from '../ui/ConfirmModal';

const StockPointManager = ({ tenantId, onSelectStockPoint, currentStockPoint, planConfig, currentCount = 0, onStockPointCreated, onStockPointDeleted }) => {
  const [stockPoints, setStockPoints] = useState([]);
  const [newPointName, setNewPointName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const stockPointsLimit = planConfig?.stockPointsMax;
  const limitReached = !isUnlimited(stockPointsLimit) && currentCount >= stockPointsLimit;

  useEffect(() => {
    loadStockPoints();
  }, [tenantId]);

  const loadStockPoints = async () => {
    setLoading(true);
    try {
      const loadedPoints = await stockPointService.getStockPointsByTenant(tenantId);
      setStockPoints(loadedPoints);
    } catch (err) {
      setError("Erro ao carregar pontos de estocagem.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStockPoint = async (e) => {
    e.preventDefault();
    if (!newPointName.trim()) return;
    if (limitReached) {
      setError("Limite de pontos de estocagem atingido para o seu plano.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newPoint = await stockPointService.createStockPoint(tenantId, newPointName.trim());
      setStockPoints([...stockPoints, newPoint]);
      setNewPointName('');
      onSelectStockPoint(newPoint);
      if (typeof onStockPointCreated === 'function') {
        onStockPointCreated(newPoint);
      }
    } catch (err) {
      setError("Erro ao criar ponto de estocagem.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStockPoint = (point) => {
    if (!point?.id) return;
    setConfirmDelete(point);
  };

  const executeDeleteStockPoint = async () => {
    const point = confirmDelete;
    if (!point) return;
    setConfirmDelete(null);
    setLoading(true);
    setError(null);
    try {
      await stockPointService.deleteStockPoint(point.id);
      setStockPoints((prev) => prev.filter((p) => p.id !== point.id));
      if (currentStockPoint?.id === point.id) {
        onSelectStockPoint(null);
      }
      if (typeof onStockPointDeleted === 'function') {
        onStockPointDeleted(point);
      }
    } catch (err) {
      const detail = err?.message || err?.code || '';
      setError(`Erro ao excluir ponto de estocagem.${detail ? ` (${detail})` : ''}`);
      console.error('Falha ao excluir stock point:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <MapPin className="text-emerald-500" size={20} /> Pontos de Estocagem
      </h2>

      <form onSubmit={handleCreateStockPoint} className="flex gap-2" data-guide="create-stock-point">
        <input 
          type="text" 
          placeholder="Novo Ponto (Ex: Almoxarifado A)"
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-emerald-500 outline-none"
          value={newPointName}
          onChange={(e) => setNewPointName(e.target.value)}
          disabled={loading}
        />
        <button 
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-400 text-black p-2.5 rounded-xl transition-all disabled:opacity-50"
          disabled={loading || !newPointName.trim() || limitReached}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
        </button>
      </form>

      {limitReached && (
        <p className="text-amber-400 text-xs">
          Limite de {stockPointsLimit} ponto(s) atingido. Para adicionar mais, faça upgrade do plano.
        </p>
      )}

      {error && <p className="text-rose-500 text-xs">{error}</p>}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {stockPoints.map(point => {
          const isActive = currentStockPoint?.id === point.id;
          return (
            <div
              key={point.id}
              className={`w-full p-3 rounded-xl transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectStockPoint(point)}
                className="flex-1 text-left flex items-center justify-between gap-2"
              >
                <span className="text-sm">{point.name}</span>
                {isActive && <CheckCircle2 size={16} />}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStockPoint(point)}
                className={`p-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-black/10 hover:bg-black/20 text-black'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-rose-400'
                }`}
                aria-label={`Excluir ${point.name}`}
                title="Excluir ponto"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      
      {stockPoints.length === 0 && !loading && (
        <p className="text-zinc-500 text-sm text-center">Nenhum ponto de estocagem criado.</p>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir ponto"
        message={`Tem certeza que deseja excluir o ponto "${confirmDelete?.name}"? Essa ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        onConfirm={executeDeleteStockPoint}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

const StockPointHistory = ({ stockPointId, tenantId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stockPointId) {
      loadLogs(stockPointId);
    } else {
      setLogs([]);
      setLoading(false);
    }
  }, [stockPointId]);

  const loadLogs = async (id) => {
    setLoading(true);
    try {
      const loadedLogs = await stockService.getStockLogsByStockPoint(id, tenantId);
      setLogs(loadedLogs);
    } catch (err) {
      console.error("Erro ao carregar logs do ponto de estocagem:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!stockPointId) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center">
        <p className="text-zinc-500 text-sm">Selecione um ponto de estocagem para ver o histórico.</p>
      </div>
    );
  }

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `há ${diffD}d`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-zinc-400" />
          <h3 className="text-lg font-bold text-white">Histórico</h3>
        </div>
        {logs.length > 0 && (
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">{logs.length} registro{logs.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-20">
          <Loader2 className="animate-spin text-emerald-500" size={24} />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8">
          <Package size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Nenhuma movimentação registrada neste ponto.</p>
        </div>
      ) : (
        <div className="relative max-h-[420px] overflow-y-auto pr-1 space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-zinc-800" />

          {logs.map((log, index) => {
            const diff = log.difference ?? (log.newQty - log.previousQty);
            const isEntry = diff > 0 || log.type === 'entry';
            const Icon = isEntry ? ArrowDownCircle : ArrowUpCircle;
            const label = isEntry ? 'ENTRADA' : 'SAÍDA';

            return (
              <div key={index} className="relative flex items-start gap-3 py-3 group">
                {/* Timeline dot */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isEntry ? 'bg-emerald-500/10 border border-emerald-500/30 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/30 group-hover:bg-rose-500/20'}`}>
                  <Icon size={18} className={isEntry ? 'text-emerald-500' : 'text-rose-500'} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 bg-zinc-950 rounded-xl border border-zinc-800 p-3 group-hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full ${isEntry ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                      {label}
                    </span>
                    <span className="text-[11px] text-zinc-600 flex-shrink-0">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-300 truncate">
                      {log.itemId ? (log.notes?.split('Ponto:')[0]?.trim() || label) : (log.notes || label)}
                    </p>
                    <span className={`text-sm font-black tabular-nums ml-2 ${isEntry ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isEntry ? '+' : ''}{diff} un
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockPointManager;
export { StockPointHistory };
