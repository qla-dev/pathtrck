import { useCallback, useEffect, useRef, useState } from 'react';
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
  // The backend reads 'limit' before 'per_page', so a refresh has to widen whichever key the
  // caller actually passed - overriding the other one would silently be ignored.
  const pageKey = params.limit !== undefined ? 'limit' : 'per_page';
  const pageSize = Math.max(1, Number(params.limit ?? params.per_page ?? 25) || 25);
  const pagesLoaded = useRef(1);
  useEffect(() => { pagesLoaded.current = 1; }, [serialized]);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    const loaded = Math.max(1, pagesLoaded.current);
    try {
      // Refreshing must not throw away the pages the user already scrolled into view (the chat
      // list refetches itself after every sent message), so everything loaded so far comes back
      // as one oversized page instead of collapsing the list to its first page again.
      const response = await request({ ...JSON.parse(serialized), [pageKey]: pageSize * loaded, page: 1 });
      setItems(response.data);
      const count = response.meta?.total ?? response.data.length;
      setTotal(count);
      setPage(loaded);
      setLastPage(Math.max(1, Math.ceil(count / pageSize)));
    }
    catch (caught) { pagesLoaded.current = 1; setItems([]); setTotal(0); setPage(1); setLastPage(1); setError(caught instanceof Error ? caught.message : 'Unable to load data.'); }
    finally { setLoading(false); }
  }, [pageKey, pageSize, request, serialized]);
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
      setPage(nextPage);
      pagesLoaded.current = nextPage;
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
