import React, { useState, useEffect } from 'react';
import { toast } from '../ui/toast';

const DynamicForm = ({ schema, onSubmit, initialData = {} }) => {
  // Inicializa o estado com os campos do schema para evitar problemas de controle
  const [formData, setFormData] = useState({});

  // Sincroniza o formulário quando o schema muda
  useEffect(() => {
    if (schema) {
      const initial = {};
      schema.fields.forEach(f => {
        initial[f.key] = initialData[f.key] || '';
      });
      setFormData(initial);
    }
  }, [schema]); // Removido initialData da dependência para evitar resets durante a digitação

  const handleChange = (key, value) => {
    // Atualização direta do estado para garantir que o input não perca o foco ou trave
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const missingFields = schema.fields
      .filter(f => f.required && !formData[f.key])
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast(`Por favor, preencha os campos obrigatórios: ${missingFields.join(', ')}`, { type: 'warning' });
      return;
    }

    onSubmit(formData);
    
    // Limpa o formulário após o envio
    const resetData = {};
    schema.fields.forEach(f => resetData[f.key] = '');
    setFormData(resetData);
  };

  if (!schema) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4">
        {schema.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
            </label>
            
            {field.type === 'boolean' ? (
              <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <input
                  type="checkbox"
                  checked={!!formData[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-sm text-zinc-300">Sim / Ativo</span>
              </div>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={`Digite ${field.label.toLowerCase()}...`}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              />
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98]"
      >
        Cadastrar Item
      </button>
    </form>
  );
};

export default DynamicForm;
