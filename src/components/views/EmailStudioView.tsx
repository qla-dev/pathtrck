import { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  CheckCircle2,
  Eye,
  Image,
  Laptop,
  MailCheck,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Type,
} from 'lucide-react';

import { Language } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { BrandWordmark } from '../ui/BrandWordmark';
import { AudienceSelection } from '../email/AudienceSelection';
import { EmailHtmlEditor, sanitizeEmailHtml } from '../email/EmailHtmlEditor';

type Alignment = 'left' | 'center';
type PreviewMode = 'desktop' | 'mobile';

const DEFAULT_EMAIL_HTML = `
<p style="margin:0 0 16px;font-size:17px;line-height:1.75;color:#334155;">Freightbook.ai povezuje svaki dio vaše transportne operacije u jedan pregledan radni prostor.</p>
<p style="margin:0 0 16px;font-size:17px;line-height:1.75;color:#334155;">Od prvog zahtjeva za prevoz i kreiranja tereta do koordinacije partnera, praćenja pošiljke i potvrde konačne isporuke, vaš tim može upravljati cijelim procesom uz jasnije informacije i manje nepovezanih alata.</p>
<p style="margin:0 0 22px;font-size:17px;line-height:1.75;color:#334155;">Pošiljaoci, logističke kompanije, dispečeri i vozači mogu sarađivati koristeći iste operativne podatke, smanjiti ponavljajući administrativni posao i imati važne informacije dostupne u svakoj fazi transporta.</p>
<div style="margin:22px 0;padding:20px;border-radius:16px;background:#F0F9FF;border:1px solid #BAE6FD;">
  <strong style="display:block;margin-bottom:8px;font-size:18px;color:#0369A1;">✦ Upoznajte LenaAI, svog AI asistenta za transport</strong>
  <span style="line-height:1.7;color:#334155;">Učitajte narudžbu, fakturu ili transportni dokument. LenaAI može sadržaj pretvoriti u strukturirani nacrt tereta, prepoznati ključne podatke o pošiljci i usmjeriti vaš tim prema sljedećem koraku.</span>
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border-collapse:separate;border-spacing:10px;">
  <tr>
    <td width="50%" valign="top" style="padding:18px;border:1px solid #E2E8F0;border-radius:14px;background:#F8FAFC;"><strong style="display:block;margin-bottom:7px;color:#0F172A;">🚚 Objavite i pronađite terete</strong><span style="font-size:14px;line-height:1.6;color:#475569;">Objavite prilike za cestovni, pomorski i zračni prevoz te se povežite s provjerenim logističkim partnerima.</span></td>
    <td width="50%" valign="top" style="padding:18px;border:1px solid #E2E8F0;border-radius:14px;background:#F8FAFC;"><strong style="display:block;margin-bottom:7px;color:#0F172A;">📍 Pratite svaku pošiljku</strong><span style="font-size:14px;line-height:1.6;color:#475569;">Pratite trenutnu lokaciju, ključne događaje, rutu i napredak isporuke iz jednog prikaza uživo.</span></td>
  </tr>
  <tr>
    <td width="50%" valign="top" style="padding:18px;border:1px solid #E2E8F0;border-radius:14px;background:#F8FAFC;"><strong style="display:block;margin-bottom:7px;color:#0F172A;">📊 Upravljajte flotnim operacijama</strong><span style="font-size:14px;line-height:1.6;color:#475569;">Koordinirajte vozače, vozila, ponude, dokumente i operativne zahtjeve bez nepovezanih alata.</span></td>
    <td width="50%" valign="top" style="padding:18px;border:1px solid #E2E8F0;border-radius:14px;background:#F8FAFC;"><strong style="display:block;margin-bottom:7px;color:#0F172A;">💬 Sarađujte u stvarnom vremenu</strong><span style="font-size:14px;line-height:1.6;color:#475569;">Povežite dispečere, vozače, kupce i kompanije pomoću zajedničkih podataka i poruka.</span></td>
  </tr>
</table>
<h3 style="margin:28px 0 12px;font-size:21px;line-height:1.3;color:#0F172A;">Jedan proces, od dokumenta do isporuke</h3>
<ol style="margin:0 0 24px;padding-left:26px;line-height:1.9;color:#334155;list-style-type:decimal;"><li style="margin-bottom:5px;">Kreirajte ili uvezite strukturirani teret.</li><li style="margin-bottom:5px;">Povežite odgovarajuću kompaniju, vozača i vozilo.</li><li style="margin-bottom:5px;">Pratite realizaciju i držite sve dokumente povezanim.</li><li>Pregledajte isporuku, troškove i operativnu historiju.</li></ol>
<h3 style="margin:28px 0 12px;font-size:21px;line-height:1.3;color:#0F172A;">Napravljeno za sve učesnike u lancu snabdijevanja</h3>
<ul style="margin:0 0 24px;padding-left:26px;line-height:1.8;color:#334155;list-style-type:disc;">
  <li style="margin-bottom:7px;"><strong>Pošiljaoci i kupci</strong> mogu organizirati transportne zahtjeve, dokumente i očekivanja isporuke.</li>
  <li style="margin-bottom:7px;"><strong>Logističke kompanije</strong> mogu koordinirati terete, ponude, timove, vozila i komercijalne procese.</li>
  <li style="margin-bottom:7px;"><strong>Dispečeri</strong> imaju jasan pregled dnevnih operacija i mogu brže reagovati kada se plan promijeni.</li>
  <li><strong>Vozači</strong> mogu pristupiti relevantnim informacijama o teretu, navigaciji i komunikaciji na jednom mjestu.</li>
</ul>
<div style="margin:24px 0;padding:22px;border-radius:16px;background:#0F172A;color:#FFFFFF;">
  <strong style="display:block;margin-bottom:9px;font-size:19px;color:#FFFFFF;">🔔 Budite informisani bez stalnog traženja novosti</strong>
  <span style="line-height:1.7;color:#CBD5E1;">Zajednički statusi, obavijesti, napomene i povezani zapisi omogućavaju svim ovlaštenim korisnicima da rade na osnovu istih operativnih informacija.</span>
</div>
<h3 style="margin:28px 0 12px;font-size:21px;line-height:1.3;color:#0F172A;">Fleksibilna platforma za svakodnevne transportne poslove</h3>
<ul style="margin:0 0 24px;padding-left:26px;line-height:1.8;color:#334155;list-style-type:disc;">
  <li style="margin-bottom:7px;">Procesi za cestovni, pomorski i zračni prevoz</li>
  <li style="margin-bottom:7px;">Pronalaženje tereta, ponude i koordinacija rezervacija</li>
  <li style="margin-bottom:7px;">Praćenje pošiljki, ruta i trenutnog operativnog konteksta</li>
  <li style="margin-bottom:7px;">Upravljanje flotom, vozačima, dokumentima i kontaktima</li>
  <li>Analitika, napomene, finansijski zapisi i timska saradnja</li>
</ul>
<p style="margin:0;line-height:1.75;color:#334155;">Trošite manje vremena na kopiranje podataka između sistema, a više na sigurno i efikasno kretanje robe. Freightbook.ai pruža rastućim logističkim timovima jasniju i bolje povezanu osnovu za svakodnevni rad.</p>`;

