/**
 * Serviço para Impressão Direta via Bluetooth (Web Bluetooth API)
 * Focado em impressoras térmicas que aceitam comandos ESC/POS ou texto simples.
 */

export const printViaBluetooth = async (labelData, template) => {
  try {
    // 1. Solicitar dispositivo Bluetooth
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // UUID comum para impressoras
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    // 2. Formatar dados para a impressora (Exemplo simples ESC/POS)
    const encoder = new TextEncoder();
    let commands = '\x1B\x40'; // Inicializar impressora
    
    labelData.forEach(item => {
      commands += `\x1B\x61\x01`; // Centralizar
      commands += `${item.descricao || 'ITEM'}\n`;
      commands += `ID: ${item.id}\n`;
      commands += `----------------\n\n`;
    });

    commands += '\x1D\x56\x41'; // Cortar papel

    // 3. Enviar comandos
    await characteristic.writeValue(encoder.encode(commands));
    
    return true;
  } catch (error) {
    console.error("Erro na impressão Bluetooth:", error);
    throw error;
  }
};

export const isBluetoothAvailable = () => {
  return 'bluetooth' in navigator;
};
