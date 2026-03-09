import { useState, useCallback, useRef } from 'react';
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
  const loadIdRef = useRef(0);

  const loadStockPointData = useCallback(async (stockPointId) => {
    const thisLoadId = ++loadIdRef.current;
    setLoading(true);
    try {
      const schema = await schemaService.getSchemaByStockPoint(tenantId, stockPointId);
      if (loadIdRef.current !== thisLoadId) return { schema: null, items: [], templates: [] };
      setCurrentSchema(schema || null);

      if (schema) {
        const [loadedItems, loadedTemplates] = await Promise.all([
          itemService.getItemsByStockPoint(tenantId, stockPointId),
          templateService.getTemplatesBySchema(tenantId, schema.id),
        ]);
        if (loadIdRef.current !== thisLoadId) return { schema, items: loadedItems, templates: loadedTemplates };
        setItems(loadedItems);
        setTemplates(loadedTemplates);
        const templateWithElements =
          loadedTemplates.find((tpl) => (tpl.elements || []).length > 0) || null;
        setTemplate(templateWithElements || (loadedTemplates.length > 0 ? loadedTemplates[0] : null));
        return { schema, items: loadedItems, templates: loadedTemplates };
      } else {
        setItems([]);
        setTemplates([]);
        setTemplate(null);
        return { schema: null, items: [], templates: [] };
      }
    } catch (error) {
      if (loadIdRef.current !== thisLoadId) return { schema: null, items: [], templates: [] };
      console.error('Erro ao carregar dados do ponto:', error);
      setItems([]);
      setTemplates([]);
      setTemplate(null);
      return { schema: null, items: [], templates: [] };
    } finally {
      if (loadIdRef.current === thisLoadId) setLoading(false);
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
