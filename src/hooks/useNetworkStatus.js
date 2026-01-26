import { useState, useEffect } from 'react';
import { syncPendingMovements } from '../services/firebase/stockService';

const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingMovementsCount, setPendingMovementsCount] = useState(0);

  const updatePendingCount = () => {
    const pending = JSON.parse(localStorage.getItem('pending_stock_movements') || '[]');
    setPendingMovementsCount(pending.length);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingMovements().finally(updatePendingCount);
    };
    const handleOffline = () => setIsOnline(false);
    const handleStorage = (e) => {
      if (e.key === 'pending_stock_movements') {
        updatePendingCount();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inicializa a contagem de movimentos pendentes
    updatePendingCount();

    // Adiciona um listener para o evento de armazenamento local, 
    // que é disparado quando o localStorage muda em outra aba/janela.
    // Embora não seja ideal para a mesma aba, é um fallback.
    // O ideal seria usar um canal de comunicação (BroadcastChannel) ou um estado global.
    window.addEventListener('storage', handleStorage);

    // Registra o Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch(error => {
          console.error('Falha no registro do Service Worker:', error);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return { isOnline, pendingMovementsCount, updatePendingCount };
};

export default useNetworkStatus;
