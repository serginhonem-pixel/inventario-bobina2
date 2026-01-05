export const normalizeText = (value) => {
  if (!value) return "";
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/,/g, ".")
    .toLowerCase()
    .trim();
};

const extractFamily = (description) => {
  const text = normalizeText(description);
  if (text.includes("perfil us")) return "US";
  if (text.includes("perfil ue")) return "UE";
  if (text.includes("perfil u bandeja")) return "U BANDEJA";
  if (text.includes("perfil u porta")) return "U PORTA";
  if (text.includes("perfil u")) return "U";
  if (text.includes("chapa")) return "CHAPA";
  return "OUTROS";
};

const extractDimensions = (description) => {
  const text = normalizeText(description);
  const match = text.match(/(\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)+)/);
  if (!match) return null;

  const parts = match[1]
    .split("x")
    .map((part) => parseFloat(part))
    .filter((part) => !Number.isNaN(part));

  if (!parts.length) return null;

  return {
    dimensions: parts,
    thickness: parts[parts.length - 1],
  };
};

const indexTokens = (tokenIndex, text, itemIndex) => {
  const tokens = new Set(text.split(/[^a-z0-9.]+/).filter(Boolean));
  tokens.forEach((token) => {
    if (!tokenIndex.has(token)) {
      tokenIndex.set(token, []);
    }
    tokenIndex.get(token).push(itemIndex);
  });
};

const intersectIndexes = (lists) => {
  if (!lists.length) return [];
  const ordered = [...lists].sort((a, b) => a.length - b.length);
  let working = new Set(ordered[0]);
  for (let i = 1; i < ordered.length; i += 1) {
    const next = new Set(ordered[i]);
    working = new Set([...working].filter((idx) => next.has(idx)));
    if (!working.size) break;
  }
  return [...working];
};

export const buildCatalogModel = (catalog, catalogName) => {
  const byId = new Map();
  const duplicates = new Set();
  const tokenIndex = new Map();

  const items = catalog.map((item, index) => {
    if (byId.has(item.id)) duplicates.add(item.id);
    byId.set(item.id, index);

    const searchText = normalizeText(`${item.id} ${item.description}`);
    const family = extractFamily(item.description);
    const dims = extractDimensions(item.description);

    indexTokens(tokenIndex, searchText, index);

    return {
      ...item,
      family,
      searchText,
      dimensions: dims?.dimensions ?? null,
      thickness: dims?.thickness ?? null,
    };
  });

  if (duplicates.size) {
    console.warn(
      `[catalog] Duplicated ids in ${catalogName || "catalog"}:`,
      [...duplicates]
    );
  }

  const families = [...new Set(items.map((item) => item.family))].sort();

  return {
    items,
    byId,
    tokenIndex,
    families,
  };
};

export const searchCatalog = (model, searchTerm, familyFilter) => {
  if (!model) return [];

  const normalized = normalizeText(searchTerm);
  const baseItems =
    familyFilter && familyFilter !== "ALL"
      ? model.items.filter((item) => item.family === familyFilter)
      : model.items;

  if (!normalized) return baseItems;

  const tokens = normalized.split(/[^a-z0-9.]+/).filter(Boolean);
  const indexedLists = tokens
    .map((token) => model.tokenIndex.get(token))
    .filter(Boolean);

  if (tokens.length && indexedLists.length !== tokens.length) {
    return baseItems.filter((item) => item.searchText.includes(normalized));
  }

  if (!indexedLists.length) {
    return baseItems.filter((item) => item.searchText.includes(normalized));
  }

  const indexes = intersectIndexes(indexedLists);
  if (!indexes.length) return [];

  let results = indexes
    .map((idx) => model.items[idx])
    .filter((item) => item && item.searchText.includes(normalized));

  if (familyFilter && familyFilter !== "ALL") {
    results = results.filter((item) => item.family === familyFilter);
  }

  return results;
};
