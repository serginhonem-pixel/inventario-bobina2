import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

/**
 * Serviço de Impressão de Alta Fidelidade
 * Converte o layout do Designer em um documento pronto para impressoras térmicas.
 */
export const printLabels = async (template, items, options = {}) => {
  if (!template || !items || items.length === 0) return;

  const { size, elements } = template;
  const usePreview = !!options.usePreview;
  const normalizeKey = (value = '') =>
    String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const formatDateValue = (value) => {
    if (!value) return value;
    const dateObj = value instanceof Date
      ? value
      : typeof value?.toDate === 'function'
        ? value.toDate()
        : null;
    if (dateObj) {
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    if (typeof value === 'string') {
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    return value;
  };

  const generateQrDataUrl = async (value) => {
    try {
      return await QRCode.toDataURL(String(value || ''), {
        width: 300,
        margin: 1
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      return '';
    }
  };

  const generateBarcodeDataUrl = (value) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, String(value || '000123'), {
        format: 'CODE128',
        displayValue: false,
        margin: 0
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Erro ao gerar Barcode:', error);
      return '';
    }
  };

  const qrCache = new Map();
  const barcodeCache = new Map();

  const getQr = async (value) => {
    const key = String(value || '');
    if (qrCache.has(key)) return qrCache.get(key);
    const dataUrl = await generateQrDataUrl(key);
    qrCache.set(key, dataUrl);
    return dataUrl;
  };

  const getBarcode = (value) => {
    const key = String(value || '');
    if (barcodeCache.has(key)) return barcodeCache.get(key);
    const dataUrl = generateBarcodeDataUrl(key);
    barcodeCache.set(key, dataUrl);
    return dataUrl;
  };

  for (const item of items) {
    const keyMap = new Map(Object.keys(item || {}).map((key) => [normalizeKey(key), key]));
    for (const el of elements) {
      const labelKey = el.label ? keyMap.get(normalizeKey(el.label)) : null;
      const fieldKey = el.fieldKey;
      const shouldUseLabelKey = labelKey && labelKey !== fieldKey && item?.[labelKey] !== undefined;
      const rawVal = usePreview && el.previewValue !== undefined
        ? el.previewValue
        : (el.fieldKey
          ? (el.fieldKey === '__item__'
            ? JSON.stringify(item)
            : (shouldUseLabelKey ? (item[labelKey] || '') : (item[el.fieldKey] || '')))
          : el.previewValue);
      const val = formatDateValue(rawVal);

      if (el.type === 'qr') {
        const qrValue = usePreview && el.previewValue !== undefined
          ? String(el.previewValue)
          : (el.qrMode === 'item' || el.fieldKey === '__item__'
            ? JSON.stringify(item)
            : (el.qrFieldKey
              ? (item[el.qrFieldKey] || '')
              : (el.fieldKey
                ? (shouldUseLabelKey ? (item[labelKey] || '') : (item[el.fieldKey] || ''))
                : '')));
        await getQr(qrValue);
      }

      if (el.type === 'barcode') {
        const codeVal = el.barcodeCodeKey ? (item[el.barcodeCodeKey] || '') : '';
        const qtyVal = el.barcodeQtyKey ? (item[el.barcodeQtyKey] || '') : '';
        const barcodeValue = usePreview && el.previewValue !== undefined
          ? String(el.previewValue || '000123')
          : (el.fieldKey === '__code_qty__'
            ? `${codeVal} ${qtyVal}`.trim() || '000123'
            : (val || '000123'));
        getBarcode(barcodeValue);
      }
    }
  }

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
    .element.text-wrap {
      align-items: flex-start;
    }
    .element.text-top {
      align-items: flex-start;
    }
    .text-content {
      display: block;
      width: 100%;
    }
    .wrap {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .nowrap {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label-text {
      display: block;
    }
    .value-text {
      display: block;
    }
    .qr-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .qr-img {
      width: 80%;
      height: auto;
      max-width: 80%;
      max-height: 80%;
      object-fit: contain;
      display: block;
    }
    .barcode-img {
      width: 95%;
      height: auto;
      max-width: 95%;
      max-height: 60%;
      object-fit: contain;
      display: block;
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
        ${items.map(item => {
          const keyMap = new Map(
            Object.keys(item || {}).map((key) => [normalizeKey(key), key])
          );
          return `
          <div class="label-page">
            ${elements.map(el => {
              let content = '';
              const labelKey = el.label ? keyMap.get(normalizeKey(el.label)) : null;
              const fieldKey = el.fieldKey;
              const shouldUseLabelKey = labelKey && labelKey !== fieldKey && item?.[labelKey] !== undefined;
              const rawVal = usePreview && el.previewValue !== undefined
                ? el.previewValue
                : (el.fieldKey
                  ? (el.fieldKey === '__item__'
                    ? JSON.stringify(item)
                    : (shouldUseLabelKey ? (item[labelKey] || '') : (item[el.fieldKey] || '')))
                  : el.previewValue);
              const val = formatDateValue(rawVal);
              const hasLabel = el.showLabel && el.fieldKey;
              const titlePosition = el.titlePosition || 'inline';

              if (el.type === 'qr') {
                const qrValue = usePreview && el.previewValue !== undefined
                  ? String(el.previewValue)
                  : (el.qrMode === 'item' || el.fieldKey === '__item__'
                    ? JSON.stringify(item)
                    : (el.qrFieldKey
                      ? (item[el.qrFieldKey] || '')
                      : (el.fieldKey
                        ? (shouldUseLabelKey ? (item[labelKey] || '') : (item[el.fieldKey] || ''))
                        : '')));
                const qrDataUrl = qrCache.get(String(qrValue || '')) || '';
                content = `<div class="qr-container">
                  ${qrDataUrl ? `<img class="qr-img" src="${qrDataUrl}" />` : ''}
                  <span style="font-size: 6px; margin-top: 2px;">${qrValue}</span>
                </div>`;
              } else if (el.type === 'barcode') {
                const codeVal = el.barcodeCodeKey ? (item[el.barcodeCodeKey] || '') : '';
                const qtyVal = el.barcodeQtyKey ? (item[el.barcodeQtyKey] || '') : '';
                const barcodeValue = usePreview && el.previewValue !== undefined
                  ? String(el.previewValue || '000123')
                  : (el.fieldKey === '__code_qty__'
                    ? `${codeVal} ${qtyVal}`.trim() || '000123'
                    : (val || '000123'));
                const barcodeDataUrl = barcodeCache.get(String(barcodeValue || '')) || '';
                content = `<div class="qr-container">
                  ${barcodeDataUrl ? `<img class="barcode-img" src="${barcodeDataUrl}" />` : ''}
                  <span style="font-size: 6px; margin-top: 2px;">${barcodeValue}</span>
                </div>`;
              } else if (el.type === 'image') {
                content = `<img src="${el.url}" class="logo-img" />`;
              } else {
                const wrapClass = el.wrap ? 'wrap' : 'nowrap';
                const lineHeight = el.lineHeight || 1.2;
                if (hasLabel && titlePosition === 'top') {
                  const titleSize = el.titleFontSize || el.fontSize;
                  content = `<div class="text-content" style="line-height: ${lineHeight};">
                    <span class="label-text" style="font-size: ${titleSize}pt;">${el.label}</span>
                    <span class="value-text ${wrapClass}">${val}</span>
                  </div>`;
                } else if (hasLabel && titlePosition === 'inline') {
                  const titleSize = el.titleFontSize || el.fontSize;
                  content = `<span class="text-content ${wrapClass}" style="line-height: ${lineHeight};">
                    <span class="label-text" style="font-size: ${titleSize}pt;">${el.label}: </span>${val}
                  </span>`;
                } else {
                  const displayVal = val;
                  content = `<span class="text-content ${wrapClass}" style="line-height: ${lineHeight};">${displayVal}</span>`;
                }
              }

              return `
                <div class="element ${el.wrap ? 'text-wrap' : ''} ${hasLabel && titlePosition === 'top' ? 'text-top' : ''}" style="
                  left: ${el.x}mm;
                  top: ${el.y}mm;
                  width: ${el.width}mm;
                  height: ${el.height}mm;
                  font-size: ${el.fontSize}pt;
                  font-weight: ${el.bold ? 'bold' : 'normal'};
                  font-family: ${el.fontFamily || 'Arial'};
                  text-align: ${el.align};
                  justify-content: ${el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start'};
                  align-items: ${el.vAlign === 'top' ? 'flex-start' : el.vAlign === 'bottom' ? 'flex-end' : 'center'};
                  background-color: ${el.backgroundColor || 'transparent'};
                  transform: rotate(${el.rotation}deg);
                  border: ${el.border ? '0.1mm solid black' : 'none'};
                  padding: 0 1mm;
                ">
                  ${content}
                </div>
              `;
            }).join('')}
          </div>
        `;
        }).join('')}
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
