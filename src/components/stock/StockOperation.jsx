import React, { useState, useEffect, useMemo } from 'react';
import { Search, Camera, Package, Plus, Minus, Save, CheckCircle2, Loader2, History, ArrowRight, ShieldCheck, ScanLine } from 'lucide-react';
import { saveAdjustment, getStockLogs } from '../../services/firebase/stockService';
import { findItemByTerm } from '../../core/utils';
import { ClipboardList, Play, Check } from 'lucide-react';
import { 
  applyInventoryAdjustments,
  closeInventorySession,
  getActiveInventorySession,
  getInventoryCount,
  getInventorySummary,
  saveInventoryCount,
  startInventorySession
} from '../../services/firebase/inventoryService';
import BarcodeScanner from './BarcodeScanner';
import { sendWhatsAppAlert } from '../../services/notifications/whatsappService';
import { toast } from '../ui/toast';
import { resolveItemQty } from '../../core/utils';

const StockOperation = ({ items, schema, tenantId, currentStockPoint, onItemsUpdated, currentUserId }) => {
  const [mode, setMode] = useState('adjust'); // adjust | inventory
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQty, setNewQty] = useState(0);
  const [baselineQty, setBaselineQty] = useState(0);
  const [countedQty, setCountedQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [history, setHistory] = useState([]);
  const [inventorySession, setInventorySession] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [applyArmed, setApplyArmed] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [inventorySummary, setInventorySummary] = useState({ total: 0, counted: 0, divergences: 0 });

  // resolveItemQty importado de core/utils

  useEffect(() => {
    if (!currentStockPoint?.id || !tenantId) {
      setInventorySession(null);
      return;
    }
    let active = true;
    const loadSession = async () => {
      try {
        const session = await getActiveInventorySession(tenantId, currentStockPoint.id);
        if (!active) return;
        setInventorySession(session);
        if (session) {
          setMode('inventory');
          const summary = await getInventorySummary(tenantId, session.id);
          if (active) setInventorySummary(summary);
        } else {
          setInventorySummary({ total: 0, counted: 0, divergences: 0 });
        }
      } catch (error) {
        console.error('Erro ao carregar sessão de inventário:', error);
      }
    };
    loadSession();
    return () => {
      active = false;
    };
  }, [tenantId, currentStockPoint?.id]);

  useEffect(() => {
    if (!selectedItem) return;
    if (mode === 'adjust') {
      const currentQty = resolveItemQty(selectedItem);
      setNewQty(currentQty);
      loadHistory(selectedItem.id);
    }
    if (mode === 'inventory' && inventorySession?.id) {
      loadInventoryCount(selectedItem.id);
    }
  }, [selectedItem, mode, inventorySession?.id]);

  useEffect(() => {
    setApplyArmed(false);
  }, [inventorySession?.id, mode]);

  const loadHistory = async (itemId) => {
    try {
      const logs = await getStockLogs(itemId, tenantId);
      setHistory(logs || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const loadInventoryCount = async (itemId) => {
    if (!inventorySession?.id) return;
    setCountLoading(true);
    try {
      const count = await getInventoryCount(tenantId, inventorySession.id, itemId);
      if (!count) {
        const fallback = resolveItemQty(selectedItem);
        setBaselineQty(fallback);
        setCountedQty(fallback);
        toast('Item não está no inventário iniciado.', { type: 'warning' });
        return;
      }
      const baseline = Number(count.baselineQty || 0);
      const counted = count.countedQty !== null && count.countedQty !== undefined
        ? Number(count.countedQty)
        : baseline;
      setBaselineQty(baseline);
      setCountedQty(Number.isFinite(counted) ? counted : baseline);
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
      toast('Erro ao carregar contagem do inventário.', { type: 'error' });
    } finally {
      setCountLoading(false);
    }
  };

  const findItem = (term) => findItemByTerm(items, term);

  const handleSearch = (e) => {
    if (e.preventDefault) e.preventDefault();
    if (mode === 'inventory' && !inventorySession) {
      toast('Inicie o inventário para liberar a contagem.', { type: 'warning' });
      return;
    }
    const found = findItem(searchTerm);
    if (found) {
      setSelectedItem(found);
    } else {
      toast("Item não encontrado no catálogo.", { type: 'warning' });
    }
  };

  const handleScan = (decodedText) => {
    setShowScanner(false);
    setSearchTerm(decodedText);
    if (mode === 'inventory' && !inventorySession) {
      toast('Inicie o inventário para liberar a contagem.', { type: 'warning' });
      return;
    }
    const found = findItem(decodedText);
    if (found) {
      setSelectedItem(found);
    } else {
      toast(`Código lido: ${decodedText}. Item não encontrado.`, { type: 'warning' });
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const currentQty = resolveItemQty(selectedItem);
      await saveAdjustment(tenantId, schema.id, selectedItem.id, currentStockPoint?.id || null, {
        previousQty: currentQty,
        newQty: newQty,
        type: 'manual_adjustment'
      });

      if (typeof onItemsUpdated === 'function') {
        const updates = new Map();
        updates.set(selectedItem.id, newQty);
        onItemsUpdated(updates);
      }

      // Verificar alerta de estoque mínimo
      const minQty = Number(selectedItem.data.estoque_minimo || 0);
      if (minQty > 0 && newQty <= minQty) {
        sendWhatsAppAlert(selectedItem.data.descricao || selectedItem.data.nome, newQty, minQty);
      }
      
      setSuccess(true);
      loadHistory(selectedItem.id);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (_error) {
      toast("Erro ao salvar ajuste.", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentQty = useMemo(() => {
    if (!selectedItem) return 0;
    return resolveItemQty(selectedItem);
  }, [selectedItem]);

  const lastMovement = history?.[0] || null;
  const statusQty = mode === 'inventory' ? baselineQty : currentQty;
  const statusLabel = mode === 'inventory' ? 'Quantidade congelada' : 'Quantidade no sistema';

  const handleStartInventory = async () => {
    if (!currentStockPoint?.id) {
      toast('Selecione um ponto de estocagem.', { type: 'warning' });
      return;
    }
    if (!items?.length) {
      toast('Nenhum item para inventariar neste ponto.', { type: 'warning' });
      return;
    }
    if (!navigator.onLine) {
      toast('Inventário exige conexão para congelar os dados.', { type: 'warning' });
      return;
    }
    setInventoryLoading(true);
    try {
      const session = await startInventorySession(
        tenantId,
        currentStockPoint.id,
        items,
        currentUserId || null
      );
      setInventorySession(session);
      setMode('inventory');
      const summary = await getInventorySummary(tenantId, session.id);
      setInventorySummary(summary);
      toast('Inventário iniciado. Quantidades congeladas.', { type: 'success' });
    } catch (error) {
      console.error('Erro ao iniciar inventário:', error);
      toast('Erro ao iniciar inventário.', { type: 'error' });
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleSaveCount = async () => {
    if (!selectedItem || !inventorySession?.id) return;
    setCountLoading(true);
    try {
      await saveInventoryCount(tenantId, inventorySession.id, selectedItem.id, countedQty);
      const summary = await getInventorySummary(tenantId, inventorySession.id);
      setInventorySummary(summary);
      toast('Contagem salva.', { type: 'success' });
    } catch (error) {
      console.error('Erro ao salvar contagem:', error);
      toast('Erro ao salvar contagem.', { type: 'error' });
    } finally {
      setCountLoading(false);
    }
  };

  const handleApplyInventory = async () => {
    if (!inventorySession?.id) return;
    if (!applyArmed) {
      setApplyArmed(true);
      setTimeout(() => setApplyArmed(false), 4000);
      return;
    }
    setApplyLoading(true);
    try {
      const result = await applyInventoryAdjustments(
        tenantId,
        inventorySession.id,
        schema.id,
        currentStockPoint.id
      );
      if (typeof onItemsUpdated === 'function' && result?.updates) {
        onItemsUpdated(result.updates);
      }
      await closeInventorySession(tenantId, inventorySession.id, {
        closedBy: currentUserId || null,
        adjustmentsApplied: true
      });
      setInventorySession(null);
      setSelectedItem(null);
      setApplyArmed(false);
      setInventorySummary({ total: 0, counted: 0, divergences: 0 });
      toast(`Inventário encerrado. Ajustes aplicados: ${result?.applied || 0}.`, { type: 'success' });
    } catch (error) {
      console.error('Erro ao aplicar inventário:', error);
      toast('Erro ao aplicar ajustes do inventário.', { type: 'error' });
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 max-w-6xl mx-auto">
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start justify-between bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <ShieldCheck size={14} /> Produção
          </div>
          <h2 className="text-2xl font-black text-white">Ajuste Rápido do Estoque</h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            Faça a contagem no ponto de estocagem. Bipou a etiqueta, ajustou a quantidade e o histórico fica registrado.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setMode('adjust')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'adjust' ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}
              >
                AJUSTE
              </button>
              <button
                onClick={() => setMode('inventory')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'inventory' ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}
              >
                INVENTÁRIO
              </button>
            </div>
            {mode === 'inventory' && !inventorySession && (
              <button
                onClick={handleStartInventory}
                disabled={inventoryLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-60"
              >
                {inventoryLoading ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                Iniciar Inventário
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-1 lg:max-w-lg gap-3 w-full">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder={mode === 'inventory' && !inventorySession ? 'Inicie o inventário para liberar a busca...' : 'Bipe ou digite ID, nome ou código...'} 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={mode === 'inventory' && !inventorySession}
              autoFocus
            />
          </form>
          <button 
            onClick={() => setShowScanner(true)}
            disabled={mode === 'inventory' && !inventorySession}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 rounded-2xl transition-all active:scale-95 flex items-center gap-2"
            title="Escanear Código"
          >
            <ScanLine size={20} />
            <span className="hidden sm:inline text-sm font-bold">Escanear</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Status do Item</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between bg-zinc-950 rounded-2xl p-4 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-emerald-400" />
                  <span className="text-sm text-zinc-300">{statusLabel}</span>
                </div>
                <span className="text-lg font-black text-white">{statusQty}</span>
              </div>
              {mode === 'adjust' ? (
                <div className="flex items-center justify-between bg-zinc-950 rounded-2xl p-4 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <History size={18} className="text-blue-400" />
                    <span className="text-sm text-zinc-300">Último ajuste</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {lastMovement ? new Date(lastMovement.timestamp).toLocaleString() : 'Sem histórico'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-zinc-950 rounded-2xl p-4 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <ClipboardList size={18} className="text-blue-400" />
                    <span className="text-sm text-zinc-300">Contados</span>
                  </div>
                  <span className="text-xs text-zinc-400 font-bold">
                    {inventorySummary.counted}/{inventorySummary.total || items.length}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Dica de Produção</h3>
            <p className="text-sm text-zinc-400 mt-3">
              {mode === 'inventory'
                ? 'Inicie o inventário, bipe os itens e salve a contagem. Depois aplique os ajustes.'
                : 'Use o leitor para ganhar velocidade. Depois confirme a quantidade física e salve o ajuste.'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-8">
          {selectedItem ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <Package className="text-emerald-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">{selectedItem.data.descricao || selectedItem.data.nome || 'Item Identificado'}</h3>
                    <p className="text-zinc-500 text-xs font-mono mt-1">ID: {selectedItem.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">
                    {mode === 'inventory' ? 'Congelado' : 'No Sistema'}
                  </p>
                  <p className="text-3xl font-black text-white">
                    {mode === 'inventory' ? baselineQty : (selectedItem.data.quantidade || selectedItem.data.estoque || 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedItem.data).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/50">
                    <p className="text-xs text-zinc-600 uppercase font-bold mb-1">{key}</p>
                    <p className="text-sm text-zinc-300 truncate font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
                <h4 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
                  <ArrowRight size={18} className="text-emerald-500" />
                  {mode === 'inventory' ? 'Contagem Física' : 'Ajustar Quantidade'}
                </h4>
                <div className="flex items-center justify-center gap-10">
                  <button 
                    onClick={() => mode === 'inventory' ? setCountedQty(Math.max(0, countedQty - 1)) : setNewQty(Math.max(0, newQty - 1))}
                    className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl hover:bg-zinc-800 transition-all active:scale-90 flex items-center justify-center"
                  >
                    <Minus size={28} />
                  </button>
                  <div className="text-center">
                    <input 
                      type="number" 
                      className="bg-transparent text-6xl font-black text-white w-32 text-center outline-none"
                      value={mode === 'inventory' ? countedQty : newQty}
                      onChange={(e) => {
                        const next = parseInt(e.target.value, 10);
                        if (mode === 'inventory') {
                          setCountedQty(Number.isNaN(next) ? 0 : next);
                        } else {
                          setNewQty(Number.isNaN(next) ? 0 : next);
                        }
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <p className="text-xs text-zinc-600 uppercase font-bold mt-2">
                      {mode === 'inventory' ? 'Unidades Contadas' : 'Unidades Físicas'}
                    </p>
                  </div>
                  <button 
                    onClick={() => mode === 'inventory' ? setCountedQty(countedQty + 1) : setNewQty(newQty + 1)}
                    className="w-16 h-16 rounded-2xl bg-emerald-500 text-black text-2xl hover:bg-emerald-400 transition-all active:scale-90 flex items-center justify-center"
                  >
                    <Plus size={28} />
                  </button>
                </div>
                {mode === 'inventory' ? (
                  <button 
                    onClick={handleSaveCount}
                    disabled={countLoading || !inventorySession}
                    className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] bg-white text-black hover:bg-zinc-200 disabled:opacity-60"
                  >
                    {countLoading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                    Salvar Contagem
                  </button>
                ) : (
                  <button 
                    onClick={handleSave}
                    disabled={loading || success}
                    className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                      success ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : success ? <CheckCircle2 size={24} /> : <Save size={24} />}
                    {success ? 'Ajuste Salvo com Sucesso!' : 'Confirmar Alteração'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-5">
              <div className="p-8 bg-zinc-950 rounded-full border border-zinc-800">
                <Package size={64} className="text-zinc-800" />
              </div>
              <div className="max-w-xs space-y-2">
                <h3 className="text-white font-bold text-xl">Aguardando Identificação</h3>
                <p className="text-zinc-500 text-sm">
                  {mode === 'inventory'
                    ? 'Inicie o inventário para liberar a contagem no ponto.'
                    : 'Bipe uma etiqueta ou busque um item para iniciar a contagem no ponto.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-lg">
        {mode === 'adjust' ? (
          <>
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
              <History size={20} className="text-emerald-500" /> Histórico de Ajustes
            </h3>
            <div className="space-y-4">
              {history.length > 0 ? history.map((log, idx) => (
                <div key={idx} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-bold">Ajuste Manual</p>
                    <p className="text-xs text-zinc-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${log.difference > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {log.difference > 0 ? '+' : ''}{log.difference}
                    </p>
                    <p className="text-xs text-zinc-600 font-bold">Saldo: {log.newQty}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 space-y-3">
                  <History size={32} className="text-zinc-800 mx-auto" />
                  <p className="text-zinc-600 text-xs">Nenhuma movimentação registrada para este item.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
              <ClipboardList size={20} className="text-emerald-500" /> Resumo do Inventário
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase font-bold">Itens Totais</p>
                <p className="text-xl font-black text-white">{inventorySummary.total || items.length}</p>
              </div>
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase font-bold">Itens Contados</p>
                <p className="text-xl font-black text-white">{inventorySummary.counted}</p>
              </div>
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase font-bold">Divergências</p>
                <p className="text-xl font-black text-white">{inventorySummary.divergences}</p>
              </div>
            </div>
            <button
              onClick={handleApplyInventory}
              disabled={!inventorySession || applyLoading}
              className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                applyArmed ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-zinc-200'
              } disabled:opacity-60`}
            >
              {applyLoading ? <Loader2 className="animate-spin" size={24} /> : (applyArmed ? <Check size={24} /> : <ClipboardList size={24} />)}
              {applyArmed ? 'Confirmar Ajustes e Encerrar' : 'Aplicar Ajustes e Encerrar'}
            </button>
            {!inventorySession && (
              <p className="text-xs text-zinc-500 mt-3 text-center">Nenhum inventário ativo neste ponto.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StockOperation;


