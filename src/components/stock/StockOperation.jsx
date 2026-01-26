import React, { useState, useEffect } from 'react';
import { Search, Camera, Package, Plus, Minus, Save, CheckCircle2, Loader2, History, ArrowRight } from 'lucide-react';
import { saveAdjustment, getStockLogs } from '../../services/firebase/stockService';
import BarcodeScanner from './BarcodeScanner';
import { sendWhatsAppAlert } from '../../services/notifications/whatsappService';

const StockOperation = ({ items, schema, tenantId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQty, setNewQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (selectedItem) {
      const currentQty = Number(selectedItem.data.quantidade || selectedItem.data.estoque || 0);
      setNewQty(currentQty);
      loadHistory(selectedItem.id);
    }
  }, [selectedItem]);

  const loadHistory = async (itemId) => {
    try {
      const logs = await getStockLogs(itemId, tenantId);
      setHistory(logs || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const findItem = (term) => {
    return items.find(item => 
      item.id === term || 
      Object.values(item.data).some(val => 
        String(val).toLowerCase().includes(term.toLowerCase())
      )
    );
  };

  const handleSearch = (e) => {
    if (e.preventDefault) e.preventDefault();
    const found = findItem(searchTerm);
    if (found) {
      setSelectedItem(found);
    } else {
      alert("Item não encontrado no catálogo.");
    }
  };

  const handleScan = (decodedText) => {
    setShowScanner(false);
    setSearchTerm(decodedText);
    const found = findItem(decodedText);
    if (found) {
      setSelectedItem(found);
    } else {
      alert("Código lido: " + decodedText + ". Item não encontrado.");
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const currentQty = Number(selectedItem.data.quantidade || selectedItem.data.estoque || 0);
      await saveAdjustment(tenantId, schema.id, selectedItem.id, {
        previousQty: currentQty,
        newQty: newQty,
        type: 'manual_adjustment'
      });

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
    } catch (error) {
      alert("Erro ao salvar ajuste");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 max-w-5xl mx-auto">
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Operação de Estoque</h2>
          <p className="text-zinc-500 text-xs">Busque ou escanie para ajustar o inventário</p>
        </div>
        
        <div className="flex flex-1 md:max-w-md gap-3">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="ID, Nome ou Código..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              // Adicionado foco automático para coletores de dados
              autoFocus 
            />
          </form>
          <button 
            onClick={() => setShowScanner(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-black p-3 rounded-2xl transition-all active:scale-95"
            title="Escanear Código"
          >
            <Camera size={24} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
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
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">No Sistema</p>
                  <p className="text-3xl font-black text-white">{selectedItem.data.quantidade || selectedItem.data.estoque || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedItem.data).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">{key}</p>
                    <p className="text-sm text-zinc-300 truncate font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
                <h4 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-widest"><ArrowRight size={18} className="text-emerald-500" /> Ajustar Quantidade</h4>
                <div className="flex items-center justify-center gap-10">
                  <button 
                    onClick={() => setNewQty(Math.max(0, newQty - 1))} 
                    className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl hover:bg-zinc-800 transition-all active:scale-90 flex items-center justify-center"
                  >
                    <Minus size={28} />
                  </button>
	                  <div className="text-center">
	                    <input 
	                      type="number" 
	                      className="bg-transparent text-6xl font-black text-white w-32 text-center outline-none"
	                      value={newQty}
	                      onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
	                      // Adicionado pattern para teclado numérico em mobile
	                      inputMode="numeric"
	                      pattern="[0-9]*"
	                    />
	                    <p className="text-[10px] text-zinc-600 uppercase font-bold mt-2">Unidades Físicas</p>
	                  </div>
                  <button 
                    onClick={() => setNewQty(newQty + 1)} 
                    className="w-16 h-16 rounded-2xl bg-emerald-500 text-black text-2xl hover:bg-emerald-400 transition-all active:scale-90 flex items-center justify-center"
                  >
                    <Plus size={28} />
                  </button>
                </div>
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
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-8 bg-zinc-950 rounded-full border border-zinc-800">
                <Package size={64} className="text-zinc-800" />
              </div>
              <div className="max-w-xs space-y-2">
                <h3 className="text-white font-bold text-xl">Aguardando Identificação</h3>
                <p className="text-zinc-500 text-sm">Bipe uma etiqueta ou use a busca para localizar um produto e ajustar o estoque.</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-lg">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest"><History size={20} className="text-emerald-500" /> Histórico de Ajustes</h3>
            <div className="space-y-4">
              {history.length > 0 ? history.map((log, idx) => (
                <div key={idx} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Ajuste Manual</p>
                    <p className="text-xs text-zinc-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
	                    <p className={`text-lg font-black ${log.difference > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
	                      {log.difference > 0 ? '+' : ''}{log.difference}
	                    </p>
                    <p className="text-[10px] text-zinc-600 font-bold">Saldo: {log.newQty}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 space-y-3">
                  <History size={32} className="text-zinc-800 mx-auto" />
                  <p className="text-zinc-600 text-xs">Nenhuma movimentação registrada para este item.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockOperation;
