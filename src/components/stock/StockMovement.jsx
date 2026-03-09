import React, { useState } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, ScanLine, Search, 
  Package, FileText, CheckCircle2, Loader2, X, Printer
} from 'lucide-react';
import { saveAdjustment } from '../../services/firebase/stockService';
import { isLocalhost } from '../../services/firebase/mockPersistence';
import { findItemByTerm } from '../../core/utils';
import BarcodeScanner from './BarcodeScanner';
import { toast } from '../ui/toast';
import { resolveItemQty } from '../../core/utils';
import ConfirmModal from '../ui/ConfirmModal';
import { printLabels } from '../../services/pdf/pdfService';

const StockMovement = ({ items, schema, tenantId, currentStockPoint, updatePendingCount, onItemsUpdated, onMovementProcessed, template }) => {
  const [type, setType] = useState('in'); // 'in' ou 'out'
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showProcessConfirm, setShowProcessConfirm] = useState(false);
  const [lastProcessedItems, setLastProcessedItems] = useState([]);

  const findItem = (term) => findItemByTerm(items, term);

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
    setSearchTerm('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const found = findItem(searchTerm);
    if (found) {
      addToCart(found);
    } else {
      toast("Item não encontrado.", { type: 'warning' });
    }
  };

  const handleScan = (code) => {
    setShowScanner(false);
    const found = findItem(code);
    if (found) {
      addToCart(found);
    } else {
      toast("Código não reconhecido.", { type: 'warning' });
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const updateCartQty = (id, newQty) => {
    if (newQty < 1) return;
    setCart(cart.map(c => c.id === id ? { ...c, qty: newQty } : c));
  };

  const requestProcess = () => {
    if (cart.length === 0) return;
    setShowProcessConfirm(true);
  };

  const handleProcess = async () => {
    if (cart.length === 0) return;
    setShowProcessConfirm(false);
    setLoading(true);
    const updatedMap = new Map();
    try {
      for (const item of cart) {
        const currentQty = resolveItemQty(item);
        const adjustment = type === 'in' ? item.qty : -item.qty;
        
        const newQty = currentQty + adjustment; // Simplificação: a quantidade real deve ser calculada a partir dos logs por ponto de estocagem
        updatedMap.set(item.id, newQty);
        
        const movementData = {
          id: `offline_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`, // ID único seguro para rastreamento
          tenantId,
          schemaId: schema.id,
          itemId: item.id,
          stockPointId: currentStockPoint.id,
          previousQty: currentQty,
          newQty: newQty,
          type: type === 'in' ? 'entry' : 'exit',
          notes: `Movimentação de ${type === 'in' ? 'Entrada' : 'Saída'} em lote no Ponto: ${currentStockPoint.name}`,
          timestamp: new Date().toISOString(),
          synced: false // Flag para indicar que é offline
        };

        if (!isLocalhost() && !navigator.onLine) {
          // Lógica de armazenamento offline (apenas quando realmente sem internet)
          let pendingMovements;
          try {
            pendingMovements = JSON.parse(localStorage.getItem('pending_stock_movements') || '[]');
            if (!Array.isArray(pendingMovements)) pendingMovements = [];
          } catch {
            pendingMovements = [];
          }
          pendingMovements.push(movementData);
          localStorage.setItem('pending_stock_movements', JSON.stringify(pendingMovements));
          if (typeof updatePendingCount === 'function') {
            updatePendingCount();
          }
          
          // Tenta registrar o sync se o Service Worker estiver ativo
          if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
              registration.sync.register('sync-stock-movements');
            });
          }
        } else {
          // Lógica online normal (inclui localhost com mock)
          await saveAdjustment(tenantId, schema.id, item.id, currentStockPoint.id, movementData);
        }

      }
      if (typeof onItemsUpdated === 'function' && updatedMap.size > 0) {
        onItemsUpdated(updatedMap);
      }
      if (typeof onMovementProcessed === 'function') {
        onMovementProcessed();
      }
      setLastProcessedItems(cart.map(c => ({ ...c })));
      setSuccess(true);
      setCart([]);
      setTimeout(() => setSuccess(false), 5000);
    } catch (_error) {
      toast("Erro ao processar movimentação.", { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      <ConfirmModal
        open={showProcessConfirm}
        title={`Confirmar ${type === 'in' ? 'Entrada' : 'Saída'}`}
        message={`Deseja processar ${cart.length} ite${cart.length === 1 ? 'm' : 'ns'} com volume total de ${cart.reduce((a, c) => a + c.qty, 0)} unidades como ${type === 'in' ? 'ENTRADA' : 'SAÍDA'} em ${currentStockPoint.name}?`}
        confirmText={type === 'in' ? 'Confirmar Entrada' : 'Confirmar Saída'}
        variant={type === 'in' ? 'info' : 'warning'}
        onConfirm={handleProcess}
        onCancel={() => setShowProcessConfirm(false)}
      />

      {/* Header: Tipo de operação + Busca */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {type === 'in' ? <ArrowUpCircle className="text-emerald-500" size={22} /> : <ArrowDownCircle className="text-rose-500" size={22} />}
            <h3 className="text-base font-bold text-white whitespace-nowrap">
              {type === 'in' ? 'Entrada' : 'Saída'} — {currentStockPoint.name}
            </h3>
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button onClick={() => setType('in')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${type === 'in' ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}>ENTRADA</button>
              <button onClick={() => setType('out')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${type === 'out' ? 'bg-rose-500 text-black' : 'text-zinc-500'}`}>SAÍDA</button>
            </div>
          </div>
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="text"
                placeholder="Buscar ou bipar item..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:border-emerald-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
            <button onClick={() => setShowScanner(true)} className="bg-zinc-800 hover:bg-zinc-700 text-white p-2.5 rounded-xl transition-all" aria-label="Abrir scanner">
              <ScanLine size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Esquerda: Itens do ponto (saldos clicáveis) */}
        <div className="lg:flex-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Package size={14} className="text-emerald-500" />
              Itens em {currentStockPoint.name}
              <span className="text-zinc-600 font-normal ml-1">({items.length})</span>
            </h4>
            {items.length === 0 ? (
              <p className="text-sm text-zinc-600 py-8 text-center">Nenhum item cadastrado neste ponto.</p>
            ) : (
              <div className="space-y-1 max-h-[520px] overflow-y-auto">
                {items.map(item => {
                  const qty = resolveItemQty(item);
                  const inCart = cart.some(c => c.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        inCart
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'hover:bg-zinc-800/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${inCart ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          <Package size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.data?.descricao || item.data?.nome || '—'}</p>
                          <p className="text-xs text-zinc-500 font-mono">{item.data?.codigo || item.data?.sku || item.id.substring(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-bold ${qty > 0 ? 'text-emerald-400' : qty < 0 ? 'text-rose-400' : 'text-zinc-600'}`}>{qty}</span>
                        {inCart && <span className="text-[10px] bg-emerald-500 text-black font-bold px-2 py-0.5 rounded-full">NA CARGA</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Direita: Carrinho + Resumo */}
        <div className="lg:w-96 space-y-5">
          {/* Carrinho */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Carga ({cart.length} {cart.length === 1 ? 'item' : 'itens'})
            </h4>
            {cart.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">Clique nos itens ao lado para adicionar à carga.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium text-white truncate">{item.data?.descricao || item.data?.nome}</p>
                      <p className="text-xs text-zinc-500 font-mono">{item.data?.codigo || item.data?.sku || item.id.substring(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800">
                        <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="px-2 py-1 text-zinc-500 hover:text-white text-sm">−</button>
                        <input
                          type="number"
                          className="w-10 bg-transparent text-center text-sm font-bold text-white outline-none"
                          value={item.qty}
                          onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 1)}
                        />
                        <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="px-2 py-1 text-zinc-500 hover:text-white text-sm">+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-zinc-700 hover:text-rose-500 transition-colors p-1" aria-label="Remover">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo + Ação */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Itens</span><span className="text-white font-bold">{cart.length}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Volume</span><span className="text-white font-bold">{cart.reduce((a, c) => a + c.qty, 0)}</span></div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Operação</span>
                <span className={`font-bold ${type === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>{type === 'in' ? 'ENTRADA' : 'SAÍDA'}</span>
              </div>
            </div>

            <button
              onClick={requestProcess}
              disabled={cart.length === 0 || loading || success}
              className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                success ? 'bg-emerald-500 text-black' :
                type === 'in' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-rose-500 text-black hover:bg-rose-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? <Loader2 className="animate-spin" /> : success ? <CheckCircle2 /> : <FileText />}
              {success ? 'Processado!' : `Finalizar ${type === 'in' ? 'Entrada' : 'Saída'}`}
            </button>

            {success && (
              <div className="space-y-3">
                <p className="text-xs text-emerald-500 text-center font-bold">Estoque atualizado com sucesso!</p>
                {template && lastProcessedItems.length > 0 && (
                  <button
                    onClick={() => {
                      const printItems = lastProcessedItems.map(c => c.data);
                      printLabels(template, printItems);
                    }}
                    className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-all"
                  >
                    <Printer size={18} /> Imprimir Etiquetas
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockMovement;
