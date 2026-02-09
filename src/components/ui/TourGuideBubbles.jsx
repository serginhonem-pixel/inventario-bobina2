import React from 'react';
import { ArrowRight, X, MapPin, ScanLine, CheckCircle } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 1,
    title: "Bem-vindo ao QtdApp!",
    content: "Este tour rápido vai guiá-lo pelos passos essenciais para começar.",
    target: 'nav-stock_points',
    targetTab: 'stock_points',
    action: 'navigate',
    icon: ArrowRight
  },
  {
    id: 2,
    title: "1. Ponto de Estocagem",
    content: "Crie o ponto que representa o local fisico (ex: Almoxarifado A).",
    targetTab: 'stock_points',
    target: 'create-stock-point',
    action: 'next',
    icon: MapPin
  },
  {
    id: 3,
    title: "2. Defina as colunas",
    content: "Cadastre as colunas do ponto (SKU, Descrição, Lote, etc.) e salve.",
    targetTab: 'stock_points',
    target: 'save-columns',
    action: 'next',
    icon: MapPin
  },
  {
    id: 4,
    title: "3. Importe os itens",
    content: "Importe o Excel/CSV e salve os itens do ponto.",
    targetTab: 'stock_points',
    target: 'save-items',
    action: 'next',
    icon: MapPin
  },
  {
    id: 5,
    title: "4. Designer de etiquetas",
    content: "Abra o designer para montar o layout da etiqueta.",
    targetTab: 'designer',
    target: 'nav-designer',
    action: 'navigate',
    icon: ScanLine
  },
  {
    id: 6,
    title: "5. Salve o template",
    content: "Depois de montar o layout, salve o template.",
    targetTab: 'designer',
    target: 'save-template',
    action: 'next',
    icon: CheckCircle
  },
  {
    id: 7,
    title: "Pronto para começar!",
    content: "Voce concluiu o tour. Agora pode operar o inventario normalmente.",
    targetTab: 'dashboard',
    action: 'finish',
    icon: CheckCircle
  }
];

class TourGuideBubbles extends React.Component {
  constructor(props) {
    super(props);
    const hasWindow = typeof window !== 'undefined';
    const storedStep = hasWindow ? parseInt(localStorage.getItem('qtdapp_tour_step') || '1', 10) : 1;
    const completed = hasWindow ? localStorage.getItem('qtdapp_tour_completed') === 'true' : true;
    this.state = {
      currentStep: Number.isNaN(storedStep) ? 1 : storedStep,
      showTour: !completed,
      targetRect: null,
      targetFound: false
    };
    this.handleNext = this.handleNext.bind(this);
    this.handleFinish = this.handleFinish.bind(this);
    this.handleSkip = this.handleSkip.bind(this);
    this.updateTarget = this.updateTarget.bind(this);
  }

  componentDidMount() {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', this.updateTarget);
    window.addEventListener('scroll', this.updateTarget, true);
    this.updateTarget();
  }

