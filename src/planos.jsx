import React, { useState } from 'react';
import {
  Check,
  Package,
  Printer,
  Factory,
  ChevronRight,
  ScanLine,
  Zap
} from 'lucide-react';

const PricingPage = ({ onEnter }) => {
  const [isAnnual, setIsAnnual] = useState(false);

  // Dados dos planos atualizados com lógica de preço
  const plans = [
    {
      id: 'trial',
      name: 'Trial',
      subtitle: 'Teste Grátis por 7 Dias',
      priceMonthly: 'R$ 0',
      priceAnnual: 'R$ 0',
      period: '/7 dias',
      description: 'Experimente todos os recursos Pro sem compromisso.',
      features: [
        'Leitura de QR Code no app',
        'Contagem de inventário completa',
        'Criação de etiquetas personalizadas',
        'Identificação visual imediata',
        '1 local de estoque',
        'Acesso por 7 dias'
      ],
      cta: 'Iniciar Trial Grátis',
      ctaStyle: 'outline',
      highlight: false,
      icon: <Package className="w-6 h-6 text-emerald-400" />
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'Etiquetas Personalizadas',
      priceMonthly: 'R$ 69,90',
      priceAnnual: 'R$ 59,90', // ~15% desconto
      period: '/mês',
      description: 'Padronização visual profissional para seus itens.',
      features: [
        'Leitura de QR Code no app',
        'Criação de etiquetas personalizadas',
        'Campos: código, descrição, lote e data',
        'Etiquetas prontas para impressão (PDF)',
        'Histórico de contagens'
      ],
      cta: 'Organizar Meu Estoque',
      ctaLinkMonthly: 'https://betinistudio.mycartpanda.com/checkout?subscription=3862',
      ctaLinkAnnual: 'https://betinistudio.mycartpanda.com/checkout/206394722:1?subscription=3864',
      ctaStyle: 'solid',
      highlight: true,
      borderColor: 'border-emerald-500/50',
      icon: <Printer className="w-6 h-6 text-emerald-400" />
    },
    {
      id: 'business',
      name: 'Business',
      subtitle: 'Controle em Tempo Real',
      priceMonthly: 'R$ 199',
      priceAnnual: 'R$ 169', // ~15% desconto
      period: '/mês',
      description: 'Gestão completa com leitura de QR Code.',
      features: [
        'Leitura de QR Code no app',
        'Entrada e saída de estoque',
        'Saldo atualizado em tempo real',
        'Histórico completo de movimentações',
        'Múltiplos locais de estoque'
      ],
      cta: 'Ativar Controle',
      ctaStyle: 'primary',
      highlight: false, 
      isPremium: true,
      icon: <ScanLine className="w-6 h-6 text-black" />
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Sua Indústria',
      priceMonthly: 'Sob Consulta',
      priceAnnual: 'Sob Consulta',
      period: '',
      description: 'Etiqueta com a identidade da sua empresa.',
      features: [
        'Leitura de QR Code no app',
        'Layout de etiqueta com logo próprio',
        'Cores e padrão visual exclusivo',
        'Usuários com permissões',
        'Relatórios avançados'
      ],
      cta: 'Falar com Especialista',
      ctaStyle: 'ghost',
      highlight: false,
      icon: <Factory className="w-6 h-6 text-zinc-400" />
    }
  ];

  return (
    <section
      id="planos"
      className="py-24 bg-zinc-950 font-sans text-zinc-100 selection:bg-emerald-500 selection:text-black"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative overflow-hidden">
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Zap className="w-3 h-3" /> Tecnologia Industrial
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Controle de ponta a ponta.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
              Da etiqueta ao inventário.
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Abandone o papel. Transforme seu smartphone em um coletor de dados poderoso e padronize seu chão de fábrica.
          </p>

          {/* Toggle Mensal/Anual */}
          <div className="mt-10 flex justify-center items-center gap-4">
            <span 
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-bold tracking-wide cursor-pointer transition-colors ${!isAnnual ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              MENSAL
            </span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAnnual ? 'bg-emerald-600' : 'bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAnnual ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span 
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-bold tracking-wide cursor-pointer transition-colors ${isAnnual ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              ANUAL <span className="text-black text-xs font-black bg-emerald-400 px-1.5 py-0.5 rounded ml-1 uppercase">-15%</span>
            </span>
          </div>
        </div>

        {/* Grid de Preços */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch relative z-10">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`
                relative flex flex-col p-6 rounded-xl transition-all duration-300 group
                ${plan.highlight
                  ? 'bg-zinc-900 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                  : plan.isPremium
                    ? 'bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-emerald-500/30'
                    : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
                }
              `}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest py-1 px-3 rounded shadow-lg">
                  Mais Escolhido
                </div>
              )}

              {/* Card Header */}
              <div className="mb-6">
                <div className={`w-10 h-10 rounded flex items-center justify-center mb-4 transition-colors ${
                    plan.isPremium ? 'bg-white' : 'bg-zinc-800 group-hover:bg-zinc-700'
                  }`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${plan.highlight ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {plan.subtitle}
                </p>
                
                {/* Preço Dinâmico */}
                <div className="mt-5 flex items-baseline">
                  <span className="text-3xl font-bold text-white tracking-tighter">
                    {isAnnual ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  {plan.priceMonthly !== 'Sob Consulta' && (
                    <span className="text-zinc-500 ml-1 font-medium text-sm">{plan.period}</span>
                  )}
                </div>
                
                {/* Nota sobre faturamento anual (apenas se for anual e não for grátis/enterprise) */}
                {isAnnual && plan.priceMonthly !== 'R$ 0' && plan.priceMonthly !== 'Sob Consulta' ? (
                  <p className="text-xs text-emerald-400/80 font-medium mt-1">
                    Faturado anualmente
                  </p>
                ) : plan.id === 'trial' ? (
                  <p className="text-xs text-emerald-400/80 font-medium mt-1">
                    Sem cartão de crédito
                  </p>
                ) : (
                  // Espaçador para manter alinhamento
                  <div className="h-[15px] mt-1"></div>
                )}

                <p className="mt-2 text-sm text-zinc-400 leading-snug min-h-[40px]">
                  {plan.description}
                </p>
              </div>

              {/* Divider */}
              <div className={`h-px w-full mb-6 ${plan.highlight ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}></div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="w-4 h-4 flex-shrink-0 mr-3 text-emerald-500 mt-0.5" />
                    <span className="text-sm text-zinc-300 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {plan.ctaLinkMonthly || plan.ctaLinkAnnual ? (
                <button
                  type="button"
                  onClick={() => {
                    const href = isAnnual ? plan.ctaLinkAnnual : plan.ctaLinkMonthly;
                    if (href) window.open(href, '_blank', 'noopener');
                  }}
                  className={`
                    w-full py-3 px-4 rounded text-sm font-bold tracking-wide uppercase transition-all duration-200 text-center inline-block
                    ${plan.ctaStyle === 'outline'
                      ? 'bg-transparent border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500'
                      : ''}
                    ${plan.ctaStyle === 'solid'
                      ? 'bg-emerald-600 text-black hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : ''}
                    ${plan.ctaStyle === 'primary'
                      ? 'bg-white text-black hover:bg-zinc-200 border border-transparent'
                      : ''}
                    ${plan.ctaStyle === 'ghost'
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                      : ''}
                  `}
                >
                  {plan.cta}
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={plan.id === 'trial' && typeof onEnter === 'function' ? onEnter : undefined}
                  className={`
                    w-full py-3 px-4 rounded text-sm font-bold tracking-wide uppercase transition-all duration-200
                    ${plan.ctaStyle === 'outline'
                      ? 'bg-transparent border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500'
                      : ''}
                    ${plan.ctaStyle === 'solid'
                      ? 'bg-emerald-600 text-black hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : ''}
                    ${plan.ctaStyle === 'primary'
                      ? 'bg-white text-black hover:bg-zinc-200 border border-transparent'
                      : ''}
                    ${plan.ctaStyle === 'ghost'
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                      : ''}
                  `}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer Banner / Chamada Final */}
        <div className="mt-24 rounded-2xl bg-black border border-emerald-900/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-emerald-900/20 to-transparent"></div>
          
          <div className="relative px-8 py-20 text-center flex flex-col items-center justify-center">
            <ScanLine className="w-12 h-12 text-emerald-500 mb-6 animate-pulse" />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tighter uppercase">
              Seu estoque começa na <span className="text-emerald-500">etiqueta</span>.
            </h2>
            <p className="text-xl md:text-2xl font-bold text-zinc-400 tracking-tight mb-8">
              O controle vem na leitura.
            </p>
            
            <button className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-black text-base font-bold rounded uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              Criar Conta — Trial 7 dias
              <ChevronRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default PricingPage;
