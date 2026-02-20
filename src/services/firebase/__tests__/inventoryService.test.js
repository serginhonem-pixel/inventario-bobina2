import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do firebase config
vi.mock('../config', () => ({
  db: {}
}));

vi.mock('../mockPersistence', () => ({
  isLocalhost: vi.fn(() => false)
}));

vi.mock('../pagination', () => ({
  getDocsWithPagination: vi.fn()
}));

const mockBatchSet = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock_session_id' })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit
  }))
}));

import { isLocalhost } from '../mockPersistence';
import { getDocsWithPagination } from '../pagination';
import {
  getInventorySummary,
  applyInventoryAdjustments,
  startInventorySession
} from '../inventoryService';

describe('startInventorySession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita com dados inválidos (sem tenantId)', async () => {
    await expect(startInventorySession(null, 'sp1', [], 'user'))
      .rejects.toThrow('Dados inválidos');
  });

  it('rejeita com dados inválidos (sem stockPointId)', async () => {
    await expect(startInventorySession('t1', null, [], 'user'))
      .rejects.toThrow('Dados inválidos');
  });

  it('retorna sessão local quando isLocalhost', async () => {
    isLocalhost.mockReturnValue(true);
    const items = [{ id: 'i1' }, { id: 'i2' }];
    const session = await startInventorySession('t1', 'sp1', items, 'user1');

    expect(session.tenantId).toBe('t1');
    expect(session.stockPointId).toBe('sp1');
    expect(session.status).toBe('open');
    expect(session.itemsTotal).toBe(2);
    expect(session.id).toContain('local_');
  });
});

describe('getInventorySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLocalhost.mockReturnValue(false);
  });

  it('retorna zeros para parâmetros inválidos', async () => {
    const result = await getInventorySummary(null, null);
    expect(result).toEqual({ total: 0, counted: 0, divergences: 0 });
  });

  it('retorna zeros quando localhost', async () => {
    isLocalhost.mockReturnValue(true);
    const result = await getInventorySummary('t1', 'session1');
    expect(result).toEqual({ total: 0, counted: 0, divergences: 0 });
  });

  it('calcula resumo corretamente', async () => {
    getDocsWithPagination.mockResolvedValue({
      docs: [
        { data: () => ({ baselineQty: 10, countedQty: 10 }) },    // contado, sem divergência
        { data: () => ({ baselineQty: 5, countedQty: 8 }) },      // contado, COM divergência
        { data: () => ({ baselineQty: 20, countedQty: null }) },   // não contado
        { data: () => ({ baselineQty: 3, countedQty: 0 }) }       // contado, COM divergência
      ]
    });

    const result = await getInventorySummary('t1', 'session1');
    expect(result.total).toBe(4);
    expect(result.counted).toBe(3);
    expect(result.divergences).toBe(2);
  });

  it('trata countedQty zero como contado', async () => {
    getDocsWithPagination.mockResolvedValue({
      docs: [
        { data: () => ({ baselineQty: 5, countedQty: 0 }) }
      ]
    });

    const result = await getInventorySummary('t1', 'session1');
    expect(result.counted).toBe(1);
    expect(result.divergences).toBe(1); // 5 != 0
  });

  it('trata countedQty undefined como não contado', async () => {
    getDocsWithPagination.mockResolvedValue({
      docs: [
        { data: () => ({ baselineQty: 5, countedQty: undefined }) }
      ]
    });

    const result = await getInventorySummary('t1', 'session1');
    expect(result.counted).toBe(0);
  });
});

describe('applyInventoryAdjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLocalhost.mockReturnValue(false);
  });

  it('rejeita com dados inválidos', async () => {
    await expect(applyInventoryAdjustments(null, 's1', 'sch1', 'sp1'))
      .rejects.toThrow('Dados inválidos');
    await expect(applyInventoryAdjustments('t1', null, 'sch1', 'sp1'))
      .rejects.toThrow('Dados inválidos');
  });

  it('retorna vazio quando localhost', async () => {
    isLocalhost.mockReturnValue(true);
    const result = await applyInventoryAdjustments('t1', 's1', 'sch1', 'sp1');
    expect(result.applied).toBe(0);
    expect(result.updates.size).toBe(0);
  });

  it('pula itens não contados (countedQty null)', async () => {
    getDocsWithPagination.mockResolvedValue({
      docs: [
        { data: () => ({ itemId: 'i1', baselineQty: 10, countedQty: null }) }
      ]
    });

    const result = await applyInventoryAdjustments('t1', 's1', 'sch1', 'sp1');
    expect(result.applied).toBe(0);
    expect(mockBatchSet).not.toHaveBeenCalled();
  });

  it('pula itens sem divergência (baseline === counted)', async () => {
    getDocsWithPagination.mockResolvedValue({
      docs: [
        { data: () => ({ itemId: 'i1', baselineQty: 10, countedQty: 10 }) }
      ]
    });

    const result = await applyInventoryAdjustments('t1', 's1', 'sch1', 'sp1');
    expect(result.applied).toBe(0);
    expect(mockBatchSet).not.toHaveBeenCalled();
  });

  it('aplica ajustes em batch para itens com divergência', async () => {
    getDocsWithPagination.mockResolvedValue({
      docs: [
        { data: () => ({ itemId: 'i1', baselineQty: 10, countedQty: 15 }) },
        { data: () => ({ itemId: 'i2', baselineQty: 5, countedQty: 3 }) },
        { data: () => ({ itemId: 'i3', baselineQty: 20, countedQty: 20 }) } // sem divergência
      ]
    });

    const result = await applyInventoryAdjustments('t1', 's1', 'sch1', 'sp1');
    expect(result.applied).toBe(2);
    expect(result.updates.size).toBe(2);
    expect(result.updates.get('i1')).toBe(15);
    expect(result.updates.get('i2')).toBe(3);

    // 2 adjustments (set) + 2 item updates
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('pula contagens com valor NaN', async () => {
    getDocsWithPagination.mockResolvedValue({
      docs: [
        { data: () => ({ itemId: 'i1', baselineQty: 10, countedQty: 'abc' }) }
      ]
    });

    const result = await applyInventoryAdjustments('t1', 's1', 'sch1', 'sp1');
    expect(result.applied).toBe(0);
  });
});
