import React from 'react';
import { Search, Bell, AlertCircle, X } from 'lucide-react';
import { syncPendingMovements } from '../../services/firebase/stockService';
import { toast } from '../ui/toast';

const TAB_HEADERS = {
  dashboard:          { title: 'Visão Geral',                 desc: 'Bem-vindo ao centro de comando do seu inventário.' },
  stock_points:       { title: 'Ponto de Estocagem',          desc: 'Crie o ponto e cadastre os SKUs vinculados.' },
  designer:           { title: 'Engenharia de Etiquetas',     desc: 'Crie layouts de etiquetas profissionais com precisão milimétrica.' },
  movement_internal:  { title: 'Movimentação de Carga',       desc: 'Gerencie a entrada e saída de itens no ponto de estocagem.' },
  operation:          { title: 'Ajuste Rápido',               desc: 'Realize ajustes pontuais e conferências rápidas.' },
  reports:            { title: 'Relatórios e BI',             desc: 'Analise dados, perdas e produtividade da sua operação.' },
  team:               { title: 'Equipe e Permissões',         desc: 'Convide membros e controle permissões da organização.' },
  settings:           { title: 'Configurações do Sistema',    desc: 'Gerencie notificações, alertas e preferências do QtdApp.' },
};

const PageHeader = ({
  activeTab,
  globalSearch,
  setGlobalSearch,
  hasGlobalSearch,
  filteredItems,
  isOnline,
  pendingMovementsCount,
  hasNotifications,
  updatePendingCount,
}) => {
  const header = TAB_HEADERS[activeTab] || { title: '', desc: '' };

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 md:mb-12">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight">{header.title}</h2>
        <p className="text-zinc-500 text-sm mt-1">{header.desc}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input
            type="text"
            placeholder="Busca rápida..."
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-8 text-xs text-white focus:border-emerald-500 outline-none w-64"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          {hasGlobalSearch && (
            <button
              type="button"
              onClick={() => setGlobalSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
          {hasGlobalSearch && activeTab === 'stock_points' && (
            <div className="mt-1 text-[10px] text-zinc-500">
              {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'} no ponto ativo
            </div>
          )}
        </div>

        {/* Notifications & status */}
        <div className="flex items-center gap-3">
          {pendingMovementsCount > 0 && (
            <button
              className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 hover:bg-amber-500/20 relative flex items-center gap-2 text-xs font-bold transition-all"
              title="Movimentos Pendentes de Sincronização"
              onClick={() => {
                if (!navigator.onLine) {
                  toast('Você está offline. Conecte-se para sincronizar.', { type: 'warning' });
                  return;
                }
                syncPendingMovements()
                  .then(({ synced, remaining }) => {
                    toast(`Sincronizados ${synced} movimentos. Restam ${remaining}.`, { type: 'success' });
                  })
                  .catch(() => {
                    toast('Erro ao sincronizar movimentos pendentes.', { type: 'error' });
                  })
                  .finally(() => {
                    updatePendingCount();
                  });
              }}
            >
              <AlertCircle size={16} />
              {pendingMovementsCount} Pendente{pendingMovementsCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (hasNotifications) {
                toast(`Você tem ${pendingMovementsCount} movimento${pendingMovementsCount > 1 ? 's' : ''} pendente${pendingMovementsCount > 1 ? 's' : ''}.`, { type: 'warning' });
              } else {
                toast('Sem notificações no momento.', { type: 'info' });
              }
            }}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white relative"
            title={hasNotifications ? 'Notificações pendentes' : 'Sem notificações'}
          >
            <Bell size={20} />
            {hasNotifications && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-zinc-900" />
            )}
          </button>
          <div
            className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'} border-2 border-zinc-950`}
            title={isOnline ? 'Online' : 'Offline'}
          />
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
