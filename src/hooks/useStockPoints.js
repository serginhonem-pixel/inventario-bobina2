import { useState, useEffect, useCallback } from 'react';
import * as stockPointService from '../services/firebase/stockPointService';

/**
 * Gerencia a lista de pontos de estocagem do tenant.
 * Carrega na montagem e expõe callbacks de criação/exclusão.
 */
export default function useStockPoints(tenantId) {
  const [stockPoints, setStockPoints] = useState([]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    stockPointService
      .getStockPointsByTenant(tenantId)
      .then((points) => {
        if (!cancelled) setStockPoints(points);
      })
      .catch((err) => console.error('Erro ao carregar pontos de estocagem:', err));

    return () => { cancelled = true; };
  }, [tenantId]);

  const handleStockPointCreated = useCallback((newPoint) => {
    if (!newPoint?.id) return;
    setStockPoints((prev) => {
      if (prev.some((p) => p.id === newPoint.id)) return prev;
      return [newPoint, ...prev];
    });
  }, []);

  const handleStockPointDeleted = useCallback((deletedPoint) => {
    if (!deletedPoint?.id) return;
    setStockPoints((prev) => prev.filter((p) => p.id !== deletedPoint.id));
  }, []);

  return { stockPoints, setStockPoints, handleStockPointCreated, handleStockPointDeleted };
}
