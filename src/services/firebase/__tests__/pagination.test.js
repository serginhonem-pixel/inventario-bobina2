import { describe, it, expect, vi } from 'vitest';

// Mock do Firestore
vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  limit: vi.fn((n) => ({ type: 'limit', value: n })),
  query: vi.fn((...args) => ({ type: 'query', args })),
  startAfter: vi.fn((cursor) => ({ type: 'startAfter', cursor }))
}));

import { getDocsWithPagination, DEFAULT_PAGE_SIZE } from '../pagination';
import { getDocs } from 'firebase/firestore';

// Helper para criar snapshot mock
const mockSnapshot = (count, startId = 0) => {
  const docs = Array.from({ length: count }, (_, i) => ({
    id: `doc_${startId + i}`,
    data: () => ({ value: startId + i })
  }));
  return { docs };
};

describe('DEFAULT_PAGE_SIZE', () => {
  it('é 200', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(200);
  });
});

describe('getDocsWithPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna docs de uma página quando fetchAll=false', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(50));

    const result = await getDocsWithPagination('baseQuery', { fetchAll: false });
    expect(result.docs).toHaveLength(50);
    expect(result.cursor).toBeNull(); // 50 < 200 → sem próxima página
  });

  it('retorna cursor quando há mais páginas (fetchAll=false)', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(200));

    const result = await getDocsWithPagination('baseQuery', {
      fetchAll: false,
      pageSize: 200
    });
    expect(result.docs).toHaveLength(200);
    expect(result.cursor).toBeTruthy(); // exatamente pageSize → cursor para próxima
  });

  it('busca apenas uma página quando fetchAll não é passado (default false)', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(50));

    const result = await getDocsWithPagination('baseQuery');
    expect(result.docs).toHaveLength(50);
    expect(result.cursor).toBeNull();
  });

  it('busca todos os docs quando fetchAll=true explicitamente', async () => {
    // Simula 2 páginas: 200 docs + 50 docs
    getDocs
      .mockResolvedValueOnce(mockSnapshot(200, 0))
      .mockResolvedValueOnce(mockSnapshot(50, 200));

    const result = await getDocsWithPagination('baseQuery', { fetchAll: true });
    expect(result.docs).toHaveLength(250);
    expect(result.cursor).toBeNull();
  });

  it('lida com página vazia (0 docs)', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(0));

    const result = await getDocsWithPagination('baseQuery');
    expect(result.docs).toHaveLength(0);
    expect(result.cursor).toBeNull();
  });

  it('respeita pageSize customizado', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(10));

    await getDocsWithPagination('baseQuery', {
      fetchAll: false,
      pageSize: 10
    });

    // Verifica que limit(10) foi chamado na query
    const { limit: limitFn } = await import('firebase/firestore');
    expect(limitFn).toHaveBeenCalledWith(10);
  });

  it('trata pageSize inválido com default', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(5));

    await getDocsWithPagination('baseQuery', {
      fetchAll: false,
      pageSize: 'abc'
    });

    const { limit: limitFn } = await import('firebase/firestore');
    expect(limitFn).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);
  });

  it('trata pageSize negativo com default', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(5));

    await getDocsWithPagination('baseQuery', {
      fetchAll: false,
      pageSize: -5
    });

    const { limit: limitFn } = await import('firebase/firestore');
    expect(limitFn).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);
  });

  it('usa cursor inicial quando fornecido (fetchAll=false)', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot(10));

    const cursor = { id: 'prev_doc' };
    await getDocsWithPagination('baseQuery', {
      fetchAll: false,
      cursor
    });

    const { startAfter: startAfterFn } = await import('firebase/firestore');
    expect(startAfterFn).toHaveBeenCalledWith(cursor);
  });

  it('fetchAll=true com exatamente 1 página não faz segunda chamada', async () => {
    // Retorna menos que pageSize, então para
    getDocs.mockResolvedValueOnce(mockSnapshot(100));

    const result = await getDocsWithPagination('baseQuery', {
      fetchAll: true,
      pageSize: 200
    });
    expect(result.docs).toHaveLength(100);
    expect(getDocs).toHaveBeenCalledTimes(1);
  });
});
