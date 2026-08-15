import { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

export const adminFieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white';
export const AdminField = ({ label, children }: { label: string; children: ReactNode }) => <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;

export const AdminFormModal = ({ open, title, description, submitting, error, onClose, onSubmit, children }: { open: boolean; title: string; description: string; submitting: boolean; error: string; onClose: () => void; onSubmit: () => void; children: ReactNode }) => {
  if (!open) return null;
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(); };
  return <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"><button type="button" className="absolute inset-0 cursor-pointer" aria-label="Close" onClick={onClose} /><form onSubmit={submit} className="relative my-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800"><div><h2 className="text-2xl font-black dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><button type="button" onClick={onClose} className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"><X className="h-5 w-5" /></button></div><div className="max-h-[70vh] overflow-y-auto p-5">{error && <div className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{error}</div>}<div className="grid gap-4 sm:grid-cols-2">{children}</div></div><div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button></div></form></div>;
};