  componentWillUnmount() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', this.updateTarget);
    window.removeEventListener('scroll', this.updateTarget, true);
  }

  componentDidUpdate(prevProps, prevState) {
    const { activeTab, forceOpenToken } = this.props;
    const { currentStep, showTour } = this.state;

    if (prevProps.forceOpenToken !== forceOpenToken && forceOpenToken) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('qtdapp_tour_step', '1');
        localStorage.setItem('qtdapp_tour_completed', 'false');
      }
      this.setState({ currentStep: 1, showTour: true }, this.updateTarget);
      if (this.props.setActiveTab) {
        this.props.setActiveTab('dashboard');
      }
      return;
    }

    if (!showTour) return;
    if (prevProps.activeTab !== activeTab || prevState.currentStep !== currentStep) {
      this.updateTarget();
    }
  }

  updateTarget() {
    if (typeof document === 'undefined') return;
    const { currentStep, showTour } = this.state;
    if (!showTour) return;
    const currentTourStep = TOUR_STEPS.find(step => step.id === currentStep);
    if (!currentTourStep || !currentTourStep.target) {
      this.setState({ targetRect: null, targetFound: false });
      return;
    }
    const el = document.querySelector(`[data-guide="${currentTourStep.target}"]`);
    if (!el) {
      this.setState({ targetRect: null, targetFound: false });
      return;
    }
    const rect = el.getBoundingClientRect();
    this.setState({
      targetRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      targetFound: true
    });
  }

  handleNext() {
    const { currentStep } = this.state;
    if (currentStep < TOUR_STEPS.length) {
      const currentTourStep = TOUR_STEPS.find(step => step.id === currentStep);
      if (currentTourStep && currentTourStep.action === 'navigate') {
        this.props.setActiveTab(currentTourStep.targetTab);
      }
      const nextStep = currentStep + 1;
      this.setState({ currentStep: nextStep });
      if (typeof window !== 'undefined') {
        localStorage.setItem('qtdapp_tour_step', String(nextStep));
      }

      const nextTourStep = TOUR_STEPS.find(step => step.id === nextStep);
      if (nextTourStep && nextTourStep.action === 'navigate') {
        this.props.setActiveTab(nextTourStep.targetTab);
      }

      if (nextTourStep && nextTourStep.action === 'finish') {
        this.handleFinish();
      }
    }
  }

  handleFinish() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qtdapp_tour_completed', 'true');
      localStorage.removeItem('qtdapp_tour_step');
    }
    this.setState({ showTour: false });
  }

  handleSkip() {
    this.handleFinish();
  }

  render() {
    const { currentStep, showTour, targetRect, targetFound } = this.state;
    const currentTourStep = TOUR_STEPS.find(step => step.id === currentStep);
    if (!showTour || !currentTourStep) {
      return null;
    }

    const hasWindow = typeof window !== 'undefined';
    const winW = hasWindow ? window.innerWidth : 1024;
    const winH = hasWindow ? window.innerHeight : 768;

    const padding = 12;
    const maxWidth = 360;
    let tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    let arrowStyle = { left: '16px', top: '-6px' };

    if (targetRect) {
      const availableBelow = winH - (targetRect.top + targetRect.height) - padding;
      const placeBelow = availableBelow > 140;
      const top = placeBelow ? targetRect.top + targetRect.height + padding : Math.max(12, targetRect.top - padding - 160);
      const left = Math.min(
        winW - maxWidth - 12,
        Math.max(12, targetRect.left)
      );
      tooltipStyle = { top, left, transform: 'none' };
      arrowStyle = placeBelow ? { top: '-6px', left: '18px' } : { bottom: '-6px', left: '18px' };
    }

    return (
      <div className="fixed inset-0 bg-black/70 z-[100]">
        {targetFound && targetRect && (
          <div
            className="fixed rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_6px_rgba(16,185,129,0.15)] pointer-events-none"
            style={{
              top: Math.max(4, targetRect.top - 6),
              left: Math.max(4, targetRect.left - 6),
              width: Math.max(8, targetRect.width + 12),
              height: Math.max(8, targetRect.height + 12)
            }}
          />
        )}
        <div
          className="fixed bg-zinc-900 border border-emerald-500/50 rounded-3xl p-6 max-w-[360px] w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-300"
          style={tooltipStyle}
        >
          <div className="absolute w-3 h-3 bg-zinc-900 border border-emerald-500/50 rotate-45" style={arrowStyle} />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <currentTourStep.icon className="text-emerald-500" size={22} />
              {currentTourStep.title}
            </h2>
            <button onClick={this.handleSkip} className="text-zinc-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <p className="text-zinc-300 text-sm">{currentTourStep.content}</p>

          <div className="flex justify-between items-center">
            <button onClick={this.handleSkip} className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
              Pular tour
            </button>

            <button
              onClick={this.handleNext}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              {currentTourStep.action === 'finish' ? 'Finalizar' : 'Proximo passo'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default TourGuideBubbles;


