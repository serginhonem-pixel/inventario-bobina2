import * as XLSX from 'xlsx';

/**
 * Normaliza uma string para ser usada como chave (slug)
 * Ex: "Descrição do Item" -> "descricao_do_item"
 */
export const slugify = (text) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')           // Substitui espaços por _
    .replace(/[^\w-]+/g, '')         // Remove caracteres não-alfanuméricos
    .replace(/--+/g, '_');           // Evita múltiplos underscores
};

/**
 * Infere o tipo de dado baseado em um valor de amostra
 */
const inferType = (value) => {
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (typeof value === 'boolean') return 'boolean';
  
  // Checagem de string que pode ser data
  if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-')) {
    return 'date';
  }
  
  return 'text';
};

/**
 * Lê um arquivo Excel/CSV e retorna uma sugestão de Schema
 */
export const parseFileToSchema = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converte para JSON (array de objetos)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        if (jsonData.length === 0) {
          throw new Error("A planilha está vazia.");
        }

        const headers = Object.keys(jsonData[0]);
        const schemaFields = headers.map(header => {
          // Busca o primeiro valor não nulo para inferir o tipo
          const sampleRow = jsonData.find(row => row[header] !== null) || jsonData[0];
          const sampleValue = sampleRow[header];
          
          return {
            key: slugify(header),
            label: header,
            type: inferType(sampleValue),
            required: false,
            defaultValue: '',
            validation: {},
            options: [] // Para tipos 'select'
          };
        });

        resolve({
          fields: schemaFields,
          sampleData: jsonData[0] // Retorna a primeira linha como objeto simples para preview
        });
      } catch (error) {
        reject(error.message);
      }
    };

    reader.onerror = () => reject("Erro ao ler o arquivo.");
    reader.readAsArrayBuffer(file);
  });
};

/**
 * LÃª um arquivo Excel/CSV e retorna schema + itens normalizados
 */
export const parseFileToSchemaAndItems = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        if (jsonData.length === 0) {
          throw new Error("A planilha estÃ¡ vazia.");
        }

        const headers = Object.keys(jsonData[0]);
        const headerToKey = headers.reduce((acc, header) => {
          acc[header] = slugify(header);
          return acc;
        }, {});

        const schemaFields = headers.map(header => {
          const sampleRow = jsonData.find(row => row[header] !== null) || jsonData[0];
          const sampleValue = sampleRow[header];
          
          return {
            key: headerToKey[header],
            label: header,
            type: inferType(sampleValue),
            required: false,
            defaultValue: '',
            validation: {},
            options: []
          };
        });

        const items = jsonData.map(row => {
          const normalized = {};
          headers.forEach(header => {
            normalized[headerToKey[header]] = row[header];
          });
          return normalized;
        });

        const firstRow = jsonData[0];
        const sampleData = { ...firstRow };
        headers.forEach(header => {
          sampleData[headerToKey[header]] = firstRow[header];
        });

        resolve({
          fields: schemaFields,
          sampleData,
          items
        });
      } catch (error) {
        reject(error.message);
      }
    };

    reader.onerror = () => reject("Erro ao ler o arquivo.");
    reader.readAsArrayBuffer(file);
  });
};
