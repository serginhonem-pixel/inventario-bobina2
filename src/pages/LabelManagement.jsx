import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, PenTool, BarChart3, 
  Settings, LogOut, Bell, User, Search, Plus,
  ScanLine, AlertCircle, ArrowUpCircle, MapPin,
  Menu, X
} from 'lucide-react';

import SchemaImporter from '../components/schema-editor/SchemaImporter';
import LabelDesigner from '../components/label-designer/LabelDesigner';
import ItemTable from '../components/ui/ItemTable';
import StockOperation from '../components/stock/StockOperation';
import StockMovement from '../components/stock/StockMovement';
import StockPointManager, { StockPointHistory } from '../components/stock/StockPointManager'; // Novo componente de gestão de pontos e histórico
import NotificationSettings from '../components/settings/NotificationSettings';
import DynamicForm from '../components/dynamic-form/DynamicForm';
import * as schemaService from '../services/firebase/schemaService';
import * as itemService from '../services/firebase/itemService';
import * as templateService from '../services/firebase/templateService';
import { syncPendingMovements } from '../services/firebase/stockService';
import { printLabels } from '../services/pdf/pdfService';
import { printViaBluetooth, isBluetoothAvailable } from '../services/pdf/bluetoothPrintService';
import Dashboard from '../components/dashboard/Dashboard';
import TourGuide from '../components/ui/TourGuide';

