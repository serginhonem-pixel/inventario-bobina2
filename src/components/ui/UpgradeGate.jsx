import React from 'react';
import { Lock, ArrowUpCircle } from 'lucide-react';

/**
 * Bloqueia conteúdo que exige um plano superior.
 * Se o plano atual não atende ao mínimo, mostra um painel de upgrade.
 *
 * Props:
 *  - allowed: boolean – se true, renderiza children normalmente
 *  - requiredPlanLabel: string – nome do plano mínimo (ex: "Business")
 *  - featureLabel: string – descrição da funcionalidade bloqueada
 *  - children: ReactNode
 */
const UpgradeGate = ({ allowed, requiredPlanLabel = 'Business', featureLabel, children }) => {
  if (allowed) return children;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 flex items-center justify-center min-h-[420px]">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-2xl flex items-center justify-center">
          <Lock size={32} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-white">
          Recurso do Plano {requiredPlanLabel}
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {featureLabel
            ? <><strong className="text-white">{featureLabel}</strong> está disponível a partir do plano <strong className="text-emerald-400">{requiredPlanLabel}</strong>.</>
            : <>Esta funcionalidade requer o plano <strong className="text-emerald-400">{requiredPlanLabel}</strong> ou superior.</>
          }
        </p>
        <p className="text-xs text-zinc-500">
          Faça o upgrade para desbloquear controle completo de estoque, movimentações em lote e muito mais.
        </p>
        <a
          href="/#planos"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold px-6 py-3 rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10"
        >
          <ArrowUpCircle size={18} /> Ver Planos
        </a>
      </div>
    </div>
  );
};

export default UpgradeGate;
