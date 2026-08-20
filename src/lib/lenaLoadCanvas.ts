import * as XLSX from 'xlsx';
import { api, BulkLoadRow, LoadScanResult } from '../services/api';

export const LENA_LOAD_FILE_ACCEPT = 'image/*,application/pdf,.pdf,.xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type LenaCanvasMode = 'new_load' | 'bulk';

export type LenaAttachment = {
  name: string;
  type: string;
  size: number;
  loadScan?: LoadScanResult;
  bulkRows?: BulkLoadRow[];
};

const spreadsheetExtensions = ['.xlsx', '.xls', '.csv'];

export const isLenaSpreadsheet = (file: File) =>
  spreadsheetExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))
  || file.type === 'text/csv'
  || file.type === 'application/vnd.ms-excel'
  || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const isSupportedLenaFile = (file: File) =>
  file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || isLenaSpreadsheet(file);

const readAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
  reader.readAsDataURL(file);
});

const readAsArrayBuffer = (file: File): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
  reader.readAsArrayBuffer(file);
});

const spreadsheetToText = async (file: File): Promise<string> => {
  const workbook = XLSX.read(await readAsArrayBuffer(file), { type: 'array' });
  return workbook.SheetNames.map((name) => {
    const text = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return workbook.SheetNames.length > 1 ? `# ${name}\n${text}` : text;
  }).join('\n\n').trim();
};

export const analyzeLenaAttachment = async (file: File, mode: LenaCanvasMode): Promise<LenaAttachment> => {
  if (!isSupportedLenaFile(file)) {
    throw new Error('Use an Excel, CSV, image, or PDF file.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('The file is larger than 15 MB. Please use a smaller file.');
  }

  const base = { name: file.name, type: file.type || 'application/octet-stream', size: file.size };
  if (isLenaSpreadsheet(file)) {
    const text = await spreadsheetToText(file);
    if (text.length < 8) throw new Error('This spreadsheet appears to be empty.');
    const response = await api.loads.scanBulkText(text);
    return { ...base, bulkRows: response.data.rows };
  }

  const dataUrl = await readAsDataUrl(file);
  const encoded = { base64: dataUrl.split(',')[1] || '', mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined), filename: file.name };
  if (mode === 'bulk') {
    const response = await api.loads.scanBulk([encoded]);
    return { ...base, bulkRows: response.data.rows };
  }

  const response = await api.loads.scan([encoded]);
  return { ...base, loadScan: response.data };
};

export const formatAttachmentSize = (size: number) => size >= 1024 * 1024
  ? `${(size / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(size / 1024))} KB`;
