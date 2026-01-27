import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, Circle, MapPin, LayoutTemplate, Package, PenTool } from 'lucide-react';

const OnboardingPanel = ({
  stockPointsCount = 0,
  currentStockPoint = null,
  hasSchema = false,
  hasItems = false,
  hasTemplate = false,
  onNavigate,
  onStartTour,
  onDismiss
}) => {
  const steps = useMemo(() => ([
    {
      id: 'stock_point',
      title: 'Crie um ponto de estocagem',
      description: 'Ex: Almoxarifado, Prateleira A, Linha 3.',
      done: stockPointsCount > 0,
      actionTab: 'stock_points',
      actionLabel: 'Ir para Ponto de Estocagem',
      icon: MapPin
    },
    {
      id: 'schema',
      title: 'Defina as colunas do ponto',
      description: 'Ex: SKU, Descricao, Lote, Validade.',
      done: hasSchema,
      actionTab: 'stock_points',
      actionLabel: 'Criar colunas',
      icon: LayoutTemplate
    },
    {
      id: 'items',
      title: 'Importe SKUs ou cadastre manual',
      description: 'Use o modelo Excel ou o cadastro manual.',
      done: hasItems,
      actionTab: 'stock_points',
      actionLabel: 'Cadastrar itens',
      icon: Package
    },
    {
      id: 'template',
      title: 'Crie um template de etiqueta',
      description: 'Monte o layout para imprimir as etiquetas.',
      done: hasTemplate,
      actionTab: 'designer',
      actionLabel: 'Abrir designer',
      icon: PenTool
    }
  ]), [stockPointsCount, hasSchema, hasItems, hasTemplate]);

  const completed = steps.filter(step => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  const needsStockPointSelection = stockPointsCount > 0 && !currentStockPoint;

  return (
    <div className="bg-zinc-900 border border-emerald-500/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl shadow-emerald-500/5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white">Onboarding rapido</h3>
          <p className="text-zinc-400 text-sm mt-1">
            Conclua os passos abaixo para comecar a operar em minutos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onStartTour}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            Iniciar tour
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Ocultar
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span>Progresso</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {needsStockPointSelection && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-2xl p-4">
          Voce ja tem pontos criados. Selecione um ponto ativo para continuar o onboarding.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Icon size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {step.done ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <Circle size={16} className="text-zinc-600" />
                    )}
                    <h4 className="text-sm font-bold text-white">{step.title}</h4>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{step.description}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate(step.actionTab)}
                className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  step.done ? 'bg-zinc-900 text-zinc-500 border border-zinc-800' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
                disabled={step.done}
              >
                {step.actionLabel}
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingPanel;
