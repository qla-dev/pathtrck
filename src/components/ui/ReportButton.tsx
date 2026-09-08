import { FileText } from 'lucide-react';
import type { Language } from '../../types';
import { openReportPreview, type Report } from '../../lib/reportPreview';
import { showError } from '../../lib/swal';

export const ReportButton = ({ report, lang }: { report: Report; lang: Language }) => <button type="button"
  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
  onClick={() => {
    try { openReportPreview(report, lang); }
    catch (error) { void showError(lang === 'bs' ? 'Pregled nije dostupan' : lang === 'de' ? 'Vorschau nicht verfügbar' : 'Preview unavailable', error instanceof Error ? error.message : undefined); }
  }}><FileText className="h-4 w-4" />{lang === 'bs' ? 'PDF izvještaj' : lang === 'de' ? 'PDF-Bericht' : 'PDF report'}</button>;
