import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, PenTool, BarChart3, 
  Settings, LogOut, Bell, User, Users, Search, Plus,
  ScanLine, AlertCircle, ArrowUpCircle, MapPin,
  Menu, X, Clock
} from 'lucide-react';

import SchemaImporter from '../components/schema-editor/SchemaImporter';
import LabelDesigner from '../components/label-designer/LabelDesigner';
import ItemTable from '../components/ui/ItemTable';
import StockOperation from '../components/stock/StockOperation';
import StockMovement from '../components/stock/StockMovement';
import StockPointManager, { StockPointHistory } from '../components/stock/StockPointManager'; // Novo componente de gestão de pontos e histórico
import NotificationSettings from '../components/settings/NotificationSettings';
import TeamManagement from '../components/settings/TeamManagement';
import * as schemaService from '../services/firebase/schemaService';
import * as itemService from '../services/firebase/itemService';
import * as templateService from '../services/firebase/templateService';
import * as stockPointService from '../services/firebase/stockPointService';
import { getDefaultTemplate, saveDefaultTemplate } from '../services/firebase/defaultTemplateService';
import { syncPendingMovements } from '../services/firebase/stockService';
import { printLabels } from '../services/pdf/pdfService';
import { printViaBluetooth, isBluetoothAvailable } from '../services/pdf/bluetoothPrintService';
import Dashboard from '../components/dashboard/Dashboard';
import TourGuide from '../components/ui/TourGuideBubbles';
import OnboardingPanel from '../components/ui/OnboardingPanel';
import { getPlanConfig, isUnlimited, getTrialInfo } from '../core/plansConfig';
import { normalizeText } from '../catalogUtils';
import { toast } from '../components/ui/toast';
import { setItemQty } from '../core/utils';

