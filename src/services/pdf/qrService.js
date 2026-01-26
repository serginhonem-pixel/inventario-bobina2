import QRCode from 'qrcode';

/**
 * Gera um DataURL de QR Code para um ID de item
 * Pode ser configurado para apontar para uma URL ou conter um JSON compacto
 */
export const generateItemQRCode = async (itemId, baseUrl = 'https://app.etiquetas.com/scan/') => {
  try {
    const url = `${baseUrl}${itemId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error("Erro ao gerar QR Code:", err);
    return null;
  }
};
