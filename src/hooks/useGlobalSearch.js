import { useMemo, useState } from 'react';
import { normalizeText } from '../catalogUtils';

/**
 * Filtra itens com base em uma busca global (normalizada).
 */
export default function useGlobalSearch(items, currentSchema) {
  const [globalSearch, setGlobalSearch] = useState('');

  const hasGlobalSearch = globalSearch.trim().length > 0;

  const filteredItems = useMemo(() => {
    if (!hasGlobalSearch) return items;
    const normalized = normalizeText(globalSearch);
    return items.filter((item) => {
      const values = currentSchema?.fields?.length
        ? currentSchema.fields.map((field) => item.data?.[field.key || field.name])
        : Object.values(item.data || {});
      const searchText = normalizeText([item.id, ...values].filter(Boolean).join(' '));
      return searchText.includes(normalized);
    });
  }, [items, currentSchema, globalSearch, hasGlobalSearch]);

  return { globalSearch, setGlobalSearch, hasGlobalSearch, filteredItems };
}
