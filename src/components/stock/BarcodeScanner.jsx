import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

const pickBackcâmera = (câmeras = []) => {
  if (!câmeras.length) return null;
  const isBack = (label = '') => /back|rear|traseira|environment/i.test(label);
  const isUltra = (label = '') => /ultra|wide|0\.6|0,6/i.test(label);
  const backCams = câmeras.filter((c) => isBack(c.label));
  const preferred = backCams.find((c) => !isUltra(c.label));
  return (preferred || backCams[0] || câmeras[0]).id;
};

const formatcâmeraLabel = (câmera, index) => {
  const label = (câmera.label || '').trim();
  const isBack = /back|rear|traseira|environment/i.test(label);
  const isFront = /front|frontal|user/i.test(label);
  const isUltra = /ultra|wide|0\.6|0,6/i.test(label);
  const base = isBack ? (isUltra ? 'Traseira (0.6x)' : 'Traseira') : isFront ? 'Frontal' : 'câmera';
  const clean = label.replace(/câmera|webcam|facing/gi, '').replace(/\s+/g, ' ').trim();
  return clean ? `${base} - ${clean}` : `${base} ${index + 1}`;
};


const safeStop = async (scanner) => {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch (err) {
    const msg = String(err || '');
    if (!msg.includes('not running') && !msg.includes('not running or paused')) {
      console.warn('Erro ao parar câmera:', err);
    }
  }
};

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const startTokenRef = useRef(0);
  const [câmeras, setcâmeras] = useState([]);
  const [selectedcâmeraId, setSelectedcâmeraId] = useState('');
  const [useFacingMode, setUseFacingMode] = useState(false);
  const [error, setError] = useState('');

  const startScanner = async (câmeraConfig) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    const token = ++startTokenRef.current;
    setError('');
    try {
      await safeStop(scanner);
      if (token != startTokenRef.current) return;
      await scanner.start(
        câmeraConfig,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          onScan(decodedText);
          safeStop(scanner);
        },
        () => {}
      );
    } catch (err) {
      if (token == startTokenRef.current) {
        console.error('Erro ao iniciar câmera:', err);
        setError('Não foi possível iniciar a câmera selecionada.');
      }
    }
  };

  useEffect(() => {
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    Html5Qrcode.getcâmeras()
      .then((cams) => {
        setcâmeras(cams);
        const camId = pickBackcâmera(cams);
        if (camId) {
          setSelectedcâmeraId(camId);
          setUseFacingMode(false);
        } else {
          setSelectedcâmeraId('');
          setUseFacingMode(true);
        }
      })
      .catch((err) => {
        console.error('Erro ao listar câmeras:', err);
        setUseFacingMode(true);
        setError('Não foi possível acessar a câmera.');
      });

    return () => {
      safeStop(scanner);
      try {
        scanner.clear();
      } catch (err) {
        console.error('Erro ao limpar scanner', err);
      }
    };
  }, []);

  useEffect(() => {
    if (useFacingMode) {
      startScanner({ facingMode: 'environment' });
      return;
    }
    if (selectedcâmeraId) {
      startScanner({ deviceId: { exact: selectedcâmeraId } });
    }
  }, [selectedcâmeraId, useFacingMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="QtdApp" className="h-12 w-auto" />
            <h3 className="font-bold text-white">Escanear Código</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div id="reader" className="w-full"></div>

        {câmeras.length > 1 && !useFacingMode && (
          <div className="px-6 pt-4">
            <label className="block text-[11px] uppercase tracking-wide text-zinc-400">câmera</label>
            <select
              value={selectedcâmeraId}
              onChange={(e) => {
                setSelectedcâmeraId(e.target.value);
                setUseFacingMode(false);
              }}
              className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
            >
              {câmeras.map((câmera, index) => (
                <option key={câmera.id} value={câmera.id}>
                  {formatcâmeraLabel(câmera, index)}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="px-6 pt-4 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="p-6 text-center">
          <p className="text-xs text-zinc-500">Posicione o QR Code ou Código de Barras dentro do quadrado</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;