const LabelManagement = ({ user, onLogout, isOnline, pendingMovementsCount, updatePendingCount }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentSchema, setCurrentSchema] = useState(null);
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);
  const [currentStockPoint, setCurrentStockPoint] = useState(null); // Novo estado para Ponto de Estocagem
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tenantId = user?.uid || 'default-user';

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
        setTemplate(loadedTemplates.length > 0 ? loadedTemplates[0] : null);
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

  const handleAddItem = async (itemData) => {
    if (!currentSchema || !currentStockPoint) {
      alert("Selecione um ponto de estocagem com itens antes de cadastrar.");
      return;
    }
    try {
      const newItem = await itemService.createItem(
        tenantId,
        currentSchema.id,
        currentSchema.version,
        itemData,
        currentStockPoint.id
      );
      setItems([newItem, ...items]);
    } catch (error) {
      console.error("Erro ao salvar item:", error);
      alert("Erro ao salvar item");
    }
  };

  const handlePrint = (selectedItems) => {
    if (!template) {
      alert("Por favor, selecione um template de etiqueta primeiro.");
      return;
    }
    const itemsToPrint = selectedItems.map(item => ({
      ...item.data,
      id: item.id
    }));
    printLabels(template, itemsToPrint);
  };

  const handleBluetoothPrint = async (selectedItems) => {
    try {
      const itemsToPrint = selectedItems.map(item => ({
        ...item.data,
        id: item.id
      }));
      await printViaBluetooth(itemsToPrint, template);
    } catch (error) {
      alert("Erro ao conectar com impressora Bluetooth.");
    }
  };



  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      <TourGuide activeTab={activeTab} setActiveTab={setActiveTab} />
      {/* Sidebar Profissional (Desktop) */}
      <aside className="hidden md:flex w-72 bg-zinc-950 border-r border-zinc-900 flex-col p-6 fixed h-full z-50">
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
            { id: 'settings', label: 'Configurações', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
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
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Plano Pro</p>
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

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur border-t border-zinc-900 px-2 py-2">
        <div className="grid grid-cols-5 gap-2">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'stock_points', label: 'Pontos', icon: MapPin },
            { id: 'movement_internal', label: 'Mov.', icon: ArrowUpCircle },
            { id: 'operation', label: 'Ajuste', icon: ScanLine },
            { id: 'designer', label: 'Etiquetas', icon: PenTool },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                activeTab === item.id ? 'bg-emerald-500 text-black' : 'text-zinc-500'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 md:ml-72 p-4 md:p-10 pb-24 md:pb-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 md:mb-12">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'stock_points' && 'Ponto de Estocagem'}
              {activeTab === 'designer' && 'Engenharia de Etiquetas'}
              {activeTab === 'movement_internal' && 'Movimentação de Carga'}
              {activeTab === 'operation' && 'Ajuste Rápido'}
              {activeTab === 'reports' && 'Relatórios e BI'}
              {activeTab === 'settings' && 'Configurações do Sistema'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {activeTab === 'dashboard' && 'Bem-vindo ao centro de comando do seu inventário.'}
              {activeTab === 'stock_points' && 'Crie o ponto e faça o upload único dos itens.'}
              {activeTab === 'designer' && 'Crie layouts de etiquetas profissionais com precisão milimétrica.'}
              {activeTab === 'movement_internal' && 'Gerencie a entrada e saida de itens no ponto de estocagem.'}
              {activeTab === 'operation' && 'Realize ajustes pontuais e conferências rápidos.'}
              {activeTab === 'reports' && 'Analise dados, perdas e produtividade da sua operação.'}
              {activeTab === 'settings' && 'Gerencie notificações, alertas e preferências do QtdApp.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input 
                type="text" 
                placeholder="Busca rápida..." 
                className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:border-emerald-500 outline-none w-64"
              />
            </div>
	            <div className="flex items-center gap-3">
	              {pendingMovementsCount > 0 && (
	                <button 
	                  className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 hover:bg-amber-500/20 relative flex items-center gap-2 text-xs font-bold transition-all"
	                  title="Movimentos Pendentes de Sincronização"
                  onClick={() => {
                    if (!navigator.onLine) {
                      alert("Voce esta offline. Conecte-se para sincronizar.");
                      return;
                    }
                    syncPendingMovements()
                      .then(({ synced, remaining }) => {
                        alert("Sincronizados " + synced + " movimentos. Restam " + remaining + ".");
                      })
                      .catch(() => {
                        alert("Erro ao sincronizar movimentos pendentes.");
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
	              <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white relative">
	                <Bell size={20} />
	                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-zinc-900" />
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
                <Dashboard tenantId={tenantId} currentSchema={currentSchema} />
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
                      />

                      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                          <Plus size={20} className="text-emerald-500" /> Cadastrar Item Manual
                        </h2>
                        {currentSchema && currentStockPoint ? (
                          <DynamicForm schema={currentSchema} onSubmit={handleAddItem} />
                        ) : (
                          <p className="text-zinc-500 text-sm">Selecione um ponto e importe os itens primeiro.</p>
                        )}
                      </div>

                      <SchemaImporter 
                        key={currentStockPoint?.id || 'no-point'}
                        tenantId={tenantId}
                        stockPointId={currentStockPoint?.id || null}
                        defaultName={currentStockPoint?.name || ''}
                        onImported={() => {
                          if (currentStockPoint) {
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

                      {currentSchema && currentStockPoint ? (
                        <ItemTable 
                          items={items} 
                          schema={currentSchema}
                          onPrintSelected={handlePrint}
                          onBluetoothPrint={handleBluetoothPrint}
                          hasBluetooth={isBluetoothAvailable()}
                        />
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                          <p className="text-zinc-500">Selecione um ponto e importe os itens.</p>
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
                          />
                          <StockPointHistory stockPointId={currentStockPoint.id} tenantId={tenantId} />
                        </>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                          <p className="text-zinc-500">Selecione um ponto de estocagem para iniciar a movimentação.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'designer' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  {currentSchema ? (
                    <LabelDesigner 
                      schema={currentSchema}
                      initialTemplate={template}
                      onSaveTemplate={async (newTemplate) => {
                        await templateService.saveTemplate(tenantId, currentSchema.id, currentSchema.version || 1, newTemplate);
                        setTemplate(newTemplate);
                        alert("Template de engenharia salvo com sucesso!");
                      }}
                    />
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                      <p className="text-zinc-500">Selecione um ponto de estocagem e importe os itens para acessar a engenharia de etiquetas.</p>
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
                    />
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                      <p className="text-zinc-500">Selecione um ponto de estocagem para iniciar a operação de estoque.</p>
                    </div>
                  )}
                </div>
              )}



	              {activeTab === 'reports' && (
	                <Dashboard tenantId={tenantId} currentSchema={currentSchema} />
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


