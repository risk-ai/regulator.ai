/**
 * useOptimistic — P2 Performance
 * 
 * Optimistic update pattern: update UI immediately before API confirms.
 * Automatically rolls back on failure.
 * 
 * Usage:
 *   const { data, update, loading, error } = useOptimistic(initialData);
 *   
 *   const handleToggle = (id: string) => {
 *     update(
 *       // Optimistic transform
 *       (prev) => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item),
 *       // API call
 *       () => togglePolicy(id),
 *     );
 *   };
 */

import { useState, useCallback, useRef } from 'react';
import { addToast } from '../store/toastStore.js';

interface UseOptimisticResult<T> {
  data: T;
  setData: (data: T) => void;
  update: (
    optimisticTransform: (current: T) => T,
    apiCall: () => Promise<any>,
    rollbackMessage?: string,
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useOptimistic<T>(initialData: T): UseOptimisticResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<T>(initialData);

  const update = useCallback(async (
    optimisticTransform: (current: T) => T,
    apiCall: () => Promise<any>,
    rollbackMessage = 'Action failed — changes reverted',
  ) => {
    // Save current state for rollback
    previousRef.current = data;
    setError(null);
    setLoading(true);

    // Apply optimistic update immediately
    const optimistic = optimisticTransform(data);
    setData(optimistic);

    try {
      // Execute the real API call
      await apiCall();
      // Success — optimistic state is now confirmed
    } catch (err) {
      // Rollback to previous state
      setData(previousRef.current);
      const message = err instanceof Error ? err.message : rollbackMessage;
      setError(message);
      addToast(message, 'error', {
        label: 'Retry',
        onClick: () => update(optimisticTransform, apiCall, rollbackMessage),
      });
    } finally {
      setLoading(false);
    }
  }, [data]);

  return { data, setData, update, loading, error };
}
