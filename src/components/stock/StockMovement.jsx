import React, { useState } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, ScanLine, Search, 
  Package, Trash2, FileText, CheckCircle2, Loader2, X
} from 'lucide-react';
import { saveAdjustment } from '../../services/firebase/stockService';
import { isLocalhost } from '../../services/firebase/mockPersistence';
import { findItemByTerm } from '../../core/utils';
import BarcodeScanner from './BarcodeScanner';
import { sendWhatsAppAlert } from '../../services/notifications/whatsappService';
import { toast } from '../ui/toast';
import { resolveItemQty } from '../../core/utils';
import ConfirmModal from '../ui/ConfirmModal';

const StockMovement = ({ items, schema, tenantId, currentStockPoint, updatePendingCount, onItemsUpdated }) => {
  const [type, setType] = useState('in'); // 'in' ou 'out'
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showProcessConfirm, setShowProcessConfirm] = useState(false);

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
          id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // ID único para rastreamento
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

        if (isLocalhost() || !navigator.onLine) {
          // Lógica de armazenamento offline
          const pendingMovements = JSON.parse(localStorage.getItem('pending_stock_movements') || '[]');
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
          // Lógica online normal
          await saveAdjustment(tenantId, schema.id, item.id, currentStockPoint.id, movementData);
        }

        // Verificar alerta de estoque mínimo (apenas em saídas)
        if (type === 'out') {
          const minQty = Number(item.data.estoque_minimo || 0);
          if (minQty > 0 && newQty <= minQty) {
            sendWhatsAppAlert(item.data.descricao || item.data.nome, newQty, minQty);
          }
        }
      }
      if (typeof onItemsUpdated === 'function' && updatedMap.size > 0) {
        onItemsUpdated(updatedMap);
      }
      setSuccess(true);
      setCart([]);
      setTimeout(() => setSuccess(false), 3000);
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Lado Esquerdo: Busca e Seleção */}
        <div className="lg:col-span-7 space-y-6 flex-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {type === 'in' ? <ArrowUpCircle className="text-emerald-500" /> : <ArrowDownCircle className="text-rose-500" />}
                Nova {type === 'in' ? 'Entrada' : 'Saída'} em {currentStockPoint.name}
              </h3>
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setType('in')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${type === 'in' ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}
                >
                  ENTRADA
                </button>
                <button 
                  onClick={() => setType('out')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${type === 'out' ? 'bg-rose-500 text-black' : 'text-zinc-500'}`}
                >
                  SAÍDA
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  type="text" 
                  placeholder="Bipe ou busque o item..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
              <button 
                onClick={() => setShowScanner(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-2xl transition-all"
                aria-label="Abrir scanner de código de barras"
              >
                <ScanLine size={24} />
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 min-h-[400px]">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Itens na Movimentação</h4>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
                <Package size={48} className="mb-2 opacity-20" />
                <p className="text-sm">Nenhum item selecionado</p>
                <p className="text-xs text-zinc-500 mt-1">Use a busca ou o scanner para adicionar itens à carga.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800 group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{item.data.descricao || item.data.nome}</p>
                        <p className="text-xs text-zinc-500 font-mono">{item.data?.codigo || item.data?.sku || item.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800">
                        <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="p-2 text-zinc-500 hover:text-white">-</button>
                        <input 
                          type="number" 
                          className="w-12 bg-transparent text-center text-sm font-bold text-white outline-none"
                          value={item.qty}
                          onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 1)}
                        />
                        <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="p-2 text-zinc-500 hover:text-white">+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-zinc-700 hover:text-rose-500 transition-colors" aria-label={`Remover ${item.data.descricao || item.data.nome || 'item'}`}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Resumo e Processamento */}
        <div className="lg:w-80 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Resumo da Carga</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total de Itens</span>
                <span className="text-white font-bold">{cart.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Volume Total</span>
                <span className="text-white font-bold">{cart.reduce((acc, curr) => acc + curr.qty, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Operação</span>
                <span className={`font-bold ${type === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {type === 'in' ? 'ENTRADA' : 'SAÍDA'}
                </span>
              </div>
            </div>

            <button 
              onClick={requestProcess}
              disabled={cart.length === 0 || loading || success}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                success ? 'bg-emerald-500 text-black' : 
                type === 'in' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-rose-500 text-black hover:bg-rose-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? <Loader2 className="animate-spin" /> : success ? <CheckCircle2 /> : <FileText />}
              {success ? 'Processado!' : `Finalizar ${type === 'in' ? 'Entrada' : 'Saída'}`}
            </button>

            {success && (
              <p className="text-xs text-emerald-500 text-center mt-4 font-bold animate-bounce">
                Estoque atualizado com sucesso!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockMovement;
