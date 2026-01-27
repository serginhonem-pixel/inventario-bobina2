import React, { useState, useEffect, useRef } from 'react';
import { parseFileToItemsBySchema, parseFileToSchemaAndItems, slugify } from '../../services/excel/excelParser';
import { saveSchema } from '../../services/firebase/schemaService';
import { createItemsBulk } from '../../services/firebase/itemService';

const SchemaImporter = ({ onImported, tenantId = 'default-user', stockPointId = null, defaultName = '', currentSchema = null }) => {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [fields, setFields] = useState([]);
  const [schemaName, setSchemaName] = useState('');
  const [loading, setLoading] = useState(false);
  const [schemaSaved, setSchemaSaved] = useState(false);
  const [savedSchema, setSavedSchema] = useState(null);
  const fileInputRef = useRef(null);

  const ensureFieldIds = (list = []) =>
    list.map((field, idx) =>
      field.id
        ? field
        : { ...field, id: `fld_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}` }
    );

  useEffect(() => {
    if (defaultName && !schemaName) {
      setSchemaName(defaultName);
    }
  }, [defaultName, schemaName]);

  useEffect(() => {
    if (currentSchema?.fields?.length) {
      setFields(ensureFieldIds(currentSchema.fields));
      setSchemaSaved(true);
      setSavedSchema(currentSchema);
      if (currentSchema.name && !schemaName) {
        setSchemaName(currentSchema.name);
      }
    } else if (fields.length === 0) {
      setFields(ensureFieldIds([
        { key: 'sku', label: 'SKU', type: 'text', required: true }
      ]));
    }
  }, [currentSchema]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        if (!schemaSaved) {
          const { fields: parsedFields, items } = await parseFileToSchemaAndItems(selectedFile);
          setFields(ensureFieldIds(parsedFields));
          setItemsData(items || []);
          setPreviewRows((items || []).slice(0, 5));
        } else {
          const { items } = await parseFileToItemsBySchema(selectedFile, fields);
          setItemsData(items || []);
          setPreviewRows(items.slice(0, 5));
        }
        if (!schemaName) setSchemaName(selectedFile.name.split('.')[0]);
      } catch (error) {
        alert("Erro ao processar arquivo: " + error);
      }
    }
  };

  const updateField = (index, key, value) => {
    const updated = [...fields];
    if (key === 'label') {
      updated[index].label = value;
      updated[index].key = slugify(value);
    } else {
      updated[index][key] = value;
    }
    setFields(updated);
  };

  const addField = () => {
    setFields([
      ...fields,
      { id: `fld_${Date.now()}_${fields.length}_${Math.random().toString(36).slice(2, 6)}`, key: `campo_${fields.length + 1}`, label: '', type: 'text', required: false }
    ]);
  };

  const removeField = (index) => {
    const updated = fields.filter((_, idx) => idx !== index);
    setFields(updated);
  };

  const handleSaveSchema = async () => {
    if (!schemaName) return alert("De um nome ao conjunto de itens");
    if (!stockPointId) return alert("Selecione um ponto de estocagem antes de importar.");
    if (fields.length === 0) return alert("Adicione ao menos uma coluna.");
    if (fields.some(field => !field.label || !field.label.trim())) {
      return alert("Preencha o nome de todas as colunas.");
    }
    const keys = fields.map(field => slugify(field.label || field.key || ''));
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      return alert("Existem colunas com nomes duplicados.");
    }
    setLoading(true);
    try {
      const schemaData = {
        name: schemaName,
        fields: fields.map((field) => ({
          ...field,
          key: field.key || slugify(field.label || 'campo')
        })),
        sampleData: {}
      };
      
      const savedSchema = await saveSchema(tenantId, schemaData, stockPointId);
      setSchemaSaved(true);
      setSavedSchema(savedSchema);
      if (onImported) onImported(savedSchema, 0);
      return savedSchema;
    } catch (error) {
      console.error("Erro ao salvar colunas:", error);
      alert("Erro ao salvar colunas. Tente novamente.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItems = async () => {
    let schemaToUse = savedSchema || currentSchema;
    if (!schemaSaved || !schemaToUse) {
      const created = await handleSaveSchema();
      if (!created) return;
      schemaToUse = created;
    }
    if (itemsData.length === 0) {
      alert("Nenhum item para importar.");
      return;
    }
    setLoading(true);
    try {
      await createItemsBulk(
        tenantId,
        schemaToUse.id,
        schemaToUse.version || 1,
        stockPointId,
        itemsData
      );
      if (onImported) onImported(schemaToUse, itemsData.length);
      setItemsData([]);
      setPreviewRows([]);
      setFile(null);
    } catch (error) {
      console.error("Erro ao salvar itens:", error);
      alert("Erro ao salvar itens. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (fields.length === 0) {
      alert("Adicione ao menos uma coluna.");
      return;
    }
    const headers = fields.map(field => field.label || field.key);
    const csvContent = `${headers.join(',')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${schemaName || 'modelo'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
      <h2 className="text-xl font-bold text-emerald-400 mb-4">1. Criar colunas do ponto</h2>
      
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Nome do Conjunto (ex: Itens do Ponto A)</label>
        <input 
          type="text" 
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white"
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          placeholder="Ex: Almoxarifado Central"
        />
      </div>

      <div className="space-y-3 mb-6">
        {fields.map((field, idx) => (
          <div key={field.id || `${field.key}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <input
              type="text"
              placeholder="Nome da coluna (ex: Descricao)"
              className="md:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm text-white min-w-0"
              value={field.label}
              onChange={(e) => updateField(idx, 'label', e.target.value)}
            />
            <select
              className="md:col-span-3 bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm text-white min-w-0"
              value={field.type}
              onChange={(e) => updateField(idx, 'type', e.target.value)}
            >
              <option value="text">Texto</option>
              <option value="number">Numero</option>
              <option value="date">Data</option>
              <option value="boolean">Sim/Nao</option>
            </select>
            <label className="md:col-span-2 flex items-center gap-1 text-[10px] text-zinc-400 leading-tight whitespace-nowrap min-w-0">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(idx, 'required', e.target.checked)}
                className="accent-emerald-500"
              />
              Obrig.
            </label>
            <button
              type="button"
              onClick={() => removeField(idx)}
              className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-[10px] text-zinc-400 hover:text-white whitespace-nowrap"
            >
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addField}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 text-xs text-zinc-400 hover:text-white"
        >
          + Adicionar coluna
        </button>
        <button
          onClick={handleSaveSchema}
          disabled={loading}
          data-guide="save-columns"
          className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors disabled:bg-zinc-800"
        >
          {loading ? "Salvando..." : "Salvar Colunas do Ponto"}
        </button>
      </div>

      <div className="border-t border-zinc-800 pt-6 space-y-4">
        <h3 className="text-lg font-semibold text-zinc-200">2. Importar SKUs (com todas as colunas)</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-xs text-zinc-300 hover:text-white"
          >
            Baixar modelo do Excel
          </button>
          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-4 text-center flex-1">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange}
              className="hidden" 
              id="excel-upload"
              ref={fileInputRef}
            />
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className={`w-full ${schemaSaved ? 'text-zinc-400 hover:text-emerald-300' : 'text-zinc-600'} cursor-pointer`}
            >
              {file ? file.name : schemaSaved ? "Clique para selecionar ou arraste seu Excel/CSV aqui" : "Clique para selecionar ou arraste seu Excel/CSV aqui"}
            </button>
          </div>
        </div>

        {itemsData.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-zinc-400">
              Prévia dos primeiros {previewRows.length} itens carregados.
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300">
              {previewRows.map((row, idx) => (
                <div key={idx} className="py-1 border-b border-zinc-800 last:border-b-0">
                  {fields.map(field => (
                    <span key={field.key} className="mr-3">
                      <strong className="text-zinc-500">{field.label}:</strong> {String(row[field.key] ?? '') || '-'}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <button 
              onClick={handleSaveItems}
              disabled={loading}
              data-guide="save-items"
              className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors disabled:bg-zinc-800"
            >
              {loading ? "Salvando..." : "Salvar Itens do Ponto"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaImporter;
