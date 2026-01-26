import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Sucesso na leitura
        onScan(decodedText);
        scanner.clear(); // Para o scanner após a leitura
      },
      (error) => {
        // Erros de leitura são comuns enquanto a câmera foca, ignoramos
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Erro ao limpar scanner", err));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="font-bold text-white">Escanear Código</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400">
            <X size={20} />
          </button>
        </div>
        
        <div id="reader" className="w-full"></div>
        
        <div className="p-6 text-center">
          <p className="text-xs text-zinc-500">Posicione o QR Code ou Código de Barras dentro do quadrado</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
