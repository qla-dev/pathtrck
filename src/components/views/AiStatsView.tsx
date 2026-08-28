import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Coins,
  Copy,
  Eye,
  Gauge,
  Hash,
  Inbox,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import { Language, Role } from "../../types";
import { confirmAction, showError } from "../../lib/swal";
import { useApiList } from "../../hooks/useApiList";
import { Card } from "../ui/Card";
import { PageHeader } from '../ui/PageHeader';
import { ServerDataTable, ServerDataTableColumn } from "../ui/ServerDataTable";

const SERVICE_LABELS: Record<string, string> = {
  dispatch_chat: "Dispatch chat",
  load_scan: "Load scan (file)",
  load_scan_text: "Load scan (text)",
  bulk_scan: "Bulk scan (file)",
  bulk_scan_text: "Bulk scan (text)",
  guided_answer: "Guided answer",
};

const serviceLabel = (value: unknown) =>
  SERVICE_LABELS[String(value)] || String(value || "—");

const formatCost = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== null ? `$${n.toFixed(4)}` : "—";
};

const LENA_ALPHA_MODEL = "freightbook/lena-1.0-alpha";
const LENA_ALPHA_DISPLAY_TOKENS = "1280";

// Superadmin gets a simplified token figure: a fixed placeholder for the free guided-answer
// service (never its real, always-0 token count) and the plain total elsewhere - only master sees
// the real prompt/completion/total breakdown.
const displayTokenTotal = (row: Record<string, unknown>, role?: Role): string =>
  role !== "master" && row.model === LENA_ALPHA_MODEL
    ? LENA_ALPHA_DISPLAY_TOKENS
    : String(row.total_tokens ?? "—");

// Superadmin sees "Super Admin" wherever the actual user is the master account, so nothing in
// this screen reveals that a role above superadmin exists.
const displayUserName = (rowUser: Record<string, unknown> | undefined, role?: Role): string => {
  const name = String(rowUser?.name || rowUser?.username || "—");
  return role !== "master" && name === "Master Admin" ? "Super Admin" : name;
};

const formatTime = (value: unknown) =>
  String(value || "").slice(0, 19).replace("T", " ") || "—";

const truncateMessage = (value: string, max = 320) =>
  value.length > max ? `${value.slice(0, max)}…` : value;

// DispatchChatController.php rewrites a guided-action/skip click into an English sentence before
// sending it to the LLM (see its $history mapping) - decode that back into the real underlying
// value for the tooltip, instead of showing the LLM-facing paraphrase.
const GUIDED_ACTION_LABELS: Record<string, string> = {
  add: "Add a new load",
  tracking: "Check load status",
  booking: "Reserve a load",
  hs: "Check HS code",
  free: "Ask about Freightbook.ai",
  upload_yes: "Yes",
  upload_no: "No, ask me questions",
  start_add_yes: "Yes, start creating",
  start_add_no: "No, not now",
  continue_add_yes: "Yes, continue",
  continue_add_no: "No, leave load creation",
};
const GUIDED_ACTION_PATTERN = /^\[User selected guided LenaAI action: ([a-z_]+)\]$/;
const GUIDED_SKIP_PATTERN = /^\[User chose to answer the questionnaire step "([a-zA-Z]+)" later\. Continue with the next server-supplied step\.\]$/;

// Every hidden signal LenaAI's reply text can carry (see useLenaEmbeddedMessages.tsx, which
// strips this exact set for the chat UI) - none of these internal markers may ever be visible to
// an admin either, so the same stripping is mirrored here for the tooltip preview.
const stripLenaMarkers = (text: string): string =>
  text
    .replace(/\[\[OFFER_BOOKING(?::\d+)?\]\]/g, "")
    .replace(/\[\[LOAD_DETAILS(?::\d+)?\]\]/g, "")
    .replace(/\[\[LOAD_LOCATION(?::\d+)?\]\]/g, "")
    .replace(/\[\[LOAD_MAP(?::\d+)?\]\]/g, "")
    .replace(/\[\[LOAD_STATUS(?::\d+)?\]\]/g, "")
    .replace(/\[\[LENA_OPTIONS:[a-z_,]+\]\]/g, "")
    .replace(/\[\[LOAD_READY_TO_POST(?::complete)?\]\]/g, "")
    .replace(/\[\[LENA_STEP:[a-zA-Z]+\]\]/g, "")
    .replace(/\[\[LENA_SKIP:[a-zA-Z]+\]\]/g, "")
    .replace(/\[\[LENA_ACTION:[a-z_]+\]\]/g, "")
    .replace(/\[\[CHAT_TITLE:[^\]\r\n]+\]\]/g, "")
    .trim();

