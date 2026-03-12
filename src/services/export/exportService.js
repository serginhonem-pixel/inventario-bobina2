import { toast } from '../../components/ui/toast';
import { resolveItemQty, groupItems } from '../../core/utils';

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

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildPdfDocument = ({
  title,
  subtitle = 'QtdApp',
  meta = {},
  columns = [],
  rows = [],
  orientation = 'landscape',
  accent = '#10b981',
  summary = [],
}) => {
  const headerCells = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const tableRows = rows.length > 0
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${Math.max(columns.length, 1)}" class="empty">Nenhum dado disponivel para este relatorio.</td></tr>`;
  const metaHtml = Object.entries(meta)
    .map(([label, value]) => `<span class="meta-chip"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`)
    .join('');
  const summaryHtml = summary.length > 0
    ? `<div class="summary-grid">${summary.map((item) => `
        <div class="summary-card">
          <span class="summary-label">${escapeHtml(item.label)}</span>
          <strong class="summary-value">${escapeHtml(item.value)}</strong>
        </div>
      `).join('')}</div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --accent: ${accent};
          --ink: #111827;
          --muted: #6b7280;
          --line: #d4d4d8;
          --panel: #f8fafc;
          --panel-strong: #eef2f7;
        }
        @page { size: A4 ${orientation}; margin: 14mm; }
        * { box-sizing: border-box; }
        body {
          font-family: "Segoe UI", Arial, sans-serif;
          color: var(--ink);
          margin: 0;
          background: #ffffff;
        }
        .sheet {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .hero {
          position: relative;
          overflow: hidden;
          border: 1px solid #dbe4ea;
          border-radius: 20px;
          background:
            radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 16%, transparent), transparent 34%),
            linear-gradient(135deg, #0f172a, #111827 55%, #1f2937);
          color: #fff;
          padding: 22px 24px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 6px 10px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.82);
        }
        .brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 20%, transparent);
        }
        h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.08;
          letter-spacing: -0.03em;
        }
        .subtitle {
          margin-top: 8px;
          max-width: 70ch;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          line-height: 1.55;
        }
        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
        .meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.88);
          font-size: 11px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        }
        .summary-card {
          border: 1px solid #e5e7eb;
          background: var(--panel);
          border-radius: 16px;
          padding: 12px 14px;
        }
        .summary-label {
          display: block;
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.18em;
          margin-bottom: 6px;
          font-weight: 700;
        }
        .summary-value {
          font-size: 20px;
          line-height: 1.1;
        }
        .table-shell {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        thead th {
          background: var(--panel-strong);
          color: #374151;
          text-align: left;
          padding: 12px 14px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 10px;
          border-bottom: 1px solid var(--line);
        }
        tbody td {
          padding: 11px 14px;
          border-bottom: 1px solid #eceff3;
          vertical-align: top;
        }
        tbody tr:nth-child(even) td {
          background: #fbfcfd;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        .empty {
          text-align: center;
          color: var(--muted);
          padding: 24px 14px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding-top: 4px;
          font-size: 10px;
          color: var(--muted);
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <main class="sheet">
        <section class="hero">
          <div class="brand"><span class="brand-dot"></span> QtdApp Report</div>
          <h1>${escapeHtml(title)}</h1>
          <div class="subtitle">${escapeHtml(subtitle)}</div>
          <div class="meta-row">${metaHtml}</div>
        </section>
        ${summaryHtml}
        <section class="table-shell">
          <table>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </section>
        <footer class="footer">
          <span>Gerado automaticamente pelo QtdApp</span>
          <span>${escapeHtml(new Date().toLocaleString('pt-BR'))}</span>
        </footer>
      </main>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;
};

// Helper para obter valor de quantidade (usa utilitário compartilhado)
const getQtyValue = resolveItemQty;

// Função para exportar dados para Excel (CSV com formatação para Excel)
export const exportToExcel = (data, schema, filename = 'inventario_qtdapp.csv') => {
  // Agrupa itens iguais
  const groupedData = groupItems(data, schema);
  
  const headers = [...schema.fields.map(field => field.label), 'CONTAGEM', 'DIFERENÇA'];
  
  const csvRows = [];
  // BOM para UTF-8 no Excel
  csvRows.push('\uFEFF' + headers.join(';'));

  let totalQty = 0;

  groupedData.forEach((item) => {
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
export const exportToPDF = (data, schema, _filename = 'inventario_qtdapp.pdf') => {
  // Agrupa itens iguais
  const groupedData = groupItems(data, schema);
  
  let totalQty = 0;
  groupedData.forEach(item => {
    totalQty += getQtyValue(item);
  });

  // Cria HTML para impressão/PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Permita pop-ups para exportar PDF.', { type: 'warning' });
    return;
  }

  const headers = [...schema.fields.slice(0, 4).map(f => f.label), 'CONTAGEM', 'DIF.'];
  
  let tableRows = '';
  groupedData.forEach((item) => {
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
      <meta charset="UTF-8">
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
      <h1>&#128230; Planilha de Inventário</h1>
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

export const exportInventoryReportToExcel = (rows, meta = {}) => {
  const headers = ['CODIGO', 'DESCRICAO', 'CONGELADO', 'CONTADO', 'DIFERENCA', 'STATUS'];
  const csvRows = ['\uFEFF' + headers.join(';')];

  rows.forEach((row) => {
    const values = [
      row.codigo || '',
      row.descricao || '',
      row.baselineQty ?? '',
      row.countedQty ?? '',
      row.difference ?? '',
      row.status || '',
    ].map((value) => {
      const text = String(value ?? '');
      return text.includes(';') || text.includes('\n')
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    });
    csvRows.push(values.join(';'));
  });

  csvRows.push('');
  csvRows.push(`Ponto;${meta.stockPointName || ''}`);
  csvRows.push(`Sessão;${meta.sessionId || ''}`);
  csvRows.push(`Gerado em;${new Date().toLocaleString('pt-BR')}`);

  downloadFile(
    csvRows.join('\n'),
    `relatorio_inventario_${(meta.stockPointName || 'qtdapp').replace(/\s+/g, '_').toLowerCase()}.csv`,
    'text/csv;charset=utf-8;'
  );
};

export const exportInventoryReportToPDF = (rows, meta = {}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Permita pop-ups para exportar PDF.', { type: 'warning' });
    return;
  }

  const divergences = rows.filter((row) => Number(row.difference || 0) !== 0).length;
  const counted = rows.filter((row) => row.countedQty !== null && row.countedQty !== undefined).length;
  const html = buildPdfDocument({
    title: 'Relatorio de Inventario',
    subtitle: 'Resumo de contagem, divergencias e status por item.',
    accent: '#0ea5e9',
    meta: {
      Ponto: meta.stockPointName || '-',
      Sessao: meta.sessionId || '-',
      GeradoEm: new Date().toLocaleString('pt-BR'),
    },
    summary: [
      { label: 'Itens', value: rows.length },
      { label: 'Contados', value: counted },
      { label: 'Divergencias', value: divergences },
    ],
    columns: [
      { label: 'Codigo' },
      { label: 'Descricao' },
      { label: 'Congelado' },
      { label: 'Contado' },
      { label: 'Diferenca' },
      { label: 'Status' },
    ],
    rows: rows.map((row) => [
      row.codigo || '-',
      row.descricao || '-',
      row.baselineQty ?? '-',
      row.countedQty ?? '-',
      row.difference ?? '-',
      row.status || '-',
    ]),
  });

  printWindow.document.write(html);
  printWindow.document.close();
};

export const exportTableToExcel = (rows, columns, filename = 'relatorio_qtdapp.csv', meta = {}) => {
  const headers = columns.map((column) => column.label);
  const csvRows = ['\uFEFF' + headers.join(';')];

  rows.forEach((row) => {
    const values = columns.map((column) => {
      const rawValue = typeof column.value === 'function' ? column.value(row) : row?.[column.key];
      const text = String(rawValue ?? '');
      return text.includes(';') || text.includes('\n')
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    });
    csvRows.push(values.join(';'));
  });

  if (meta && Object.keys(meta).length > 0) {
    csvRows.push('');
    Object.entries(meta).forEach(([label, value]) => {
      csvRows.push(`${label};${value ?? ''}`);
    });
  }

  downloadFile(csvRows.join('\n'), filename, 'text/csv;charset=utf-8;');
};

export const exportTableToPDF = (rows, columns, title = 'Relatorio QtdApp', meta = {}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('Permita pop-ups para exportar PDF.', { type: 'warning' });
    return;
  }

  const html = buildPdfDocument({
    title,
    subtitle: 'Documento exportado a partir do modulo de relatorios do QtdApp.',
    meta,
    summary: [
      { label: 'Linhas', value: rows.length },
      { label: 'Colunas', value: columns.length },
    ],
    columns: columns.map((column) => ({ label: column.label })),
    rows: rows.map((row) => columns.map((column) => {
      const rawValue = typeof column.value === 'function' ? column.value(row) : row?.[column.key];
      return rawValue ?? '-';
    })),
  });

  printWindow.document.write(html);
  printWindow.document.close();
};

// Mantém funções antigas para compatibilidade
export const exportToCSV = exportToExcel;
export const exportToText = exportToPDF;
