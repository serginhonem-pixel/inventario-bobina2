import { describe, it, expect } from 'vitest';
import {
  QTY_FIELDS,
  resolveItemQty,
  resolveQtyField,
  setItemQty,
  getTimestampMillis,
  toNumber,
  normalizeText,
  getItemCode,
  groupItems,
  findItemByTerm
} from '../utils';

// ── resolveItemQty ──────────────────────────────────────────────────

describe('resolveItemQty', () => {
  it('retorna 0 para item nulo/undefined', () => {
    expect(resolveItemQty(null)).toBe(0);
    expect(resolveItemQty(undefined)).toBe(0);
    expect(resolveItemQty({})).toBe(0);
  });

  it('retorna 0 quando item.data está vazio', () => {
    expect(resolveItemQty({ data: {} })).toBe(0);
  });

  it('resolve campo "quantidade"', () => {
    expect(resolveItemQty({ data: { quantidade: 10 } })).toBe(10);
  });

  it('resolve campo "qtd"', () => {
    expect(resolveItemQty({ data: { qtd: 5 } })).toBe(5);
  });

  it('resolve campo "estoque"', () => {
    expect(resolveItemQty({ data: { estoque: 42 } })).toBe(42);
  });

  it('resolve campo "quantidade_atual"', () => {
    expect(resolveItemQty({ data: { quantidade_atual: 7 } })).toBe(7);
  });

  it('resolve campo "saldo"', () => {
    expect(resolveItemQty({ data: { saldo: 99 } })).toBe(99);
  });

  it('prioriza o primeiro campo encontrado na ordem QTY_FIELDS', () => {
    // QTY_FIELDS = ['quantidade', 'qtd', 'estoque', ...]
    expect(resolveItemQty({ data: { qtd: 3, estoque: 50 } })).toBe(3);
    expect(resolveItemQty({ data: { quantidade: 1, qtd: 3, estoque: 50 } })).toBe(1);
  });

  it('converte string numérica para número', () => {
    expect(resolveItemQty({ data: { quantidade: '25' } })).toBe(25);
    expect(resolveItemQty({ data: { quantidade: '3.5' } })).toBe(3.5);
  });

  it('retorna 0 para valores não numéricos', () => {
    expect(resolveItemQty({ data: { quantidade: 'abc' } })).toBe(0);
    expect(resolveItemQty({ data: { quantidade: NaN } })).toBe(0);
    expect(resolveItemQty({ data: { quantidade: Infinity } })).toBe(0);
  });

  it('retorna 0 para valor null no campo de quantidade', () => {
    // null faz o campo ser ignorado (find retorna undefined), cai no fallback
    expect(resolveItemQty({ data: { quantidade: null, qtd: 8 } })).toBe(8);
  });
});

// ── resolveQtyField ─────────────────────────────────────────────────

describe('resolveQtyField', () => {
  it('retorna "quantidade" como fallback padrão', () => {
    expect(resolveQtyField({})).toBe('quantidade');
    expect(resolveQtyField(null)).toBe('quantidade');
    expect(resolveQtyField(undefined)).toBe('quantidade');
  });

  it('retorna o primeiro campo QTY existente', () => {
    expect(resolveQtyField({ qtd: 5 })).toBe('qtd');
    expect(resolveQtyField({ estoque: 10, saldo: 3 })).toBe('estoque');
    expect(resolveQtyField({ saldo: 1 })).toBe('saldo');
  });

  it('ignora campos com valor null/undefined', () => {
    expect(resolveQtyField({ quantidade: null, estoque: 10 })).toBe('estoque');
    expect(resolveQtyField({ quantidade: undefined, qtd: 0 })).toBe('qtd');
  });

  it('reconhece valor 0 como campo existente', () => {
    expect(resolveQtyField({ quantidade: 0 })).toBe('quantidade');
  });
});

// ── setItemQty ──────────────────────────────────────────────────────

