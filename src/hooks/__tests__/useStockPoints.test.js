import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useStockPoints from '../useStockPoints';

vi.mock('../../services/firebase/stockPointService', () => ({
  getStockPointsByTenant: vi.fn(),
}));

import * as stockPointService from '../../services/firebase/stockPointService';

describe('useStockPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega pontos na montagem', async () => {
    const points = [{ id: 'sp1', name: 'Ponto 1' }];
    stockPointService.getStockPointsByTenant.mockResolvedValue(points);

    const { result } = renderHook(() => useStockPoints('t1'));

    await waitFor(() => {
      expect(result.current.stockPoints).toEqual(points);
    });
    expect(stockPointService.getStockPointsByTenant).toHaveBeenCalledWith('t1');
  });

  it('não carrega se tenantId é falsy', () => {
    stockPointService.getStockPointsByTenant.mockResolvedValue([]);
    renderHook(() => useStockPoints(null));
    expect(stockPointService.getStockPointsByTenant).not.toHaveBeenCalled();
  });

  it('handleStockPointCreated adiciona ponto sem duplicar', async () => {
    stockPointService.getStockPointsByTenant.mockResolvedValue([]);
    const { result } = renderHook(() => useStockPoints('t1'));

    await waitFor(() => expect(result.current.stockPoints).toEqual([]));

    act(() => {
      result.current.handleStockPointCreated({ id: 'sp2', name: 'Novo' });
    });
    expect(result.current.stockPoints).toHaveLength(1);

    // Não duplica
    act(() => {
      result.current.handleStockPointCreated({ id: 'sp2', name: 'Novo' });
    });
    expect(result.current.stockPoints).toHaveLength(1);
  });

  it('handleStockPointCreated ignora newPoint sem id', async () => {
    stockPointService.getStockPointsByTenant.mockResolvedValue([]);
    const { result } = renderHook(() => useStockPoints('t1'));

    await waitFor(() => expect(result.current.stockPoints).toEqual([]));

    act(() => {
      result.current.handleStockPointCreated(null);
    });
    expect(result.current.stockPoints).toHaveLength(0);
  });

  it('handleStockPointDeleted remove ponto', async () => {
    stockPointService.getStockPointsByTenant.mockResolvedValue([
      { id: 'sp1', name: 'A' },
      { id: 'sp2', name: 'B' },
    ]);
    const { result } = renderHook(() => useStockPoints('t1'));

    await waitFor(() => expect(result.current.stockPoints).toHaveLength(2));

    act(() => {
      result.current.handleStockPointDeleted({ id: 'sp1' });
    });
    expect(result.current.stockPoints).toHaveLength(1);
    expect(result.current.stockPoints[0].id).toBe('sp2');
  });

  it('handleStockPointDeleted ignora deletedPoint sem id', async () => {
    stockPointService.getStockPointsByTenant.mockResolvedValue([{ id: 'sp1' }]);
    const { result } = renderHook(() => useStockPoints('t1'));

    await waitFor(() => expect(result.current.stockPoints).toHaveLength(1));

    act(() => {
      result.current.handleStockPointDeleted(null);
    });
    expect(result.current.stockPoints).toHaveLength(1);
  });
});
