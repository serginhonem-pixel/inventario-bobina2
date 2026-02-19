import React from 'react';
import { ArrowRight, X, MapPin, ScanLine, CheckCircle } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 1,
    title: "Bem-vindo ao QtdApp!",
    content: "Este tour rápido irá guiá-lo pelos passos essenciais para começar a organizar seu inventário.",
    targetTab: 'dashboard',
    action: 'start',
    icon: ArrowRight
  },
  {
    id: 2,
    title: "1. Ponto de Estocagem",
    content: "O primeiro passo é criar um ponto e definir as colunas dele. Clique em 'Ponto de Estocagem' para continuar.",
    targetTab: 'stock_points',
    action: 'navigate',
    icon: MapPin
  },
  {
    id: 3,
    title: "2. Importe os Itens",
    content: "Depois de definir as colunas, use o upload ou o modelo para carregar os itens do ponto.",
    targetTab: 'stock_points',
    action: 'next',
    icon: MapPin
  },
  {
    id: 4,
    title: "3. Pontos de Estocagem",
    content: "Aqui você gerencia seus locais de estoque. Crie um novo ponto (Ex: 'Prateleira A') para rastrear onde seus itens estão.",
    targetTab: 'movement_internal',
    action: 'next',
    icon: MapPin
  },
  {
    id: 5,
    title: "4. Movimentação de Estoque",
    content: "Com o Ponto de Estocagem selecionado, você pode registrar a Entrada ou Saída de itens. Use a busca ou o scanner para adicionar itens.",
    targetTab: 'movement_internal',
    action: 'next',
    icon: ScanLine
  },
  {
    id: 6,
    title: "Pronto para Começar!",
    content: "Você concluiu o tour. Agora você pode organizar seu inventário com a eficiência de um SaaS profissional. Boas movimentações!",
    targetTab: 'dashboard',
    action: 'finish',
    icon: CheckCircle
  }
];

class TourGuide extends React.Component {
  constructor(props) {
    super(props);
    const hasWindow = typeof window !== 'undefined';
    const storedStep = hasWindow ? parseInt(localStorage.getItem('qtdapp_tour_step') || '1', 10) : 1;
    const completed = hasWindow ? localStorage.getItem('qtdapp_tour_completed') === 'true' : true;
    this.state = {
      currentStep: Number.isNaN(storedStep) ? 1 : storedStep,
      showTour: !completed
    };
    this.handleNext = this.handleNext.bind(this);
    this.handleFinish = this.handleFinish.bind(this);
    this.handleSkip = this.handleSkip.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(e) {
    if (e.key === 'Escape' && this.state.showTour) {
      this.handleSkip();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { activeTab, forceOpenToken } = this.props;
    const { currentStep, showTour } = this.state;

    if (prevProps.forceOpenToken !== forceOpenToken && forceOpenToken) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('qtdapp_tour_step', '1');
        localStorage.setItem('qtdapp_tour_completed', 'false');
      }
      this.setState({ currentStep: 1, showTour: true });
      if (this.props.setActiveTab) {
        this.props.setActiveTab('dashboard');
      }
      return;
    }

    if (!showTour) return;

    const tabChanged = prevProps.activeTab !== activeTab;
    const stepChanged = prevState.currentStep !== currentStep;

    if (!tabChanged && !stepChanged) return;

    if (currentStep === 2 && activeTab === 'stock_points') {
      this.handleNext();
    }
    if (currentStep === 4 && activeTab === 'movement_internal') {
      this.handleNext();
    }
  }

  handleNext() {
    const { currentStep } = this.state;
    if (currentStep < TOUR_STEPS.length) {
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
    const { currentStep, showTour } = this.state;
    const currentTourStep = TOUR_STEPS.find(step => step.id === currentStep);

    if (!showTour || !currentTourStep) {
      return null;
    }

    return (
      <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Tour guiado">
        <div className="bg-zinc-900 border border-emerald-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <currentTourStep.icon className="text-emerald-500" size={24} />
              {currentTourStep.title}
            </h2>
            <button onClick={this.handleSkip} className="text-zinc-500 hover:text-white transition-colors" aria-label="Fechar tour">
              <X size={20} />
            </button>
          </div>
          
          <p className="text-zinc-300">{currentTourStep.content}</p>

          <div className="flex justify-between items-center">
            <button onClick={this.handleSkip} className="text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
              Pular Tour
            </button>
            
            <button 
              onClick={this.handleNext}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              {currentTourStep.action === 'finish' ? 'Finalizar' : 'Próximo Passo'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default TourGuide;
