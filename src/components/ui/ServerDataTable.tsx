import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileDown,
  FileSpreadsheet,
  Printer,
  Search,
  X,
} from "lucide-react";

import { ApiEnvelope } from "../../services/api";
import { cn } from "../../lib/cn";
import { DataTable } from "./DataTable";

export type ServerDataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  exportValue?: (row: T, index: number) => string | number | null | undefined;
  className?: string;
  exportable?: boolean;
};

type ServerDataTableProps<T extends Record<string, unknown>> = {
  title: string;
  request: (
    params?: Record<string, string | number | boolean | undefined>,
  ) => Promise<ApiEnvelope<T[]>>;
  columns: ServerDataTableColumn<T>[];
  params?: Record<string, string | number | boolean | undefined>;
  refreshKey?: number;
  initialPageSize?: number;
  pageSizes?: number[];
  rowKey?: (row: T) => string;
  emptyMessage?: string;
  // Makes the whole row clickable (cursor-pointer + hover highlight), not just an actions-column
  // button - clicks on an interactive element inside the row (a button, a link) don't bubble into
  // this since those stop propagation themselves.
  onRowClick?: (row: T, index: number) => void;
  /** Lets section borders reach a padding-free parent card while retaining inner spacing. */
  edgeToEdge?: boolean;
};

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;
const htmlCell = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const download = (content: BlobPart, type: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const ServerDataTable = <T extends Record<string, unknown>>({
  title,
  request,
  columns,
  params = {},
  refreshKey = 0,
  initialPageSize = 50,
  pageSizes = [10, 25, 50, 100],
  rowKey = (row) => String(row.id),
  emptyMessage = "No results found.",
  onRowClick,
  edgeToEdge = false,
}: ServerDataTableProps<T>) => {
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(
    () => new Set(columns.map((column) => column.key)),
  );
  const serializedParams = JSON.stringify(params);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(query.trim());
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [query]);

  // Switching a filter (e.g. picking a different model) jumps back to page 1 too, the same way a
  // new search does - otherwise, still being on page 3 from before would keep showing whatever
  // landed there rather than the newest rows matching the new filter.
  useEffect(() => {
    setPage(1);
  }, [serializedParams]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    request({
      ...JSON.parse(serializedParams),
      search: search || undefined,
      limit: pageSize,
      pageno: page,
    })
      .then((response) => {
        if (!current) return;
        const responseTotal = response.meta?.total ?? response.data.length;
        const responseLastPage =
          response.meta?.last_page ??
          Math.max(1, Math.ceil(responseTotal / pageSize));
        if (page > responseLastPage) {
          setPage(responseLastPage);
          return;
        }
        setRows(response.data);
        setTotal(responseTotal);
        setLastPage(responseLastPage);
      })
      .catch((caught) => {
        if (!current) return;
        setRows([]);
        setTotal(0);
        setLastPage(1);
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load table data.",
        );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [page, pageSize, refreshKey, request, search, serializedParams]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.has(column.key)),
    [columns, visibleKeys],
  );
  const exportColumns = visibleColumns.filter(
    (column) => column.exportable !== false,
  );
  const exportRows = () =>
    rows.map((row, index) =>
      exportColumns.map((column) => column.exportValue?.(row, index) ?? ""),
    );
  const filename =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "export";

  const exportCsv = () => {
    const content = [
      [...exportColumns.map((column) => column.header)],
      ...exportRows(),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    download(`\uFEFF${content}`, "text/csv;charset=utf-8", `${filename}.csv`);
  };

  const exportExcel = () => {
    const body = exportRows()
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join("")}</tr>`,
      )
      .join("");
    const head = `<tr>${exportColumns.map((column) => `<th>${htmlCell(column.header)}</th>`).join("")}</tr>`;
    download(
      `<html><meta charset="utf-8"><table><thead>${head}</thead><tbody>${body}</tbody></table></html>`,
      "application/vnd.ms-excel",
      `${filename}.xls`,
    );
  };

  const printTable = (pdf = false) => {
    const popup = window.open("about:blank", "_blank");
    if (!popup) return;
    popup.opener = null;
    popup.document.open();
    const body = exportRows()
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join("")}</tr>`,
      )
      .join("");
    popup.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${htmlCell(title)}</title><style>@page{size:auto;margin:14mm}body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:8px;border:1px solid #cbd5e1;text-align:left;vertical-align:top}th{background:#e2e8f0}</style></head><body><h1>${htmlCell(title)}</h1>${pdf ? '<p>Choose "Save as PDF" as the printer destination.</p>' : ""}<table><thead><tr>${exportColumns.map((column) => `<th>${htmlCell(column.header)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`,
    );
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div>
      <div
        className={cn(
          "flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between",
          edgeToEdge ? "px-6 py-5" : "pb-4",
        )}
      >
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700"
          >
            <FileDown className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => printTable(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => printTable()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumns((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700"
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </button>
            {showColumns && (
              <div className="absolute right-0 z-20 mt-2 min-w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={visibleKeys.has(column.key)}
                      onChange={() =>
                        setVisibleKeys((current) => {
                          const next = new Set(current);
                          if (next.has(column.key) && next.size > 1)
                            next.delete(column.key);
                          else next.add(column.key);
                          return next;
                        })
                      }
                    />
                    {column.header}
                  </label>
                ))}
              </div>
            )}
          </div>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} rows
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className={cn("mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400", edgeToEdge && "mx-6")}>
          {error}
        </div>
      )}
      <div className={cn("relative overflow-x-auto", !edgeToEdge && "mt-4")}>
        {loading && (
          <div className="absolute inset-0 z-10 flex min-h-40 items-center justify-center bg-white/75 text-sm font-bold text-slate-500 backdrop-blur-sm dark:bg-slate-900/75">
            Loading...
          </div>
        )}
        <DataTable className="min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
              {visibleColumns.map((column) => (
                <th key={column.key} className={cn("p-3", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row, (page - 1) * pageSize + rowIndex) : undefined}
                className={cn(
                  "border-b border-slate-100 last:border-b-0 dark:border-slate-800",
                  onRowClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                )}
              >
                {visibleColumns.map((column) => (
                  <td key={column.key} className={cn("p-3", column.className)}>
                    {column.render(row, (page - 1) * pageSize + rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </DataTable>
        {!loading && rows.length === 0 && !error && (
          <div className="py-12 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 border-t border-slate-200 text-sm text-slate-500 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between",
          edgeToEdge ? "px-6 py-3" : "mt-4 pt-4",
        )}
      >
        <p>
          Showing {start}–{end} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-24 text-center text-xs font-bold">
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage}
            onClick={() =>
              setPage((current) => Math.min(lastPage, current + 1))
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
