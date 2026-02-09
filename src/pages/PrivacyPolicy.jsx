import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Legal</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2">Política de Privacidade</h1>
          <p className="text-zinc-400 text-sm mt-3">Última atualização: 09/02/2026.</p>
        </header>

        <section className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            Esta Política de Privacidade explica como o QtdApp coleta, usa, armazena e protege dados pessoais
            no contexto da prestação do serviço de gestão e inventário. Ao utilizar a plataforma, você concorda
            com as práticas descritas aqui.
          </p>
          <p>
            Coletamos dados de cadastro (nome, e-mail, organização) e dados operacionais gerados no uso do
            sistema (itens, etiquetas, movimentações, pontos de estocagem). Esses dados são utilizados para
            operar o serviço, oferecer suporte, cumprir obrigações legais e melhorar a experiência do usuário.
          </p>
          <p>
            Não vendemos dados pessoais. Compartilhamos informações apenas com provedores necessários para
            operação da infraestrutura e quando exigido por lei.
          </p>
          <p>
            Você pode solicitar acesso, correção, portabilidade ou exclusão de dados a qualquer momento. Para
            exercer seus direitos, entre em contato pelo e-mail: privacidade@qtdapp.com.br.
          </p>
        </section>

        <div className="pt-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-semibold"
          >
            Voltar para a página inicial
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
