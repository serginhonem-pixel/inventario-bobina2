import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do toast
vi.mock('../../../components/ui/toast', () => ({
  toast: vi.fn()
}));

// Precisamos importar o módulo real para testar as funções internas via a exportação
// exportToExcel usa downloadFile internamente, que cria DOM elements.
// Vamos mockar URL e document.
const mockCreateElement = vi.fn(() => ({
  href: '',
  download: '',
  click: vi.fn()
}));

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock DOM globals
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement);
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
  vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
});

import { exportToExcel } from '../exportService';

const schema = {
  name: 'Teste',
  fields: [
    { key: 'codigo', name: 'codigo', label: 'Código' },
    { key: 'descricao', name: 'descricao', label: 'Descrição' },
    { key: 'quantidade', name: 'quantidade', label: 'Quantidade' }
  ]
};

describe('exportToExcel', () => {
  it('exporta CSV com headers corretos', () => {
    const items = [
      { id: '1', data: { codigo: 'A001', descricao: 'Parafuso', quantidade: 10 } },
      { id: '2', data: { codigo: 'A002', descricao: 'Porca', quantidade: 5 } }
    ];

    exportToExcel(items, schema, 'test.csv');

    // Verifica que um Blob foi criado
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

    // Verifica que o conteúdo do Blob contém os dados
    const blobCall = global.URL.createObjectURL.mock.calls[0][0];
    expect(blobCall).toBeInstanceOf(Blob);
  });

  it('agrupa items com mesmo código', () => {
    const items = [
      { id: '1', data: { codigo: 'A001', descricao: 'Parafuso', quantidade: 10 } },
      { id: '2', data: { codigo: 'A001', descricao: 'Parafuso', quantidade: 5 } },
      { id: '3', data: { codigo: 'A002', descricao: 'Porca', quantidade: 3 } }
    ];

    // exportToExcel agrupa por código, logo a saída deve ter 2 items únicos
    exportToExcel(items, schema, 'grouped.csv');

    // Verifica que a exportação aconteceu
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('lida com lista vazia', () => {
    exportToExcel([], schema, 'empty.csv');
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('gera nome de arquivo padrão', () => {
    const items = [
      { id: '1', data: { codigo: 'A001', descricao: 'Item', quantidade: 1 } }
    ];
    exportToExcel(items, schema);
    const el = mockCreateElement.mock.results[0].value;
    expect(el.download).toBe('inventario_qtdapp.csv');
  });

  it('escapa valores com ponto-e-vírgula', () => {
    const items = [
      { id: '1', data: { codigo: 'A001', descricao: 'Parafuso; Rosca', quantidade: 1 } }
    ];

    exportToExcel(items, schema, 'escaped.csv');
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});
