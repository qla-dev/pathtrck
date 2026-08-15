import { LoaderCircle, RefreshCw } from 'lucide-react';

export const InlineDataState = ({ loading, error, empty, onRetry }: { loading: boolean; error?: string; empty: string; onRetry?: () => void }) => loading
  ? <div className="flex min-h-32 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Loading data...</div>
  : error ? <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-sm text-rose-500"><span>{error}</span>{onRetry && <button onClick={onRetry} className="inline-flex items-center gap-1 font-bold"><RefreshCw className="h-4 w-4" />Retry</button>}</div>
  : <div className="flex min-h-32 items-center justify-center text-sm text-slate-500">{empty}</div>;
