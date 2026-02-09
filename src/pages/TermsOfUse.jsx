import React from 'react';

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Legal</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2">Termos de Uso</h1>
          <p className="text-zinc-400 text-sm mt-3">Última atualização: 09/02/2026.</p>
        </header>

        <section className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p>
            Estes Termos de Uso regulam o acesso e utilização do QtdApp. Ao utilizar a plataforma, você declara
            ter lido e concordado com estes termos.
          </p>
          <p>
            O QtdApp fornece ferramentas para gestão e contagem de inventário. O usuário é responsável pela
            veracidade dos dados inseridos e pelo uso adequado do sistema.
          </p>
          <p>
            O serviço pode ser atualizado periodicamente. Podemos suspender contas em caso de uso indevido,
            violação de leis ou tentativa de fraude.
          </p>
          <p>
            Para dúvidas, suporte ou solicitações, entre em contato pelo e-mail: suporte@qtdapp.com.br.
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

export default TermsOfUse;