describe('setItemQty', () => {
  it('cria campo "quantidade" se nenhum campo qty existir', () => {
    const result = setItemQty({}, 10);
    expect(result).toEqual({ quantidade: 10 });
  });

  it('atualiza o campo de quantidade existente', () => {
    const result = setItemQty({ nome: 'Item A', qtd: 5 }, 20);
    expect(result).toEqual({ nome: 'Item A', qtd: 20 });
  });

  it('preserva os outros campos de data', () => {
    const result = setItemQty({ nome: 'Parafuso', codigo: 'P001', quantidade: 10 }, 25);
    expect(result.nome).toBe('Parafuso');
    expect(result.codigo).toBe('P001');
    expect(result.quantidade).toBe(25);
  });

  it('não muta o objeto original', () => {
    const original = { quantidade: 5, nome: 'A' };
    const result = setItemQty(original, 99);
    expect(result.quantidade).toBe(99);
    expect(original.quantidade).toBe(5);
  });

  it('lida com null/undefined de itemData', () => {
    expect(setItemQty(null, 10)).toEqual({ quantidade: 10 });
    expect(setItemQty(undefined, 10)).toEqual({ quantidade: 10 });
  });
});

// ── getTimestampMillis ──────────────────────────────────────────────

describe('getTimestampMillis', () => {
  it('retorna 0 para valor falsy', () => {
    expect(getTimestampMillis(null)).toBe(0);
    expect(getTimestampMillis(undefined)).toBe(0);
    expect(getTimestampMillis(0)).toBe(0);
  });

  it('converte objeto com toMillis()', () => {
    const ts = { toMillis: () => 1700000000000 };
    expect(getTimestampMillis(ts)).toBe(1700000000000);
  });

  it('converte objeto com toDate()', () => {
    const date = new Date(1700000000000);
    const ts = { toDate: () => date };
    expect(getTimestampMillis(ts)).toBe(1700000000000);
  });

  it('converte Date nativo', () => {
    const date = new Date(1700000000000);
    expect(getTimestampMillis(date)).toBe(1700000000000);
  });

  it('retorna número diretamente', () => {
    expect(getTimestampMillis(1700000000000)).toBe(1700000000000);
  });

  it('retorna 0 para tipos não suportados', () => {
    expect(getTimestampMillis('invalid')).toBe(0);
    expect(getTimestampMillis({})).toBe(0);
  });
});

// ── toNumber ────────────────────────────────────────────────────────

describe('toNumber', () => {
  it('converte string numérica', () => {
    expect(toNumber('42')).toBe(42);
    expect(toNumber('3.14')).toBe(3.14);
    expect(toNumber('-7')).toBe(-7);
  });

  it('retorna 0 para null, undefined, string vazia', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('')).toBe(0);
  });

  it('retorna 0 para NaN', () => {
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(NaN)).toBe(0);
  });

  it('retorna o próprio número para números válidos', () => {
    expect(toNumber(0)).toBe(0);
    expect(toNumber(100)).toBe(100);
    expect(toNumber(-5.5)).toBe(-5.5);
  });

  it('converte boolean para número', () => {
    expect(toNumber(true)).toBe(1);
    expect(toNumber(false)).toBe(0);
  });
});

// ── QTY_FIELDS ──────────────────────────────────────────────────────

describe('QTY_FIELDS', () => {
  it('contém os campos esperados', () => {
    expect(QTY_FIELDS).toContain('quantidade');
    expect(QTY_FIELDS).toContain('qtd');
    expect(QTY_FIELDS).toContain('estoque');
    expect(QTY_FIELDS).toContain('quantidade_atual');
    expect(QTY_FIELDS).toContain('saldo');
  });

  it('quantidade é o primeiro campo (maior prioridade)', () => {
    expect(QTY_FIELDS[0]).toBe('quantidade');
  });
});

// ── normalizeText ───────────────────────────────────────────────────

