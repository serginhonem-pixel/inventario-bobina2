import * as stockPointService from './stockPointService';
import * as schemaService from './schemaService';
import * as templateService from './templateService';
import { buildDefaultTemplate } from '../../core/defaultTemplate';
import { getDefaultTemplate } from './defaultTemplateService';

/**
 * Schema padrão para novos usuários.
 * Campos: Código, Descrição, Quantidade
 */
const DEFAULT_SCHEMA_FIELDS = [
  { key: 'codigo', label: 'Código', type: 'text', required: true },
  { key: 'descricao', label: 'Descrição', type: 'text', required: false },
  { key: 'quantidade', label: 'Qtd', type: 'number', required: false },
];

const DEFAULT_SAMPLE_DATA = {
  codigo: '000123',
  descricao: 'Produto Padrão',
  quantidade: 10,
};

/**
 * Garante que um ponto de estocagem tenha schema e template.
 * Se o ponto não tiver schema, cria o padrão (Código, Descrição, Qtd).
 * Se o schema não tiver template, cria a etiqueta padrão.
 *
 * @param {string} tenantId
 * @param {{ id: string, name?: string }} point - ponto de estocagem
 * @returns {{ schema, template } | null}
 */
export const provisionForPoint = async (tenantId, point) => {
  if (!tenantId || !point?.id) return null;

  try {
    // Schema
    let schema = await schemaService.getSchemaByStockPoint(tenantId, point.id);
    if (!schema) {
      schema = await schemaService.saveSchema(tenantId, {
        name: `Itens - ${point.name || 'Estoque'}`,
        fields: DEFAULT_SCHEMA_FIELDS,
        sampleData: DEFAULT_SAMPLE_DATA,
      }, point.id);
    }

    // Template
    const existing = await templateService.getTemplatesBySchema(tenantId, schema.id);
    const hasTemplate = existing.some((t) => (t.elements || []).length > 0);

    let template = hasTemplate ? existing[0] : null;
    if (!template) {
      let def;
      try {
        const g = await getDefaultTemplate('default');
        if (g && (g.elements || []).length > 0) {
          def = { name: g.name, size: g.size, elements: g.elements, logistics: g.logistics };
        }
      } catch { /* sem global default */ }

      if (!def) def = buildDefaultTemplate(schema);
      template = await templateService.saveTemplate(tenantId, schema.id, schema.version || 1, def);
    }

    return { schema, template };
  } catch (error) {
    console.error('[provisionForPoint] Erro:', error);
    return null;
  }
};

/**
 * Provisiona recursos padrão para uma organização.
 * 1. Garante que exista ao menos um ponto ("Estoque Principal")
 * 2. Garante schema + template para esse ponto
 *
 * Roda a cada login — só cria o que estiver faltando.
 */
export const provisionDefaults = async (tenantId) => {
  if (!tenantId) return null;

  try {
    // Garante ao menos um ponto
    let points = await stockPointService.getStockPointsByTenant(tenantId);
    let point = points[0] || null;
    if (!point) {
      point = await stockPointService.createStockPoint(tenantId, 'Estoque Principal');
    }

    // Garante schema + template para o ponto
    const result = await provisionForPoint(tenantId, point);
    return result ? { point, ...result } : { point };
  } catch (error) {
    console.error('[provisionDefaults] Erro:', error);
    return null;
  }
};
