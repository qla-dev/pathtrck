import type { Language } from '../types';

export type ReportField = { label: string; value: unknown };
export type Report = { title: string; subtitle?: string; fields: ReportField[] };

const escape = (value: unknown): string => String(value ?? '—').replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export const reportHtml = (report: Report, lang: Language): string => {
  const locale = lang === 'bs' || lang === 'de' ? lang : 'en';
  const download = { bs: 'Preuzmi PDF', de: 'PDF herunterladen', en: 'Download PDF' }[locale];
  const generated = { bs: 'Izvještaj generisan', de: 'Bericht erstellt', en: 'Report generated' }[locale];
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escape(report.title)}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#0f172a;font:14px Arial,sans-serif}
    .toolbar{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;background:white;border-bottom:1px solid #e2e8f0}
    button{border:0;border-radius:8px;background:#0f172a;color:white;padding:12px 20px;cursor:pointer;font-weight:bold}
    .paper{width:210mm;max-width:100%;min-height:297mm;margin:24px auto;padding:15mm;background:white;box-shadow:0 8px 32px #0f172a12}
    .brand{font-size:24px;font-weight:bold;border-bottom:3px solid #0ea5e9;padding-bottom:16px}h1{font-size:24px;margin:28px 0 8px}
    p{color:#64748b;white-space:pre-wrap}table{width:100%;border-collapse:collapse;margin-top:24px;table-layout:fixed}
    th,td{padding:12px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{width:35%;color:#64748b;font-size:12px}
    footer{margin-top:32px;color:#64748b;font-size:11px}tr{break-inside:avoid}
    @media print{@page{size:A4;margin:15mm}.toolbar{display:none}body{background:white}.paper{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}
  </style></head><body><header class="toolbar"><strong>${escape(report.title)}</strong><button id="print-document" type="button">${download}</button></header>
  <main class="paper"><div class="brand">Freightbook.ai</div><h1>${escape(report.title)}</h1>${report.subtitle ? `<p>${escape(report.subtitle)}</p>` : ''}
  <table><tbody>${report.fields.map((field) => `<tr><th scope="row">${escape(field.label)}</th><td>${escape(field.value === '' ? '—' : field.value)}</td></tr>`).join('')}</tbody></table>
  <footer>${generated}: ${escape(new Date().toLocaleString(locale))}</footer></main></body></html>`;
};

/** Same preview-first browser PDF printing used by the invoice documents. */
export const openReportPreview = (report: Report, lang: Language): void => {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error(lang === 'bs' ? 'Dozvolite skočne prozore za pregled izvještaja.' : lang === 'de' ? 'Bitte Pop-ups für die Berichtsvorschau zulassen.' : 'Allow pop-ups to preview the report.');
  popup.opener = null;
  popup.document.open();
  popup.document.write(reportHtml(report, lang));
  popup.document.close();
  popup.document.getElementById('print-document')?.addEventListener('click', () => popup.print());
};