describe('normalizeText', () => {
  it('retorna string vazia para valores falsy', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
  });

  it('converte para lowercase e remove acentos', () => {
    expect(normalizeText('AÇÃO')).toBe('acao');
    expect(normalizeText('Café')).toBe('cafe');
  });

  it('substitui vírgula por ponto', () => {
    expect(normalizeText('3,5')).toBe('3.5');
  });

  it('faz trim', () => {
    expect(normalizeText('  abc  ')).toBe('abc');
  });
});

// ── getItemCode ─────────────────────────────────────────────────────

describe('getItemCode', () => {
  it('retorna código do campo mais comum', () => {
    expect(getItemCode({ data: { codigo: 'A01' } })).toBe('A01');
    expect(getItemCode({ data: { sku: 'SKU1' } })).toBe('SKU1');
    expect(getItemCode({ data: { cod: 'C01' } })).toBe('C01');
    expect(getItemCode({ data: { code: 'X99' } })).toBe('X99');
  });

  it('retorna string vazia para item sem código', () => {
    expect(getItemCode({ data: {} })).toBe('');
    expect(getItemCode(null)).toBe('');
  });
});

// ── groupItems ──────────────────────────────────────────────────────

describe('groupItems', () => {
  const schema = {
    fields: [
      { key: 'codigo', name: 'codigo', label: 'Código' },
      { key: 'descricao', name: 'descricao', label: 'Descrição' },
      { key: 'quantidade', name: 'quantidade', label: 'Quantidade' }
    ]
  };

  it('retorna [] para inputs nulos', () => {
    expect(groupItems(null, schema)).toEqual([]);
    expect(groupItems([], null)).toEqual([]);
  });

  it('agrupa itens com mesmo código e soma quantidades', () => {
    const items = [
      { id: '1', data: { codigo: 'A01', descricao: 'Parafuso', quantidade: 10 } },
      { id: '2', data: { codigo: 'A01', descricao: 'Parafuso', quantidade: 5 } },
      { id: '3', data: { codigo: 'A02', descricao: 'Porca', quantidade: 3 } }
    ];
    const result = groupItems(items, schema);
    expect(result).toHaveLength(2);
    const parafuso = result.find(r => r.data.codigo === 'A01');
    expect(parafuso.data.quantidade).toBe(15);
  });

  it('mantém _originalIds para itens agrupados', () => {
    const items = [
      { id: '1', data: { codigo: 'A01', quantidade: 10 } },
      { id: '2', data: { codigo: 'A01', quantidade: 5 } }
    ];
    const result = groupItems(items, schema);
    expect(result[0]._originalIds).toContain('1');
    expect(result[0]._originalIds).toContain('2');
  });

  it('não muta os itens originais', () => {
    const items = [
      { id: '1', data: { codigo: 'A01', quantidade: 10 } }
    ];
    const result = groupItems(items, schema);
    result[0].data.quantidade = 999;
    expect(items[0].data.quantidade).toBe(10);
  });
});

// ── findItemByTerm ──────────────────────────────────────────────────

describe('findItemByTerm', () => {
  const items = [
    { id: 'item_1', data: { codigo: 'A01', descricao: 'Parafuso M10' } },
    { id: 'item_2', data: { codigo: 'B02', descricao: 'Porca Sextavada' } }
  ];

  it('encontra por ID exato', () => {
    expect(findItemByTerm(items, 'item_1')).toBe(items[0]);
  });

  it('encontra por texto parcial em qualquer campo', () => {
    expect(findItemByTerm(items, 'Parafuso')).toBe(items[0]);
    expect(findItemByTerm(items, 'sextavada')).toBe(items[1]); // case-insensitive
  });

  it('encontra por código', () => {
    expect(findItemByTerm(items, 'B02')).toBe(items[1]);
  });

  it('retorna undefined quando não encontra', () => {
    expect(findItemByTerm(items, 'xyz')).toBeUndefined();
  });

  it('retorna undefined para inputs nulos', () => {
    expect(findItemByTerm(null, 'test')).toBeUndefined();
    expect(findItemByTerm(items, null)).toBeUndefined();
    expect(findItemByTerm(items, '')).toBeUndefined();
  });
});
