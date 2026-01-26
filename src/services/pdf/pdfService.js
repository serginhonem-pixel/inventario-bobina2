/**
 * Serviço de Impressão de Alta Fidelidade
 * Converte o layout do Designer em um documento pronto para impressoras térmicas.
 */
export const printLabels = (template, items) => {
  if (!template || !items || items.length === 0) return;

  const { size, elements } = template;
  
  // Cria um iframe oculto para a impressão
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow.document;
  
  // Estilos CSS para garantir precisão milimétrica e suporte a logos
  const style = `
    @page {
      size: ${size.width}mm ${size.height}mm;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
      -webkit-print-color-adjust: exact;
    }
    .label-page {
      width: ${size.width}mm;
      height: ${size.height}mm;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      background: white;
    }
    .element {
      position: absolute;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      overflow: hidden;
    }
    .qr-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `;

  const html = `
    <html>
      <head>
        <style>${style}</style>
      </head>
      <body>
        ${items.map(item => `
          <div class="label-page">
            ${elements.map(el => {
              let content = '';
              const val = el.fieldKey
                ? (el.fieldKey === '__item__' ? JSON.stringify(item) : (item[el.fieldKey] || ''))
                : el.previewValue;
              const displayVal = (el.showLabel && el.fieldKey) ? `${el.label}: ${val}` : val;

              if (el.type === 'qr') {
                const qrValue = el.qrMode === 'item' || el.fieldKey === '__item__'
                  ? JSON.stringify(item)
                  : (el.qrFieldKey ? (item[el.qrFieldKey] || '') : (el.fieldKey ? (item[el.fieldKey] || '') : ''));
                content = `<div class="qr-container">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrValue)}" style="width: 80%; height: 80%;" />
                  <span style="font-size: 6px; margin-top: 2px;">${qrValue}</span>
                </div>`;
              } else if (el.type === 'barcode') {
                const barcodeValue = val || '000123';
                content = `<div class="qr-container">
                  <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeValue)}&code=Code128&translate-esc=on" style="width: 95%; height: 60%;" />
                  <span style="font-size: 6px; margin-top: 2px;">${barcodeValue}</span>
                </div>`;
              } else if (el.type === 'image') {
                content = `<img src="${el.url}" class="logo-img" />`;
              } else {
                content = `<span>${displayVal}</span>`;
              }

              return `
                <div class="element" style="
                  left: ${el.x}mm;
                  top: ${el.y}mm;
                  width: ${el.width}mm;
                  height: ${el.height}mm;
                  font-size: ${el.fontSize}pt;
                  font-weight: ${el.bold ? 'bold' : 'normal'};
                  text-align: ${el.align};
                  justify-content: ${el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start'};
                  transform: rotate(${el.rotation}deg);
                  border: ${el.border ? '0.1mm solid black' : 'none'};
                  padding: 0 1mm;
                ">
                  ${content}
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Aguarda o carregamento das imagens antes de imprimir
  iframe.contentWindow.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
};
