import { useState, useCallback } from 'react';
import * as schemaService from '../services/firebase/schemaService';
import * as itemService from '../services/firebase/itemService';
import * as templateService from '../services/firebase/templateService';

/**
 * Carrega schema, items e templates do ponto de estocagem selecionado.
 */
export default function useStockPointData(tenantId, _currentStockPoint) {
  const [currentSchema, setCurrentSchema] = useState(null);
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStockPointData = useCallback(async (stockPointId) => {
    setLoading(true);
    try {
      const schema = await schemaService.getSchemaByStockPoint(tenantId, stockPointId);
      setCurrentSchema(schema || null);

      if (schema) {
        const [loadedItems, loadedTemplates] = await Promise.all([
          itemService.getItemsByStockPoint(tenantId, stockPointId),
          templateService.getTemplatesBySchema(tenantId, schema.id),
        ]);
        setItems(loadedItems);
        setTemplates(loadedTemplates);
        const templateWithElements =
          loadedTemplates.find((tpl) => (tpl.elements || []).length > 0) || null;
        setTemplate(templateWithElements || (loadedTemplates.length > 0 ? loadedTemplates[0] : null));
      } else {
        setItems([]);
        setTemplates([]);
        setTemplate(null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do ponto:', error);
      setItems([]);
      setTemplates([]);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const clearData = useCallback(() => {
    setCurrentSchema(null);
    setItems([]);
    setTemplates([]);
    setTemplate(null);
  }, []);

  return {
    currentSchema,
    setCurrentSchema,
    items,
    setItems,
    templates,
    setTemplates,
    template,
    setTemplate,
    loading,
    loadStockPointData,
    clearData,
  };
}
