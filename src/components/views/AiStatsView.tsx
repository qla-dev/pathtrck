import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Coins,
  Copy,
  Eye,
  Gauge,
  Hash,
  Paperclip,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import { Language } from "../../types";
import { useApiList } from "../../hooks/useApiList";
import { Card } from "../ui/Card";
import { ServerDataTable, ServerDataTableColumn } from "../ui/ServerDataTable";

const SERVICE_LABELS: Record<string, string> = {
  dispatch_chat: "Dispatch chat",
  load_scan: "Load scan (file)",
  load_scan_text: "Load scan (text)",
  bulk_scan: "Bulk scan (file)",
  bulk_scan_text: "Bulk scan (text)",
};

const serviceLabel = (value: unknown) =>
  SERVICE_LABELS[String(value)] || String(value || "—");

const formatCost = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== null ? `$${n.toFixed(4)}` : "—";
};

const formatTime = (value: unknown) =>
  String(value || "").slice(0, 19).replace("T", " ") || "—";

const JsonPanel = ({ title, data }: { title: string; data: unknown }) => {
  const [copied, setCopied] = useState(false);
  const text = data === null || data === undefined
    ? "(none)"
    : JSON.stringify(data, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission can be denied by the browser; the text stays selectable regardless.
    }
  };
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
        {text}
      </pre>
    </div>
  );
};

const AiCallLogDetail = ({
  log,
  onClose,
}: {
  log: Record<string, unknown> | null;
  onClose: () => void;
}) => {
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-white dark:bg-slate-900">
      <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black dark:text-white">
            {serviceLabel(log.service)} · #{String(log.id)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatTime(log.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden p-5">
          {!log.is_success && (
            <div className="mb-4 shrink-0 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              {String(log.error_message || "This call failed.")}
            </div>
          )}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_1fr]">
            <div className="space-y-2.5 overflow-y-auto lg:pr-4 lg:border-r lg:border-slate-200 lg:dark:border-slate-800">
              <p className="truncate text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Model</span><span className="font-bold text-slate-800 dark:text-slate-100">{String(log.model || "—")}</span></p>
              <p className="text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Conversation</span><span className="font-bold text-slate-800 dark:text-slate-100">{log.conversation_id ? `#${String(log.conversation_id)}` : "—"}</span></p>
              <p className="truncate text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">User</span><span className="font-bold text-slate-800 dark:text-slate-100">{String((log.user as Record<string, unknown> | undefined)?.name || (log.user as Record<string, unknown> | undefined)?.username || "—")}</span></p>
              <p className="text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Duration</span><span className="font-bold text-slate-800 dark:text-slate-100">{log.duration_ms ? `${String(log.duration_ms)} ms` : "—"}</span></p>
              <p className="text-xs">
                <span className="block font-black uppercase tracking-wider text-slate-400">Tokens (p/c/t)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{String(log.prompt_tokens ?? "—")}/{String(log.completion_tokens ?? "—")}/{String(log.total_tokens ?? "—")}</span>
                {(log.cached_tokens != null || log.reasoning_tokens != null) && (
                  <span className="ml-1 font-medium text-slate-400">
                    ({log.cached_tokens != null && `${String(log.cached_tokens)}c`}
                    {log.cached_tokens != null && log.reasoning_tokens != null && "/"}
                    {log.reasoning_tokens != null && `${String(log.reasoning_tokens)}r`})
                  </span>
                )}
              </p>
              <p className="text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Cost</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCost(log.cost_usd)}</span></p>
              <p className="truncate text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Provider</span><span className="font-bold text-slate-800 dark:text-slate-100">{String(log.provider || "—")}</span></p>
              <p className="truncate text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Finish reason</span><span className="font-bold text-slate-800 dark:text-slate-100">{String(log.finish_reason || "—")}</span></p>
              <p className="text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Temperature</span><span className="font-bold text-slate-800 dark:text-slate-100">{String(log.temperature ?? "—")}</span></p>
              <p className="text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">HTTP status</span><span className="font-bold text-slate-800 dark:text-slate-100">{String(log.http_status ?? "—")}</span></p>
              <p className="text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">Attempts</span><span className="font-bold text-slate-800 dark:text-slate-100">{String(log.attempt_count ?? "—")}</span></p>
              <p className="truncate text-xs" title={String(log.generation_id || "")}><span className="block font-black uppercase tracking-wider text-slate-400">Generation ID</span><span className="font-bold text-slate-800 dark:text-slate-100">{String(log.generation_id || "—")}</span></p>
            </div>
            <JsonPanel title="Request" data={log.request_payload} />
            <JsonPanel title="Response" data={log.response_payload} />
          </div>
      </div>
    </div>
  );
};

