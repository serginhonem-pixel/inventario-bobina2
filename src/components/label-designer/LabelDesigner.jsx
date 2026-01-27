import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { 
  Move, Type, QrCode, Trash2, AlignLeft, AlignCenter, AlignRight, 
  Bold, RotateCw, Square, Type as TypeIcon, Grid3X3, Eye, Maximize2, 
  Database, Edit3, Image as ImageIcon, ZoomIn, ZoomOut, LayoutGrid, EyeOff,
  Type as FontIcon, Save, MapPin, Map, Barcode
} from 'lucide-react';

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isCodeField = (field = {}) => {
  const key = normalizeText(field.key);
  const label = normalizeText(field.label);
  return ['codigo', 'cod', 'sku', 'code', 'barcode', 'codigo_barras', 'codigobarras'].some(
    (token) => key.includes(token) || label.includes(token)
  );
};

const isQtyField = (field = {}) => {
  const key = normalizeText(field.key);
  const label = normalizeText(field.label);
  return ['quantidade', 'qtd', 'qtde', 'qty', 'estoque'].some(
    (token) => key.includes(token) || label.includes(token)
  );
};

const isBarcodeField = (field = {}) => isCodeField(field) || isQtyField(field);

const getCodeField = (fields = []) => fields.find(isCodeField) || null;
const getQtyField = (fields = []) => fields.find(isQtyField) || null;

