import { useCallback, useEffect, useState } from 'react';
import { ApiEnvelope } from '../services/api';

type Request<T> = (params?: Record<string, string | number | boolean | undefined>) => Promise<ApiEnvelope<T[]>>;

export const useApiList = <T extends Record<string, unknown>>(request: Request<T>, params: Record<string, string | number | boolean | undefined> = {}) => {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState('');
  const serialized = JSON.stringify(params);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await request(JSON.parse(serialized));
      setItems(response.data);
      setTotal(response.meta?.total ?? response.data.length);
      setPage(response.meta?.current_page ?? response.meta?.page_no ?? 1);
      setLastPage(response.meta?.last_page ?? 1);
    }
    catch (caught) { setItems([]); setTotal(0); setError(caught instanceof Error ? caught.message : 'Unable to load data.'); }
    finally { setLoading(false); }
  }, [request, serialized]);
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || page >= lastPage) return;
    setLoadingMore(true); setError('');
    try {
      const nextPage = page + 1;
      const response = await request({ ...JSON.parse(serialized), page: nextPage });
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...response.data.filter((item) => !seen.has(item.id))];
      });
      setTotal(response.meta?.total ?? total);
      setPage(response.meta?.current_page ?? response.meta?.page_no ?? nextPage);
      setLastPage(response.meta?.last_page ?? lastPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load data.');
    } finally {
      setLoadingMore(false);
    }
  }, [lastPage, loading, loadingMore, page, request, serialized, total]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { items, total, loading, loadingMore, hasMore: page < lastPage, error, refresh, loadMore };
};
