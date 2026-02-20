import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';

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
              Trial Pro — {trialInfo.daysLeft} dia{trialInfo.daysLeft !== 1 ? 's' : ''} restante{trialInfo.daysLeft !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-zinc-400">
              Aproveite todos os recursos Pro por 7 dias. Após o trial, assine para continuar.
            </p>
          </div>
        </div>
        <a
          href="https://betinistudio.mycartpanda.com/checkout?subscription=3862"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold py-2 px-5 rounded-xl transition-all"
        >
          Assinar agora
        </a>
      </div>
    )}

    {/* Trial expirado */}
    {trialInfo.expired && org?.status !== 'active' && (
      <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/20 rounded-xl">
            <AlertCircle size={20} className="text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Seu trial Pro expirou</p>
            <p className="text-xs text-zinc-400">
              Seu período de teste acabou. Assine para continuar usando o QtdApp.
            </p>
          </div>
        </div>
        <a
          href="https://betinistudio.mycartpanda.com/checkout?subscription=3862"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold py-2 px-5 rounded-xl transition-all"
        >
          Assinar Pro — R$ 69,90/mês
        </a>
      </div>
    )}
  </>
);

export default TrialBanner;
