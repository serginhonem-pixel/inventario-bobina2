import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do firebase config
vi.mock('../config', () => ({
  db: {}
}));

// Mock do mockPersistence
vi.mock('../mockPersistence', () => ({
  isLocalhost: vi.fn(() => true),
  mockAddDoc: vi.fn(),
  mockGetDocs: vi.fn(),
  mockUpdateDoc: vi.fn()
}));

// Mock do pagination
vi.mock('../pagination', () => ({
  getDocsWithPagination: vi.fn()
}));

// Mock do firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  doc: vi.fn(() => ({ id: 'mock_doc_id' })),
  runTransaction: vi.fn()
}));

import { saveAdjustment, getStockLogs, syncPendingMovements } from '../stockService';
import { isLocalhost, mockAddDoc, mockGetDocs, mockUpdateDoc } from '../mockPersistence';

describe('saveAdjustment (localhost mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLocalhost.mockReturnValue(true);
    mockGetDocs.mockResolvedValue([]);
  });

  it('salva ajuste e atualiza item localmente', async () => {
    mockAddDoc.mockResolvedValue({ id: 'adj_1' });
    mockGetDocs.mockResolvedValue([
      { id: 'item_1', data: { quantidade: 10, nome: 'Parafuso' } }
    ]);
    mockUpdateDoc.mockResolvedValue(true);

    const result = await saveAdjustment('tenant1', 'schema1', 'item_1', 'sp1', {
      previousQty: 10,
      newQty: 15,
      type: 'adjust',
      notes: 'Teste'
    });

    expect(result).toEqual({ id: 'adj_1' });
    expect(mockAddDoc).toHaveBeenCalledWith('stock_adjustments', expect.objectContaining({
      tenantId: 'tenant1',
      schemaId: 'schema1',
      itemId: 'item_1',
      stockPointId: 'sp1',
      newQty: 15
    }));

    // Deve ter atualizado o item com a nova quantidade
    expect(mockUpdateDoc).toHaveBeenCalledWith('items', 'item_1', {
      data: expect.objectContaining({ quantidade: 15 })
    });
  });

  it('lida com assinatura sem stockPointId (argumento como objeto)', async () => {
    mockAddDoc.mockResolvedValue({ id: 'adj_2' });
    mockGetDocs.mockResolvedValue([]);

    const result = await saveAdjustment('tenant1', 'schema1', 'item_1', {
      previousQty: 5,
      newQty: 8,
      type: 'adjust',
      notes: ''
    });

    expect(result).toEqual({ id: 'adj_2' });
    expect(mockAddDoc).toHaveBeenCalledWith('stock_adjustments', expect.objectContaining({
      stockPointId: null,
      newQty: 8
    }));
  });

  it('não atualiza item se não encontrado', async () => {
    mockAddDoc.mockResolvedValue({ id: 'adj_3' });
    mockGetDocs.mockResolvedValue([]); // nenhum item

    await saveAdjustment('tenant1', 'schema1', 'item_x', 'sp1', {
      previousQty: 0,
      newQty: 5,
      type: 'adjust',
      notes: ''
    });

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('getStockLogs (localhost mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLocalhost.mockReturnValue(true);
  });

  it('filtra logs por itemId', async () => {
    mockGetDocs.mockResolvedValue([
      { id: 'log1', itemId: 'item_1', tenantId: 't1', timestamp: '2026-01-01' },
      { id: 'log2', itemId: 'item_2', tenantId: 't1', timestamp: '2026-01-02' },
      { id: 'log3', itemId: 'item_1', tenantId: 't1', timestamp: '2026-01-03' }
    ]);

    const logs = await getStockLogs('item_1', 't1');
    expect(logs).toHaveLength(2);
    expect(logs.every(l => l.itemId === 'item_1')).toBe(true);
  });

  it('ordena por timestamp descendente', async () => {
    mockGetDocs.mockResolvedValue([
      { id: 'log1', itemId: 'item_1', tenantId: 't1', timestamp: '2026-01-01' },
      { id: 'log2', itemId: 'item_1', tenantId: 't1', timestamp: '2026-01-03' }
    ]);

    const logs = await getStockLogs('item_1', 't1');
    expect(new Date(logs[0].timestamp).getTime()).toBeGreaterThan(
      new Date(logs[1].timestamp).getTime()
    );
  });
});

describe('syncPendingMovements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLocalhost.mockReturnValue(true);
  });

  it('retorna contagem de pendentes quando localhost', async () => {
    // Simula localStorage com pendentes
    const pending = [{ id: '1' }, { id: '2' }];
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(pending));

    const result = await syncPendingMovements();
    expect(result).toEqual({ synced: 0, remaining: 2 });

    vi.restoreAllMocks();
  });

  it('retorna 0/0 se não há pendentes (online, não localhost)', async () => {
    isLocalhost.mockReturnValue(false);
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify([]));

    const result = await syncPendingMovements();
    expect(result).toEqual({ synced: 0, remaining: 0 });

    vi.restoreAllMocks();
  });
});
