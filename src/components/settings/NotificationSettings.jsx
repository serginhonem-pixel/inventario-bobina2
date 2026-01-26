import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Save, CheckCircle2, Loader2, Globe, Key, Smartphone } from 'lucide-react';
import { getWhatsAppConfig, saveWhatsAppConfig, sendTestMessage } from '../../services/notifications/whatsappService';

const NotificationSettings = () => {
  const [config, setConfig] = useState({ enabled: false, number: '', apiKey: '', instance: '', apiUrl: '' });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setConfig(getWhatsAppConfig());
  }, []);

  const handleSave = async () => {
    saveWhatsAppConfig(config);
    setSaved(true);
    
    // Enviar mensagem de teste automaticamente ao salvar se estiver habilitado
    if (config.enabled && config.number && config.apiUrl && config.instance) {
      try {
        await sendTestMessage();
      } catch (error) {
        console.error("Erro ao enviar mensagem de teste automática:", error);
      }
    }
    
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!config.number) return alert("Insira um número primeiro!");
    setTesting(true);
    try {
      await sendTestMessage();
      alert("Mensagem de teste enviada! Verifique o console do navegador.");
    } catch (error) {
      alert(error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-2xl animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
          <Bell size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Configurações de Alerta</h3>
          <p className="text-sm text-zinc-500">Configure como você deseja receber avisos de estoque crítico.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-emerald-500" size={20} />
            <div>
              <p className="text-sm font-bold text-white">Alertas via WhatsApp</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Notificações em tempo real</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {config.enabled && (
          <div className="space-y-4 p-6 bg-zinc-950 rounded-2xl border border-zinc-800 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                  <Smartphone size={12} /> Número (com DDI/DDD)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: 5511999999999"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-emerald-500 outline-none"
                  value={config.number}
                  onChange={(e) => setConfig({ ...config, number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                  <Globe size={12} /> URL da Evolution API
                </label>
                <input 
                  type="text" 
                  placeholder="https://api.sua-instancia.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-emerald-500 outline-none"
                  value={config.apiUrl}
                  onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                  <Key size={12} /> API Key
                </label>
                <input 
                  type="password" 
                  placeholder="Sua API Key"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-emerald-500 outline-none"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                  <Smartphone size={12} /> Nome da Instância
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: QtdApp"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-emerald-500 outline-none"
                  value={config.instance}
                  onChange={(e) => setConfig({ ...config, instance: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <p className="text-[10px] text-emerald-500 font-bold leading-relaxed">
                DICA: O sistema enviará um alerta automático sempre que um item atingir o nível de estoque mínimo definido no catálogo. Ao salvar, uma mensagem de teste será enviada.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button 
            onClick={handleSave}
            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
            {saved ? 'Configurações Salvas!' : 'Salvar Configurações'}
          </button>
          
          {config.enabled && (
            <button 
              onClick={handleTest}
              disabled={testing}
              className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {testing ? <Loader2 className="animate-spin" size={20} /> : <MessageSquare size={20} />}
              Testar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