const decodeSentMessage = (content: string): string => {
  const actionMatch = content.match(GUIDED_ACTION_PATTERN);
  if (actionMatch) return GUIDED_ACTION_LABELS[actionMatch[1]] || actionMatch[1];
  const skipMatch = content.match(GUIDED_SKIP_PATTERN);
  if (skipMatch) return `Skipped step: ${skipMatch[1]}`;
  return stripLenaMarkers(content);
};

// Pulls just the human-readable text out of a call's raw payloads for the Message column's
// tooltips - never the whole request/response JSON, only the actual prompt/reply content, and
// never a raw [[...]] marker (see stripLenaMarkers above).
const extractSentMessage = (row: Record<string, unknown>): string => {
  const req = row.request_payload as Record<string, unknown> | undefined;
  if (!req) return "";
  const messages = req.messages as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(messages)) {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const content = lastUser?.content;
    if (typeof content === "string") return decodeSentMessage(content);
    if (Array.isArray(content)) {
      const textPart = content.find((part) => (part as Record<string, unknown>)?.type === "text") as Record<string, unknown> | undefined;
      if (typeof textPart?.text === "string") return decodeSentMessage(textPart.text);
    }
  }
  // The deterministic guided-answer path has no messages[] - fall back to what was actually
  // clicked/typed for that step.
  if (typeof req.display_text === "string") return stripLenaMarkers(req.display_text);
  if (typeof req.value === "string") return stripLenaMarkers(req.value);
  return "";
};

const extractReceivedMessage = (row: Record<string, unknown>): string => {
  const res = row.response_payload as Record<string, unknown> | undefined;
  if (!res) return "";
  const choices = res.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  if (typeof message?.content === "string") return stripLenaMarkers(message.content);
  if (typeof res.reply === "string") return stripLenaMarkers(res.reply);
  return "";
};

// Rendered into document.body via a portal (position: fixed, viewport coordinates) instead of a
// CSS absolute child, so the tooltip is never clipped by the table's own overflow-x-auto scroll
// container (which also clips vertically once any overflow is set - a well-known CSS quirk).
const MessageIcon = ({ icon: Icon, tone, text }: { icon: typeof Send; tone: string; text: string }) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: "above" | "below" } | null>(null);

  const showTooltip = () => {
    if (!text || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow < 160 ? "above" : "below";
    setTooltipPos({
      left: rect.left + rect.width / 2,
      top: placement === "below" ? rect.bottom + 8 : rect.top - 8,
      placement,
    });
  };
  const hideTooltip = () => setTooltipPos(null);

  return (
    <span
      ref={anchorRef}
      className="inline-flex cursor-help"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <Icon className={`h-4 w-4 ${tone}`} />
      {tooltipPos && createPortal(
        <div
          className="pointer-events-none fixed z-[300] w-64 -translate-x-1/2 whitespace-pre-wrap rounded-lg bg-slate-900 p-2.5 text-left text-[11px] leading-relaxed text-white shadow-xl dark:bg-slate-700"
          style={{
            left: tooltipPos.left,
            top: tooltipPos.top,
            transform: tooltipPos.placement === "above" ? "translate(-50%, -100%)" : "translateX(-50%)",
          }}
        >
          {truncateMessage(text)}
        </div>,
        document.body
      )}
    </span>
  );
};

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
  role,
  onClose,
}: {
  log: Record<string, unknown> | null;
  role?: Role;
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
              <p className="truncate text-xs"><span className="block font-black uppercase tracking-wider text-slate-400">User</span><span className="font-bold text-slate-800 dark:text-slate-100">{displayUserName(log.user as Record<string, unknown> | undefined, role)}</span></p>
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

const ConversationCallsModal = ({
  conversationId,
  columns,
  onClose,
  onRowClick,
}: {
  conversationId: string | null;
  columns: ServerDataTableColumn<Record<string, unknown>>[];
  onClose: () => void;
  onRowClick: (row: Record<string, unknown>) => void;
}) => {
  if (!conversationId) return null;
  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-white dark:bg-slate-900">
      <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
        <h2 className="text-xl font-black dark:text-white">Conversation #{conversationId} · AI calls</h2>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <ServerDataTable
          title={`Conversation ${conversationId}`}
          request={api.aiCallLogs.list}
          columns={columns}
          params={{ conversation_id: conversationId }}
          initialPageSize={50}
          onRowClick={onRowClick}
          emptyMessage="No AI calls logged for this conversation."
        />
      </div>
    </div>
  );
};

