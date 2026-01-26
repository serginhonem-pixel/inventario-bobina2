import React, { useState } from 'react';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, exportToText } from '../../services/export/exportService';

const ItemTable = ({ items, schema, onPrintSelected, onBluetoothPrint, hasBluetooth }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const isSkuOnly = schema?.fields?.length === 1 && schema.fields[0]?.key === 'sku';

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handlePrint = () => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    if (selectedItems.length === 0) return alert("Selecione ao menos um item");
    onPrintSelected(selectedItems);
  };

  const handleExportText = () => {
    if (items.length === 0) return alert("Não há itens para exportar.");
    exportToText(items, schema);
  };

  const handleExportCSV = () => {
    if (items.length === 0) return alert("Não há itens para exportar.");
    exportToCSV(items, schema);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <h3 className="text-white font-bold">{isSkuOnly ? 'SKUs Cadastrados' : 'Itens Cadastrados'}</h3>
<div className="flex gap-2">
          <button 
            onClick={handleExportText}
            disabled={items.length === 0}
            className="bg-rose-500/10 disabled:bg-zinc-700/50 text-rose-500 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-rose-500/30"
          >
            <FileText size={14} /> Exportar TXT
          </button>
          <button 
            onClick={handleExportCSV}
            disabled={items.length === 0}
            className="bg-blue-500/10 disabled:bg-zinc-700/50 text-blue-500 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-blue-500/30"
          >
            <FileSpreadsheet size={14} /> Exportar CSV
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
                    if (e.target.checked) setSelectedIds(new Set(items.map(i => i.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </th>
              {schema.fields.slice(0, 4).map(field => (
                <th key={field.key} className="p-4 font-medium">{field.label}</th>
              ))}
              <th className="p-4">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                </td>
                {schema.fields.slice(0, 4).map(field => (
                  <td key={field.key} className="p-4 text-zinc-200">
                    {item.data[field.key]?.toString() || '-'}
                  </td>
                ))}
                <td className="p-4 text-zinc-500 text-xs">
                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recente'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemTable;
