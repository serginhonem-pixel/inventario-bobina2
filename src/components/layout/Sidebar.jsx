import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PenTool, BarChart3,
  Settings, LogOut, User, Users,
  MapPin, ScanLine, X, Lock, ArrowLeftRight, HelpCircle,
} from 'lucide-react';
import ROUTES from '../../core/routes';
import { meetsMinPlan } from '../../core/plansConfig';

const ICON_MAP = {
  dashboard: LayoutDashboard,
  stock_points: MapPin,
  designer: PenTool,
  operation: ScanLine,
  movement_internal: ArrowLeftRight,
  reports: BarChart3,
  team: Users,
  settings: Settings,
};

// Todas as rotas com ícone entram no menu lateral
const NAV_ITEMS = ROUTES.filter((r) => ICON_MAP[r.id]).map((r) => ({
  ...r,
  icon: ICON_MAP[r.id],
}));

const Sidebar = ({ sidebarOpen, setSidebarOpen, user, effectivePlanId, trialInfo, onLogout, onStartTour }) => (
  <>
    {sidebarOpen && (
      <div
        className="fixed inset-0 bg-black/70 z-40 md:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )}

    <aside className={`w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col p-6 fixed h-full z-50 transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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

      <div className="mb-12 px-2">
        <img
          src="/logo.png"
          alt="QtdApp"
          className="w-40 max-w-full h-auto drop-shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
        />
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const locked = item.minPlan && !meetsMinPlan(effectivePlanId, item.minPlan);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/app'}
              onClick={() => setSidebarOpen(false)}
              data-guide={`nav-${item.id}`}
              className={({ isActive }) =>
                `w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                  locked
                    ? 'text-zinc-700 cursor-pointer'
                    : isActive
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10'
                      : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={locked ? 'text-zinc-700' : isActive ? 'text-black' : 'group-hover:text-emerald-500'} />
                  <span className="flex-1">{item.label}</span>
                  {locked && <Lock size={14} className="text-zinc-600" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-zinc-900 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
            <User size={20} className="text-zinc-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.email || 'Usuário'}</p>
            <p className="text-xs text-zinc-500 uppercase font-bold">
              {trialInfo.isTrial
                ? <span className="text-emerald-400">Trial Pro — {trialInfo.timeLeftShortLabel}</span>
                : trialInfo.expired
                  ? <span className="text-rose-400">Trial Expirado</span>
                  : <>Plano {effectivePlanId.charAt(0).toUpperCase() + effectivePlanId.slice(1)}</>
              }
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
        >
          <LogOut size={20} /> Sair do Sistema
        </button>
        {onStartTour && (
          <button
            onClick={onStartTour}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all"
          >
            <HelpCircle size={20} /> Reabrir Tour Guiado
          </button>
        )}
      </div>
    </aside>
  </>
);

export default Sidebar;