const LabelManagement = ({ user, tenantId: tenantIdProp, org, onLogout, isOnline, pendingMovementsCount, updatePendingCount }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentSchema, setCurrentSchema] = useState(null);
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);
  const [currentStockPoint, setCurrentStockPoint] = useState(null); // Novo estado para Ponto de Estocagem
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [skuSubmitting, setSkuSubmitting] = useState(false);
  const [stockPoints, setStockPoints] = useState([]);
  const [manualItem, setManualItem] = useState({});
  const [tourToken, setTourToken] = useState(0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [orgUsage, setOrgUsage] = useState({ seatsUsed: 0, stockPointsUsed: 0, templatesUsed: 0 });
  const [globalSearch, setGlobalSearch] = useState('');

  const tenantId = tenantIdProp || user?.uid || 'default-user';
  const trialInfo = getTrialInfo(org);
  const effectivePlanId = trialInfo.effectivePlanId;
  const planConfig = getPlanConfig(effectivePlanId);
  const canCreateDefaultTemplate = true;
  const canSaveFreeDefault = user?.superAdmin === true;
  const hasNotifications = pendingMovementsCount > 0;

  const hasGlobalSearch = globalSearch.trim().length > 0;
  const filteredItems = useMemo(() => {
    if (!hasGlobalSearch) return items;
    const normalized = normalizeText(globalSearch);
    return items.filter((item) => {
      const values = currentSchema?.fields?.length
        ? currentSchema.fields.map((field) => item.data?.[field.key || field.name])
        : Object.values(item.data || {});
      const searchText = normalizeText([item.id, ...values].filter(Boolean).join(' '));
      return searchText.includes(normalized);
    });
  }, [items, currentSchema, globalSearch, hasGlobalSearch]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem('qtdapp_onboarding_dismissed') === 'true';
    setOnboardingDismissed(dismissed);
  }, []);

  useEffect(() => {
    setOrgUsage({
      seatsUsed: org?.seatsUsed ?? 0,
      stockPointsUsed: org?.stockPointsUsed ?? 0,
      templatesUsed: org?.templatesUsed ?? 0
    });
  }, [org?.id]);

  useEffect(() => {
    if (currentStockPoint) {
      loadStockPointData(currentStockPoint.id);
    } else {
      setCurrentSchema(null);
      setItems([]);
      setTemplates([]);
      setTemplate(null);
    }
  }, [tenantId, currentStockPoint]);

  useEffect(() => {
    if (!tenantId || currentStockPoint) return;
    if (effectivePlanId !== 'free') return;
    handleCreateDefaultTemplate().catch(() => {});
  }, [tenantId, effectivePlanId, currentStockPoint]);

  useEffect(() => {
    if (currentSchema?.fields?.length) {
      setManualItem((prev) => {
        const next = {};
        currentSchema.fields.forEach((field) => {
          if (field.type === 'boolean') {
            next[field.key] = prev[field.key] ?? false;
          } else {
            next[field.key] = prev[field.key] ?? '';
          }
        });
        return next;
      });
    } else {
      setManualItem({});
    }
  }, [currentSchema?.id]);

  useEffect(() => {
    const loadPoints = async () => {
      try {
        const loadedPoints = await stockPointService.getStockPointsByTenant(tenantId);
        setStockPoints(loadedPoints);
      } catch (error) {
        console.error("Erro ao carregar pontos de estocagem:", error);
      }
    };
    loadPoints();
  }, [tenantId]);

  const loadStockPointData = async (stockPointId) => {
    setLoading(true);
    try {
      const schema = await schemaService.getSchemaByStockPoint(tenantId, stockPointId);
      setCurrentSchema(schema || null);
      if (schema) {
        const [loadedItems, loadedTemplates] = await Promise.all([
          itemService.getItemsByStockPoint(tenantId, stockPointId),
          templateService.getTemplatesBySchema(tenantId, schema.id)
        ]);
        setItems(loadedItems);
        setTemplates(loadedTemplates);
        const templateWithElements = loadedTemplates.find((tpl) => (tpl.elements || []).length > 0) || null;
        setTemplate(templateWithElements || (loadedTemplates.length > 0 ? loadedTemplates[0] : null));
      } else {
        setItems([]);
        setTemplates([]);
        setTemplate(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do ponto:", error);
      setItems([]);
      setTemplates([]);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qtdapp_tour_completed', 'false');
      localStorage.setItem('qtdapp_tour_step', '1');
    }
    setTourToken(Date.now());
  };

  const handleDismissOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qtdapp_onboarding_dismissed', 'true');
    }
    setOnboardingDismissed(true);
  };

  const ensureDefaultStockPointAndSchema = async () => {
    const templatesLimit = planConfig.templatesMax;
    if (!isUnlimited(templatesLimit) && templates.length >= templatesLimit) {
      throw new Error('templates_limit');
    }

    let points = await stockPointService.getStockPointsByTenant(tenantId);
    let point = points[0] || null;

    if (!point) {
      const stockPointsLimit = planConfig.stockPointsMax;
      if (!isUnlimited(stockPointsLimit) && stockPoints.length >= stockPointsLimit) {
        throw new Error('stockpoints_limit');
      }
      point = await stockPointService.createStockPoint(tenantId, 'Ponto Padrão');
      points = [point, ...points];
      setStockPoints(points);
      setOrgUsage((prev) => ({
        ...prev,
        stockPointsUsed: (prev.stockPointsUsed || 0) + 1
      }));
    }

    let schema = await schemaService.getSchemaByStockPoint(tenantId, point.id);
    if (!schema) {
      const schemaData = {
        name: `Itens - ${point.name}`,
        fields: [
          { key: 'codigo', label: 'Código', type: 'text', required: true },
          { key: 'descricao', label: 'Descrição', type: 'text', required: false },
          { key: 'quantidade', label: 'Qtd', type: 'number', required: false },
          { key: 'data', label: 'Data', type: 'date', required: false }
        ],
        sampleData: {
          codigo: '000123',
          descricao: 'Produto Padrão',
          quantidade: 10,
          data: '2025-01-01'
        }
      };
      schema = await schemaService.saveSchema(tenantId, schemaData, point.id);
    }

    return { point, schema };
  };

  const handleCreateDefaultTemplate = async () => {
    try {
      const { point, schema } = await ensureDefaultStockPointAndSchema();
      const existingTemplates = await templateService.getTemplatesBySchema(tenantId, schema.id);
      const shouldUseGlobalDefault = effectivePlanId === 'free';
      const globalDefault = shouldUseGlobalDefault ? await getDefaultTemplate('free') : null;

      const hasUsableTemplate = existingTemplates.some((tpl) => (tpl.elements || []).length > 0);
      if (!hasUsableTemplate && globalDefault) {
        const defaultTemplate = {
          name: globalDefault.name,
          size: globalDefault.size,
          elements: globalDefault.elements,
          logistics: globalDefault.logistics
        };
        const saved = await templateService.saveTemplate(
          tenantId,
          schema.id,
          schema.version || 1,
          defaultTemplate
        );
        setTemplate(saved);
        setTemplates([saved]);
        if (existingTemplates.length === 0) {
          setOrgUsage((prev) => ({
            ...prev,
            templatesUsed: (prev.templatesUsed || 0) + 1
          }));
        }
      } else if (existingTemplates.length === 0) {
        const defaultTemplate = {
          name: 'Etiqueta Padrão',
          size: { width: 100, height: 50 },
          elements: [],
          logistics: { street: '', shelf: '', level: '' }
        };
        const saved = await templateService.saveTemplate(
          tenantId,
          schema.id,
          schema.version || 1,
          defaultTemplate
        );
        setTemplate(saved);
        setTemplates([saved]);
        setOrgUsage((prev) => ({
          ...prev,
          templatesUsed: (prev.templatesUsed || 0) + 1
        }));
      } else {
        setTemplates(existingTemplates);
        setTemplate(existingTemplates[0]);
      }

      setCurrentStockPoint(point);
      setCurrentSchema(schema);
      setActiveTab('designer');
    } catch (error) {
      if (error?.message === 'templates_limit') {
        toast('Limite de templates do seu plano.', { type: 'warning' });
        return;
      }
      if (error?.message === 'stockpoints_limit') {
        toast('Limite de pontos de estocagem do seu plano.', { type: 'warning' });
        return;
      }
      console.error("Erro ao criar etiqueta padrao:", error);
      toast("Erro ao criar etiqueta padrão.", { type: 'error' });
    }
  };

  const handleSaveFreeDefaultTemplate = async (templateData) => {
    try {
      await saveDefaultTemplate('free', templateData);
      if (currentSchema) {
        const saved = await templateService.saveTemplate(
          tenantId,
          currentSchema.id,
          currentSchema.version || 1,
          templateData
        );
        setTemplate(saved);
        setTemplates((prev) => {
          const existingIndex = prev.findIndex(t => t.id === saved.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = saved;
            return next;
          }
          return [saved, ...prev];
        });
      }
      toast('Template padrão do Free atualizado.', { type: 'success' });
    } catch (error) {
      console.error('Erro ao salvar template padrao:', error);
      toast('Erro ao salvar template padrão.', { type: 'error' });
    }
  };

  const handleStockPointCreated = async (newPoint) => {
    if (newPoint?.id) {
      setStockPoints((prev) => {
        if (prev.some((p) => p.id === newPoint.id)) return prev;
        return [newPoint, ...prev];
      });
    }
    setOrgUsage((prev) => ({
      ...prev,
      stockPointsUsed: (prev.stockPointsUsed || 0) + 1
    }));
  };

  const handleStockPointDeleted = (deletedPoint) => {
    if (!deletedPoint?.id) return;
    setStockPoints((prev) => prev.filter((p) => p.id !== deletedPoint.id));
    if (currentStockPoint?.id === deletedPoint.id) {
      setCurrentStockPoint(null);
    }
    setOrgUsage((prev) => ({
      ...prev,
      stockPointsUsed: Math.max(0, (prev.stockPointsUsed || 0) - 1)
    }));
  };

  const handleAddSku = async (e) => {
    e.preventDefault();
    if (!currentStockPoint) {
      toast("Selecione um ponto de estocagem antes de cadastrar SKUs.", { type: 'warning' });
      return;
    }
    if (!currentSchema) {
      toast("Crie as colunas do ponto antes de cadastrar SKUs.", { type: 'warning' });
      return;
    }
    const requiredMissing = (currentSchema.fields || []).some((field) => {
      if (!field.required) return false;
      const value = manualItem[field.key];
      if (field.type === 'boolean') return value !== true;
      return value === undefined || value === null || String(value).trim() === '';
    });
    if (requiredMissing) {
      toast("Preencha todos os campos obrigatórios.", { type: 'warning' });
      return;
    }

    setSkuSubmitting(true);
    try {
      const payload = {};
      (currentSchema.fields || []).forEach((field) => {
        let value = manualItem[field.key];
        if (value === undefined || value === null || value === '') return;
        if (field.type === 'number') {
          const num = Number(value);
          value = Number.isNaN(num) ? value : num;
        }
        payload[field.key] = value;
      });
      const newItem = await itemService.createItem(
        tenantId,
        currentSchema.id,
        currentSchema.version || 1,
        payload,
        currentStockPoint.id
      );
      setItems([newItem, ...items]);
      setManualItem((prev) => {
        const reset = {};
        (currentSchema.fields || []).forEach((field) => {
          reset[field.key] = field.type === 'boolean' ? false : '';
        });
        return reset;
      });
    } catch (error) {
      console.error("Erro ao salvar SKU:", error);
      toast("Erro ao salvar SKU.", { type: 'error' });
    } finally {
      setSkuSubmitting(false);
    }
  };

  const handlePrint = async (selectedItems) => {
    if (!template) {
      toast("Por favor, selecione um template de etiqueta primeiro.", { type: 'warning' });
      return;
    }
    const itemsToPrint = selectedItems.map(item => ({
      ...item.data,
      id: item.id
    }));
    await printLabels(template, itemsToPrint);
  };

  const handleBluetoothPrint = async (selectedItems) => {
    try {
      const itemsToPrint = selectedItems.map(item => ({
        ...item.data,
        id: item.id
      }));
      await printViaBluetooth(itemsToPrint, template);
    } catch (error) {
      toast("Erro ao conectar com impressora Bluetooth.", { type: 'error' });
    }
  };



  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      <TourGuide activeTab={activeTab} setActiveTab={setActiveTab} forceOpenToken={tourToken} />
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
          title="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="text-sm font-bold text-white truncate">
          {activeTab === 'dashboard' && 'Visão Geral'}
          {activeTab === 'stock_points' && 'Ponto de Estocagem'}
          {activeTab === 'designer' && 'Engenharia de Etiquetas'}
          {activeTab === 'movement_internal' && 'Movimentação de Carga'}
          {activeTab === 'operation' && 'Ajuste Rápido'}
          {activeTab === 'reports' && 'Relatórios'}
          {activeTab === 'settings' && 'Configurações'}
        </div>
        <div className="w-9" />
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Profissional */}
      <aside className={`w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col p-6 fixed h-full z-50 transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="md:hidden flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
            title="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mb-12 px-2">
          <img
            src="/logo.png"
            alt="QtdApp"
            className="w-40 max-w-full h-auto drop-shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
          />
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'stock_points', label: 'Ponto de Estocagem', icon: MapPin },
            { id: 'designer', label: 'Engenharia de Etiquetas', icon: PenTool },
            { id: 'operation', label: 'Ajuste Rápido', icon: ScanLine },
            { id: 'reports', label: 'Relatórios', icon: BarChart3 },
            { id: 'team', label: 'Equipe', icon: Users },
            { id: 'settings', label: 'Configurações', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              data-guide={`nav-${item.id}`}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${activeTab === item.id ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-black' : 'group-hover:text-emerald-500'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-900 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
              <User size={20} className="text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.email || 'Usuário'}</p>
              <p className="text-xs text-zinc-500 uppercase font-bold">
                Plano {effectivePlanId.charAt(0).toUpperCase() + effectivePlanId.slice(1)}
                {trialInfo.isTrial && <span className="text-emerald-400"> (Trial)</span>}
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
          >
            <LogOut size={20} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 md:ml-72 p-4 md:p-10 pt-20 md:pt-10">

        {/* Trial Banner */}
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
                  Aproveite todos os recursos Pro. Após o trial, seu plano volta para Free.
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

        {/* Trial Expired Banner */}
        {trialInfo.expired && (org?.status !== 'active') && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-xl">
                <AlertCircle size={20} className="text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Seu trial Pro expirou
                </p>
                <p className="text-xs text-zinc-400">
                  Você está no plano Free. Assine para recuperar seus recursos Pro.
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
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 md:mb-12">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'stock_points' && 'Ponto de Estocagem'}
              {activeTab === 'designer' && 'Engenharia de Etiquetas'}
              {activeTab === 'movement_internal' && 'Movimentação de Carga'}
              {activeTab === 'operation' && 'Ajuste Rápido'}
              {activeTab === 'reports' && 'Relatórios e BI'}
              {activeTab === 'team' && 'Equipe e Permissões'}
              {activeTab === 'settings' && 'Configurações do Sistema'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {activeTab === 'dashboard' && 'Bem-vindo ao centro de comando do seu inventário.'}
              {activeTab === 'stock_points' && 'Crie o ponto e cadastre os SKUs vinculados.'}
              {activeTab === 'designer' && 'Crie layouts de etiquetas profissionais com precisão milimétrica.'}
              {activeTab === 'movement_internal' && 'Gerencie a entrada e saída de itens no ponto de estocagem.'}
              {activeTab === 'operation' && 'Realize ajustes pontuais e conferências rápidas.'}
              {activeTab === 'reports' && 'Analise dados, perdas e produtividade da sua operação.'}
              {activeTab === 'team' && 'Convide membros e controle permissões da organização.'}
              {activeTab === 'settings' && 'Gerencie notificações, alertas e preferências do QtdApp.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input 
                type="text" 
                placeholder="Busca rápida..." 
                className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-8 text-xs text-white focus:border-emerald-500 outline-none w-64"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              {hasGlobalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
              {hasGlobalSearch && activeTab === 'stock_points' && (
                <div className="mt-1 text-[10px] text-zinc-500">
                  {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'} no ponto ativo
                </div>
              )}
            </div>
	            <div className="flex items-center gap-3">
	              {pendingMovementsCount > 0 && (
	                <button 
	                  className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 hover:bg-amber-500/20 relative flex items-center gap-2 text-xs font-bold transition-all"
	                  title="Movimentos Pendentes de Sincronização"
                  onClick={() => {
                    if (!navigator.onLine) {
                      toast("Você está offline. Conecte-se para sincronizar.", { type: 'warning' });
                      return;
                    }
                    syncPendingMovements()
                      .then(({ synced, remaining }) => {
                        toast(`Sincronizados ${synced} movimentos. Restam ${remaining}.`, { type: 'success' });
                      })
                      .catch(() => {
                        toast("Erro ao sincronizar movimentos pendentes.", { type: 'error' });
                      })
                      .finally(() => {
                        updatePendingCount();
                      });
                  }}
	                >
	                  <AlertCircle size={16} />
	                  {pendingMovementsCount} Pendente{pendingMovementsCount > 1 ? 's' : ''}
	                </button>
	              )}
	              <button
	                type="button"
	                onClick={() => {
	                  if (hasNotifications) {
	                    toast(`Você tem ${pendingMovementsCount} movimento${pendingMovementsCount > 1 ? 's' : ''} pendente${pendingMovementsCount > 1 ? 's' : ''}.`, { type: 'warning' });
	                  } else {
	                    toast("Sem notificações no momento.", { type: 'info' });
	                  }
	                }}
	                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white relative"
	                title={hasNotifications ? 'Notificações pendentes' : 'Sem notificações'}
	              >
	                <Bell size={20} />
	                {hasNotifications && (
	                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-zinc-900" />
	                )}
	              </button>
	              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'} border-2 border-zinc-950`} title={isOnline ? 'Online' : 'Offline'} />
	            </div>
          </div>
        </header>

        <div className="min-h-[600px]">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {!onboardingDismissed && (
                    <OnboardingPanel
                      stockPointsCount={stockPoints.length}
                      currentStockPoint={currentStockPoint}
                      hasSchema={!!currentSchema}
                      hasItems={items.length > 0}
                      hasTemplate={templates.length > 0}
                      onNavigate={(tab) => setActiveTab(tab)}
                      onStartTour={handleStartTour}
                      onDismiss={handleDismissOnboarding}
                    />
                  )}
                  <Dashboard tenantId={tenantId} currentSchema={currentSchema} view="dashboard" />
                </div>
              )}
              
              {activeTab === 'stock_points' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  {currentStockPoint && (
                    <div className="flex items-center justify-between bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg">{currentStockPoint.name}</h3>
                          <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Ponto Ativo</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setActiveTab('movement_internal')}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                        >
                          <ArrowUpCircle size={14} /> Movimentar Lote
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                      <StockPointManager 
                        tenantId={tenantId}
                        currentStockPoint={currentStockPoint}
                        onSelectStockPoint={setCurrentStockPoint}
                        planConfig={planConfig}
                        currentCount={stockPoints.length}
                        onStockPointCreated={handleStockPointCreated}
                        onStockPointDeleted={handleStockPointDeleted}
                      />

                      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                          <Plus size={20} className="text-emerald-500" /> Cadastrar SKU Manual
                        </h2>
                        {currentStockPoint ? (
                          <form onSubmit={handleAddSku} className="space-y-4">
                            {currentSchema?.fields?.map((field) => {
                              const value = manualItem[field.key];
                              const commonClass = "w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all";
                              if (field.type === 'boolean') {
                                return (
                                  <label key={field.key} className="flex items-center gap-2 text-xs text-zinc-400">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => setManualItem((prev) => ({ ...prev, [field.key]: e.target.checked }))} 
                                      className="accent-emerald-500"
                                      disabled={skuSubmitting || !currentSchema}
                                    />
                                    {field.label || field.key}
                                  </label>
                                );
                              }
                              return (
                                <input
                                  key={field.key}
                                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                  placeholder={field.label || field.key}
                                  className={commonClass}
                                  value={value ?? ''}
                                  onChange={(e) => setManualItem((prev) => ({ ...prev, [field.key]: e.target.value }))} 
                                  disabled={skuSubmitting || !currentSchema}
                                />
                              );
                            })}
                            <button
                              type="submit"
                              disabled={skuSubmitting || !currentSchema}
                              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] disabled:bg-zinc-800"
                            >
                              {skuSubmitting ? "Salvando..." : "Cadastrar SKU"}
                            </button>
                          </form>
                        ) : (
                          <p className="text-zinc-500 text-sm">Selecione um ponto de estocagem para começar a cadastrar SKUs. Se ainda não tiver um, crie no painel ao lado.</p>
                        )}
                        {currentStockPoint && !currentSchema && (
                          <p className="text-zinc-500 text-xs mt-3">
                            Antes de cadastrar SKUs, crie as colunas do ponto abaixo.
                          </p>
                        )}
                      </div>

                      <SchemaImporter 
                        key={currentStockPoint?.id || 'no-point'}
                        tenantId={tenantId}
                        stockPointId={currentStockPoint?.id || null}
                        defaultName={currentStockPoint?.name ? `Itens - ${currentStockPoint.name}` : ''}
                        currentSchema={currentSchema}
                        isFreePlan={effectivePlanId === 'free'}
                        onImported={(schema, itemCount = 0) => {
                          if (schema) {
                            setCurrentSchema(schema);
                          }
                          if (currentStockPoint && itemCount > 0) {
                            loadStockPointData(currentStockPoint.id);
                          }
                        }} 
                      />
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                      {currentSchema && templates.length > 0 && (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <PenTool size={18} className="text-emerald-500" />
                            <span className="text-sm font-bold text-white">Modelo de Etiqueta:</span>
                            <select 
                              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                              value={template?.id || ''}
                              onChange={(e) => setTemplate(templates.find(t => t.id === e.target.value))}
                            >
                              {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name || `Modelo ${t.id.slice(0,4)}`}</option>
                              ))}
                            </select>
                          </div>
                          <button 
                            onClick={() => setActiveTab('designer')}
                            className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest hover:underline"
                          >
                            Editar Layout
                          </button>
                        </div>
                      )}

                      {currentSchema && templates.length === 0 && canCreateDefaultTemplate && (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <PenTool size={18} className="text-emerald-500" />
                            <span className="text-sm font-bold text-white">Sem etiqueta padrão</span>
                          </div>
                          <button 
                            onClick={handleCreateDefaultTemplate}
                            className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest hover:underline"
                          >
                            Criar Etiqueta padrão
                          </button>
                        </div>
                      )}

                      {currentSchema && currentStockPoint ? (
                        <ItemTable 
                          items={hasGlobalSearch ? filteredItems : items} 
                          schema={currentSchema}
                          onPrintSelected={handlePrint}
                          onBluetoothPrint={handleBluetoothPrint}
                          hasBluetooth={isBluetoothAvailable()}
                          searchTerm={globalSearch}
                        />
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                          <p className="text-zinc-500">Selecione um ponto e cadastre os SKUs para ver a tabela aqui.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'movement_internal' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                      <StockPointManager 
                        tenantId={tenantId}
                        currentStockPoint={currentStockPoint}
                        onSelectStockPoint={setCurrentStockPoint}
                        planConfig={planConfig}
                        currentCount={stockPoints.length}
                        onStockPointCreated={handleStockPointCreated}
                        onStockPointDeleted={handleStockPointDeleted}
                      />
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                      {currentSchema && currentStockPoint ? (
                        <>
                          <StockMovement 
                            items={items} 
                            schema={currentSchema}
                            tenantId={tenantId}
                            currentStockPoint={currentStockPoint}
                            updatePendingCount={updatePendingCount}
                            onItemsUpdated={(updates) => {
                              setItems((prev) => prev.map((item) => {
                                if (!updates.has(item.id)) return item;
                                const nextQty = updates.get(item.id);
                                const data = setItemQty(item.data, nextQty);
                                return { ...item, data };
                              }));
                            }}
                          />
                          <StockPointHistory stockPointId={currentStockPoint.id} tenantId={tenantId} />
                        </>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                          <p className="text-zinc-500">Selecione um ponto de estocagem e adicione itens para registrar entradas e saídas.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'designer' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-sm text-zinc-400">
                      Selecione o ponto de estocagem para carregar os campos do catálogo.
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                      <select
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full md:w-72"
                        value={currentStockPoint?.id || ''}
                        onChange={(e) => {
                          const selected = stockPoints.find(p => p.id === e.target.value) || null;
                          setCurrentStockPoint(selected);
                        }}
                      >
                        <option value="">Selecione um ponto de estocagem</option>
                        {stockPoints.map(point => (
                          <option key={point.id} value={point.id}>{point.name}</option>
                        ))}
                      </select>
                      {canCreateDefaultTemplate && (
                        <button
                          type="button"
                          onClick={handleCreateDefaultTemplate}
                          className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                        >
                          Criar Etiqueta Padrão
                        </button>
                      )}
                    </div>
                  </div>
                  {currentSchema ? (
                    <LabelDesigner 
                      schema={currentSchema}
                      initialTemplate={template}
                      canSaveAsDefault={canSaveFreeDefault}
                      onSaveAsDefault={handleSaveFreeDefaultTemplate}
                      onSaveTemplate={async (newTemplate) => {
                        const templatesLimit = planConfig.templatesMax;
                        const templatesUsed = templates.length;
                        const isNewTemplate = !newTemplate.id;
                        if (!isUnlimited(templatesLimit) && isNewTemplate && templatesUsed >= templatesLimit) {
                          toast("Limite de templates do seu plano.", { type: 'warning' });
                          return;
                        }

                        const saved = await templateService.saveTemplate(tenantId, currentSchema.id, currentSchema.version || 1, newTemplate);
                        setTemplate(saved);
                        setTemplates((prev) => {
                          const existingIndex = prev.findIndex(t => t.id === saved.id);
                          if (existingIndex >= 0) {
                            const next = [...prev];
                            next[existingIndex] = saved;
                            return next;
                          }
                          return [saved, ...prev];
                        });
                        if (isNewTemplate) {
                          setOrgUsage((prev) => ({
                            ...prev,
                            templatesUsed: (prev.templatesUsed || 0) + 1
                          }));
                        }
                        toast("Template de engenharia salvo com sucesso!", { type: 'success' });
                      }}
                    />
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                      <p className="text-zinc-500">Selecione um ponto e importe itens para liberar a engenharia de etiquetas.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'operation' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  {currentSchema && currentStockPoint ? (
                    <StockOperation 
                      items={items} 
                      schema={currentSchema}
                      tenantId={tenantId}
                      currentStockPoint={currentStockPoint}
                      currentUserId={user?.uid}
                      onItemsUpdated={(updates) => {
                        setItems((prev) => prev.map((item) => {
                          if (!updates.has(item.id)) return item;
                          const nextQty = updates.get(item.id);
                          const data = setItemQty(item.data, nextQty);
                          return { ...item, data };
                        }));
                      }}
                    />
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                      <p className="text-zinc-500">Selecione um ponto e um item para iniciar o ajuste de estoque.</p>
                    </div>
                  )}
                </div>
              )}



                {activeTab === 'reports' && (
                  <Dashboard tenantId={tenantId} currentSchema={currentSchema} view="reports" />
                )}

              {activeTab === 'team' && (
                <TeamManagement orgId={tenantId} currentUserId={user?.uid} />
              )}

              {activeTab === 'settings' && (
                <NotificationSettings />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default LabelManagement;




