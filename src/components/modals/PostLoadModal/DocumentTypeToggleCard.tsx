import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { api } from '../../../services/api';
import { formatDocumentSize } from '../../views/LoadDocumentsPanel';
import { DetailToggleCard } from './DetailToggleCard';

type UploadedDocument = { id: string; name: string; size: number; uploadedAt: string };

/**
 * A requirement toggle that also carries the paperwork of its own type.
 *
 * "CMR required" is a flag, but the CMR itself is a file - and a load can carry more than one of
 * them (two consignment notes on a two-leg run is ordinary). The count sits where DG / IMO shows
 * what was filled in, and opens the same popover: the files themselves, each opening in a new tab.
 *
 * Both a published load and a draft can hold documents, so whichever of the two ids is present is
 * what the list is fetched against; with neither, the card is just the toggle it used to be.
 */
export const DocumentTypeToggleCard = ({
  type,
  active,
  onToggle,
  title,
  description,
  icon,
  loadId,
  draftId,
  u,
}: {
  type: string;
  active: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  icon: LucideIcon;
  loadId?: number | string | null;
  draftId?: number | string | null;
  u: (key: string, fallback: string) => string;
}) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loadId && !draftId) {
      setDocuments([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    void api.documents.list({ type, per_page: 50, ...(loadId ? { load_id: loadId } : { load_draft_id: draftId }) })
      .then((response) => {
        if (cancelled) return;
        setDocuments(response.data.map((row) => ({
          id: String(row.id),
          name: String(row.name || '—'),
          size: Number(row.size_bytes || 0),
          uploadedAt: String(row.created_at || '').replace('T', ' ').slice(0, 16),
        })));
      })
      .catch(() => {
        // Non-critical: without the list the card still works as a plain requirement toggle.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draftId, loadId, type]);

  return (
    <DetailToggleCard
      active={active}
      onToggle={onToggle}
      icon={icon}
      title={title}
      description={description}
      summary={documents.length > 0 ? `${documents.length} ${u('documents.tab', 'Documents')}` : ''}
      emptyHint={loading ? u('common.loading', 'Loading...') : u('documents.noneAttached', 'No files yet')}
    >
      {documents.length === 0 ? (
        <p className="px-1 py-2 text-[11px] font-semibold text-slate-500">
          {loading
            ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />{u('common.loading', 'Loading...')}</span>
            : u('documents.noneAttachedHint', 'Files attached to this load appear here.')}
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {documents.map((document) => (
            <li key={document.id}>
              <button
                type="button"
                onClick={() => void api.documents.open(document.id, document.name, true)}
                title={u('documents.openInNewTab', 'Open in a new tab')}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-slate-800 dark:text-white">{document.name}</span>
                  <span className="block text-[10px] text-slate-400">{formatDocumentSize(document.size)} · {document.uploadedAt}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </DetailToggleCard>
  );
};
