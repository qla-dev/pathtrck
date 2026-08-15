import { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  Building2,
  CheckCircle2,
  Eye,
  Image,
  Laptop,
  MailCheck,
  Palette,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Type,
  Users,
} from 'lucide-react';

import { Language } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type Alignment = 'left' | 'center';
type PreviewMode = 'desktop' | 'mobile';

export const EmailStudioView = ({ lang: _lang }: { lang: Language }) => {
  const companies = useApiList(api.companies.list, { per_page: 100 });
  const [campaignName, setCampaignName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#00AEEF');
  const [backgroundColor, setBackgroundColor] = useState('#F1F5F9');
  const [contentColor, setContentColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#0F172A');
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [fontSize, setFontSize] = useState(16);
  const [radius, setRadius] = useState(20);
  const [alignment, setAlignment] = useState<Alignment>('left');
  const [audience, setAudience] = useState('all');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [status, setStatus] = useState('Not saved');
  const [templateId, setTemplateId] = useState<number | null>(null);

  const audiences = useMemo(() => [
    { id: 'all', label: 'Logistics companies', count: companies.items.length },
    { id: 'enterprise', label: 'Enterprise companies', count: companies.items.filter((item) => item.plan === 'enterprise').length },
    { id: 'trial', label: 'Trial accounts', count: companies.items.filter((item) => item.plan === 'trial').length },
    { id: 'inactive', label: 'Inactive companies', count: companies.items.filter((item) => item.status === 'inactive').length },
    { id: 'verified', label: 'Verified companies', count: companies.items.filter((item) => item.status === 'verified').length },
  ], [companies.items]);
  const audienceData = useMemo(() => audiences.find((item) => item.id === audience) || audiences[0], [audience, audiences]);
  const fieldClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white';
  const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

  const saveTemplate = async () => {
    if (!campaignName.trim() || !subject.trim() || !body.trim()) { setStatus('Name, subject and body are required'); return; }
    setStatus('Saving...');
    try {
      const user = await api.auth.me();
      const data = { created_by_user_id: user.id, name: campaignName, subject, html_body: `<h1>${heading}</h1><p>${body}</p>`, design: { senderName, preheader, buttonText, buttonUrl, heroImage, alignment, primaryColor, backgroundColor }, is_active: true };
      const response = templateId ? await api.emailTemplates.update(templateId, data) : await api.emailTemplates.create(data);
      setTemplateId(Number(response.data.id));
      setStatus('Template saved to database');
    } catch (caught) { setStatus(caught instanceof Error ? caught.message : 'Template could not be saved'); }
  };
  const sendTest = () => {
    if (!/^\S+@\S+\.\S+$/.test(testEmail)) { setStatus('Enter a valid test email'); return; }
    setStatus('Test email delivery is not configured on the backend');
  };
  const prepareCampaign = async () => {
    if (!templateId) { setStatus('Save the template first'); return; }
    try { const user = await api.auth.me(); await api.emailCampaigns.create({ email_template_id: templateId, created_by_user_id: user.id, name: campaignName, status: 'draft' }); setStatus(`Campaign draft saved for ${audienceData.count} companies`); }
    catch (caught) { setStatus(caught instanceof Error ? caught.message : 'Campaign could not be saved'); }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/20"><Sparkles className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Superadmin communication</p><h1 className="text-2xl font-black dark:text-white">Company Email Studio</h1></div></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={saveTemplate} className="gap-2"><Save className="h-4 w-4" /> Save template</Button><Button onClick={prepareCampaign} className="gap-2"><Send className="h-4 w-4" /> Prepare send</Button></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" />{status}</span><span>·</span><span>{audienceData.count} recipients</span></div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2"><MailCheck className="h-5 w-5 text-primary" /><p className="font-black dark:text-white">Campaign</p></div>
            <div className="mt-4 space-y-3">
              <label><span className={labelClass}>Campaign name</span><input className={fieldClass} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></label>
              <label><span className={labelClass}>Sender name</span><input className={fieldClass} value={senderName} onChange={(event) => setSenderName(event.target.value)} /></label>
              <label><span className={labelClass}>Subject line</span><input className={fieldClass} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
              <label><span className={labelClass}>Preview text</span><input className={fieldClass} value={preheader} onChange={(event) => setPreheader(event.target.value)} /></label>
              <label><span className={labelClass}>Audience</span><select className={fieldClass} value={audience} onChange={(event) => setAudience(event.target.value)}>{audiences.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.count})</option>)}</select></label>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2"><Type className="h-5 w-5 text-primary" /><p className="font-black dark:text-white">Content</p></div>
            <div className="mt-4 space-y-3">
              <label><span className={labelClass}>Headline</span><input className={fieldClass} value={heading} onChange={(event) => setHeading(event.target.value)} /></label>
              <label><span className={labelClass}>Message</span><textarea className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={body} onChange={(event) => setBody(event.target.value)} /></label>
              <div className="grid grid-cols-2 gap-3"><label><span className={labelClass}>Button text</span><input className={fieldClass} value={buttonText} onChange={(event) => setButtonText(event.target.value)} /></label><label><span className={labelClass}>Button URL</span><input className={fieldClass} value={buttonUrl} onChange={(event) => setButtonUrl(event.target.value)} /></label></div>
              <label><span className={labelClass}>Hero image URL</span><div className="relative"><Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={cn(fieldClass, 'pl-9')} value={heroImage} onChange={(event) => setHeroImage(event.target.value)} /></div></label>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /><p className="font-black dark:text-white">Design system</p></div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[['Brand', primaryColor, setPrimaryColor], ['Page', backgroundColor, setBackgroundColor], ['Card', contentColor, setContentColor], ['Text', textColor, setTextColor]].map(([label, value, setter]) => <label key={String(label)}><span className={labelClass}>{String(label)} color</span><div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2 dark:border-slate-700"><input type="color" value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="h-7 w-8 cursor-pointer border-0 bg-transparent" /><span className="text-xs font-mono text-slate-500">{String(value)}</span></div></label>)}
            </div>
            <div className="mt-3 space-y-3">
              <label><span className={labelClass}>Font family</span><select className={fieldClass} value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="'Trebuchet MS', sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option><option value="'Courier New', monospace">Courier New</option></select></label>
              <label><span className={labelClass}>Body font size · {fontSize}px</span><input type="range" min="12" max="22" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="w-full accent-primary" /></label>
              <label><span className={labelClass}>Card radius · {radius}px</span><input type="range" min="0" max="36" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="w-full accent-primary" /></label>
              <div><span className={labelClass}>Text alignment</span><div className="grid grid-cols-2 gap-2"><button onClick={() => setAlignment('left')} className={cn('flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold', alignment === 'left' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800')}><AlignLeft className="h-4 w-4" /> Left</button><button onClick={() => setAlignment('center')} className={cn('flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold', alignment === 'center' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800')}><AlignCenter className="h-4 w-4" /> Center</button></div></div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /><div><p className="font-black dark:text-white">Live email preview</p><p className="text-xs text-slate-500">{subject} · {preheader}</p></div></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button onClick={() => setPreviewMode('desktop')} className={cn('flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold', previewMode === 'desktop' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-slate-500')}><Laptop className="h-4 w-4" /> Desktop</button><button onClick={() => setPreviewMode('mobile')} className={cn('flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold', previewMode === 'mobile' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-slate-500')}><Smartphone className="h-4 w-4" /> Mobile</button></div></div>
            <div className="mt-5 overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950 md:p-8">
              <div className={cn('mx-auto overflow-hidden shadow-2xl transition-all', previewMode === 'mobile' ? 'max-w-[390px]' : 'max-w-[760px]')} style={{ backgroundColor, fontFamily }}>
                <div style={{ padding: previewMode === 'mobile' ? 18 : 32 }}>
                  <div style={{ color: primaryColor, fontWeight: 900, fontSize: 20, marginBottom: 20 }}>smartfreight.ai</div>
                  <div style={{ backgroundColor: contentColor, borderRadius: radius, overflow: 'hidden', color: textColor, textAlign: alignment }}>
                    {heroImage && <img src={heroImage} alt="Campaign hero" style={{ width: '100%', height: previewMode === 'mobile' ? 160 : 260, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: previewMode === 'mobile' ? 22 : 40 }}>
                      <p style={{ color: primaryColor, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>Smartfreight update</p>
                      <h2 style={{ fontSize: previewMode === 'mobile' ? 27 : 38, lineHeight: 1.1, margin: '14px 0', color: textColor }}>{heading}</h2>
                      <p style={{ fontSize, lineHeight: 1.65, margin: 0, color: textColor, opacity: 0.78 }}>{body}</p>
                      <a href={buttonUrl} style={{ display: 'inline-block', marginTop: 24, padding: '13px 22px', borderRadius: Math.min(radius, 14), backgroundColor: primaryColor, color: '#ffffff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>{buttonText}</a>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px 10px 4px', fontSize: 11, color: '#64748b' }}>Sent by {senderName} · Manage email preferences · Unsubscribe</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><p className="font-black dark:text-white">Audience summary</p></div><div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><div className="flex items-center gap-3"><Building2 className="h-8 w-8 text-violet-500" /><div><p className="text-2xl font-black dark:text-white">{audienceData.count}</p><p className="text-sm text-slate-500">{audienceData.label}</p></div></div></div><p className="mt-3 text-xs text-slate-500">Recipients will be resolved from verified company billing and operations contacts before sending.</p></Card>
            <Card><div className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /><p className="font-black dark:text-white">Send a test</p></div><div className="mt-4 flex gap-2"><input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className={fieldClass} placeholder="you@company.com" /><Button onClick={sendTest}>Send</Button></div><p className="mt-3 text-xs text-slate-500">Test delivery uses the current live design and content.</p></Card>
          </div>
        </div>
      </div>
    </div>
  );
};
