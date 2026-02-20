import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { pathToTabId } from '../../core/routes';

const TAB_TITLES = {
  dashboard: 'Visão Geral',
  stock_points: 'Ponto de Estocagem',
  designer: 'Engenharia de Etiquetas',
  movement_internal: 'Movimentação de Carga',
  operation: 'Ajuste Rápido',
  reports: 'Relatórios',
  settings: 'Configurações',
  team: 'Equipe e Permissões',
};

const MobileTopBar = ({ setSidebarOpen }) => {
  const location = useLocation();
  const activeTab = pathToTabId[location.pathname] || 'dashboard';

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
      <button
        onClick={() => setSidebarOpen(true)}
        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
        title="Abrir menu"
      >
        <Menu size={20} />
      </button>
      <div className="text-sm font-bold text-white truncate">
        {TAB_TITLES[activeTab] || ''}
      </div>
      <div className="w-9" />
    </div>
  );
};

export default MobileTopBar;
