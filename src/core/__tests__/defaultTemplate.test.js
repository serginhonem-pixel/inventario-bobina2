import { describe, it, expect } from 'vitest';
import { buildDefaultTemplate, detectSchemaFields } from '../defaultTemplate';

const sampleSchema = {
  fields: [
    { key: 'codigo', label: 'Código', type: 'text' },
    { key: 'descricao', label: 'Descrição', type: 'text' },
    { key: 'quantidade', label: 'Qtd', type: 'number' },
    { key: 'data', label: 'Data', type: 'date' },
  ],
  sampleData: {
    codigo: '000123',
    descricao: 'Produto Padrão',
    quantidade: 10,
    data: '2025-01-01',
  },
};

describe('detectSchemaFields', () => {
  it('detects code, description and qty fields', () => {
    const { codeField, descField, qtyField } = detectSchemaFields(sampleSchema);
    expect(codeField.key).toBe('codigo');
    expect(descField.key).toBe('descricao');
    expect(qtyField.key).toBe('quantidade');
  });

  it('matches SKU as code field', () => {
    const schema = {
      fields: [{ key: 'sku', label: 'SKU', type: 'text' }],
    };
    const { codeField } = detectSchemaFields(schema);
    expect(codeField.key).toBe('sku');
  });

  it('matches nome as description field', () => {
    const schema = {
      fields: [{ key: 'nome', label: 'Nome do Produto', type: 'text' }],
    };
    const { descField } = detectSchemaFields(schema);
    expect(descField.key).toBe('nome');
  });

  it('matches estoque as qty field', () => {
    const schema = {
      fields: [{ key: 'estoque', label: 'Estoque', type: 'number' }],
    };
    const { qtyField } = detectSchemaFields(schema);
    expect(qtyField.key).toBe('estoque');
  });

  it('returns null for unmatched fields', () => {
    const schema = { fields: [{ key: 'cor', label: 'Cor', type: 'text' }] };
    const { codeField, descField, qtyField } = detectSchemaFields(schema);
    expect(codeField).toBeNull();
    expect(descField).toBeNull();
    expect(qtyField).toBeNull();
  });

  it('handles empty/undefined schema', () => {
    expect(detectSchemaFields(null).codeField).toBeNull();
    expect(detectSchemaFields({}).codeField).toBeNull();
  });
});

describe('buildDefaultTemplate', () => {
  it('returns a template with name, size, elements and logistics', () => {
    const tpl = buildDefaultTemplate(sampleSchema);
    expect(tpl.name).toBe('Etiqueta Padrão QtdApp');
    expect(tpl.size).toEqual({ width: 100, height: 50 });
    expect(tpl.elements).toHaveLength(5);
    expect(tpl.logistics).toBeDefined();
  });

  it('contains logo element with /logoescura.png', () => {
    const tpl = buildDefaultTemplate(sampleSchema);
    const logo = tpl.elements.find((el) => el.type === 'image');
    expect(logo).toBeDefined();
    expect(logo.url).toBe('/logoescura.png');
    expect(logo.label).toBe('Logo');
  });

  it('contains QR code element linked to code field', () => {
    const tpl = buildDefaultTemplate(sampleSchema);
    const qr = tpl.elements.find((el) => el.type === 'qr');
    expect(qr).toBeDefined();
    expect(qr.id).toBe('el_qr');
    expect(qr.qrFieldKey).toBe('codigo');
    expect(qr.qrMode).toBe('field');
    expect(qr.showLabel).toBe(false);
  });

  it('maps code field from schema', () => {
    const tpl = buildDefaultTemplate(sampleSchema);
    const code = tpl.elements.find((el) => el.id === 'el_code');
    expect(code.fieldKey).toBe('codigo');
    expect(code.label).toBe('Código');
    expect(code.previewValue).toBe('000123');
    expect(code.bold).toBe(true);
  });

  it('maps description field from schema', () => {
    const tpl = buildDefaultTemplate(sampleSchema);
    const desc = tpl.elements.find((el) => el.id === 'el_desc');
    expect(desc.fieldKey).toBe('descricao');
    expect(desc.previewValue).toBe('Produto Padrão');
    expect(desc.wrap).toBe(true);
  });

  it('maps qty field from schema', () => {
    const tpl = buildDefaultTemplate(sampleSchema);
    const qty = tpl.elements.find((el) => el.id === 'el_qty');
    expect(qty.fieldKey).toBe('quantidade');
    expect(qty.bold).toBe(true);
  });

  it('QR code falls back to first field when no code field found', () => {
    const schema = {
      fields: [{ key: 'cor', label: 'Cor', type: 'text' }],
      sampleData: { cor: 'Azul' },
    };
    const tpl = buildDefaultTemplate(schema);
    const qr = tpl.elements.find((el) => el.type === 'qr');
    expect(qr.qrFieldKey).toBe('cor');
    expect(qr.qrMode).toBe('field');
  });

  it('uses fallback keys when schema has no matching fields', () => {
    const schema = {
      fields: [{ key: 'cor', label: 'Cor', type: 'text' }],
      sampleData: { cor: 'Azul' },
    };
    const tpl = buildDefaultTemplate(schema);
    const code = tpl.elements.find((el) => el.id === 'el_code');
    expect(code.fieldKey).toBe('codigo');
    expect(code.previewValue).toBe('000123');
  });

  it('all elements fit within 100x50mm', () => {
    const tpl = buildDefaultTemplate(sampleSchema);
    for (const el of tpl.elements) {
      expect(el.x + el.width).toBeLessThanOrEqual(100);
      expect(el.y + el.height).toBeLessThanOrEqual(50);
    }
  });

  it('adapts to a custom schema with different field names', () => {
    const custom = {
      fields: [
        { key: 'sku', label: 'SKU', type: 'text' },
        { key: 'nome', label: 'Nome', type: 'text' },
        { key: 'qtde', label: 'Qtde', type: 'number' },
      ],
      sampleData: { sku: 'ABC-789', nome: 'Granito Preto', qtde: 50 },
    };
    const tpl = buildDefaultTemplate(custom);
    const code = tpl.elements.find((el) => el.id === 'el_code');
    const desc = tpl.elements.find((el) => el.id === 'el_desc');
    const qty = tpl.elements.find((el) => el.id === 'el_qty');
    expect(code.fieldKey).toBe('sku');
    expect(code.previewValue).toBe('ABC-789');
    expect(desc.fieldKey).toBe('nome');
    expect(desc.previewValue).toBe('Granito Preto');
    expect(qty.fieldKey).toBe('qtde');
    expect(qty.previewValue).toBe(50);
  });
});
