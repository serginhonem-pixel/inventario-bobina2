// Função auxiliar para criar um link de download
const downloadFile = (data, filename, mimeType) => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Função para exportar dados para CSV (substituindo Excel)
export const exportToCSV = (data, schema, filename = 'inventario_qtdapp.csv') => {
  const headers = schema.fields.map(field => field.label);
  
  const csvRows = [];
  csvRows.push(headers.join(';')); // Cabeçalho

  data.forEach(item => {
    const values = schema.fields.map(field => {
      const value = item.data[field.name] || '';
      // Envolve o valor em aspas se contiver vírgulas ou quebras de linha
      return typeof value === 'string' && (value.includes(';') || value.includes('\n')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    csvRows.push(values.join(';'));
  });

  const csvString = csvRows.join('\n');
  downloadFile(csvString, filename, 'text/csv;charset=utf-8;');
};

// Função para exportar dados para um formato de texto simples (substituindo PDF)
export const exportToText = (data, schema, filename = 'inventario_qtdapp.txt') => {
  const headers = schema.fields.map(field => field.label);
  let textContent = `Relatório de Inventário - ${schema.name}\n`;
  textContent += `Gerado em: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
  
  textContent += headers.join(' | ') + '\n';
  textContent += headers.map(h => '-'.repeat(h.length)).join('-|-') + '\n';

  data.forEach(item => {
    const values = schema.fields.map(field => {
      const value = item.data[field.name] || '';
      return String(value).padEnd(field.label.length); // Simples alinhamento
    });
    textContent += values.join(' | ') + '\n';
  });

  downloadFile(textContent, filename, 'text/plain');
};
