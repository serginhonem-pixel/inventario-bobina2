import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente para bloco sortable
function SortableBlock({ id, children, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} {...props}>
      {children}
    </div>
  );
}

// Componente principal do LabelEditor
export default function LabelEditor({
  labelSettings,
  updateLabelSetting,
  labelLayout,
  updateLabelLayout,
  labelFields,
  toggleLabelField,
  toggleFieldOption,
  moveLabelField,
  reorderLabelFields,
  updateLabelFieldTitleSize,
  updateLabelBlock,
  addLabelField,    
  removeLabelField,
  labelFieldInput,
  setLabelFieldInput,
  updateCustomFieldValue,
  savedLabelLayouts,
  labelLayoutName,
  setLabelLayoutName,
  handleSaveLabelLayout,
  selectedSavedLayoutId,
  setSelectedSavedLayoutId,
  handleLoadSavedLayout,
  handleDeleteSavedLayout,
  formatSavedLayoutLabel,
  labelItems,
  previewQrSrc,
  previewBarcodeSrc,
  renderLabelLayout,
  previewLabelStyle,
  showGuides,
  setShowGuides,
  selectedBlockKey,
  setSelectedBlockKey,
  gridRef,
  handleGridPointerMove,
  handleGridPointerUp,
  handleBlockPointerDown,
  showPrintPreview,
  setShowPrintPreview,
  handleLogoUpload,
  canUseHeaderFooter,
  resolvedLayout,
  applyLabelPreset,
  removedBlocks,
  setRemovedBlocks,
}) {
  const [activeTab, setActiveTab] = useState('layout');
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      // Encontra os índices usando o labelFields que já está nas props
      const oldIndex = labelFields.findIndex((f) => f.key === active.id);
      const newIndex = labelFields.findIndex((f) => f.key === over.id);
      
      // Chama a função que veio do App.jsx
      if (reorderLabelFields) {
        reorderLabelFields(oldIndex, newIndex);
      }
    }
  };

  // Função para lidar com drop de blocos removidos
  const handleDrop = (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    if (removedBlocks.includes(key)) {
      // Adicionar o bloco ao layout em uma posição padrão
      updateLabelBlock(key, { x: 0, y: 0, w: 1, h: 1 }, { allowSwap: true });
      // Remover da lista de removidos
      setRemovedBlocks((prev) => prev.filter((k) => k !== key));
    }
  };

  const tabs = [
    { id: 'layout', label: 'Layout', icon: '📐' },
    { id: 'typography', label: 'Tipografia', icon: '🔤' },
    { id: 'fields', label: 'Campos', icon: '📝' },
    { id: 'headerFooter', label: 'Cabeçalho/Rodapé', icon: '📄' },
  ];

  return (
    <section className="w-full max-w-none sm:max-w-6xl lg:max-w-7xl mx-auto mt-6 sm:mt-8 bg-zinc-950/80 border border-zinc-800/80 p-4 sm:p-6 rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h2 className="font-bold text-emerald-300 text-lg">Criação de etiqueta</h2>
          <p className="text-xs text-zinc-400">
            Ajuste tamanhos e posicione os blocos no grid da etiqueta.
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-emerald-300 underline hover:text-emerald-200"
          onClick={() => setShowPrintPreview((prev) => !prev)}
        >
          {showPrintPreview ? "Ocultar impressão" : "Visualizar impressão"}
        </button>
      </div>

      {/* Salvar/Carregar Layout */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 mb-4">
        <p className="text-xs text-zinc-400 mb-2">Salvar layout no Firebase</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            className="flex-1 min-w-[180px] bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
            placeholder="Nome do layout (opcional)"
            value={labelLayoutName}
            onChange={(e) => setLabelLayoutName(e.target.value)}
          />
          <button
            type="button"
            className="bg-emerald-500/90 text-black px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-400"
            onClick={handleSaveLabelLayout}
          >
            Salvar
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={selectedSavedLayoutId}
            onChange={(e) => setSelectedSavedLayoutId(e.target.value)}
            className="flex-1 min-w-[200px] bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-2"
          >
            <option value="">Carregar layout salvo</option>
            {savedLabelLayouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {formatSavedLayoutLabel(layout)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-lg text-xs font-semibold"
            onClick={() => handleLoadSavedLayout(selectedSavedLayoutId)}
            disabled={!selectedSavedLayoutId}
          >
            Carregar
          </button>
          <button
            type="button"
            className="border border-rose-700/70 text-rose-200 bg-rose-900/20 hover:bg-rose-900/40 px-3 py-2 rounded-lg text-xs font-semibold"
            onClick={() => handleDeleteSavedLayout(selectedSavedLayoutId)}
            disabled={!selectedSavedLayoutId}
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        {/* Painel de Configurações */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
          {/* Abas */}
          <div className="flex flex-wrap gap-1 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo das Abas */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-2">📏 Tamanho</p>
                <label className="block text-xs text-zinc-400 mb-1">Tamanho padrão</label>
                <select
                  value={labelSettings.preset}
                  onChange={(e) => applyLabelPreset(e.target.value)}
                  className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2"
                >
                  <option value="40x20">40x20 mm</option>
                  <option value="50x30">50x30 mm</option>
                  <option value="60x40">60x40 mm</option>
                  <option value="70x30">70x30 mm</option>
                  <option value="80x50">80x50 mm</option>
                  <option value="100x50">100x50 mm</option>
                  <option value="100x100">100x100 mm</option>
                  <option value="100x150">100x150 mm</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-2">📐 Layout</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Largura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      value={labelSettings.widthCm}
                      onChange={(e) =>
                        updateLabelSetting("widthCm", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      value={labelSettings.heightCm}
                      onChange={(e) =>
                        updateLabelSetting("heightCm", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">QR (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      value={labelSettings.qrCm}
                      onChange={(e) =>
                        updateLabelSetting("qrCm", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Padding horizontal (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      value={labelSettings.paddingXCm}
                      onChange={(e) =>
                        updateLabelSetting("paddingXCm", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Padding vertical (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      value={labelSettings.paddingYCm}
                      onChange={(e) =>
                        updateLabelSetting("paddingYCm", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Alinhamento texto</label>
                    <select
                      value={labelLayout.align}
                      onChange={(e) => updateLabelLayout("align", e.target.value)}
                      className="bg-zinc-900/60 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full"
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Altura mínima do grid (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.2"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      value={labelLayout.gridSizeCm ?? 0.5}
                      onChange={(e) =>
                        updateLabelLayout("gridSizeCm", parseFloat(e.target.value) || 0.5)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-4">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-2">🔤 Tipografia</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte código (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontTitle}
                    onChange={(e) =>
                      updateLabelSetting("fontTitle", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte descrição (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontDesc}
                    onChange={(e) =>
                      updateLabelSetting("fontDesc", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte infos (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontMeta}
                    onChange={(e) =>
                      updateLabelSetting("fontMeta", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Fonte título (px)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                    value={labelSettings.fontLabel}
                    onChange={(e) =>
                      updateLabelSetting("fontLabel", parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-4">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-2">📝 Campos e ordem</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={labelFields.map(f => f.key)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {labelFields
                      .filter((field) => field.key !== "test" && normalizeKey(field.label || "") !== "texto_teste")
                      .map((field) => {
                        const block = resolvedLayout.blocks?.[field.key];
                        return (
                          <SortableBlock key={field.key} id={field.key}>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-xs text-zinc-200">
                                  <input
                                    type="checkbox"
                                    checked={field.enabled}
                                    onChange={() => toggleLabelField(field.key)}
                                  />
                                  {field.label}
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className={`text-xs ${selectedBlockKey === field.key ? "text-emerald-300" : "text-zinc-400 hover:text-zinc-200"}`}
                                    onClick={() => setSelectedBlockKey(field.key)}
                                  >
                                    {selectedBlockKey === field.key ? "Selecionado" : "Selecionar bloco"}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-zinc-400 hover:text-zinc-200"
                                    onClick={() => toggleFieldOption(field.key, "showLabel")}
                                  >
                                    {field.showLabel ? "Ocultar título" : "Mostrar título"}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-zinc-400 hover:text-zinc-200"
                                    onClick={() => toggleFieldOption(field.key, "boldLabel")}
                                  >
                                    {field.boldLabel ? "Título normal" : "Título negrito"}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-zinc-400 hover:text-zinc-200"
                                    onClick={() => toggleFieldOption(field.key, "boldValue")}
                                  >
                                    {field.boldValue ? "Valor normal" : "Valor negrito"}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-zinc-400 hover:text-zinc-200"
                                    onClick={() => toggleFieldOption(field.key, "emphasize")}
                                  >
                                    {field.emphasize ? "Sem borda" : "Borda"}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-zinc-400 hover:text-zinc-200"
                                    onClick={() => toggleFieldOption(field.key, "highlight")}
                                  >
                                    {field.highlight ? "Sem fundo" : "Fundo"}
                                  </button>
                                  {field.key.startsWith("custom:") && (
                                    <button
                                      type="button"
                                      className="text-xs text-rose-300 hover:text-rose-200"
                                      onClick={() => removeLabelField(field.key)}
                                    >
                                      Remover
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                                  <span>Título (px)</span>
                                  <input
                                    type="number"
                                    className="w-20 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                                    value={field.labelFontSize ?? labelSettings.fontLabel}
                                    onChange={(e) =>
                                      updateLabelFieldTitleSize(
                                        field.key,
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                  />
                                  <span>Bloco (col x lin)</span>
                                  <input
                                    type="number"
                                    className="w-16 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                                    value={block?.w ?? 1}
                                    onChange={(e) =>
                                      updateLabelBlock(field.key, {
                                        w: parseInt(e.target.value, 10) || 1,
                                      })
                                    }
                                  />
                                  <input
                                    type="number"
                                    className="w-16 bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-xs"
                                    value={block?.h ?? 1}
                                    onChange={(e) =>
                                      updateLabelBlock(field.key, {
                                        h: parseInt(e.target.value, 10) || 1,
                                      })
                                    }
                                  />
                                  <span>Pos (x,y)</span>
                                  <span className="text-[11px] text-zinc-500">
                                    {block?.x ?? 0},{block?.y ?? 0}
                                  </span>
                                </div>
                                {/* Campos de teste específicos */}
                                {field.key === "id" && (
                                  <input
                                    type="text"
                                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                                    placeholder="Código de teste"
                                    value={labelSettings.testCode}
                                    onChange={(e) => updateLabelSetting("testCode", e.target.value)}
                                  />
                                )}
                                {field.key === "description" && (
                                  <input
                                    type="text"
                                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                                    placeholder="Descrição de teste"
                                    value={labelSettings.testDescription}
                                    onChange={(e) =>
                                      updateLabelSetting("testDescription", e.target.value)
                                    }
                                  />
                                )}
                                {field.key === "qty" && (
                                  <input
                                    type="text"
                                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                                    placeholder="Quantidade de teste"
                                    value={labelSettings.testQty}
                                    onChange={(e) => updateLabelSetting("testQty", e.target.value)}
                                  />
                                )}
                                {field.key === "weight" && (
                                  <input
                                    type="text"
                                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                                    placeholder="Peso de teste"
                                    value={labelSettings.testWeight}
                                    onChange={(e) => updateLabelSetting("testWeight", e.target.value)}
                                  />
                                )}
                                {field.key === "location" && (
                                  <input
                                    type="text"
                                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                                    placeholder="Local de teste"
                                    value={labelSettings.testLocation}
                                    onChange={(e) => updateLabelSetting("testLocation", e.target.value)}
                                  />
                                )}
                                {field.key.startsWith("custom:") && (
                                  <input
                                    type="text"
                                    className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                                    placeholder={`Valor de ${field.label}`}
                                    value={labelSettings.customFieldValues[field.key] || ""}
                                    onChange={(e) =>
                                      updateCustomFieldValue(field.key, e.target.value)
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </SortableBlock>
                        );
                      })}
                  </div>
                </SortableContext>
              </DndContext>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  className="flex-1 min-w-[180px] bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                  placeholder="Adicionar campo (ex: Lote, Espessura)"
                  value={labelFieldInput}
                  onChange={(e) => setLabelFieldInput(e.target.value)}
                />
                <button
                  type="button"
                  className="border border-zinc-700 text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 rounded-lg text-xs font-semibold"
                  onClick={addLabelField}
                >
                  Adicionar campo
                </button>
              </div>
            </div>
          )}

          {activeTab === 'headerFooter' && (
            <div className="space-y-4">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-2">📄 Cabeçalho e rodapé</p>
              {!canUseHeaderFooter ? (
                <p className="text-[11px] text-zinc-500">
                  Disponível apenas para etiquetas a partir de 100x150mm.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-xs text-zinc-200">
                      <input
                        type="checkbox"
                        checked={labelSettings.headerEnabled}
                        onChange={() =>
                          updateLabelSetting("headerEnabled", !labelSettings.headerEnabled)
                        }
                      />
                      Cabeçalho
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-200">
                      <input
                        type="checkbox"
                        checked={labelSettings.footerEnabled}
                        onChange={() =>
                          updateLabelSetting("footerEnabled", !labelSettings.footerEnabled)
                        }
                      />
                      Rodapé
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-xs text-zinc-200">
                      <input
                        type="checkbox"
                        checked={labelSettings.headerLogoEnabled}
                        onChange={() =>
                          updateLabelSetting(
                            "headerLogoEnabled",
                            !labelSettings.headerLogoEnabled
                          )
                        }
                      />
                      Logo no cabeçalho
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-200">
                      <input
                        type="checkbox"
                        checked={labelSettings.footerLogoEnabled}
                        onChange={() =>
                          updateLabelSetting(
                            "footerLogoEnabled",
                            !labelSettings.footerLogoEnabled
                          )
                        }
                      />
                      Logo no rodapé
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      placeholder="Texto do cabeçalho"
                      value={labelSettings.headerText}
                      onChange={(e) => updateLabelSetting("headerText", e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-2 text-xs"
                      placeholder="Texto do rodapé"
                      value={labelSettings.footerText}
                      onChange={(e) => updateLabelSetting("footerText", e.target.value)}
                    />
                  </div>
                  {/* Simplificar: mostrar apenas campos essenciais, mover detalhes para modal ou aba expandida */}
                  <p className="text-xs text-zinc-400">Posições e tamanhos podem ser ajustados no preview.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="text-xs text-zinc-400"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                    />
                    {labelSettings.logoDataUrl && (
                      <button
                        type="button"
                        className="text-xs text-rose-300 hover:text-rose-200"
                        onClick={() => updateLabelSetting("logoDataUrl", "")}
                      >
                        Remover logo
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 lg:sticky lg:top-6 self-start lg:justify-self-end w-full max-w-none">
          <p className="text-xs text-zinc-400 mb-1">Preview da etiqueta</p>
          <p className="text-[11px] text-zinc-500 mb-3">
            {labelSettings.widthCm}x{labelSettings.heightCm}cm
          </p>
          <p className="text-[11px] text-zinc-500 mb-3">
            Arraste os blocos no grid (3 colunas: esquerda/centro/direita).
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={() => setShowGuides((prev) => !prev)}
              />
              Mostrar guias
            </label>
            <button
              type="button"
              className="text-[11px] text-zinc-400 hover:text-zinc-200"
              onClick={() => setSelectedBlockKey(null)}
            >
              Limpar seleção
            </button>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 overflow-visible flex justify-center relative">
            <div className="relative">
              <div className="rounded-xl border border-zinc-300 bg-white" style={previewLabelStyle}>
                {renderLabelLayout(labelItems[0] || {}, previewQrSrc, previewBarcodeSrc, {
                  showGuides,
                  highlightKey: selectedBlockKey,
                  onBlockClick: setSelectedBlockKey,
                  gridRef,
                  onGridPointerMove: handleGridPointerMove,
                  onGridPointerUp: handleGridPointerUp,
                  onBlockPointerDown: handleBlockPointerDown,
                  onDrop: handleDrop,
                })}
              </div>
              {/* Indicadores de blocos fora dos limites - FORA da etiqueta */}
              {(() => {
                const outOfBoundsBlocks = [];
                const cols = Math.floor((labelSettings.widthCm - (labelSettings.paddingXCm || 0) * 2) / (labelLayout.gridSizeCm || 0.5));
                const rows = Math.floor((labelSettings.heightCm - (labelSettings.paddingYCm || 0) * 2) / (labelLayout.gridSizeCm || 0.5));

                Object.entries(resolvedLayout.blocks || {}).forEach(([key, block]) => {
                  if (block.x + block.w > cols || block.y + block.h > rows) {
                    outOfBoundsBlocks.push(key);
                  }
                });

                return outOfBoundsBlocks.map((key, index) => (
                  <div
                    key={key}
                    className="absolute bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10 flex items-center gap-1"
                    style={{
                      top: `${index * 35}px`,
                      left: `calc(100% + 10px)`, // Fora da borda direita da etiqueta
                    }}
                    title={`Bloco "${key}" fora dos limites da etiqueta`}
                  >
                    <span className="text-sm">⚠️</span> {key}
                  </div>
                ));  
              })()}
            </div>
          </div>

          {/* Blocos removidos */}
          {removedBlocks.length > 0 && (
            <div className="mt-4">
              <details className="group">
                <summary className="text-xs text-zinc-400 mb-2 cursor-pointer hover:text-zinc-200 flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Blocos removidos ({removedBlocks.length}) - arraste para adicionar
                </summary>
                <div className="flex flex-wrap gap-2 mt-2">
                  {removedBlocks.map((key) => {
                    const field = labelFields.find(f => f.key === key);
                    return (
                      <div
                        key={key}
                        className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 cursor-grab hover:bg-zinc-700/60"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', key);
                        }}
                      >
                        {field ? field.label : key}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-300">Visualização de impressão</p>
              <button
                type="button"
                className="text-xs text-rose-300 hover:text-rose-200"
                onClick={() => setShowPrintPreview(false)}
              >
                Fechar
              </button>
            </div>
            <p className="text-center text-zinc-400">Em desenvolvimento</p>
          </div>
        </div>
      )}
    </section>
  );
}

// Função auxiliar
function normalizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}