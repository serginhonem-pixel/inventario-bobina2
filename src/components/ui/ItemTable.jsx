import React, { useState, useEffect, useMemo } from 'react';
import { Printer, FileSpreadsheet, FileText, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../../services/export/exportService';

// Helper para agrupar itens iguais e somar quantidades
const groupItems = (items, schema) => {
  if (!items || !schema) return [];
  
  const qtyFields = ['quantidade', 'qtd', 'estoque', 'quantidade_atual', 'saldo'];
  const codeField = schema.fields?.find(f => ['codigo', 'sku', 'cod', 'code'].includes(f.key || f.name));
  const codeKey = codeField?.key || codeField?.name || 'codigo';
  
  const grouped = new Map();
  
  items.forEach(item => {
    const code = item.data?.[codeKey] || item.data?.codigo || item.data?.sku || `_item_${item.id}`;
    
    if (grouped.has(code)) {
      const existing = grouped.get(code);
      // Soma as quantidades
      schema.fields?.forEach(field => {
        const fk = field.key || field.name;
        if (qtyFields.includes(fk)) {
          const existingVal = Number(existing.data[fk]) || 0;
          const newVal = Number(item.data?.[fk]) || 0;
          existing.data[fk] = existingVal + newVal;
        }
      });
      // Guarda IDs originais para seleção
      existing._originalIds = existing._originalIds || [existing.id];
      existing._originalIds.push(item.id);
    } else {
      grouped.set(code, {
        ...item,
        data: { ...item.data },
        _originalIds: [item.id]
      });
    }
  });
  
  return Array.from(grouped.values());
};

const ItemTable = ({ items, schema, onPrintSelected, onBluetoothPrint, hasBluetooth }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const pageSize = 10;
  const isSkuOnly = schema?.fields?.length === 1 && schema.fields[0]?.key === 'sku';

  // Agrupa itens iguais
  const groupedItems = useMemo(() => groupItems(items, schema), [items, schema]);

  // Mapa de itens originais por código para mostrar lotes
  const originalItemsMap = useMemo(() => {
    const map = new Map();
    groupedItems.forEach(grouped => {
      const originals = items.filter(item => 
        (grouped._originalIds || [grouped.id]).includes(item.id)
      );
      map.set(grouped.id, originals);
    });
    return map;
  }, [items, groupedItems]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds((prev) => {
      const next = new Set();
      const allowed = new Set(groupedItems.map((item) => item.id));
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [groupedItems]);

  const totalPages = Math.max(1, Math.ceil(groupedItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedItems = groupedItems.slice(startIndex, endIndex);

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const handlePrint = () => {
    // Pega os itens originais para impressão
    const selectedGrouped = groupedItems.filter(item => selectedIds.has(item.id));
    const originalIds = new Set();
    selectedGrouped.forEach(item => {
      (item._originalIds || [item.id]).forEach(id => originalIds.add(id));
    });
    const selectedItems = items.filter(item => originalIds.has(item.id));
    if (selectedItems.length === 0) return alert("Selecione ao menos um item");
    onPrintSelected(selectedItems);
  };

  const handleExportExcel = () => {
    if (items.length === 0) return alert("Não há itens para exportar.");
    exportToExcel(items, schema);
  };

  const handleExportPDF = () => {
    if (items.length === 0) return alert("Não há itens para exportar.");
    exportToPDF(items, schema);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <h3 className="text-white font-bold">{isSkuOnly ? 'SKUs Cadastrados' : 'Itens Cadastrados'}</h3>
<div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            disabled={groupedItems.length === 0}
            className="bg-emerald-500/10 disabled:bg-zinc-700/50 text-emerald-500 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-emerald-500/30 hover:bg-emerald-500/20"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={items.length === 0}
            className="bg-rose-500/10 disabled:bg-zinc-700/50 text-rose-500 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-rose-500/30 hover:bg-rose-500/20"
          >
            <FileText size={14} /> PDF
          </button>
          {hasBluetooth && (
            <button 
              onClick={() => {
                const selectedItems = items.filter(item => selectedIds.has(item.id));
                onBluetoothPrint(selectedItems);
              }}
              disabled={selectedIds.size === 0}
              className="bg-blue-500 disabled:bg-zinc-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              Bluetooth ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={handlePrint}
            disabled={selectedIds.size === 0}
            className="bg-emerald-500 disabled:bg-zinc-700 text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Printer size={14} /> Imprimir PDF ({selectedIds.size})
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-4 w-10">
                <input 
                  type="checkbox" 
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        pagedItems.forEach((i) => next.add(i.id));
                        return next;
                      });
                    } else {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        pagedItems.forEach((i) => next.delete(i.id));
                        return next;
                      });
                    }
                  }}
                  checked={pagedItems.length > 0 && pagedItems.every((i) => selectedIds.has(i.id))}
                />
              </th>
              <th className="p-2 w-10"></th>
              {schema.fields.slice(0, 4).map(field => (
                <th key={field.key} className="p-4 font-medium">{field.label}</th>
              ))}
              <th className="p-4">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {pagedItems.map(item => {
              const originals = originalItemsMap.get(item.id) || [];
              const hasMultiple = originals.length > 1;
              const isExpanded = expandedIds.has(item.id);
              
              return (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="p-2">
                      {hasMultiple && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-1 rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-emerald-400"
                          title={`Ver ${originals.length} lotes`}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      )}
                    </td>
                    {schema.fields.slice(0, 4).map((field, idx) => (
                      <td key={field.key} className="p-4 text-zinc-200">
                        <span className="flex items-center gap-2">
                          {item.data[field.key]?.toString() || '-'}
                          {idx === 0 && hasMultiple && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <Layers size={10} /> {originals.length}
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                    <td className="p-4 text-zinc-500 text-xs">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recente'}
                    </td>
                  </tr>
                  {/* Linhas expandidas dos lotes */}
                  {isExpanded && originals.map((orig, idx) => (
                    <tr key={`${item.id}-lote-${idx}`} className="bg-zinc-950/50 border-l-2 border-emerald-500/30">
                      <td className="p-2"></td>
                      <td className="p-2 text-zinc-600 text-xs pl-4">#{idx + 1}</td>
                      {schema.fields.slice(0, 4).map(field => (
                        <td key={field.key} className="p-3 text-zinc-400 text-xs">
                          {orig.data?.[field.key]?.toString() || '-'}
                        </td>
                      ))}
                      <td className="p-3 text-zinc-600 text-xs">
                        {orig.createdAt?.toDate ? orig.createdAt.toDate().toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400">
        <div>
          Exibindo {groupedItems.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, groupedItems.length)} de {groupedItems.length} itens únicos
          {items.length !== groupedItems.length && (
            <span className="text-zinc-600 ml-2">({items.length} registros)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1 rounded-lg border border-zinc-800 text-zinc-300 disabled:text-zinc-600 disabled:border-zinc-900"
          >
            Anterior
          </button>
          <span className="text-zinc-500">
            Página {safePage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1 rounded-lg border border-zinc-800 text-zinc-300 disabled:text-zinc-600 disabled:border-zinc-900"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemTable;
