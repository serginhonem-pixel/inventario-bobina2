// ── Constantes de campos de quantidade ──────────────────────────────
export const QTY_FIELDS = ['quantidade', 'qtd', 'estoque', 'quantidade_atual', 'saldo'];

// ── Resolver quantidade de um item ──────────────────────────────────
// Busca o primeiro campo de quantidade existente no item.data e retorna
// seu valor numérico. Se nenhum for encontrado, assume "quantidade" e retorna 0.
export const resolveItemQty = (item) => {
  const data = item?.data || {};
  const existingField = QTY_FIELDS.find(
    (field) => data[field] !== undefined && data[field] !== null
  );
  const targetField = existingField || 'quantidade';
  const raw = data[targetField];
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ── Encontrar o campo de quantidade de um item ──────────────────────
// Retorna o nome do campo de quantidade existente (ou 'quantidade' como padrão).
export const resolveQtyField = (itemData) => {
  const data = itemData || {};
  const existingField = QTY_FIELDS.find(
    (field) => data[field] !== undefined && data[field] !== null
  );
  return existingField || 'quantidade';
};

// ── Atualizar a quantidade em item.data ─────────────────────────────
// Retorna uma cópia de data com o campo de quantidade atualizado.
export const setItemQty = (itemData, newQty) => {
  const data = { ...(itemData || {}) };
  const targetField = resolveQtyField(data);
  data[targetField] = newQty;
  return data;
};

// ── Converter Firestore Timestamp para milissegundos ────────────────
export const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
};

// ── Converter valor para número seguro ──────────────────────────────
export const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

// ── Normalizar texto (remover acentos, lowercase, trim) ────────────
export const normalizeText = (value) => {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/,/g, '.')
    .toLowerCase()
    .trim();
};

// ── Campos de código de item (para agrupar) ─────────────────────────
const CODE_FIELD_KEYS = ['codigo', 'sku', 'cod', 'code'];

export const getItemCode = (item) => {
  const data = item?.data || {};
  return data.codigo || data.sku || data.cod || data.code || data.id || '';
};

// ── Agrupar itens iguais por código e somar quantidades ─────────────
export const groupItems = (items, schema) => {
  if (!items || !schema) return [];

  const codeField = schema.fields?.find(
    (f) => CODE_FIELD_KEYS.includes(f.key || f.name)
  );
  const codeKey = codeField?.key || codeField?.name || 'codigo';

  const grouped = new Map();

  items.forEach((item) => {
    const code = item.data?.[codeKey] || getItemCode(item) || `_item_${item.id}`;

    if (grouped.has(code)) {
      const existing = grouped.get(code);
      schema.fields?.forEach((field) => {
        const fk = field.key || field.name;
        if (QTY_FIELDS.includes(fk)) {
          const existingVal = Number(existing.data[fk]) || 0;
          const newVal = Number(item.data?.[fk]) || 0;
          existing.data[fk] = existingVal + newVal;
        }
      });
      existing._originalIds = existing._originalIds || [existing.id];
      existing._originalIds.push(item.id);
    } else {
      grouped.set(code, {
        ...item,
        data: { ...item.data },
        _originalIds: [item.id]
      });
    }
  });

  return Array.from(grouped.values());
};

// ── Buscar item por ID ou texto em qualquer campo ───────────────────
export const findItemByTerm = (items, term) => {
  if (!items || !term) return undefined;
  return items.find(
    (item) =>
      item.id === term ||
      Object.values(item.data || {}).some((val) =>
        String(val).toLowerCase().includes(term.toLowerCase())
      )
  );
};
