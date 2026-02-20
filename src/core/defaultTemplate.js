/**
 * Template de etiqueta padrão do QtdApp.
 *
 * Layout 100 × 50 mm:
 *  ┌──────────────────────────────────────────────┐
 *  │  [LOGO]   SKU: 000123         ┌─────┐       │
 *  │           Desc: Produto        │ QR  │       │
 *  │           Qtd: 10             └─────┘       │
 *  └──────────────────────────────────────────────┘
 *
 * Usa fieldKeys genéricos que são resolvidos via `detectSchemaFields(schema)`
 * para os fieldKeys reais do schema do usuário.
 */

import { normalizeText } from './utils';

// ── Detecção inteligente de campo ──────────────────────────────────
const CODE_TOKENS = ['codigo', 'cod', 'sku', 'code', 'barcode'];
const DESC_TOKENS = ['descricao', 'desc', 'nome', 'name', 'produto', 'item', 'material', 'description'];
const QTY_TOKENS  = ['quantidade', 'qtd', 'qtde', 'qty', 'estoque', 'saldo'];

const matchField = (fields, tokens) => {
  const found = fields.find((f) => {
    const k = normalizeText(f.key);
    const l = normalizeText(f.label);
    return tokens.some((t) => k.includes(t) || l.includes(t));
  });
  return found || null;
};

/**
 * Dado um schema, retorna { codeField, descField, qtyField } com os
 * campos reais (ou null se não encontrado).
 */
export const detectSchemaFields = (schema) => {
  const fields = schema?.fields || [];
  return {
    codeField: matchField(fields, CODE_TOKENS),
    descField: matchField(fields, DESC_TOKENS),
    qtyField:  matchField(fields, QTY_TOKENS),
  };
};

/**
 * Gera os elements[] do template padrão, já mapeados para os fieldKeys
 * reais do schema fornecido.
 *
 * @param {Object} schema - O schema do usuário (com .fields e .sampleData)
 * @returns {{ name, size, elements, logistics }}
 */
export const buildDefaultTemplate = (schema) => {
  const { codeField, descField, qtyField } = detectSchemaFields(schema);
  const sample = schema?.sampleData || {};

  // Campo usado pelo QR Code (usa o campo de código, ou o primeiro campo do schema)
  const qrField = codeField || (schema?.fields?.[0] || null);
  const qrFieldKey = qrField?.key || null;
  const qrMode = qrFieldKey ? 'field' : 'item';

  const elements = [
    // ── Logo escura (canto superior esquerdo) ──
    {
      id: 'el_logo',
      type: 'image',
      fieldKey: null,
      label: 'Logo',
      previewValue: 'Logo',
      url: '/logoescura.png',
      showLabel: false,
      x: 2,
      y: 2,
      width: 20,
      height: 14,
      fontSize: 8,
      titleFontSize: 8,
      bold: false,
      align: 'center',
      rotation: 0,
      border: false,
      lineHeight: 1.2,
      wrap: false,
      fontFamily: 'Arial',
      titlePosition: 'inline',
      vAlign: 'middle',
      backgroundColor: 'transparent',
    },
    // ── Código (ao lado da logo) ──
    {
      id: 'el_code',
      type: 'text',
      fieldKey: codeField?.key || 'codigo',
      label: codeField?.label || 'SKU',
      previewValue: codeField ? (sample[codeField.key] || '000123') : '000123',
      showLabel: true,
      x: 24,
      y: 2,
      width: 48,
      height: 14,
      fontSize: 14,
      titleFontSize: 9,
      bold: true,
      align: 'left',
      rotation: 0,
      border: false,
      lineHeight: 1.2,
      wrap: false,
      fontFamily: 'Arial',
      titlePosition: 'inline',
      vAlign: 'middle',
      backgroundColor: 'transparent',
    },
    // ── QR Code (canto superior direito) ──
    {
      id: 'el_qr',
      type: 'qr',
      fieldKey: qrMode === 'item' ? '__item__' : qrFieldKey,
      qrMode,
      qrFieldKey,
      label: 'QR Code',
      previewValue: qrField ? (sample[qrField.key] || '000123') : '000123',
      qrDataUrl: null,
      showLabel: false,
      x: 76,
      y: 1,
      width: 22,
      height: 22,
      fontSize: 8,
      titleFontSize: 8,
      bold: false,
      align: 'center',
      rotation: 0,
      border: false,
      lineHeight: 1.2,
      wrap: false,
      fontFamily: 'Arial',
      titlePosition: 'inline',
      vAlign: 'middle',
      backgroundColor: 'transparent',
    },
    // ── Descrição ──
    {
      id: 'el_desc',
      type: 'text',
      fieldKey: descField?.key || 'descricao',
      label: descField?.label || 'Descrição',
      previewValue: descField ? (sample[descField.key] || 'Produto Padrão') : 'Produto Padrão',
      showLabel: true,
      x: 2,
      y: 18,
      width: 72,
      height: 16,
      fontSize: 11,
      titleFontSize: 8,
      bold: false,
      align: 'left',
      rotation: 0,
      border: false,
      lineHeight: 1.3,
      wrap: true,
      fontFamily: 'Arial',
      titlePosition: 'inline',
      vAlign: 'middle',
      backgroundColor: 'transparent',
    },
    // ── Quantidade ──
    {
      id: 'el_qty',
      type: 'text',
      fieldKey: qtyField?.key || 'quantidade',
      label: qtyField?.label || 'Qtd',
      previewValue: qtyField ? (sample[qtyField.key] || '10') : '10',
      showLabel: true,
      x: 2,
      y: 36,
      width: 50,
      height: 12,
      fontSize: 12,
      titleFontSize: 8,
      bold: true,
      align: 'left',
      rotation: 0,
      border: false,
      lineHeight: 1.2,
      wrap: false,
      fontFamily: 'Arial',
      titlePosition: 'inline',
      vAlign: 'middle',
      backgroundColor: 'transparent',
    },
  ];

  return {
    name: 'Etiqueta Padrão QtdApp',
    size: { width: 100, height: 50 },
    padding: 0,
    elements,
    logistics: { street: '', shelf: '', level: '' },
  };
};
