import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PenTool, Plus, ArrowUpCircle, MapPin } from 'lucide-react';

import SchemaImporter from '../components/schema-editor/SchemaImporter';
import LabelDesigner from '../components/label-designer/LabelDesigner';
import ItemTable from '../components/ui/ItemTable';
import StockOperation from '../components/stock/StockOperation';
import StockMovement from '../components/stock/StockMovement';
import StockPointManager, { StockPointHistory } from '../components/stock/StockPointManager';
import NotificationSettings from '../components/settings/NotificationSettings';
import TeamManagement from '../components/settings/TeamManagement';
import * as schemaService from '../services/firebase/schemaService';
import * as itemService from '../services/firebase/itemService';
import * as templateService from '../services/firebase/templateService';
import * as stockPointService from '../services/firebase/stockPointService';
import { getDefaultTemplate, saveDefaultTemplate } from '../services/firebase/defaultTemplateService';
import { printLabels } from '../services/pdf/pdfService';
import { printViaBluetooth, isBluetoothAvailable } from '../services/pdf/bluetoothPrintService';
import Dashboard from '../components/dashboard/Dashboard';
import TourGuide from '../components/ui/TourGuideBubbles';
import OnboardingPanel from '../components/ui/OnboardingPanel';
import { getPlanConfig, isUnlimited, getTrialInfo } from '../core/plansConfig';
import { toast } from '../components/ui/toast';
import { setItemQty } from '../core/utils';
import { pathToTabId, tabIdToPath } from '../core/routes';

// Hooks extraídos
import useStockPoints from '../hooks/useStockPoints';
import useStockPointData from '../hooks/useStockPointData';
import useGlobalSearch from '../hooks/useGlobalSearch';

// Layout components extraídos
import Sidebar from '../components/layout/Sidebar';
import MobileTopBar from '../components/layout/MobileTopBar';
import PageHeader from '../components/layout/PageHeader';
import TrialBanner from '../components/layout/TrialBanner';

const LabelManagement = ({ user, tenantId: tenantIdProp, org, onLogout, isOnline, pendingMovementsCount, updatePendingCount }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derivar activeTab da URL
  const activeTab = pathToTabId[location.pathname] || 'dashboard';
  const setActiveTab = useCallback((tabId) => {
    const path = tabIdToPath[tabId];
    if (path) navigate(path);
  }, [navigate]);

  const [currentStockPoint, setCurrentStockPoint] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [skuSubmitting, setSkuSubmitting] = useState(false);
  const [manualItem, setManualItem] = useState({});
  const [tourToken, setTourToken] = useState(0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [, setOrgUsage] = useState({ seatsUsed: 0, stockPointsUsed: 0, templatesUsed: 0 });

  const tenantId = tenantIdProp || user?.uid || 'default-user';
  const trialInfo = getTrialInfo(org);
  const effectivePlanId = trialInfo.effectivePlanId;
  const planConfig = getPlanConfig(effectivePlanId);
  const canCreateDefaultTemplate = true;
  const canSaveFreeDefault = user?.superAdmin === true;
  const hasNotifications = pendingMovementsCount > 0;

  // Hooks extraídos
  const { stockPoints, setStockPoints, handleStockPointCreated: onPointCreated, handleStockPointDeleted: onPointDeleted } = useStockPoints(tenantId);
  const { currentSchema, setCurrentSchema, items, setItems, templates, setTemplates, template, setTemplate, loading, loadStockPointData, clearData } = useStockPointData(tenantId, currentStockPoint);
  const { globalSearch, setGlobalSearch, hasGlobalSearch, filteredItems } = useGlobalSearch(items, currentSchema);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOnboardingDismissed(localStorage.getItem('qtdapp_onboarding_dismissed') === 'true');
  }, []);

  useEffect(() => {
    setOrgUsage({
      seatsUsed: org?.seatsUsed ?? 0,
      stockPointsUsed: org?.stockPointsUsed ?? 0,
      templatesUsed: org?.templatesUsed ?? 0,
    });
  }, [org?.id]);

  useEffect(() => {
    if (currentStockPoint) {
      loadStockPointData(currentStockPoint.id);
    } else {
      clearData();
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
          next[field.key] = field.type === 'boolean' ? (prev[field.key] ?? false) : (prev[field.key] ?? '');
        });
        return next;
      });
    } else {
      setManualItem({});
    }
  }, [currentSchema?.id]);

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

  const handleStockPointCreated = (newPoint) => {
    onPointCreated(newPoint);
    setOrgUsage((prev) => ({ ...prev, stockPointsUsed: (prev.stockPointsUsed || 0) + 1 }));
  };

  const handleStockPointDeleted = (deletedPoint) => {
    onPointDeleted(deletedPoint);
    if (currentStockPoint?.id === deletedPoint?.id) setCurrentStockPoint(null);
    setOrgUsage((prev) => ({ ...prev, stockPointsUsed: Math.max(0, (prev.stockPointsUsed || 0) - 1) }));
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
      setManualItem(() => {
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
    } catch (_err) {
      toast("Erro ao conectar com impressora Bluetooth.", { type: 'error' });
    }
  };



  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      <TourGuide activeTab={activeTab} setActiveTab={setActiveTab} forceOpenToken={tourToken} />

      <MobileTopBar setSidebarOpen={setSidebarOpen} />
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        user={user}
        effectivePlanId={effectivePlanId}
        trialInfo={trialInfo}
        onLogout={onLogout}
      />

      <main className="flex-1 ml-0 md:ml-72 p-4 md:p-10 pt-20 md:pt-10">
        <TrialBanner trialInfo={trialInfo} org={org} />
        <PageHeader
          activeTab={activeTab}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          hasGlobalSearch={hasGlobalSearch}
          filteredItems={filteredItems}
          isOnline={isOnline}
          pendingMovementsCount={pendingMovementsCount}
          hasNotifications={hasNotifications}
          updatePendingCount={updatePendingCount}
        />

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




