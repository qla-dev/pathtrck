import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Code2, Eye, Heading3, List, Maximize2, Minimize2, PanelTop, Pilcrow } from 'lucide-react';

type EmailHtmlEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const snippets = [
  { label: 'Paragraph', icon: Pilcrow, html: '<p style="margin:0 0 16px;line-height:1.7;">Write your paragraph here.</p>' },
  { label: 'Heading', icon: Heading3, html: '<h3 style="margin:24px 0 10px;font-size:20px;line-height:1.3;color:#0F172A;">Section heading</h3>' },
  { label: 'List', icon: List, html: '<ul style="margin:0 0 18px;padding-left:24px;line-height:1.8;list-style-type:disc;"><li style="margin-bottom:5px;">First benefit</li><li style="margin-bottom:5px;">Second benefit</li><li>Third benefit</li></ul>' },
  { label: 'Feature', icon: PanelTop, html: '<div style="margin:14px 0;padding:18px;border:1px solid #E2E8F0;border-radius:14px;background:#F8FAFC;"><strong style="display:block;margin-bottom:6px;color:#0F172A;">✦ Feature title</strong><span style="color:#475569;line-height:1.6;">Explain the feature and its value.</span></div>' },
];

const emailIcons = ['✦', '🤖', '🚚', '📦', '📍', '🗺️', '📊', '💬', '🔔', '✓'];

export const sanitizeEmailHtml = (html: string) => {
  if (typeof DOMParser === 'undefined') return html;
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  documentNode.querySelectorAll('script, iframe, object, embed, form, input, button, meta, link').forEach((node) => node.remove());
  documentNode.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return documentNode.body.innerHTML;
};

export const EmailHtmlEditor = ({ value, onChange }: EmailHtmlEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (mode === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.innerHTML = sanitizeEmailHtml(value);
    }
  }, [mode, fullscreen]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [fullscreen]);

  const syncVisualEditor = () => {
    if (visualEditorRef.current) onChange(sanitizeEmailHtml(visualEditorRef.current.innerHTML));
  };

  const insertHtml = (html: string) => {
    if (mode === 'visual') {
      visualEditorRef.current?.focus();
      document.execCommand('insertHTML', false, html);
      syncVisualEditor();
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${html}${value.slice(end)}`;
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const cursor = start + html.length;
      textarea?.setSelectionRange(cursor, cursor);
    });
  };

  const editor = (
    <div className={fullscreen
      ? 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950'
      : 'relative overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-primary dark:border-slate-700 dark:bg-slate-950'}>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 p-2 pr-12 dark:border-slate-700 dark:bg-slate-900">
        <div className="mr-1 flex rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800">
          <button type="button" onClick={() => setMode('visual')} className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[11px] font-bold ${mode === 'visual' ? 'bg-white text-primary shadow-sm dark:bg-slate-950' : 'text-slate-500'}`}><Eye className="h-3.5 w-3.5" /> Visual</button>
          <button type="button" onClick={() => setMode('html')} className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[11px] font-bold ${mode === 'html' ? 'bg-white text-primary shadow-sm dark:bg-slate-950' : 'text-slate-500'}`}><Code2 className="h-3.5 w-3.5" /> HTML</button>
        </div>
        {snippets.map(({ label, icon: Icon, html }) => (
          <button key={label} type="button" onClick={() => insertHtml(html)} title={`Insert ${label.toLowerCase()}`} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
        <button type="button" onClick={() => setFullscreen((current) => !current)} aria-label={fullscreen ? 'Exit fullscreen' : 'Open fullscreen editor'} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="absolute right-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {mode === 'visual' ? (
        <div
          ref={visualEditorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncVisualEditor}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
          }}
          aria-label="Visual email message editor"
          className={fullscreen
            ? 'min-h-0 w-full flex-1 overflow-auto bg-transparent p-6 text-sm leading-6 text-slate-800 outline-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 dark:text-slate-100'
            : 'h-72 w-full overflow-auto bg-transparent p-4 text-sm leading-6 text-slate-800 outline-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 dark:text-slate-100'}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-label="Email message HTML"
          className={fullscreen
            ? 'min-h-0 w-full flex-1 resize-none bg-transparent p-6 font-mono text-sm leading-6 text-slate-800 outline-none dark:text-slate-100'
            : 'h-72 w-full resize-none overflow-auto bg-transparent p-3 font-mono text-xs leading-5 text-slate-800 outline-none dark:text-slate-100'}
        />
      )}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Email-safe icons</span>
        {emailIcons.map((icon) => <button key={icon} type="button" onClick={() => insertHtml(`<span role="img" aria-label="feature icon">${icon}</span>`)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-sm hover:border-primary dark:border-slate-700 dark:bg-slate-950">{icon}</button>)}
      </div>
    </div>
  );

  return (
    <>
      {!fullscreen && editor}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {fullscreen && (
            <motion.div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm md:p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setFullscreen(false);
              }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Fullscreen email editor"
                className="h-[calc(100dvh-1.5rem)] w-full max-w-7xl md:h-[calc(100dvh-3rem)]"
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                {editor}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
