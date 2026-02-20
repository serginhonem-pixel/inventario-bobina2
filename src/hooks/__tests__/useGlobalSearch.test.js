import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useGlobalSearch from '../useGlobalSearch';

describe('useGlobalSearch', () => {
  const schema = {
    fields: [
      { key: 'codigo', name: 'codigo' },
      { key: 'descricao', name: 'descricao' },
    ],
  };

  const items = [
    { id: 'item1', data: { codigo: 'ABC123', descricao: 'Parafuso' } },
    { id: 'item2', data: { codigo: 'DEF456', descricao: 'Porca' } },
    { id: 'item3', data: { codigo: 'GHI789', descricao: 'Arruela' } },
  ];

  it('retorna todos os itens quando busca está vazia', () => {
    const { result } = renderHook(() => useGlobalSearch(items, schema));
    expect(result.current.hasGlobalSearch).toBe(false);
    expect(result.current.filteredItems).toEqual(items);
  });

  it('filtra por código', () => {
    const { result } = renderHook(() => useGlobalSearch(items, schema));

    act(() => {
      result.current.setGlobalSearch('ABC');
    });

    expect(result.current.hasGlobalSearch).toBe(true);
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe('item1');
  });

  it('filtra por descrição (case insensitive)', () => {
    const { result } = renderHook(() => useGlobalSearch(items, schema));

    act(() => {
      result.current.setGlobalSearch('porca');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe('item2');
  });

  it('filtra por id do item', () => {
    const { result } = renderHook(() => useGlobalSearch(items, schema));

    act(() => {
      result.current.setGlobalSearch('item3');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe('item3');
  });

  it('retorna vazio quando nada corresponde', () => {
    const { result } = renderHook(() => useGlobalSearch(items, schema));

    act(() => {
      result.current.setGlobalSearch('xyz_nao_existe');
    });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('usa Object.values quando schema não tem fields', () => {
    const { result } = renderHook(() => useGlobalSearch(items, null));

    act(() => {
      result.current.setGlobalSearch('Parafuso');
    });

    expect(result.current.filteredItems).toHaveLength(1);
  });

  it('trata busca com espaços como vazia', () => {
    const { result } = renderHook(() => useGlobalSearch(items, schema));

    act(() => {
      result.current.setGlobalSearch('   ');
    });

    expect(result.current.hasGlobalSearch).toBe(false);
    expect(result.current.filteredItems).toEqual(items);
  });
});
