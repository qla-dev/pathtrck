import { useCallback, useEffect, useState } from 'react';
import { ApiEnvelope } from '../services/api';

type Request<T> = (params?: Record<string, string | number | boolean | undefined>) => Promise<ApiEnvelope<T[]>>;

export const useApiList = <T extends Record<string, unknown>>(request: Request<T>, params: Record<string, string | number | boolean | undefined> = {}) => {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const serialized = JSON.stringify(params);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await request(JSON.parse(serialized)); setItems(response.data); setTotal(response.meta?.total ?? response.data.length); }
    catch (caught) { setItems([]); setTotal(0); setError(caught instanceof Error ? caught.message : 'Unable to load data.'); }
    finally { setLoading(false); }
  }, [request, serialized]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { items, total, loading, error, refresh };
};