const AvgCostBreakdown = ({
  open,
  onClose,
  avgOverall,
  avgText,
  avgImage,
  countOverall,
  countText,
  countImage,
}: {
  open: boolean;
  onClose: () => void;
  avgOverall: number;
  avgText: number;
  avgImage: number;
  countOverall: number;
  countText: number;
  countImage: number;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-lg font-black dark:text-white">Average cost per call</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Overall</p>
              <p className="text-[11px] text-slate-400">{countOverall} call{countOverall === 1 ? "" : "s"}</p>
            </div>
            <p className="text-lg font-black text-emerald-500">{formatCost(avgOverall)}</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Average (text only)</p>
              <p className="text-[11px] text-slate-400">{countText} call{countText === 1 ? "" : "s"}</p>
            </div>
            <p className="text-lg font-black text-emerald-500">{formatCost(avgText)}</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Average (with image)</p>
              <p className="text-[11px] text-slate-400">{countImage} call{countImage === 1 ? "" : "s"}</p>
            </div>
            <p className="text-lg font-black text-emerald-500">{formatCost(avgImage)}</p>
          </div>
          {(countImage > 0 && countImage < 5) && (
            <p className="text-[11px] leading-relaxed text-slate-400">
              Only {countImage} call{countImage === 1 ? "" : "s"} with an attachment logged so far - this average is not yet statistically reliable and will settle as more calls come in.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const AiStatsView = ({ lang: _lang }: { lang: Language }) => {
  const [tableRefreshKey] = useState(0);
  const [serviceFilter, setServiceFilter] = useState("");
  const [attachmentFilter, setAttachmentFilter] = useState<"" | "1" | "0">("");
  const [statusFilter, setStatusFilter] = useState<"" | "1" | "0">("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [showAvgModal, setShowAvgModal] = useState(false);

  // A separate, larger unfiltered fetch just for the summary cards, so the totals always reflect
  // everything logged (never hidden, per the "show $0/generic calls too" requirement) regardless
  // of whatever filters are currently applied to the table below.
  const stats = useApiList(api.aiCallLogs.list, { limit: 500 });
  const totalCost = stats.items.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0);
  const totalTokens = stats.items.reduce((sum, row) => sum + Number(row.total_tokens || 0), 0);
  const withAttachmentRows = stats.items.filter((row) => row.has_attachment);
  const textOnlyRows = stats.items.filter((row) => !row.has_attachment);
  const withAttachment = withAttachmentRows.length;
  const avgCostOverall = stats.items.length ? totalCost / stats.items.length : 0;
  const avgCostText = textOnlyRows.length
    ? textOnlyRows.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0) / textOnlyRows.length
    : 0;
  const avgCostImage = withAttachmentRows.length
    ? withAttachmentRows.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0) / withAttachmentRows.length
    : 0;

  const params = useMemo(
    () => ({
      ...(serviceFilter ? { service: serviceFilter } : {}),
      ...(attachmentFilter ? { has_attachment: attachmentFilter } : {}),
      ...(statusFilter ? { is_success: statusFilter } : {}),
    }),
    [serviceFilter, attachmentFilter, statusFilter],
  );

  const columns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(
    () => [
      {
        key: "number",
        header: "#",
        render: (_row, index) => index + 1,
        exportValue: (_row, index) => index + 1,
      },
      {
        key: "time",
        header: "Time",
        render: (row) => <span className="whitespace-nowrap text-xs text-slate-500">{formatTime(row.created_at)}</span>,
        exportValue: (row) => String(row.created_at || ""),
      },
      {
        key: "service",
        header: "Service",
        render: (row) => <span className="text-xs font-bold dark:text-white">{serviceLabel(row.service)}</span>,
        exportValue: (row) => String(row.service || ""),
      },
      {
        key: "model",
        header: "Model",
        render: (row) => <span className="text-xs text-slate-500">{String(row.model || "—")}</span>,
        exportValue: (row) => String(row.model || ""),
      },
      {
        key: "conversation",
        header: "Conversation",
        render: (row) => (
          <span className="text-xs text-slate-500">
            {row.conversation_id ? `#${String(row.conversation_id)}` : "—"}
          </span>
        ),
        exportValue: (row) => (row.conversation_id ? String(row.conversation_id) : ""),
      },
      {
        key: "user",
        header: "User",
        render: (row) => {
          const rowUser = row.user as Record<string, unknown> | undefined;
          return <span className="text-xs text-slate-500">{String(rowUser?.name || rowUser?.username || "—")}</span>;
        },
        exportValue: (row) => {
          const rowUser = row.user as Record<string, unknown> | undefined;
          return String(rowUser?.name || rowUser?.username || "");
        },
      },
      {
        key: "tokens",
        header: "Tokens (p/c/t)",
        render: (row) => (
          <span className="whitespace-nowrap text-xs text-slate-500">
            {String(row.prompt_tokens ?? "—")}/{String(row.completion_tokens ?? "—")}/{String(row.total_tokens ?? "—")}
          </span>
        ),
        exportValue: (row) => String(row.total_tokens ?? ""),
      },
      {
        key: "cost",
        header: "Cost",
        render: (row) => <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCost(row.cost_usd)}</span>,
        exportValue: (row) => formatCost(row.cost_usd),
      },
      {
        key: "attachment",
        header: "Attachment",
        render: (row) =>
          row.has_attachment ? (
            <Paperclip className="h-4 w-4 text-primary" />
          ) : (
            <span className="text-xs text-slate-300">—</span>
          ),
        exportValue: (row) => (row.has_attachment ? "yes" : "no"),
      },
      {
        key: "status",
        header: "Status",
        render: (row) =>
          row.is_success ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Success
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-600">
              <AlertTriangle className="h-3 w-3" />
              Failed
            </span>
          ),
        exportValue: (row) => (row.is_success ? "success" : "failed"),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-px text-right whitespace-nowrap",
        exportable: false,
        render: (row) => (
          <button
            onClick={() => setSelected(row)}
            className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"
          >
            <Eye className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black dark:text-white">AI Stats</h1>
              <p className="mt-1 text-sm text-slate-500">
                Every OpenRouter call across LenaAI chat and document scanning - including free,
                failed, or generic-answer calls. Nothing is hidden by default.
              </p>
            </div>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Total cost</p>
              <p className="mt-1 text-2xl font-black text-emerald-500">{formatCost(totalCost)}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Coins className="h-6 w-6" />
            </div>
          </Card>
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Total calls</p>
              <p className="mt-1 text-2xl font-black dark:text-white">{stats.total}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
              <Gauge className="h-6 w-6" />
            </div>
          </Card>
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Total tokens</p>
              <p className="mt-1 text-2xl font-black text-violet-500">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
              <Hash className="h-6 w-6" />
            </div>
          </Card>
          <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-xs uppercase text-slate-500">With attachment</p>
              <p className="mt-1 text-2xl font-black text-amber-500">{withAttachment}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Paperclip className="h-6 w-6" />
            </div>
          </Card>
          <button
            type="button"
            onClick={() => setShowAvgModal(true)}
            className="cursor-pointer text-left"
          >
            <Card className="shadow-none transition-transform hover:scale-[1.02]" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Avg cost / call</p>
                <p className="mt-1 text-2xl font-black text-rose-500">{formatCost(avgCostOverall)}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <Calculator className="h-6 w-6" />
              </div>
            </Card>
          </button>
        </div>
        <Card className="shadow-none">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">All services</option>
              {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={attachmentFilter}
              onChange={(event) => setAttachmentFilter(event.target.value as "" | "1" | "0")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Any attachment</option>
              <option value="1">Has attachment</option>
              <option value="0">No attachment</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | "1" | "0")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Any status</option>
              <option value="1">Success</option>
              <option value="0">Failed</option>
            </select>
          </div>
          <ServerDataTable
            title="AI Stats"
            request={api.aiCallLogs.list}
            columns={columns}
            params={params}
            refreshKey={tableRefreshKey}
            initialPageSize={50}
            emptyMessage="No AI calls logged yet."
          />
        </Card>
      </div>
      <AiCallLogDetail log={selected} onClose={() => setSelected(null)} />
      <AvgCostBreakdown
        open={showAvgModal}
        onClose={() => setShowAvgModal(false)}
        avgOverall={avgCostOverall}
        avgText={avgCostText}
        avgImage={avgCostImage}
        countOverall={stats.items.length}
        countText={textOnlyRows.length}
        countImage={withAttachmentRows.length}
      />
    </>
  );
};
