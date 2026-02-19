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