export const AiStatsView = ({ lang: _lang, role }: { lang: Language; role?: Role }) => {
  const [tableRefreshKey] = useState(0);
  const [serviceFilter, setServiceFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [attachmentFilter, setAttachmentFilter] = useState<"" | "1" | "0">("");
  const [statusFilter, setStatusFilter] = useState<"" | "1" | "0">("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [showAvgModal, setShowAvgModal] = useState(false);
  const [viewMode, setViewMode] = useState<"calls" | "conversations">("conversations");
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      ...(serviceFilter ? { service: serviceFilter } : {}),
      ...(modelFilter ? { model: modelFilter } : {}),
      ...(attachmentFilter ? { has_attachment: attachmentFilter } : {}),
      ...(statusFilter ? { is_success: statusFilter } : {}),
    }),
    [serviceFilter, modelFilter, attachmentFilter, statusFilter],
  );

  // Everything logged is included by default (never hidden, per the "show $0/generic calls too"
  // requirement) - but once a filter is actively chosen, the summary cards follow it too, so
  // "filter by model" actually means the cost/calls/conversations/tokens totals shown match that
  // model, not just the table rows.
  const stats = useApiList(api.aiCallLogs.list, useMemo(() => ({ limit: 500, ...params }), [params]));
  // A separate, always-unfiltered sample purely to populate the "All models" dropdown, so picking
  // one model doesn't narrow the dropdown's own option list down to just that one model.
  const modelDirectory = useApiList(api.aiCallLogs.list, { limit: 500 });
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

  // Rolled up from the same sample the summary cards already use (no separate backend endpoint) -
  // one row per distinct conversation_id, with the same kind of totals a single call row shows.
  const conversationRows = useMemo(() => {
    const byConversation = new Map<string, Record<string, unknown>>();
    for (const row of stats.items) {
      const key = row.conversation_id ? String(row.conversation_id) : "";
      if (!key) continue;
      const cost = Number(row.cost_usd || 0);
      const tokens = Number(row.total_tokens || 0);
      const isPaid = cost > 0;
      const existing = byConversation.get(key);
      if (existing) {
        existing.calls = (existing.calls as number) + 1;
        existing.paid_calls = (existing.paid_calls as number) + (isPaid ? 1 : 0);
        existing.free_calls = (existing.free_calls as number) + (isPaid ? 0 : 1);
        existing.total_tokens = (existing.total_tokens as number) + tokens;
        existing.cost_usd = (existing.cost_usd as number) + cost;
        existing.has_attachment = existing.has_attachment || row.has_attachment;
        existing.has_failure = existing.has_failure || !row.is_success;
        if (String(row.created_at || "") > String(existing.last_created_at || "")) existing.last_created_at = row.created_at;
      } else {
        byConversation.set(key, {
          conversation_id: row.conversation_id,
          calls: 1,
          paid_calls: isPaid ? 1 : 0,
          free_calls: isPaid ? 0 : 1,
          total_tokens: tokens,
          cost_usd: cost,
          has_attachment: Boolean(row.has_attachment),
          has_failure: !row.is_success,
          last_created_at: row.created_at,
          user: row.user,
        });
      }
    }
    return [...byConversation.values()].sort((a, b) =>
      String(b.last_created_at || "").localeCompare(String(a.last_created_at || ""))
    );
  }, [stats.items]);

  const conversationsRequest = useCallback(
    async (params?: Record<string, string | number | boolean | undefined>) => {
      const search = String(params?.search || "").trim().toLowerCase();
      const filtered = search
        ? conversationRows.filter((row) => {
            const user = row.user as Record<string, unknown> | undefined;
            return String(row.conversation_id).includes(search)
              || String(user?.name || user?.username || "").toLowerCase().includes(search);
          })
        : conversationRows;
      const limit = Number(params?.limit) || 50;
      const pageno = Number(params?.pageno) || 1;
      const start = (pageno - 1) * limit;
      return {
        message: "ok",
        data: filtered.slice(start, start + limit),
        meta: { total: filtered.length, last_page: Math.max(1, Math.ceil(filtered.length / limit)) },
        errors: {},
      };
    },
    [conversationRows],
  );

  const modelOptions = useMemo(
    () => [...new Set(modelDirectory.items.map((row) => String(row.model || "")).filter(Boolean))].sort(),
    [modelDirectory.items],
  );

  // Master-only permanent purge, separate from the normal (soft) conversation delete elsewhere in
  // the app - removes both the conversation and its ai_call_logs rows for real, for cleaning up
  // test/junk conversations directly from AI Stats.
  const deleteConversation = async (conversationId: string) => {
    const confirmed = await confirmAction({
      title: "Permanently delete this conversation?",
      text: `This deletes conversation #${conversationId} and all of its AI call logs for good. This cannot be undone.`,
      confirmText: "Delete permanently",
      icon: "warning",
    });
    if (!confirmed) return;
    try {
      await api.aiCallLogs.purgeConversation(conversationId);
    } catch (error) {
      void showError(
        "The conversation could not be deleted",
        error instanceof Error ? error.message : undefined,
      );
      return;
    }
    if (openConversationId === conversationId) setOpenConversationId(null);
    await stats.refresh();
  };

  const columns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(
    () => [
      {
        key: "number",
        header: "#",
        render: (row) => String(row.id ?? "—"),
        exportValue: (row) => String(row.id ?? ""),
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
        render: (row) => (
          <span className="text-xs text-slate-500">{displayUserName(row.user as Record<string, unknown> | undefined, role)}</span>
        ),
        exportValue: (row) => displayUserName(row.user as Record<string, unknown> | undefined, role),
      },
      {
        key: "tokens",
        header: "Tokens",
        render: (row) =>
          role === "master" ? (
            <div className="flex flex-col gap-0.5 text-xs text-slate-500">
              <span><span className="text-slate-400">Prompt</span> {String(row.prompt_tokens ?? "—")}</span>
              <span><span className="text-slate-400">Completion</span> {String(row.completion_tokens ?? "—")}</span>
              <span><span className="text-slate-400">Total</span> {String(row.total_tokens ?? "—")}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">{displayTokenTotal(row, role)}</span>
          ),
        exportValue: (row) => (role === "master" ? String(row.total_tokens ?? "") : displayTokenTotal(row, role)),
      },
      {
        key: "cost",
        header: "Cost",
        render: (row) => <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCost(row.cost_usd)}</span>,
        exportValue: (row) => formatCost(row.cost_usd),
      },
      {
        key: "attachment",
        header: "File",
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
        key: "message",
        header: "Message",
        render: (row) => (
          <div className="flex items-center gap-2">
            <MessageIcon icon={Send} tone="text-sky-500" text={extractSentMessage(row)} />
            <MessageIcon icon={Inbox} tone="text-emerald-500" text={extractReceivedMessage(row)} />
          </div>
        ),
        exportable: false,
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-px text-right whitespace-nowrap",
        exportable: false,
        render: (row) => (
          <button
            onClick={(event) => { event.stopPropagation(); setSelected(row); }}
            className="cursor-pointer rounded-lg bg-slate-100 p-2 dark:bg-slate-800"
          >
            <Eye className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [role],
  );

  const conversationColumns = useMemo<ServerDataTableColumn<Record<string, unknown>>[]>(
    () => [
      {
        key: "number",
        header: "#",
        render: (_row, index) => index + 1,
        exportValue: (_row, index) => index + 1,
      },
      {
        key: "conversation",
        header: "Conversation",
        render: (row) => <span className="text-xs font-bold dark:text-white">#{String(row.conversation_id)}</span>,
        exportValue: (row) => String(row.conversation_id ?? ""),
      },
      {
        key: "user",
        header: "User",
        render: (row) => (
          <span className="text-xs text-slate-500">{displayUserName(row.user as Record<string, unknown> | undefined, role)}</span>
        ),
        exportValue: (row) => displayUserName(row.user as Record<string, unknown> | undefined, role),
      },
      {
        key: "calls",
        header: "Calls",
        render: (row) =>
          role === "master" ? (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-500"><span className="text-slate-400">Paid</span> {String(row.paid_calls ?? "—")}</span>
              <span className="text-slate-500"><span className="text-slate-400">Free</span> {String(row.free_calls ?? "—")}</span>
              <span className="font-bold dark:text-white"><span className="text-slate-400">Total</span> {String(row.calls ?? "—")}</span>
            </div>
          ) : (
            <span className="text-xs font-bold dark:text-white">{String(row.calls ?? "—")}</span>
          ),
        exportValue: (row) => String(row.calls ?? ""),
      },
      {
        key: "tokens",
        header: "Tokens",
        render: (row) => <span className="text-xs text-slate-500">{Number(row.total_tokens || 0).toLocaleString()}</span>,
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
        header: "File",
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
          row.has_failure ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-600">
              <AlertTriangle className="h-3 w-3" />
              Has failures
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              All success
            </span>
          ),
        exportValue: (row) => (row.has_failure ? "has_failures" : "all_success"),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-px text-right whitespace-nowrap",
        exportable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(event) => { event.stopPropagation(); setOpenConversationId(row.conversation_id ? String(row.conversation_id) : null); }}
              className="cursor-pointer rounded-lg bg-slate-100 p-2 dark:bg-slate-800"
            >
              <Eye className="h-4 w-4" />
            </button>
            {role === "master" && (
              <button
                onClick={(event) => { event.stopPropagation(); if (row.conversation_id) void deleteConversation(String(row.conversation_id)); }}
                className="cursor-pointer rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"
                title="Permanently delete this conversation and its AI logs"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [role],
  );

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          icon={Gauge}
          title="AI Stats"
          subtitle="Every OpenRouter call across LenaAI chat and document scanning - including free, failed, or generic-answer calls. Nothing is hidden by default."
        />

        <div className="grid items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <button
            type="button"
            onClick={() => setViewMode("conversations")}
            className="h-full cursor-pointer text-left"
          >
            <Card
              className={`h-full shadow-none transition-transform hover:scale-[1.02] ${viewMode === "conversations" ? "ring-2 ring-indigo-500" : ""}`}
              contentClassName="flex h-full items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="whitespace-nowrap text-xs uppercase text-slate-500">Conversations</p>
                <p className="mt-1 text-2xl font-black text-indigo-500">{conversationRows.length}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                <MessageSquare className="h-6 w-6" />
              </div>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calls")}
            className="h-full cursor-pointer text-left"
          >
            <Card
              className={`h-full shadow-none transition-transform hover:scale-[1.02] ${viewMode === "calls" ? "ring-2 ring-sky-500" : ""}`}
              contentClassName="flex h-full items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="whitespace-nowrap text-xs uppercase text-slate-500">Calls</p>
                <p className="mt-1 text-2xl font-black dark:text-white">{stats.total}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                <Gauge className="h-6 w-6" />
              </div>
            </Card>
          </button>
          <Card className="h-full shadow-none" contentClassName="flex h-full items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xs uppercase text-slate-500">Total cost</p>
              <p className="mt-1 text-2xl font-black text-emerald-500">{formatCost(totalCost)}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Coins className="h-6 w-6" />
            </div>
          </Card>
          <Card className="h-full shadow-none" contentClassName="flex h-full items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xs uppercase text-slate-500">Total tokens</p>
              <p className="mt-1 text-2xl font-black text-violet-500">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
              <Hash className="h-6 w-6" />
            </div>
          </Card>
          <Card className="h-full shadow-none" contentClassName="flex h-full items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xs uppercase text-slate-500">With attachment</p>
              <p className="mt-1 text-2xl font-black text-amber-500">{withAttachment}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Paperclip className="h-6 w-6" />
            </div>
          </Card>
          <button
            type="button"
            onClick={() => setShowAvgModal(true)}
            className="h-full cursor-pointer text-left"
          >
            <Card className="h-full shadow-none transition-transform hover:scale-[1.02]" contentClassName="flex h-full items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="whitespace-nowrap text-xs uppercase text-slate-500">Avg cost / call</p>
                <p className="mt-1 text-2xl font-black text-rose-500">{formatCost(avgCostOverall)}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <Calculator className="h-6 w-6" />
              </div>
            </Card>
          </button>
        </div>
        <Card className="shadow-none">
          {viewMode === "calls" ? (
            <>
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
                <select
                  value={modelFilter}
                  onChange={(event) => setModelFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">All models</option>
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              <ServerDataTable
                title="AI Stats"
                request={api.aiCallLogs.list}
                columns={columns}
                params={params}
                refreshKey={tableRefreshKey}
                initialPageSize={50}
                onRowClick={(row) => setSelected(row)}
                emptyMessage="No AI calls logged yet."
              />
            </>
          ) : (
            <ServerDataTable
              title="AI Stats by conversation"
              request={conversationsRequest}
              columns={conversationColumns}
              initialPageSize={50}
              onRowClick={(row) => setOpenConversationId(row.conversation_id ? String(row.conversation_id) : null)}
              emptyMessage="No conversations logged yet."
            />
          )}
        </Card>
      </div>
      <AiCallLogDetail log={selected} role={role} onClose={() => setSelected(null)} />
      <ConversationCallsModal
        conversationId={openConversationId}
        columns={columns}
        onClose={() => setOpenConversationId(null)}
        onRowClick={(row) => setSelected(row)}
      />
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