const LabelDesigner = ({ schema, onSaveTemplate, initialTemplate = null }) => {
  const [templateName, setTemplateName] = useState(initialTemplate?.name || 'Novo Modelo');
  const [labelSize, setLabelSize] = useState(initialTemplate?.size || { width: 100, height: 50 });
  const [elements, setElements] = useState(initialTemplate?.elements || []);
  const [selectedId, setSelectedId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [layoutGrid, setLayoutGrid] = useState({ cols: 3, rows: 10 });
  const [zoom, setZoom] = useState(1);
  const [logistics, setLogistics] = useState(initialTemplate?.logistics || { street: '', shelf: '', level: '' });
  const [showTitleOptions, setShowTitleOptions] = useState(false);
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const BASE_SCALE = 4;

  const selectedElement = elements.find(el => el.id === selectedId);

  useEffect(() => {
    if (selectedElement) {
      setShowTitleOptions(!!selectedElement.showLabel);
    } else {
      setShowTitleOptions(false);
    }
  }, [selectedElement?.id, selectedElement?.showLabel]);

  useEffect(() => {
    const updateZoom = () => {
      if (containerRef.current && canvasRef.current) {
        const container = containerRef.current.getBoundingClientRect();
        const padding = 80;
        const availableW = container.width - padding;
        const availableH = container.height - padding;
        const labelW = labelSize.width * BASE_SCALE;
        const labelH = labelSize.height * BASE_SCALE;
        const newZoom = Math.min(availableW / labelW, availableH / labelH, 1.5);
        setZoom(newZoom);
      }
    };
    updateZoom();
    window.addEventListener('resize', updateZoom);
    return () => window.removeEventListener('resize', updateZoom);
  }, [labelSize]);

  const autoOrganize = () => {
    const colW = labelSize.width / layoutGrid.cols;
    const rowH = labelSize.height / layoutGrid.rows;
    setElements((prev) =>
      prev.map((el, index) => {
        const col = index % layoutGrid.cols;
        const row = Math.floor(index / layoutGrid.cols);
        return { ...el, x: col * colW, y: row * rowH, width: colW, height: rowH };
      })
    );
  };

  const getQrPreviewValue = (qrMode, qrFieldKey) => {
    if (qrMode === 'item') {
      return schema?.sampleData && Object.keys(schema.sampleData).length > 0
        ? JSON.stringify(schema.sampleData)
        : "Sem dados";
    }
    if (!qrFieldKey) return "000123";
    return schema?.sampleData?.[qrFieldKey] || "000123";
  };

  const addElement = (type, field = null, extra = {}) => {
    const colW = labelSize.width / layoutGrid.cols;
    const rowH = labelSize.height / layoutGrid.rows;
    const index = elements.length;
    const col = index % layoutGrid.cols;
    const row = Math.floor(index / layoutGrid.cols);

    let preview = "Texto";
    if (type === 'qr') {
      const skuField = schema?.fields?.find(f => f.key === 'sku') || schema?.fields?.[0];
      const qrFieldKey = skuField?.key || null;
      const qrMode = qrFieldKey ? 'field' : 'item';
      preview = getQrPreviewValue(qrMode, qrFieldKey);
    }
    if (type === 'barcode') {
      const skuField = schema?.fields?.find(f => f.key === 'sku') || schema?.fields?.[0];
      preview = skuField ? (schema?.sampleData?.[skuField.key] || "000123") : "000123";
    }
    if (type === 'image') preview = extra.url || "Logo";
    if (type === 'logistics') preview = logistics[extra.logKey] || extra.logKey.toUpperCase();
    
    if (field) {
      preview = schema?.sampleData?.[field.key] || schema?.sampleData?.[field.label] || `Exemplo ${field.label}`;
    }

    const skuField = schema?.fields?.find(f => f.key === 'sku') || schema?.fields?.[0];
    const codeField = getCodeField(schema?.fields || []);
    const qtyField = getQtyField(schema?.fields || []);
    const qrFieldKey = type === 'qr' ? (skuField?.key || null) : null;
    const qrMode = type === 'qr' ? (qrFieldKey ? 'field' : 'item') : null;
    const barcodeFieldKey = type === 'barcode' ? (extra.fieldKey || codeField?.key || skuField?.key || null) : null;
    const barcodeMode = type === 'barcode' ? 'field' : null;
    const resolvedFieldKey =
      field?.key ||
      (type === 'qr' ? (qrMode === 'item' ? '__item__' : qrFieldKey) : null) ||
      (type === 'barcode' ? barcodeFieldKey : null) ||
      extra.logKey ||
      null;

    const newElement = {
      id: `el_${Date.now()}`,
      type,
      fieldKey: resolvedFieldKey,
      qrMode,
      qrFieldKey,
      barcodeMode,
      barcodeCodeKey: codeField?.key || null,
      barcodeQtyKey: qtyField?.key || null,
      label: field?.label || (type === 'qr' ? 'QR Code' : type === 'barcode' ? 'Barcode' : type === 'image' ? 'Logo' : type === 'logistics' ? extra.logKey.toUpperCase() : 'Texto Fixo'),
      previewValue: preview,
      qrDataUrl: null,
      barcodeDataUrl: null,
      showLabel: true,
      x: col * colW,
      y: row * rowH,
      width: colW,
      height: rowH,
      fontSize: 10,
      titleFontSize: 10,
      bold: false,
      align: 'center',
      rotation: 0,
      border: true,
      lineHeight: 1.2,
      wrap: false,
      fontFamily: 'Arial',
      titlePosition: 'inline',
      backgroundColor: 'transparent',
      ...extra
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
    if (type === 'qr') {
      generateQrDataUrl(newElement.previewValue).then((url) => {
        if (url) {
          updateElement(newElement.id, { qrDataUrl: url });
        }
      });
    }
    if (type === 'barcode') {
      const url = generateBarcodeDataUrl(newElement.previewValue);
      if (url) {
        updateElement(newElement.id, { barcodeDataUrl: url });
      }
    }
  };

  const updateElement = (id, updates) => {
    setElements((prev) => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id) => {
    setElements((prev) => prev.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => addElement('image', null, { url: event.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e, el) => {
    if (e.button !== 0) return;
    setSelectedId(el.id);
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: (e.clientX - rect.left) / (BASE_SCALE * zoom) - el.x,
      y: (e.clientY - rect.top) / (BASE_SCALE * zoom) - el.y
    });
  };

  const handleResizeStart = (e, el) => {
    e.stopPropagation();
    setSelectedId(el.id);
    setIsResizing(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialW: el.width,
      initialH: el.height
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleMouseMove = (e) => {
    if (!selectedId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const colW = labelSize.width / layoutGrid.cols;
    const rowH = labelSize.height / layoutGrid.rows;

    if (isDragging) {
      let newX = (e.clientX - rect.left) / (BASE_SCALE * zoom) - dragStart.x;
      let newY = (e.clientY - rect.top) / (BASE_SCALE * zoom) - dragStart.y;
      if (snapToGrid) {
        newX = Math.round(newX / colW) * colW;
        newY = Math.round(newY / rowH) * rowH;
      }
      newX = Math.max(0, Math.min(newX, labelSize.width - selectedElement.width));
      newY = Math.max(0, Math.min(newY, labelSize.height - selectedElement.height));
      updateElement(selectedId, { x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = (e.clientX - dragStart.x) / (BASE_SCALE * zoom);
      const deltaY = (e.clientY - dragStart.y) / (BASE_SCALE * zoom);
      let newW = dragStart.initialW + deltaX;
      let newH = dragStart.initialH + deltaY;
      if (snapToGrid) {
        newW = Math.round(newW / colW) * colW;
        newH = Math.round(newH / rowH) * rowH;
      }
      newW = Math.max(colW, Math.min(newW, labelSize.width - selectedElement.x));
      newH = Math.max(rowH, Math.min(newH, labelSize.height - selectedElement.y));
      updateElement(selectedId, { width: newW, height: newH });
    }
  };

  const handleSave = () => {
    onSaveTemplate({ 
      name: templateName,
      size: labelSize, 
      elements,
      logistics 
    });
  };

  const generateQrDataUrl = async (value) => {
    try {
      return await QRCode.toDataURL(String(value || ''), {
        margin: 1,
        width: 256,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      return null;
    }
  };

  const generateBarcodeDataUrl = (value) => {
    try {
      if (typeof document === 'undefined') return null;
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, String(value || '000123'), {
        format: 'CODE128',
        displayValue: false,
        margin: 0
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("Erro ao gerar código de barras:", error);
      return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addElement('text'); }} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400" title="Texto"><TypeIcon size={18} /></button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addElement('qr'); }} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400" title="QR Code"><QrCode size={18} /></button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addElement('barcode'); }} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400" title="Barcode"><Barcode size={18} /></button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current.click(); }} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400" title="Logo"><ImageIcon size={18} /></button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
          
          <div className="h-6 w-px bg-zinc-800" />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Papel (mm):</span>
            <input type="number" value={labelSize.width} onChange={(e) => setLabelSize({...labelSize, width: parseInt(e.target.value) || 0})} className="w-14 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white" />
            <span className="text-zinc-600">×</span>
            <input type="number" value={labelSize.height} onChange={(e) => setLabelSize({...labelSize, height: parseInt(e.target.value) || 0})} className="w-14 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white" />
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Grade:</span>
            <input type="number" value={layoutGrid.cols} onChange={(e) => setLayoutGrid({...layoutGrid, cols: parseInt(e.target.value) || 1})} className="w-10 bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-xs text-white" />
            <span className="text-zinc-600">×</span>
            <input type="number" value={layoutGrid.rows} onChange={(e) => setLayoutGrid({...layoutGrid, rows: parseInt(e.target.value) || 1})} className="w-10 bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-xs text-white" />
          </div>

          <div className="flex gap-1 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
            <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`} title={showGrid ? "Ocultar Grade" : "Mostrar Grade"}>
              {showGrid ? <Grid3X3 size={16} /> : <EyeOff size={16} />}
            </button>
            <button onClick={autoOrganize} className="p-1.5 rounded text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors" title="Organizar Automaticamente">
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-950 rounded-lg border border-zinc-800 p-1">
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1 text-zinc-500"><ZoomOut size={14} /></button>
            <span className="text-[10px] text-zinc-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1 text-zinc-500"><ZoomIn size={14} /></button>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome do Modelo"
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 w-32"
            />
            <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-xl text-sm font-bold">Salvar Template</button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase mb-4 tracking-widest flex items-center gap-2"><Database size={12} /> Campos do Catálogo</h3>
          <div className="space-y-2 mb-6">
            {schema?.fields?.map(field => (
              <button key={field.key} onClick={() => addElement('field', field)} className="w-full text-left bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-300 flex flex-col group transition-all">
                <span className="font-medium">{field.label}</span>
                <span className="text-[9px] text-emerald-500/70 italic truncate">{schema.sampleData?.[field.key] || schema.sampleData?.[field.label] || 'Sem dados'}</span>
              </button>
            ))}
          </div>

          <h3 className="text-[10px] font-bold text-zinc-500 uppercase mb-4 tracking-widest flex items-center gap-2"><Map size={12} /> Localização</h3>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => addElement('logistics', null, { logKey: 'street' })} className="w-full text-left bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-lg text-[10px] text-zinc-400 flex items-center gap-2">
              <MapPin size={12} /> Adicionar Rua
            </button>
            <button onClick={() => addElement('logistics', null, { logKey: 'shelf' })} className="w-full text-left bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-lg text-[10px] text-zinc-400 flex items-center gap-2">
              <MapPin size={12} /> Adicionar Prateleira
            </button>
            <button onClick={() => addElement('logistics', null, { logKey: 'level' })} className="w-full text-left bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-lg text-[10px] text-zinc-400 flex items-center gap-2">
              <MapPin size={12} /> Adicionar Nível
            </button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 bg-zinc-950 overflow-auto p-8 relative flex" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div
            className="relative"
            style={{
              margin: 'auto',
              width: `${labelSize.width * BASE_SCALE * zoom}px`,
              height: `${labelSize.height * BASE_SCALE * zoom}px`
            }}
          >
            <div
              ref={canvasRef}
              className="bg-white shadow-2xl relative"
              style={{
                width: `${labelSize.width * BASE_SCALE}px`,
                height: `${labelSize.height * BASE_SCALE}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
              }}
            >
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none" style={{ 
                backgroundImage: `
                  linear-gradient(to right, rgba(16, 185, 129, 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${(labelSize.width / layoutGrid.cols) * BASE_SCALE}px ${(labelSize.height / layoutGrid.rows) * BASE_SCALE}px`
              }} />
            )}

            {elements.map(el => (
              <div key={el.id} onMouseDown={(e) => handleMouseDown(e, el)} className={`absolute cursor-move flex items-center ${selectedId === el.id ? 'ring-2 ring-emerald-500 z-50' : 'z-10'}`} style={{ left: `${el.x * BASE_SCALE}px`, top: `${el.y * BASE_SCALE}px`, width: `${el.width * BASE_SCALE}px`, height: `${el.height * BASE_SCALE}px`, fontSize: `${el.fontSize * (BASE_SCALE/3)}px`, fontWeight: el.bold ? 'bold' : 'normal', textAlign: el.align, transform: `rotate(${el.rotation}deg)`, border: el.border ? '1px solid black' : 'none', color: 'black', justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start', alignItems: (el.wrap || (el.titlePosition === 'top' && el.showLabel && el.fieldKey)) ? 'flex-start' : 'center', padding: '0 4px', overflow: 'hidden', lineHeight: el.lineHeight, fontFamily: el.fontFamily || 'Arial', backgroundColor: el.backgroundColor || 'transparent' }}>
                {el.type === 'qr' ? (
                  <div className="w-full h-full bg-zinc-50 flex flex-col items-center justify-center border border-zinc-200">
                    {el.qrDataUrl ? (
                      <img src={el.qrDataUrl} alt="QR" className="w-[85%] h-[85%] object-contain" />
                    ) : (
                      <QrCode size={el.width * 2} className="text-zinc-400" />
                    )}
                    <span className="text-[7px] text-zinc-400 mt-0.5 font-bold truncate w-full text-center">{el.previewValue}</span>
                  </div>
                ) : el.type === 'barcode' ? (
                  <div className="w-full h-full bg-zinc-50 flex flex-col items-center justify-center border border-zinc-200">
                    {el.barcodeDataUrl ? (
                      <img src={el.barcodeDataUrl} alt="Barcode" className="w-[95%] h-[60%] object-contain" />
                    ) : (
                      <div
                        className="w-full"
                        style={{
                          height: '60%',
                          backgroundImage:
                            'repeating-linear-gradient(90deg, #111 0 2px, transparent 2px 4px, #111 4px 6px, transparent 6px 8px)',
                          opacity: 0.6
                        }}
                      />
                    )}
                    <span className="text-[7px] text-zinc-400 mt-0.5 font-bold truncate w-full text-center">{el.previewValue}</span>
                  </div>
                ) : el.type === 'image' ? (
                  <img src={el.url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  (el.showLabel && el.fieldKey && el.titlePosition === 'top') ? (
                    <div className="w-full">
                      <span className="block" style={{ fontSize: `${(el.titleFontSize || el.fontSize) * (BASE_SCALE/3)}px` }}>{el.label}</span>
                      <span className={`block ${el.wrap ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>
                        {el.previewValue}
                      </span>
                    </div>
                  ) : (
                    <span className={`w-full ${el.wrap ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}`}>
                      {el.showLabel && el.fieldKey ? (
                        <span style={{ fontSize: `${(el.titleFontSize || el.fontSize) * (BASE_SCALE/3)}px` }}>{el.label}: </span>
                      ) : null}
                      {el.previewValue}
                    </span>
                  )
                )}
                
                {selectedId === el.id && (
                  <>
                    <button 
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} 
                      className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white p-2 rounded-full shadow-2xl hover:bg-rose-600 transition-all z-[9999] border-2 border-white flex items-center justify-center"
                      style={{ pointerEvents: 'auto' }}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div onMouseDown={(e) => handleResizeStart(e, el)} className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 cursor-nwse-resize border-2 border-white z-[60] rounded-full shadow-lg" />
                  </>
                )}
              </div>
            ))}
            </div>
          </div>
        </div>

        <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-5 overflow-y-auto">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase mb-6 tracking-widest flex items-center gap-2"><Edit3 size={12} /> Propriedades</h3>
          {selectedElement ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  Selecionado: <span className="text-white font-bold">{selectedElement.label}</span>
                </div>
                <button
                  onClick={() => deleteElement(selectedId)}
                  className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-rose-500/20"
                  title="Remover da etiqueta"
                >
                  <Trash2 size={12} /> Remover
                </button>
              </div>
              <div className="space-y-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <label className="text-[10px] text-emerald-500 uppercase font-bold flex items-center gap-2"><Eye size={10} /> Preview de Resposta</label>
                <input
                  type="text"
                  value={selectedElement.previewValue}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    updateElement(selectedId, { previewValue: nextValue });
                    if (selectedElement.type === 'qr') {
                      generateQrDataUrl(nextValue).then((url) => {
                        if (url) updateElement(selectedId, { qrDataUrl: url });
                      });
                    }
                    if (selectedElement.type === 'barcode') {
                      const url = generateBarcodeDataUrl(nextValue);
                      if (url) updateElement(selectedId, { barcodeDataUrl: url });
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              {selectedElement.type === 'qr' && (
                <div className="space-y-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Dados do QR</label>
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={selectedElement.qrMode || 'field'}
                      onChange={(e) => {
                        const mode = e.target.value;
                        const skuField = schema?.fields?.find(f => f.key === 'sku') || schema?.fields?.[0];
                        const fieldKey = mode === 'item' ? '__item__' : (selectedElement.qrFieldKey || skuField?.key || null);
                      const preview = mode === 'item'
                          ? (schema?.sampleData && Object.keys(schema.sampleData).length > 0 ? JSON.stringify(schema.sampleData) : 'Sem dados')
                          : (fieldKey && fieldKey !== '__item__' ? (schema?.sampleData?.[fieldKey] || '000123') : '000123');
                        updateElement(selectedId, {
                          qrMode: mode,
                          fieldKey,
                          qrFieldKey: fieldKey === '__item__' ? null : fieldKey,
                          previewValue: preview
                        });
                        generateQrDataUrl(preview).then((url) => {
                          if (url) updateElement(selectedId, { qrDataUrl: url });
                        });
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="field">Campo (recomendado)</option>
                      <option value="item">Item completo (pode ficar pesado)</option>
                    </select>
                    {selectedElement.qrMode !== 'item' && (
                      <select
                        value={selectedElement.qrFieldKey || ''}
                        onChange={(e) => {
                          const fieldKey = e.target.value || null;
                          const preview = fieldKey ? (schema?.sampleData?.[fieldKey] || '000123') : '000123';
                          updateElement(selectedId, {
                            qrFieldKey: fieldKey,
                            fieldKey,
                            previewValue: preview
                          });
                          generateQrDataUrl(preview).then((url) => {
                            if (url) updateElement(selectedId, { qrDataUrl: url });
                          });
                        }}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="">Selecione o campo</option>
                        {schema?.fields?.map((field) => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
              {selectedElement.type === 'barcode' && (
                <div className="space-y-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Dados do Código de Barras</label>
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={selectedElement.fieldKey || ''}
                      onChange={(e) => {
                        const fieldKey = e.target.value || null;
                        const preview = fieldKey ? (schema?.sampleData?.[fieldKey] || '000123') : '000123';
                        updateElement(selectedId, {
                          fieldKey,
                          previewValue: preview,
                          barcodeMode: 'field'
                        });
                        const url = generateBarcodeDataUrl(preview);
                        if (url) updateElement(selectedId, { barcodeDataUrl: url });
                      }}
                      className="hidden bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="">Selecione o campo</option>
                      {(schema?.fields || []).filter(isBarcodeField).map((field) => (
                        <option key={field.key} value={field.key}>{field.label}</option>
                      ))}
                    </select>
                    <select
                      value={
                        selectedElement.fieldKey === '__code_qty__'
                          ? '__code_qty__'
                          : (selectedElement.barcodeCodeKey && selectedElement.fieldKey === selectedElement.barcodeCodeKey
                              ? '__code__'
                              : (selectedElement.barcodeQtyKey && selectedElement.fieldKey === selectedElement.barcodeQtyKey
                                  ? '__qty__'
                                  : '__code__'))
                      }
                      onChange={(e) => {
                        const nextKey = e.target.value || null;
                        const fields = schema?.fields || [];
                        const codeField = getCodeField(fields);
                        const qtyField = getQtyField(fields);
                        let preview = '000123';
                        let updates = {
                          fieldKey: nextKey,
                          previewValue: preview,
                          barcodeMode: 'field',
                          barcodeCodeKey: codeField?.key || null,
                          barcodeQtyKey: qtyField?.key || null
                        };

                        if (nextKey === '__code__') {
                          preview = codeField?.key ? (schema?.sampleData?.[codeField.key] || '000123') : '000123';
                          updates = { ...updates, fieldKey: codeField?.key || null, previewValue: preview };
                        } else if (nextKey === '__qty__') {
                          preview = qtyField?.key ? (schema?.sampleData?.[qtyField.key] || '0') : '0';
                          updates = { ...updates, fieldKey: qtyField?.key || null, previewValue: preview };
                        } else if (nextKey === '__code_qty__') {
                          const codeVal = codeField?.key ? (schema?.sampleData?.[codeField.key] || '') : '';
                          const qtyVal = qtyField?.key ? (schema?.sampleData?.[qtyField.key] || '') : '';
                          preview = `${codeVal} ${qtyVal}`.trim() || '000123';
                          updates = {
                            ...updates,
                            fieldKey: '__code_qty__',
                            previewValue: preview
                          };
                        }

                        updateElement(selectedId, updates);
                        const url = generateBarcodeDataUrl(preview);
                        if (url) updateElement(selectedId, { barcodeDataUrl: url });
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="__code__">Codigo</option>
                      <option value="__qty__">Quantidade</option>
                      <option value="__code_qty__">Codigo + Quantidade</option>
                    </select>
                    {(schema?.fields || []).filter(isBarcodeField).length === 0 && (
                      <p className="text-[10px] text-zinc-500">Nenhum campo de código/quantidade encontrado.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Estilo do Texto</label>
                <div className="flex gap-2">
                  <button onClick={() => updateElement(selectedId, { bold: !selectedElement.bold })} className={`flex-1 p-2 rounded-xl border ${selectedElement.bold ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><Bold size={16} className="mx-auto" /></button>
                  <div className="flex bg-zinc-950 rounded-xl border border-zinc-800 p-1 flex-1">
                    <button onClick={() => updateElement(selectedId, { align: 'left' })} className={`flex-1 p-1 rounded-lg ${selectedElement.align === 'left' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-600'}`}><AlignLeft size={14} className="mx-auto" /></button>
                    <button onClick={() => updateElement(selectedId, { align: 'center' })} className={`flex-1 p-1 rounded-lg ${selectedElement.align === 'center' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-600'}`}><AlignCenter size={14} className="mx-auto" /></button>
                    <button onClick={() => updateElement(selectedId, { align: 'right' })} className={`flex-1 p-1 rounded-lg ${selectedElement.align === 'right' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-600'}`}><AlignRight size={14} className="mx-auto" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
                    <span>Tamanho Fonte</span>
                    <span>{selectedElement.fontSize}px</span>
                  </div>
                  <input type="range" min="6" max="48" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedId, { fontSize: parseInt(e.target.value) })} className="w-full accent-emerald-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
                    <span>Fonte</span>
                    <span className="truncate max-w-[140px]">{selectedElement.fontFamily || 'Arial'}</span>
                  </div>
                  <select
                    value={selectedElement.fontFamily || 'Arial'}
                    onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Opções do Bloco</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => updateElement(selectedId, { wrap: !selectedElement.wrap })} className={`p-2 rounded-xl border text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${selectedElement.wrap ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><Type size={12} /> Quebra</button>
                  <button onClick={() => updateElement(selectedId, { border: !selectedElement.border })} className={`p-2 rounded-xl border text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${selectedElement.border ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><Square size={12} /> Borda</button>
                  <button onClick={() => updateElement(selectedId, { showLabel: !selectedElement.showLabel })} className={`p-2 rounded-xl border text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${selectedElement.showLabel ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><FontIcon size={12} /> Título</button>
                </div>
                {showTitleOptions && selectedElement.showLabel && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => updateElement(selectedId, { titlePosition: 'top' })} className={`p-2 rounded-xl border text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${selectedElement.titlePosition === 'top' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><Type size={12} /> Titulo em cima</button>
                      <button onClick={() => updateElement(selectedId, { titlePosition: 'inline' })} className={`p-2 rounded-xl border text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${selectedElement.titlePosition !== 'top' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><Type size={12} /> Titulo antes</button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
                        <span>Tamanho Titulo</span>
                        <span>{selectedElement.titleFontSize ?? selectedElement.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="48"
                        value={selectedElement.titleFontSize ?? selectedElement.fontSize}
                        onChange={(e) => updateElement(selectedId, { titleFontSize: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => updateElement(selectedId, { rotation: (selectedElement.rotation + 90) % 360 })} className="flex-1 bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-zinc-500 hover:text-white flex items-center justify-center gap-2 text-[10px] font-bold uppercase"><RotateCw size={12} /> Girar 90°</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <div className="p-4 bg-zinc-950 rounded-full border border-zinc-800">
                <Move size={24} className="text-zinc-800" />
              </div>
              <p className="text-zinc-600 text-xs">Selecione um elemento no canvas para editar suas propriedades.</p>
            </div>
          )}

          <div className="p-4 border-t border-zinc-800 space-y-4 mt-8">
            <div className="space-y-2 hidden">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fundo do Bloco</p>
              {selectedElement ? (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={selectedElement.backgroundColor && selectedElement.backgroundColor !== 'transparent' ? selectedElement.backgroundColor : '#ffffff'}
                    onChange={(e) => updateElement(selectedId, { backgroundColor: e.target.value })}
                    className="h-8 w-12 rounded border border-zinc-800 bg-zinc-950"
                    title="Cor do fundo"
                  />
                  <button
                    onClick={() => updateElement(selectedId, { backgroundColor: 'transparent' })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-[10px] font-bold uppercase text-zinc-500 hover:text-white"
                  >
                    Sem fundo
                  </button>
                </div>
              ) : (
                <p className="text-zinc-600 text-xs">Selecione um elemento para definir o fundo.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><MapPin size={10} /> Localização Padrão</p>
              <div className="grid grid-cols-3 gap-2">
                <input 
                  type="text" placeholder="Rua" 
                  className="bg-zinc-950 border border-zinc-800 rounded p-1 text-xs text-white"
                  value={logistics.street} onChange={e => setLogistics({...logistics, street: e.target.value})}
                />
                <input 
                  type="text" placeholder="Prat." 
                  className="bg-zinc-950 border border-zinc-800 rounded p-1 text-xs text-white"
                  value={logistics.shelf} onChange={e => setLogistics({...logistics, shelf: e.target.value})}
                />
                <input 
                  type="text" placeholder="Nível" 
                  className="bg-zinc-950 border border-zinc-800 rounded p-1 text-xs text-white"
                  value={logistics.level} onChange={e => setLogistics({...logistics, level: e.target.value})}
                />
              </div>
            </div>
            <button 
              onClick={handleSave}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> Salvar Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelDesigner;
