import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Loader2, CheckCircle2, X } from 'lucide-react';
import * as stockPointService from '../../services/firebase/stockPointService';
import * as stockService from '../../services/firebase/stockService';
import { isUnlimited } from '../../core/plansConfig';

const StockPointManager = ({ tenantId, onSelectStockPoint, currentStockPoint, planConfig, currentCount = 0, onStockPointCreated }) => {
  const [stockPoints, setStockPoints] = useState([]);
  const [newPointName, setNewPointName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

      {error && <p className="text-rose-500 text-xs">{error}</p>}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {stockPoints.map(point => (
          <button
            key={point.id}
            onClick={() => onSelectStockPoint(point)}
            className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
              currentStockPoint?.id === point.id 
                ? 'bg-emerald-500 text-black font-bold' 
                : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            <span className="text-sm">{point.name}</span>
            {currentStockPoint?.id === point.id && <CheckCircle2 size={16} />}
          </button>
        ))}
      </div>
      
      {stockPoints.length === 0 && !loading && (
        <p className="text-zinc-500 text-sm text-center">Nenhum ponto de estocagem criado.</p>
      )}
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Histórico de Movimentação</h3>
      {loading ? (
        <div className="flex justify-center items-center h-20">
          <Loader2 className="animate-spin text-emerald-500" size={24} />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nenhuma movimentação registrada neste ponto.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-white">{log.notes || `Movimentação de ${log.difference > 0 ? 'Entrada' : 'Saída'}`}</p>
                <p className="text-[10px] text-zinc-500">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
              <span className={`text-xs font-black ${log.difference > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {log.difference > 0 ? `+${log.difference}` : log.difference} un
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockPointManager;
export { StockPointHistory };
