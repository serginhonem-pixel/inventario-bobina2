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

// Helper para obter valor de quantidade
const getQtyValue = (item) => {
  const data = item?.data || {};
  const val = data.quantidade || data.qtd || data.estoque || data.quantidade_atual || data.saldo || 0;
  return Number(val) || 0;
};

// Helper para obter código do item (para agrupar)
const getItemCode = (item) => {
  const data = item?.data || {};
  return data.codigo || data.sku || data.cod || data.code || data.id || '';
};

// Helper para agrupar itens iguais e somar quantidades
const groupItems = (data, schema) => {
  const qtyFields = ['quantidade', 'qtd', 'estoque', 'quantidade_atual', 'saldo'];
  const codeField = schema.fields.find(f => ['codigo', 'sku', 'cod', 'code'].includes(f.key || f.name));
  const codeKey = codeField?.key || codeField?.name || 'codigo';
  
  const grouped = new Map();
  
  data.forEach(item => {
    const code = item.data[codeKey] || getItemCode(item) || `_item_${item.id}`;
    
    if (grouped.has(code)) {
      // Soma as quantidades
      const existing = grouped.get(code);
      qtyFields.forEach(qf => {
        schema.fields.forEach(field => {
          const fk = field.key || field.name;
          if (fk === qf || qf === fk) {
            const existingVal = Number(existing.data[fk]) || 0;
            const newVal = Number(item.data[fk]) || 0;
            existing.data[fk] = existingVal + newVal;
          }
        });
      });
    } else {
      // Cria uma cópia do item
      grouped.set(code, {
        ...item,
        data: { ...item.data }
      });
    }
  });
  
  return Array.from(grouped.values());
};

// Função para exportar dados para Excel (CSV com formatação para Excel)
export const exportToExcel = (data, schema, filename = 'inventario_qtdapp.csv') => {
  // Agrupa itens iguais
  const groupedData = groupItems(data, schema);
  
  const headers = [...schema.fields.map(field => field.label), 'CONTAGEM', 'DIFERENÇA'];
  
  const csvRows = [];
  // BOM para UTF-8 no Excel
  csvRows.push('\uFEFF' + headers.join(';'));

  let totalQty = 0;

  groupedData.forEach((item, idx) => {
    const values = schema.fields.map(field => {
      // Usa field.key para acessar dados (padrão do sistema)
      const fieldKey = field.key || field.name;
      const value = item.data[fieldKey] ?? '';
      // Soma quantidade se for campo de quantidade
      if (['quantidade', 'qtd', 'estoque', 'quantidade_atual', 'saldo'].includes(fieldKey)) {
        totalQty += Number(value) || 0;
      }
      return typeof value === 'string' && (value.includes(';') || value.includes('\n')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    // Adiciona colunas vazias para CONTAGEM e DIFERENÇA
    values.push(''); // CONTAGEM (para anotar)
    values.push(''); // DIFERENÇA
    csvRows.push(values.join(';'));
  });

  // Linha de totais
  csvRows.push('');
  const totalsRow = schema.fields.map((field, idx) => {
    const fieldKey = field.key || field.name;
    if (idx === 0) return 'TOTAL';
    if (['quantidade', 'qtd', 'estoque', 'quantidade_atual', 'saldo'].includes(fieldKey)) {
      return totalQty;
    }
    return '';
  });
  totalsRow.push(''); // CONTAGEM total
  totalsRow.push(''); // DIFERENÇA total
  csvRows.push(totalsRow.join(';'));

  // Resumo
  csvRows.push('');
  csvRows.push(`Itens Únicos;${groupedData.length}`);
  csvRows.push(`Registros Originais;${data.length}`);
  csvRows.push(`Quantidade Total em Sistema;${totalQty}`);
  csvRows.push(`Data do Inventário;${new Date().toLocaleDateString('pt-BR')}`);

  const csvString = csvRows.join('\n');
  downloadFile(csvString, filename, 'text/csv;charset=utf-8;');
};

// Função para exportar para PDF (usando jsPDF se disponível, senão HTML para impressão)
export const exportToPDF = (data, schema, filename = 'inventario_qtdapp.pdf') => {
  // Agrupa itens iguais
  const groupedData = groupItems(data, schema);
  
  let totalQty = 0;
  groupedData.forEach(item => {
    totalQty += getQtyValue(item);
  });

  // Cria HTML para impressão/PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Permita pop-ups para exportar PDF');
    return;
  }

  const headers = [...schema.fields.slice(0, 4).map(f => f.label), 'CONTAGEM', 'DIF.'];
  
  let tableRows = '';
  groupedData.forEach((item, idx) => {
    const cells = schema.fields.slice(0, 4).map(field => {
      const fieldKey = field.key || field.name;
      const value = item.data[fieldKey] ?? '-';
      return `<td style="border: 1px solid #333; padding: 6px 8px;">${value}</td>`;
    }).join('');
    tableRows += `
      <tr>
        ${cells}
        <td style="border: 1px solid #333; padding: 6px 8px; min-width: 80px;"></td>
        <td style="border: 1px solid #333; padding: 6px 8px; min-width: 60px;"></td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inventário - ${schema.name || 'QtdApp'}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
        h1 { font-size: 18px; margin-bottom: 5px; }
        .info { font-size: 12px; color: #666; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #222; color: #fff; padding: 8px; text-align: left; border: 1px solid #333; }
        td { padding: 6px 8px; border: 1px solid #333; }
        tr:nth-child(even) { background: #f5f5f5; }
        .summary { margin-top: 20px; font-size: 12px; }
        .summary-item { display: inline-block; margin-right: 30px; padding: 8px 12px; background: #f0f0f0; border-radius: 4px; }
        .summary-label { color: #666; }
        .summary-value { font-weight: bold; font-size: 14px; }
        @media print {
          body { padding: 10px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>📦 Planilha de Inventário</h1>
      <div class="info">
        <strong>${schema.name || 'Inventário'}</strong> | 
        Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </div>
      
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="summary">
        <div class="summary-item">
          <span class="summary-label">Itens Únicos:</span>
          <span class="summary-value">${groupedData.length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Qtd. em Sistema:</span>
          <span class="summary-value">${totalQty.toLocaleString('pt-BR')}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Contagem Final:</span>
          <span class="summary-value">________</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Diferença:</span>
          <span class="summary-value">________</span>
        </div>
      </div>

      <div style="margin-top: 40px; font-size: 11px; color: #666;">
        <p>Responsável: _________________________________ &nbsp;&nbsp;&nbsp; Assinatura: _________________________________</p>
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

// Mantém funções antigas para compatibilidade
export const exportToCSV = exportToExcel;
export const exportToText = exportToPDF;
