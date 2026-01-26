import React, { useState, useEffect } from 'react';
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
    content: "O primeiro passo é criar um ponto e importar os itens dele. Clique em 'Ponto de Estocagem' para continuar.",
    targetTab: 'stock_points',
    action: 'navigate',
    icon: MapPin
  },
  {
    id: 3,
    title: "2. Importe os Itens",
    content: "Use o 'Importar Planilha do Ponto' para carregar os itens e as colunas da etiqueta.",
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

const TourGuide = ({ activeTab, setActiveTab }) => {
  const [currentStep, setCurrentStep] = useState(
    parseInt(localStorage.getItem('qtdapp_tour_step') || 1)
  );
  const [showTour, setShowTour] = useState(
    localStorage.getItem('qtdapp_tour_completed') !== 'true'
  );

  const currentTourStep = TOUR_STEPS.find(step => step.id === currentStep);

  useEffect(() => {
    if (currentTourStep && currentTourStep.action === 'navigate' && activeTab !== currentTourStep.targetTab) {
      // Se o passo atual exige navegação e o usuário não está na aba correta, avança o tour.
      // Isso garante que o tour só avance quando o usuário interagir com a navegação.
      // No entanto, para simplificar, vamos apenas garantir que o modal seja exibido na aba correta.
    }
    
    // Se o usuário navegou para a aba correta, avança o tour (apenas para o passo 2)
    if (currentStep === 2 && activeTab === 'stock_points') {
        handleNext();
    }
    
    // Se o usuário navegou para a aba correta, avança o tour (apenas para o passo 4)
    if (currentStep === 4 && activeTab === 'movement_internal') {
        handleNext();
    }

  }, [activeTab, currentStep]);

  if (!showTour || !currentTourStep) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      localStorage.setItem('qtdapp_tour_step', nextStep);
      
      const nextTourStep = TOUR_STEPS.find(step => step.id === nextStep);
      if (nextTourStep && nextTourStep.action === 'navigate') {
        setActiveTab(nextTourStep.targetTab);
      }
      
      if (nextTourStep && nextTourStep.action === 'finish') {
        handleFinish();
      }
    }
  };

  const handleFinish = () => {
    localStorage.setItem('qtdapp_tour_completed', 'true');
    localStorage.removeItem('qtdapp_tour_step');
    setShowTour(false);
  };

  const handleSkip = () => {
    handleFinish();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-emerald-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <currentTourStep.icon className="text-emerald-500" size={24} />
            {currentTourStep.title}
          </h2>
          <button onClick={handleSkip} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-zinc-300">{currentTourStep.content}</p>

        <div className="flex justify-between items-center">
          <button onClick={handleSkip} className="text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
            Pular Tour
          </button>
          
          <button 
            onClick={handleNext}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            {currentTourStep.action === 'finish' ? 'Finalizar' : 'Próximo Passo'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourGuide;
