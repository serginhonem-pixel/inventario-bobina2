import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

const pickBackCamera = (cameras = []) => {
  if (!cameras.length) return null;
  const isBack = (label = '') => /back|rear|traseira|environment/i.test(label);
  const isUltra = (label = '') => /ultra|wide|0\.6|0,6/i.test(label);
  const backCams = cameras.filter((c) => isBack(c.label));
  const preferred = backCams.find((c) => !isUltra(c.label));
  return (preferred || backCams[0] || cameras[0]).id;
};

const formatCameraLabel = (camera, index) => {
  const label = (camera.label || '').trim();
  const isBack = /back|rear|traseira|environment/i.test(label);
  const isFront = /front|frontal|user/i.test(label);
  const isUltra = /ultra|wide|0\.6|0,6/i.test(label);
  const base = isBack ? (isUltra ? 'Traseira (0.6x)' : 'Traseira') : isFront ? 'Frontal' : 'Camera';
  const clean = label.replace(/camera|webcam|facing/gi, '').replace(/\s+/g, ' ').trim();
  return clean ? `${base} - ${clean}` : `${base} ${index + 1}`;
};


const safeStop = async (scanner) => {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch (err) {
    const msg = String(err || '');
    if (!msg.includes('not running') && !msg.includes('not running or paused')) {
      console.warn('Erro ao parar camera:', err);
    }
  }
};

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const startTokenRef = useRef(0);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [useFacingMode, setUseFacingMode] = useState(false);
  const [error, setError] = useState('');

  const startScanner = async (cameraConfig) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    const token = ++startTokenRef.current;
    setError('');
    try {
      await safeStop(scanner);
      if (token != startTokenRef.current) return;
      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          onScan(decodedText);
          safeStop(scanner);
        },
        () => {}
      );
    } catch (err) {
      if (token == startTokenRef.current) {
        console.error('Erro ao iniciar camera:', err);
        setError('Nao foi possivel iniciar a camera selecionada.');
      }
    }
  };

  useEffect(() => {
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((cams) => {
        setCameras(cams);
        const camId = pickBackCamera(cams);
        if (camId) {
          setSelectedCameraId(camId);
          setUseFacingMode(false);
        } else {
          setSelectedCameraId('');
          setUseFacingMode(true);
        }
      })
      .catch((err) => {
        console.error('Erro ao listar cameras:', err);
        setUseFacingMode(true);
        setError('Nao foi possivel acessar a camera.');
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
    if (selectedCameraId) {
      startScanner({ deviceId: { exact: selectedCameraId } });
    }
  }, [selectedCameraId, useFacingMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="QtdApp" className="h-12 w-auto" />
            <h3 className="font-bold text-white">Escanear Codigo</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div id="reader" className="w-full"></div>

        {cameras.length > 1 && !useFacingMode && (
          <div className="px-6 pt-4">
            <label className="block text-[11px] uppercase tracking-wide text-zinc-400">Camera</label>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                setUseFacingMode(false);
              }}
              className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
            >
              {cameras.map((camera, index) => (
                <option key={camera.id} value={camera.id}>
                  {formatCameraLabel(camera, index)}
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
          <p className="text-xs text-zinc-500">Posicione o QR Code ou Codigo de Barras dentro do quadrado</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
