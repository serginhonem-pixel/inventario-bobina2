import { getDocs, limit, query, startAfter } from 'firebase/firestore';

export const DEFAULT_PAGE_SIZE = 200;

const resolvePageSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.floor(parsed);
};

export const getDocsWithPagination = async (baseQuery, options = {}) => {
  const pageSize = resolvePageSize(options.pageSize);
  // fetchAll=false é o padrão seguro. Passe { fetchAll: true } explicitamente
  // apenas quando precisar de TODOS os documentos (ex.: inventário, relatórios).
  const fetchAll = options.fetchAll === true;
  const initialCursor = options.cursor || null;

  if (!fetchAll) {
    const q = query(
      baseQuery,
      ...(initialCursor ? [startAfter(initialCursor)] : []),
      limit(pageSize)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    const nextCursor = docs.length === pageSize ? docs[docs.length - 1] : null;
    return { docs, cursor: nextCursor };
  }

  const allDocs = [];
  let cursor = initialCursor;

  while (true) {
    const q = query(
      baseQuery,
      ...(cursor ? [startAfter(cursor)] : []),
      limit(pageSize)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    allDocs.push(...docs);
    if (docs.length < pageSize) {
      return { docs: allDocs, cursor: null };
    }
    cursor = docs[docs.length - 1];
  }
};
