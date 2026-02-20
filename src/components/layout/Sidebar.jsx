import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PenTool, BarChart3,
  Settings, LogOut, User, Users,
  MapPin, ScanLine, X,
} from 'lucide-react';
import ROUTES from '../../core/routes';

const ICON_MAP = {
  dashboard: LayoutDashboard,
  stock_points: MapPin,
  designer: PenTool,
  operation: ScanLine,
  reports: BarChart3,
  team: Users,
  settings: Settings,
};

// Só as rotas com ícone no menu lateral (exclui movement_internal)
const NAV_ITEMS = ROUTES.filter((r) => ICON_MAP[r.id]).map((r) => ({
  ...r,
  icon: ICON_MAP[r.id],
}));

const Sidebar = ({ sidebarOpen, setSidebarOpen, user, effectivePlanId, trialInfo, onLogout }) => (
  <>
    {/* Overlay mobile */}
    {sidebarOpen && (
      <div
        className="fixed inset-0 bg-black/70 z-40 md:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )}

    <aside className={`w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col p-6 fixed h-full z-50 transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Fechar (mobile) */}
      <div className="md:hidden flex justify-between items-center mb-4">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Menu</span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
          title="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Logo */}
      <div className="mb-12 px-2">
        <img
          src="/logo.png"
          alt="QtdApp"
          className="w-40 max-w-full h-auto drop-shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/app'}
            onClick={() => setSidebarOpen(false)}
            data-guide={`nav-${item.id}`}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                isActive
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'text-black' : 'group-hover:text-emerald-500'} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-zinc-900 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
            <User size={20} className="text-zinc-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.email || 'Usuário'}</p>
            <p className="text-xs text-zinc-500 uppercase font-bold">
              Plano {effectivePlanId.charAt(0).toUpperCase() + effectivePlanId.slice(1)}
              {trialInfo.isTrial && <span className="text-emerald-400"> (Trial)</span>}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
        >
          <LogOut size={20} /> Sair do Sistema
        </button>
      </div>
    </aside>
  </>
);

export default Sidebar;
