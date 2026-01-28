import React, { useState, useEffect, useRef } from "react";
import appLogo from "../logo.png";
import landingImage from "../landingpage.png";
import PlanosSection from "./planos";
import { 
  Printer, 
  FileSpreadsheet, 
  Box, 
  Smartphone, 
  ArrowRight, 
  Menu, 
  X, 
  Tags, 
  Zap,
  Users,
  ClipboardList,
  ScanBarcode,
  Database,
  History,
  LayoutTemplate,
  Save,
  Edit3,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export default function LandingPage({ onEnter }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const canvasRef = useRef(null);
  const dragStateRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [mockBlocks, setMockBlocks] = useState([
    { id: "name", x: 32, y: 28, w: 150, h: 62 },
    { id: "price", x: 260, y: 220, w: 120, h: 44 },
    { id: "barcode", x: 40, y: 250, w: 140, h: 36 },
  ]);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const startDrag = (event, id) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const block = mockBlocks.find((item) => item.id === id);
    if (!block) return;
    dragStateRef.current = {
      id,
      offsetX: event.clientX - rect.left - block.x,
      offsetY: event.clientY - rect.top - block.y,
    };
    setDraggingId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleCanvasPointerMove = (event) => {
    if (!dragStateRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { id, offsetX, offsetY } = dragStateRef.current;
    const block = mockBlocks.find((item) => item.id === id);
    if (!block) return;
    const nextX = event.clientX - rect.left - offsetX;
    const nextY = event.clientY - rect.top - offsetY;
    setMockBlocks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const maxX = rect.width - item.w;
        const maxY = rect.height - item.h;
        return {
          ...item,
          x: clamp(nextX, 6, Math.max(6, maxX - 6)),
          y: clamp(nextY, 6, Math.max(6, maxY - 6)),
        };
      })
    );
  };
  const endDrag = () => {
    dragStateRef.current = null;
    setDraggingId(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* --- Navbar --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/95 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] py-2' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center group cursor-pointer">
              <div className="p-2 rounded-lg transform group-hover:rotate-3 transition-transform duration-300">
                <img src={appLogo} alt="QtdApp" className="h-12 w-auto object-contain" />
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {['Solução', 'Inventário', 'Etiquetas', 'Histórico'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm font-medium text-zinc-300 hover:text-emerald-300 transition-colors">
                  {item}
                </a>
              ))}
              <button
                className="bg-emerald-500/90 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-full font-medium transition-all shadow-lg hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 text-sm"
                onClick={onEnter}
              >
                Acessar Sistema
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={toggleMenu} className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none rounded-lg hover:bg-gray-100 transition-colors">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-zinc-950 border-t border-zinc-800 shadow-lg transition-all duration-300 origin-top ${isMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 overflow-hidden'}`}>
          <div className="px-4 py-6 space-y-4">
            {['Solução', 'Inventário', 'Etiquetas', 'Histórico'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-base font-medium text-zinc-200 hover:bg-zinc-900/60 hover:text-emerald-300 rounded-xl transition-colors"
              >
                {item}
              </a>
            ))}
            <div className="pt-4 border-t border-zinc-800">
              <button
                className="w-full bg-emerald-500/90 text-black px-5 py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform"
                onClick={onEnter}
              >
                Começar Grátis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 right-0 h-full -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-zinc-950 to-zinc-950 opacity-80"></div>
        <div className="absolute top-20 right-0 w-1/2 h-1/2 bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl rounded-full opacity-60 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mx-auto mb-10 flex justify-center">
            <img src={appLogo} alt="QtdApp" className="h-24 w-auto object-contain" />
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-100 mb-8 leading-[1.1]">
            A Ferramenta Definitiva para <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500">
              Contagem de Inventário
            </span>
          </h1>
          
          <p className="mt-6 max-w-2xl mx-auto text-xl text-zinc-300 mb-12 leading-relaxed">
            Elimine erros de balanço e planilhas confusas. Conte seu estoque com rapidez, audite resultados e use nosso gerador de etiquetas para manter tudo organizado. Contagem simultânea por várias pessoas com atualização em tempo real.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
            <button
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500/90 hover:bg-emerald-400 text-black px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-1"
              onClick={onEnter}
            >
              Começar Contagem Grátis <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900/70 hover:bg-zinc-900 text-zinc-200 border border-zinc-700 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:border-zinc-600">
              <ClipboardList className="w-5 h-5" /> Ver Relatório Exemplo
            </button>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="mt-20 relative mx-auto max-w-4xl opacity-95 hover:opacity-100 transition-opacity duration-500">
            <img
              src={landingImage}
              alt="Empilhadeira em armazem com prateleiras"
              className="rounded-2xl shadow-2xl border border-zinc-800"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent h-24 bottom-0 top-auto"></div>
          </div>
        </div>
      </section>

      {/* --- NEW SECTION: Visão Geral da Solução (Ciclo do Estoque) --- */}
      <section id="solução" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-emerald-300 tracking-wide uppercase mb-3">Workflow Profissional</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-zinc-100">Do Cadastro à Auditoria Final</h3>
            <p className="mt-4 text-xl text-zinc-400 max-w-3xl mx-auto">
              O QtdApp foca na integridade da sua contagem. Cadastre seus produtos, organize as gôndolas com etiquetas claras e realize o balanço sem surpresas.
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/30 via-zinc-500/30 to-emerald-500/30 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {/* Step 1 */}
              <div className="bg-zinc-900/60 p-6 rounded-2xl shadow-lg border border-zinc-800 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                  <Database className="w-8 h-8 text-emerald-300 group-hover:text-black" />
                </div>
                <h4 className="text-xl font-bold mb-2 text-zinc-100">1. Base de Dados</h4>
                <p className="text-zinc-400 text-sm">
                  Centralize seu cadastro de produtos. Importe do ERP ou Excel para ter a referência correta na hora de contar.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-zinc-900/60 p-6 rounded-2xl shadow-lg border border-zinc-800 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                  <Printer className="w-8 h-8 text-emerald-300 group-hover:text-black" />
                </div>
                <h4 className="text-xl font-bold mb-2 text-zinc-100">2. Organização</h4>
                <p className="text-zinc-400 text-sm">
                  Gôndola sem etiqueta gera erro. Use nosso gerador para identificar tudo antes de iniciar a contagem.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-zinc-900/60 p-6 rounded-2xl shadow-lg border border-zinc-800 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                  <ScanBarcode className="w-8 h-8 text-emerald-300 group-hover:text-black" />
                </div>
                <h4 className="text-xl font-bold mb-2 text-zinc-100">3. Contagem</h4>
                <p className="text-zinc-400 text-sm">
                  O coração do sistema. Bipe códigos, insira quantidades e faça o inventário físico (balanço) com agilidade.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-zinc-900/60 p-6 rounded-2xl shadow-lg border border-zinc-800 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-300 group-hover:text-black" />
                </div>
                <h4 className="text-xl font-bold mb-2 text-zinc-100">4. Resultado</h4>
                <p className="text-zinc-400 text-sm">
                  Confronte o físico x sistema. Gere relatórios de auditoria, exporte para Excel e ajuste seu estoque.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section: Gerador de Etiquetas (Como funcionalidade de apoio) --- */}
      <section id="etiquetas" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* Text Content */}
            <div className="lg:w-1/2">
              <div className="inline-block bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-sm font-bold mb-4">
                Organize para Contar Melhor
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Etiquetas Integradas ao Inventário</h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Não adianta contar se o produto não está identificado. Nosso módulo de etiquetas puxa os dados do seu inventário para garantir que o código na prateleira seja o mesmo do sistema.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-emerald-50 p-3 rounded-lg h-fit"><Edit3 className="w-6 h-6 text-emerald-600" /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Evite Erros de Bipagem</h4>
                    <p className="text-gray-600">Crie etiquetas com códigos de barras nítidos e legíveis, facilitando a leitura durante o balanço.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-indigo-50 p-3 rounded-lg h-fit"><Database className="w-6 h-6 text-indigo-600" /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Dados Sincronizados</h4>
                    <p className="text-gray-600">A etiqueta é gerada a partir do mesmo cadastro usado na contagem. Sem divergências de descrição ou preço.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-purple-50 p-3 rounded-lg h-fit"><LayoutTemplate className="w-6 h-6 text-purple-600" /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Personalize sua Identificação</h4>
                    <p className="text-gray-600">Arraste campos, mude tamanhos e salve modelos para Gôndola, Depósito ou Caixa Fechada.</p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <button className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Testar Gerador
                </button>
              </div>
            </div>

            {/* Interactive Visual Mockup */}
            <div className="lg:w-1/2 w-full">
              <div className="relative bg-white border border-zinc-200 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                {/* Fake Toolbar */}
                <div className="flex flex-wrap gap-2 mb-4 border-b border-zinc-200 pb-4 overflow-x-auto">
                   {['Nome do Produto', 'Preço R$', 'Código Barras', 'Localização'].map(tool => (
                     <div key={tool} className="bg-white border border-zinc-200 px-3 py-1 rounded-md text-xs font-semibold text-zinc-600 cursor-move shadow-sm whitespace-nowrap hover:border-emerald-500 hover:text-emerald-600 transition-colors">
                       :: {tool}
                     </div>
                   ))}
                </div>
                
                {/* Fake Canvas */}
                <div
                  ref={canvasRef}
                  className="bg-white border-2 border-dashed border-zinc-300 rounded-xl h-80 relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:14px_14px]"
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={endDrag}
                  onPointerLeave={endDrag}
                >
                  {/* Draggable Element Mock */}
                  {mockBlocks.map((block) => {
                    if (block.id === "name") {
                      return (
                        <div
                          key={block.id}
                          className={`absolute border border-emerald-500 bg-emerald-50 px-3 py-2 rounded-md shadow-lg ${
                            draggingId === block.id ? "cursor-grabbing" : "cursor-grab"
                          }`}
                          style={{ left: block.x, top: block.y, width: block.w }}
                          onPointerDown={(event) => startDrag(event, block.id)}
                        >
                          <span className="text-xs text-emerald-600 block mb-1">Nome do Produto</span>
                          <span className="font-bold text-zinc-900">Coca-Cola 2L</span>
                          <div className="absolute -right-1 -bottom-1 w-2 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                      );
                    }
                    if (block.id === "price") {
                      return (
                        <div
                          key={block.id}
                          className={`absolute border border-transparent hover:border-emerald-400 px-2 py-1 rounded ${
                            draggingId === block.id ? "cursor-grabbing" : "cursor-grab"
                          }`}
                          style={{ left: block.x, top: block.y }}
                          onPointerDown={(event) => startDrag(event, block.id)}
                        >
                          <span className="text-3xl font-bold text-zinc-900">R$ 9,99</span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={block.id}
                        className={`absolute border border-transparent hover:border-emerald-400 px-2 py-1 rounded opacity-80 ${
                          draggingId === block.id ? "cursor-grabbing" : "cursor-grab"
                        }`}
                        style={{ left: block.x, top: block.y, width: block.w, height: block.h }}
                        onPointerDown={(event) => startDrag(event, block.id)}
                      >
                        <div className="h-8 w-32 bg-zinc-800 rounded-md flex items-center justify-center text-white text-[10px] tracking-widest">
                          ||| || ||| || |||
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save Panel */}
                <div className="mt-4 flex justify-between items-center bg-zinc-100/80 p-3 rounded-lg">
                  <div className="text-sm font-medium text-zinc-600">Modelo: <span className="text-zinc-900 font-bold">Etiqueta de Balanço</span></div>
                  <button className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1 hover:bg-emerald-700 transition">
                    <Save className="w-3 h-3" /> Salvar Modelo
                  </button>
                </div>
              </div>
              {/* Decoration */}
              <div className="absolute -z-10 bg-emerald-500/20 rounded-full w-72 h-72 blur-3xl opacity-60 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>

          </div>
        </div>
      </section>

      {/* --- Section: Banco de Dados e Histórico Deep Dive --- */}
      <section id="histórico" className="py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-3xl">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">A Inteligência do seu Inventário</h2>
              <p className="text-gray-400 text-lg">
                Inventário é coisa séria. O QtdApp armazena seus dados para que você possa auditar contagens, verificar divergências e manter um histórico confiável para a contabilidade.
              </p>
            </div>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap">
              <Database className="w-4 h-4" /> Acessar Meus Dados
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Card 1: Histórico */}
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-emerald-500 transition-colors duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <History className="w-32 h-32" />
              </div>
              <div className="bg-emerald-900/50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 relative z-10">
                <RefreshCw className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 relative z-10">Auditoria de Contagens</h3>
              <p className="text-gray-400 mb-6 leading-relaxed relative z-10">
                Quem contou? Quando contou? O QtdApp guarda o log de cada registro. Compare o estoque físico atual com balanços anteriores.
              </p>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" /> Rastreabilidade total por usuário
                </li>
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" /> Histórico de divergências
                </li>
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" /> Re-emissão de relatórios fiscais
                </li>
              </ul>
            </div>

            {/* Card 2: Base de Produtos */}
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-emerald-500 transition-colors duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database className="w-32 h-32" />
              </div>
              <div className="bg-emerald-900/50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 relative z-10">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 relative z-10">Cadastro Único</h3>
              <p className="text-gray-400 mb-6 leading-relaxed relative z-10">
                Pare de digitar o mesmo produto toda vez que for contar. Cadastre uma vez e reutilize os dados para inventários mensais, rotativos ou gerais.
              </p>
               <ul className="space-y-3 relative z-10">
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Importação fácil via Excel
                </li>
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Padronização de códigos
                </li>
                <li className="flex items-center gap-3 text-gray-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Base pronta para qualquer balanço
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- Social Proof / Stats --- */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12 text-center">
          <StatItemDark value="+1M" label="Itens Contados" />
          <StatItemDark value="Excel" label="Exportação Nativa" />
          <StatItemDark value="100%" label="Precisão no Estoque" />
          <StatItemDark value="24/7" label="Suporte Técnico" />
        </div>
      </section>

      {/* --- Planos --- */}
      <PlanosSection onEnter={onEnter} />

      {/* --- CTA Section --- */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-gradient-to-r from-emerald-900 to-indigo-900 rounded-3xl p-8 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
            
            <h2 className="text-3xl sm:text-5xl font-bold mb-6 relative z-10">Pronto para o balanço?</h2>
            <p className="text-xl text-emerald-200 mb-10 max-w-2xl mx-auto relative z-10">
              Comece agora mesmo. Crie sua conta gratuita, importe seus produtos e inicie sua contagem de inventário hoje.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <button
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-xl text-lg font-bold transition shadow-lg shadow-emerald-900/50"
                onClick={onEnter}
              >
                Criar Conta Grátis
              </button>
              <button className="bg-transparent hover:bg-white/10 text-white border border-white/30 px-10 py-4 rounded-xl text-lg font-semibold transition">
                Ver Demonstração
              </button>
            </div>
            <p className="mt-6 text-sm text-emerald-300/80 relative z-10">Ideal para Varejo, Indústria e Logística.</p>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-6 h-6 text-emerald-600" />
                <span className="font-bold text-xl text-gray-900">QtdApp</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                A solução definitiva para contagem de inventário e organização de estoque. Seus dados seguros e auditáveis.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-emerald-600">App de Inventário</a></li>
                <li><a href="#" className="hover:text-emerald-600">Gerador de Etiquetas</a></li>
                <li><a href="#" className="hover:text-emerald-600">Banco de Dados</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-emerald-600">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-emerald-600">Vídeos Tutoriais</a></li>
                <li><a href="#" className="hover:text-emerald-600">Fale Conosco</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-emerald-600">Privacidade</a></li>
                <li><a href="#" className="hover:text-emerald-600">Termos de Uso</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} QtdApp. Todos os direitos reservados.
            </div>
            <div className="flex gap-4">
               <div className="w-8 h-8 bg-gray-100 rounded-full hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold">IN</div>
               <div className="w-8 h-8 bg-gray-100 rounded-full hover:bg-pink-100 text-pink-600 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold">IG</div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Components auxiliares
function StatItemDark({ value, label }) {
  return (
    <div className="p-4 group">
      <div className="text-4xl md:text-5xl font-bold mb-2 text-gray-900 group-hover:scale-110 transition-transform duration-300 inline-block">{value}</div>
      <div className="text-gray-500 font-medium tracking-wide uppercase text-sm">{label}</div>
    </div>
  );
}


