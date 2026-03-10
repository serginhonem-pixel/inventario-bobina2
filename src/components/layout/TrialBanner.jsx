import React from 'react';
import { Clock, AlertCircle, Lock } from 'lucide-react';

const TrialBanner = ({ trialInfo, org }) => (
  <>
    {/* Trial ativo */}
    {trialInfo.isTrial && (
      <div className="mb-6 bg-gradient-to-r from-emerald-500/10 to-amber-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <Clock size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              Trial Pro — {trialInfo.timeLeftLabel}
            </p>
            <p className="text-xs text-zinc-400">
              Aproveite todos os recursos Pro por 7 dias. Após o trial, assine para continuar.
            </p>
          </div>
        </div>
        <a
          href="/#planos"
          className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold py-2 px-5 rounded-xl transition-all"
        >
          Ver planos
        </a>
      </div>
    )}

    {/* Trial expirado */}
    {trialInfo.expired && org?.status !== 'active' && (
      <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-xl">
              <AlertCircle size={20} className="text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Seu trial expirou</p>
              <p className="text-xs text-zinc-400">
                Seu período de teste acabou. Escolha um plano para continuar usando o QtdApp.
              </p>
            </div>
          </div>
          <a
            href="/#planos"
            className="shrink-0 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold py-2 px-5 rounded-xl transition-all"
          >
            Ver planos e assinar
          </a>
        </div>

        {/* Cards rápidos de planos */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
            <p className="text-xs font-bold text-emerald-400">Pro</p>
            <p className="text-lg font-bold text-white">R$ 69,90<span className="text-xs font-normal text-zinc-400">/mês</span></p>
            <p className="text-xs text-zinc-400 mt-1">3 membros · Etiquetas · QR Codes · Inventário</p>
          </div>
          <div className="bg-zinc-800/60 border border-amber-500/30 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-400">Business</p>
            <p className="text-lg font-bold text-white">R$ 149,90<span className="text-xs font-normal text-zinc-400">/mês</span></p>
            <p className="text-xs text-zinc-400 mt-1">10 membros · Multi-estoque · Movimentação · Relatórios</p>
          </div>
        </div>
      </div>
    )}

    {/* Plano cancelado */}
    {org?.status === 'canceled' && (
      <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <Lock size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Assinatura cancelada</p>
            <p className="text-xs text-zinc-400">
              Sua assinatura foi cancelada. Renove para recuperar o acesso completo.
            </p>
          </div>
        </div>
        <a
          href="/#planos"
          className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2 px-5 rounded-xl transition-all"
        >
          Renovar plano
        </a>
      </div>
    )}
  </>
);

export default TrialBanner;
