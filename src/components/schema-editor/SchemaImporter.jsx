import React, { useState, useEffect } from 'react';
import { parseFileToSchemaAndItems } from '../../services/excel/excelParser';
import { saveSchema } from '../../services/firebase/schemaService';
import { createItemsBulk } from '../../services/firebase/itemService';

const SchemaImporter = ({ onImported, tenantId = 'default-user', stockPointId = null, defaultName = '' }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fields, setFields] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [isManual, setIsManual] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultName && !schemaName) {
      setSchemaName(defaultName);
    }
  }, [defaultName, schemaName]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        const { fields, sampleData, items } = await parseFileToSchemaAndItems(selectedFile);
        // Adicionar campo de estoque mínimo se não existir
        const hasMinStock = fields.some(f => f.key === 'estoque_minimo');
        const updatedFields = hasMinStock ? fields : [
          ...fields, 
          { key: 'estoque_minimo', label: 'Estoque Mínimo', type: 'number', required: false }
        ];
        setFields(updatedFields);
        setPreview(sampleData);
        setItemsData(items || []);
        if (!schemaName) setSchemaName(selectedFile.name.split('.')[0]);
      } catch (error) {
        alert("Erro ao processar arquivo: " + error);
      }
    }
  };

  const updateField = (index, key, value) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!schemaName) return alert("Dê um nome ao conjunto de itens");
    if (!stockPointId) return alert("Selecione um ponto de estocagem antes de importar.");
    setLoading(true);
    try {
      const schemaData = {
        name: schemaName,
        fields: fields,
        sampleData: preview
      };
      
      const savedSchema = await saveSchema(tenantId, schemaData, stockPointId);
      if (itemsData.length > 0) {
        await createItemsBulk(tenantId, savedSchema.id, savedSchema.version || 1, stockPointId, itemsData);
      }
      
      // Corrigido: Usando a prop correta 'onImported' que vem do LabelManagement
      if (onImported) {
        onImported(savedSchema, itemsData.length);
      }
    } catch (error) {
      console.error("Erro ao salvar itens:", error);
      alert("Erro ao salvar itens. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
      <h2 className="text-xl font-bold text-emerald-400 mb-4">1. Importar Planilha do Ponto</h2>
      
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Nome do Conjunto de Itens (ex: Itens do Ponto A)</label>
        <input 
          type="text" 
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white"
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          placeholder="Ex: Almoxarifado Central"
        />
      </div>

      <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center mb-6">
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileChange}
          className="hidden" 
          id="excel-upload"
        />
        <label htmlFor="excel-upload" className="cursor-pointer text-zinc-400 hover:text-emerald-300">
          {file ? file.name : "Clique para selecionar ou arraste seu Excel/CSV aqui"}
        </label>
      </div>

      {fields.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-200">2. Configurar Campos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-800 text-zinc-400">
                <tr>
                  <th className="p-2">Coluna Original</th>
                  <th className="p-2">Nome Amigável (Label)</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Obrigatório</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={idx} className="border-b border-zinc-800">
                    <td className="p-2 font-mono text-xs">{field.label}</td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={field.label}
                        onChange={(e) => updateField(idx, 'label', e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 w-full"
                      />
                    </td>
                    <td className="p-2">
                      <select 
                        value={field.type}
                        onChange={(e) => updateField(idx, 'type', e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1"
                      >
                        <option value="text">Texto</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                        <option value="boolean">Sim/Não</option>
                        <option value="select">Lista (Select)</option>
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <input 
                        type="checkbox" 
                        checked={field.required}
                        onChange={(e) => updateField(idx, 'required', e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors disabled:bg-zinc-800"
          >
            {loading ? "Salvando..." : "Salvar Itens do Ponto"}
          </button>
        </div>
      )}
    </div>
  );
};

export default SchemaImporter;
