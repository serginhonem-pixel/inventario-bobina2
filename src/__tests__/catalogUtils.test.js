import { describe, it, expect } from 'vitest';
import { normalizeText, buildCatalogModel, searchCatalog } from '../catalogUtils';

// ── normalizeText ───────────────────────────────────────────────────

describe('normalizeText', () => {
  it('retorna string vazia para valores falsy', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
    expect(normalizeText(0)).toBe('');
  });

  it('converte para lowercase', () => {
    expect(normalizeText('HELLO')).toBe('hello');
    expect(normalizeText('TeStE')).toBe('teste');
  });

  it('remove acentos/diacríticos', () => {
    expect(normalizeText('café')).toBe('cafe');
    expect(normalizeText('ação')).toBe('acao');
    expect(normalizeText('Ângulo')).toBe('angulo');
    expect(normalizeText('perímetro')).toBe('perimetro');
  });

  it('substitui vírgula por ponto', () => {
    expect(normalizeText('3,5')).toBe('3.5');
    expect(normalizeText('100,00')).toBe('100.00');
  });

  it('faz trim de espaços', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('converte número para string normalizada', () => {
    expect(normalizeText(42)).toBe('42');
    expect(normalizeText(3.14)).toBe('3.14');
  });
});

// ── buildCatalogModel ───────────────────────────────────────────────

describe('buildCatalogModel', () => {
  const sampleCatalog = [
    { id: '001', description: 'Perfil US 10x20x1.5' },
    { id: '002', description: 'Perfil UE 20x30x2.0' },
    { id: '003', description: 'Chapa 100x200x3.0' },
    { id: '004', description: 'Parafuso M10' }
  ];

  it('retorna objeto com items, byId, tokenIndex e families', () => {
    const model = buildCatalogModel(sampleCatalog, 'test');
    expect(model).toHaveProperty('items');
    expect(model).toHaveProperty('byId');
    expect(model).toHaveProperty('tokenIndex');
    expect(model).toHaveProperty('families');
    expect(model.items).toHaveLength(4);
  });

  it('mapeia ids para indexes no byId', () => {
    const model = buildCatalogModel(sampleCatalog, 'test');
    expect(model.byId.get('001')).toBe(0);
    expect(model.byId.get('003')).toBe(2);
  });

  it('classifica famílias corretamente', () => {
    const model = buildCatalogModel(sampleCatalog, 'test');
    expect(model.families).toContain('US');
    expect(model.families).toContain('UE');
    expect(model.families).toContain('CHAPA');
    expect(model.families).toContain('OUTROS');
  });

  it('extrai dimensões corretamente', () => {
    const model = buildCatalogModel(sampleCatalog, 'test');
    const perfilUS = model.items[0];
    expect(perfilUS.dimensions).toEqual([10, 20, 1.5]);
    expect(perfilUS.thickness).toBe(1.5);
  });

  it('item sem dimensões tem null', () => {
    const model = buildCatalogModel(sampleCatalog, 'test');
    const parafuso = model.items[3];
    expect(parafuso.dimensions).toBeNull();
    expect(parafuso.thickness).toBeNull();
  });

  it('indexa tokens para busca rápida', () => {
    const model = buildCatalogModel(sampleCatalog, 'test');
    expect(model.tokenIndex.has('perfil')).toBe(true);
    // "perfil" aparece no item 0 e 1
    expect(model.tokenIndex.get('perfil')).toContain(0);
    expect(model.tokenIndex.get('perfil')).toContain(1);
  });

  it('lida com catálogo vazio', () => {
    const model = buildCatalogModel([], 'empty');
    expect(model.items).toHaveLength(0);
    expect(model.families).toHaveLength(0);
  });

  it('detecta IDs duplicados sem quebrar', () => {
    const dupes = [
      { id: '001', description: 'A' },
      { id: '001', description: 'B' }
    ];
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const model = buildCatalogModel(dupes, 'dupes');
    expect(model.items).toHaveLength(2);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── searchCatalog ───────────────────────────────────────────────────

describe('searchCatalog', () => {
  const catalog = [
    { id: '001', description: 'Perfil US 10x20x1.5' },
    { id: '002', description: 'Perfil UE 20x30x2.0' },
    { id: '003', description: 'Chapa 100x200x3.0' },
    { id: '004', description: 'Parafuso M10' }
  ];

  let model;

  beforeAll(() => {
    model = buildCatalogModel(catalog, 'test');
  });

  it('retorna todos os itens quando searchTerm é vazio', () => {
    const results = searchCatalog(model, '', null);
    expect(results).toHaveLength(4);
  });

  it('retorna vazio para model null', () => {
    expect(searchCatalog(null, 'teste')).toEqual([]);
  });

  it('filtra por termo de busca', () => {
    const results = searchCatalog(model, 'perfil', null);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.family === 'US' || r.family === 'UE')).toBe(true);
  });

  it('filtra por família', () => {
    const results = searchCatalog(model, '', 'CHAPA');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('003');
  });

  it('combina busca de texto + filtro de família', () => {
    const results = searchCatalog(model, 'perfil', 'US');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('001');
  });

  it('busca com acento funciona (normalizada)', () => {
    // "parafuso" -> buscando com "parafúso"
    const results = searchCatalog(model, 'parafuso', null);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('004');
  });

  it('família "ALL" retorna todos', () => {
    const results = searchCatalog(model, '', 'ALL');
    expect(results).toHaveLength(4);
  });

  it('busca por ID funciona', () => {
    const results = searchCatalog(model, '003', null);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('003');
  });

  it('busca por múltiplos tokens (interseção)', () => {
    const results = searchCatalog(model, 'perfil us', null);
    expect(results).toHaveLength(1);
    expect(results[0].family).toBe('US');
  });

  it('retorna vazio quando nenhum resultado encontrado', () => {
    const results = searchCatalog(model, 'xyz123inexistente', null);
    expect(results).toHaveLength(0);
  });
});