export const EmailStudioView = ({ lang: _lang }: { lang: Language }) => {
  const companies = useApiList(api.companies.list, { per_page: 100 });
  const [campaignName, setCampaignName] = useState('Freightbook.ai: Pametnije upravljanje transportom');
  const [senderName, setSenderName] = useState('Freightbook.ai Team');
  const [subject, setSubject] = useState('Povežite cijelu transportnu operaciju na jednom mjestu');
  const [preheader, setPreheader] = useState('Brže objavite terete, koordinirajte flotu i pratite svaku pošiljku uz Freightbook.ai.');
  const [heading, setHeading] = useState('Vodite svaki teret uz manje ručnog rada');
  const [body, setBody] = useState(DEFAULT_EMAIL_HTML);
  const [buttonText, setButtonText] = useState('Get a free trial');
  const [buttonUrl, setButtonUrl] = useState('https://freightbook.ai');
  const [heroImage, setHeroImage] = useState('/payment-panel-logistics-plane-v2.jpg');
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
  const [audienceSelectionOpen, setAudienceSelectionOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [editorSidebarOpen, setEditorSidebarOpen] = useState(true);

  const audiences = useMemo(() => [
    { id: 'all', label: 'Logistics companies', count: companies.items.length },
    { id: 'enterprise', label: 'Enterprise companies', count: companies.items.filter((item) => item.plan === 'enterprise').length },
    { id: 'trial', label: 'Trial accounts', count: companies.items.filter((item) => item.plan === 'trial').length },
    { id: 'inactive', label: 'Inactive companies', count: companies.items.filter((item) => item.status === 'inactive').length },
    { id: 'verified', label: 'Verified companies', count: companies.items.filter((item) => item.status === 'verified').length },
  ], [companies.items]);
  const audienceData = useMemo(() => audiences.find((item) => item.id === audience) || audiences[0], [audience, audiences]);
  const sanitizedBody = useMemo(() => sanitizeEmailHtml(body), [body]);
  const fieldClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white';
  const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

  const saveTemplate = async (): Promise<number | null> => {
    if (!campaignName.trim() || !subject.trim() || !body.trim()) { setStatus('Name, subject and body are required'); return null; }
    setStatus('Saving...');
    try {
      const user = await api.auth.me();
      const data = { created_by_user_id: user.id, name: campaignName, subject, html_body: sanitizeEmailHtml(`<h1>${heading}</h1>${body}`), design: { senderName, preheader, buttonText, buttonUrl, heroImage, alignment, primaryColor, backgroundColor }, is_active: true };
      const response = templateId ? await api.emailTemplates.update(templateId, data) : await api.emailTemplates.create(data);
      const savedTemplateId = Number(response.data.id);
      setTemplateId(savedTemplateId);
      setStatus('Template saved to database');
      return savedTemplateId;
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'Template could not be saved');
      return null;
    }
  };
  const sendTest = () => {
    if (!/^\S+@\S+\.\S+$/.test(testEmail)) { setStatus('Enter a valid test email'); return; }
    setStatus('Test email delivery is not configured on the backend');
  };
  const openAudienceSelection = () => {
    setAudienceSelectionOpen(true);
  };
  const prepareCampaign = async () => {
    if (preparing) return;
    setPreparing(true);
    try {
      const preparedTemplateId = templateId || await saveTemplate();
      if (!preparedTemplateId) return;
      const user = await api.auth.me();
      await api.emailCampaigns.create({ email_template_id: preparedTemplateId, created_by_user_id: user.id, name: campaignName, status: 'draft' });
      setStatus(`Campaign draft saved for ${audienceData.count} companies`);
      setAudienceSelectionOpen(false);
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'Campaign could not be saved');
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        tone="violet"
        title="Company Email Studio"
        subtitle="Superadmin communication"
        badge={<span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />{status}</span>
          <span>·</span>
          <span>{audienceData.count} recipients</span>
        </span>}
        actions={<>
          <Button variant="outline" onClick={saveTemplate} className="gap-2"><Save className="h-4 w-4" /> Save template</Button>
          <Button onClick={openAudienceSelection} className="gap-2"><Send className="h-4 w-4" /> Prepare send</Button>
        </>}
      />

      <div className={cn('grid items-stretch gap-6', editorSidebarOpen && 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
        {editorSidebarOpen && <aside className="order-2 self-start space-y-5 xl:sticky xl:top-6">
          <Card contentClassName="p-5">
            <div className="flex items-center gap-2"><MailCheck className="h-5 w-5 text-primary" /><p className="font-black dark:text-white">Campaign</p></div>
            <div className="mt-4 space-y-3">
              <label><span className={labelClass}>Campaign name</span><input className={fieldClass} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></label>
              <label><span className={labelClass}>Sender name</span><input className={fieldClass} value={senderName} onChange={(event) => setSenderName(event.target.value)} /></label>
              <label><span className={labelClass}>Subject line</span><input className={fieldClass} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
              <label><span className={labelClass}>Preview text</span><input className={fieldClass} value={preheader} onChange={(event) => setPreheader(event.target.value)} /></label>
            </div>
          </Card>

          <Card contentClassName="p-5">
            <div className="flex items-center gap-2"><Type className="h-5 w-5 text-primary" /><p className="font-black dark:text-white">Content</p></div>
            <div className="mt-4 space-y-3">
              <label><span className={labelClass}>Headline</span><input className={fieldClass} value={heading} onChange={(event) => setHeading(event.target.value)} /></label>
              <div><span className={labelClass}>Message HTML</span><EmailHtmlEditor value={body} onChange={setBody} /></div>
              <div className="grid grid-cols-2 gap-3"><label><span className={labelClass}>Button text</span><input className={fieldClass} value={buttonText} onChange={(event) => setButtonText(event.target.value)} /></label><label><span className={labelClass}>Button URL</span><input className={fieldClass} value={buttonUrl} onChange={(event) => setButtonUrl(event.target.value)} /></label></div>
              <label><span className={labelClass}>Hero image URL</span><div className="relative"><Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={cn(fieldClass, 'pl-9')} value={heroImage} onChange={(event) => setHeroImage(event.target.value)} /></div></label>
            </div>
          </Card>

          <Card contentClassName="p-5">
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
        </aside>}

        <div className="order-1 min-w-0 h-full">
          <Card className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /><div><p className="font-black dark:text-white">Live email preview</p><p className="text-xs text-slate-500">{subject} · {preheader}</p></div></div>
              <div className="flex w-full items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button onClick={() => setPreviewMode('desktop')} className={cn('flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold', previewMode === 'desktop' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-slate-500')}><Laptop className="h-4 w-4" /> Desktop</button><button onClick={() => setPreviewMode('mobile')} className={cn('flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold', previewMode === 'mobile' ? 'bg-white text-primary shadow-sm dark:bg-slate-900' : 'text-slate-500')}><Smartphone className="h-4 w-4" /> Mobile</button></div>
                <button
                  type="button"
                  onClick={() => setEditorSidebarOpen((current) => !current)}
                  className="ml-auto flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {editorSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  {editorSidebarOpen ? 'Hide editor' : 'Show editor'}
                </button>
              </div>
            </div>
            <div className="mt-5 overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950 md:p-8">
              <div className={cn('mx-auto overflow-hidden transition-all', previewMode === 'mobile' ? 'max-w-[390px]' : 'w-full')} style={{ backgroundColor, fontFamily }}>
                <div style={{ padding: previewMode === 'mobile' ? 18 : 32 }}>
                  <div style={{ marginBottom: 20 }}><BrandWordmark className="text-xl text-slate-900 dark:text-slate-900" /></div>
                  <div style={{ backgroundColor: contentColor, borderRadius: radius, overflow: 'hidden', color: textColor, textAlign: alignment }}>
                    {heroImage && <img src={heroImage} alt="Campaign hero" style={{ width: '100%', height: previewMode === 'mobile' ? 160 : 260, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: previewMode === 'mobile' ? 22 : 40 }}>
                      <p style={{ color: primaryColor, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>Freightbook.ai novosti</p>
                      <h2 style={{ fontSize: previewMode === 'mobile' ? 27 : 38, lineHeight: 1.1, margin: '14px 0', color: textColor }}>{heading}</h2>
                      <div className="[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" style={{ fontSize, lineHeight: 1.65, color: textColor }} dangerouslySetInnerHTML={{ __html: sanitizedBody }} />
                      <a href={buttonUrl} style={{ display: 'inline-block', marginTop: 24, padding: '13px 22px', borderRadius: Math.min(radius, 14), backgroundColor: primaryColor, color: '#ffffff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>{buttonText}</a>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px 10px 4px', fontSize: 11, color: '#64748b' }}>Poslao {senderName} · Upravljajte postavkama e-pošte · Odjava</div>
                </div>
              </div>
            </div>
          </Card>

        </div>
      </div>
      <AudienceSelection
        open={audienceSelectionOpen}
        audiences={audiences}
        audience={audience}
        testEmail={testEmail}
        feedback={status}
        preparing={preparing}
        onAudienceChange={setAudience}
        onTestEmailChange={setTestEmail}
        onSendTest={sendTest}
        onConfirm={() => void prepareCampaign()}
        onClose={() => setAudienceSelectionOpen(false)}
      />
    </div>
  );
};
