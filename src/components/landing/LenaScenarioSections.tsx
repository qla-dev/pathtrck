import { useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  FileText,
  MapPin,
  Package,
  PackageCheck,
  Plane,
  Route,
  Search,
  Ship,
  Sparkles,
  Tags,
  Truck,
} from 'lucide-react';
import { motion } from 'motion/react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { useScrollDownReveal } from '../../hooks/useScrollDownReveal';

type ScenarioLocale = 'en' | 'bs' | 'de';

const copy = {
  en: {
    loadEyebrow: 'LenaAI scenario 01',
    loadTitle: 'Turn a conversation into a complete load draft',
    loadDescription: 'Start naturally in chat. LenaAI asks only for missing information while the connected canvas collects every confirmed field in real time.',
    loadBullets: ['Upload an order or begin manually', 'Confirm route, cargo, dates and requirements', 'Review one structured canvas before publishing'],
    loadUser: 'Create a new load from this order.',
    loadFile: 'Purchase-order-2048.pdf attached',
    loadAi: 'I found the pickup, delivery, cargo and dates. Just choose the transport mode.',
    loadTransportRoad: 'Road',
    loadTransportAir: 'Air',
    loadTransportSea: 'Sea',
    loadTransportPending: 'Select mode',
    loadCanvas: 'Load canvas',
    loadProgress: '14 fields collected',
    loadReady: 'Draft ready for review',
    trackingEyebrow: 'LenaAI scenario 02',
    trackingTitle: 'Ask where a shipment is and continue tracking now',
    trackingDescription: 'A tracking number becomes an immediate operational answer. LenaAI connects the current shipment record, route and latest event without forcing the user through several screens.',
    trackingBullets: ['Search by Freightbook tracking number', 'See current position and latest milestone', 'Open full tracking details from the answer'],
    trackingUser: 'Track shipment FB-C-26052.',
    trackingAi: 'The shipment is in delivery near Munich. The latest checkpoint was confirmed 18 minutes ago.',
    trackingNow: 'Track now',
    trackingLive: 'Live shipment status',
    trackingEta: 'Estimated arrival tomorrow at 07:20',
    trackingCheckpoint: 'Munich checkpoint confirmed',
    hsEyebrow: 'LenaAI scenario 03',
    hsTitle: 'Detect relevant HS codes from real goods descriptions',
    hsDescription: 'Paste product names or upload a commercial document. LenaAI separates the goods, identifies likely classifications and keeps the result ready for the load workflow.',
    hsBullets: ['Read multilingual product descriptions', 'Return code suggestions with clear labels', 'Move selected codes directly into the cargo canvas'],
    hsUser: 'Find HS codes for the goods in this invoice.',
    hsAi: 'I separated six product groups and found the strongest HS matches. Review the suggestions before applying them.',
    hsDocument: 'Commercial invoice',
    hsDetected: 'HS suggestions detected',
    hsApply: 'Apply to load',
    bookEyebrow: 'LenaAI scenario 04',
    bookTitle: 'Reserve a load straight from the answer',
    bookDescription: 'When a load is open for booking, LenaAI shows the price and terms right in the conversation, so a driver or dispatcher can reserve it without leaving the chat.',
    bookBullets: ['Confirm price and payment terms at a glance', 'Reserve the load with a single tap', 'Get an immediate booking confirmation'],
    bookUser: 'Can I book load FB-2048?',
    bookAi: 'Yes, this load is open for direct booking. Price and payment terms are confirmed below.',
    bookCardTitle: 'Direct booking',
    bookCardSubtitle: 'Load FB-2048 · Sarajevo → Vienna',
    bookPriceLabel: 'Price',
    bookPrice: 'EUR 1,250',
    bookTermsLabel: 'Terms',
    bookTerms: 'Deferred · 30 days',
    bookAction: 'Reserve this load',
    bookConfirmed: 'Load booked — you are assigned',
  },
  bs: {
    loadEyebrow: 'LenaAI scenario 01',
    loadTitle: 'Pretvorite razgovor u potpun nacrt tereta',
    loadDescription: 'Započnite prirodno kroz chat. LenaAI pita samo za podatke koji nedostaju, dok povezani canvas u stvarnom vremenu prikuplja svako potvrđeno polje.',
    loadBullets: ['Učitajte narudžbu ili počnite ručno', 'Potvrdite rutu, robu, termine i zahtjeve', 'Pregledajte strukturirani canvas prije objave'],
    loadUser: 'Napravi novi teret iz ove narudžbe.',
    loadFile: 'Narudzba-2048.pdf je priložena',
    loadAi: 'Pronašla sam preuzimanje, isporuku, robu i termine. Samo odaberite način transporta.',
    loadTransportRoad: 'Cestovni',
    loadTransportAir: 'Zračni',
    loadTransportSea: 'Pomorski',
    loadTransportPending: 'Odaberite način',
    loadCanvas: 'Draft tereta',
    loadProgress: '14 polja prikupljeno',
    loadReady: 'Nacrt je spreman za pregled',
    trackingEyebrow: 'LenaAI scenario 02',
    trackingTitle: 'Pitajte gdje je pošiljka i odmah nastavite praćenje',
    trackingDescription: 'Broj za praćenje odmah postaje operativan odgovor. LenaAI povezuje trenutni zapis pošiljke, rutu i posljednji događaj bez prolaska kroz više ekrana.',
    trackingBullets: ['Pretraga putem Freightbook tracking broja', 'Trenutna lokacija i posljednji događaj', 'Otvaranje punih detalja direktno iz odgovora'],
    trackingUser: 'Prati pošiljku FB-C-26052.',
    trackingAi: 'Pošiljka je u isporuci u blizini Minhena. Posljednja kontrolna tačka potvrđena je prije 18 minuta.',
    trackingNow: 'Prati sada',
    trackingLive: 'Status pošiljke uživo',
    trackingEta: 'Očekivani dolazak sutra u 07:20',
    trackingCheckpoint: 'Kontrolna tačka Minhen potvrđena',
    hsEyebrow: 'LenaAI scenario 03',
    hsTitle: 'Prepoznajte odgovarajuće HS kodove iz stvarnog opisa robe',
    hsDescription: 'Zalijepite nazive proizvoda ili učitajte komercijalni dokument. LenaAI razdvaja robu, pronalazi vjerovatne klasifikacije i priprema rezultat za nastavak kreiranja tereta.',
    hsBullets: ['Čitanje opisa proizvoda na više jezika', 'Prijedlozi kodova sa jasnim nazivima', 'Direktno dodavanje odabranih kodova u canvas'],
    hsUser: 'Pronađi HS kodove za robu iz ove fakture.',
    hsAi: 'Razdvojila sam šest grupa proizvoda i pronašla najjača HS podudaranja. Pregledajte prijedloge prije primjene.',
    hsDocument: 'Komercijalna faktura',
    hsDetected: 'HS prijedlozi su pronađeni',
    hsApply: 'Dodaj u teret',
    bookEyebrow: 'LenaAI scenario 04',
    bookTitle: 'Rezervišite teret direktno iz odgovora',
    bookDescription: 'Kada je teret otvoren za rezervaciju, LenaAI prikazuje cijenu i uslove direktno u razgovoru, tako da vozač ili dispečer može rezervisati bez napuštanja chata.',
    bookBullets: ['Provjerite cijenu i uslove plaćanja na prvi pogled', 'Rezervišite teret jednim klikom', 'Odmah dobijte potvrdu rezervacije'],
    bookUser: 'Mogu li rezervisati teret FB-2048?',
    bookAi: 'Da, ovaj teret je otvoren za direktnu rezervaciju. Cijena i uslovi plaćanja su potvrđeni ispod.',
    bookCardTitle: 'Direktna rezervacija',
    bookCardSubtitle: 'Teret FB-2048 · Sarajevo → Vienna',
    bookPriceLabel: 'Cijena',
    bookPrice: 'EUR 1.250',
    bookTermsLabel: 'Uslovi',
    bookTerms: 'Odgođeno · 30 dana',
    bookAction: 'Rezerviši ovaj teret',
    bookConfirmed: 'Teret rezervisan — dodijeljeni ste',
  },
  de: {
    loadEyebrow: 'LenaAI Szenario 01',
    loadTitle: 'Vom Gespräch zum vollständigen Ladungsentwurf',
    loadDescription: 'Starten Sie einfach im Chat. LenaAI fragt nur fehlende Angaben ab, während der verbundene Canvas alle bestätigten Felder in Echtzeit sammelt.',
    loadBullets: ['Auftrag hochladen oder manuell beginnen', 'Route, Ware, Termine und Anforderungen bestätigen', 'Strukturierten Canvas vor der Veröffentlichung prüfen'],
    loadUser: 'Erstelle aus diesem Auftrag eine neue Ladung.',
    loadFile: 'Bestellung-2048.pdf wurde angehängt',
    loadAi: 'Abholung, Zustellung, Ware und Termine wurden erkannt. Wählen Sie nur noch die Transportart.',
    loadTransportRoad: 'Straße',
    loadTransportAir: 'Luft',
    loadTransportSea: 'See',
    loadTransportPending: 'Modus wählen',
    loadCanvas: 'Ladungs-Canvas',
    loadProgress: '14 Felder erfasst',
    loadReady: 'Entwurf zur Prüfung bereit',
    trackingEyebrow: 'LenaAI Szenario 02',
    trackingTitle: 'Sendungsstand abfragen und sofort weiterverfolgen',
    trackingDescription: 'Eine Trackingnummer wird direkt zu einer operativen Antwort. LenaAI verbindet den aktuellen Sendungsdatensatz, die Route und das letzte Ereignis.',
    trackingBullets: ['Suche mit Freightbook Trackingnummer', 'Aktuelle Position und letzter Meilenstein', 'Vollständige Trackingdetails aus der Antwort öffnen'],
    trackingUser: 'Verfolge die Sendung FB-C-26052.',
    trackingAi: 'Die Sendung befindet sich nahe München in Zustellung. Der letzte Kontrollpunkt wurde vor 18 Minuten bestätigt.',
    trackingNow: 'Jetzt verfolgen',
    trackingLive: 'Live-Sendungsstatus',
    trackingEta: 'Voraussichtliche Ankunft morgen um 07:20',
    trackingCheckpoint: 'Kontrollpunkt München bestätigt',
    hsEyebrow: 'LenaAI Szenario 03',
    hsTitle: 'Passende HS-Codes aus realen Warenbeschreibungen erkennen',
    hsDescription: 'Fügen Sie Produktnamen ein oder laden Sie ein Handelsdokument hoch. LenaAI trennt die Waren, erkennt wahrscheinliche Klassifizierungen und bereitet das Ergebnis für den Ladungsworkflow vor.',
    hsBullets: ['Mehrsprachige Produktbeschreibungen lesen', 'Codevorschläge mit klaren Bezeichnungen', 'Ausgewählte Codes direkt in den Canvas übernehmen'],
    hsUser: 'Finde HS-Codes für die Waren in dieser Rechnung.',
    hsAi: 'Sechs Produktgruppen wurden getrennt und die stärksten HS-Treffer gefunden. Prüfen Sie die Vorschläge vor der Übernahme.',
    hsDocument: 'Handelsrechnung',
    hsDetected: 'HS-Vorschläge erkannt',
    hsApply: 'Zur Ladung hinzufügen',
    bookEyebrow: 'LenaAI Szenario 04',
    bookTitle: 'Ladung direkt aus der Antwort reservieren',
    bookDescription: 'Wenn eine Ladung zur Buchung offen ist, zeigt LenaAI Preis und Zahlungsbedingungen direkt im Gespräch, damit Fahrer oder Disponent buchen können, ohne den Chat zu verlassen.',
    bookBullets: ['Preis und Zahlungsbedingungen auf einen Blick prüfen', 'Ladung mit einem Klick reservieren', 'Sofortige Buchungsbestätigung erhalten'],
    bookUser: 'Kann ich die Ladung FB-2048 buchen?',
    bookAi: 'Ja, diese Ladung ist zur Direktbuchung offen. Preis und Zahlungsbedingungen sind unten bestätigt.',
    bookCardTitle: 'Direktbuchung',
    bookCardSubtitle: 'Ladung FB-2048 · Sarajevo → Vienna',
    bookPriceLabel: 'Preis',
    bookPrice: 'EUR 1.250',
    bookTermsLabel: 'Konditionen',
    bookTerms: 'Gestundet · 30 Tage',
    bookAction: 'Diese Ladung reservieren',
    bookConfirmed: 'Ladung gebucht — Sie sind zugewiesen',
  },
} as const;

type ScenarioText = (typeof copy)[ScenarioLocale];

const messageVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: (index: number) => ({ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, delay: index * 0.16 } }),
};

const ScenarioCopy = ({ eyebrow, title, description, bullets, tone }: { eyebrow: string; title: string; description: string; bullets: readonly string[]; tone: 'sky' | 'orange' | 'violet' | 'green' }) => {
  const { ref, controls } = useScrollDownReveal({ opacity: 0, x: -28 }, { opacity: 1, x: 0 }, 0.28);
  return (
  <motion.div ref={ref} initial={{ opacity: 0, x: -28 }} animate={controls} transition={{ duration: 0.65 }} className="self-center">
    <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]', tone === 'sky' && 'bg-sky-500/10 text-sky-600', tone === 'orange' && 'bg-orange-500/10 text-orange-600', tone === 'violet' && 'bg-violet-500/10 text-violet-600', tone === 'green' && 'bg-green-500/10 text-green-600')}><Sparkles className="h-3.5 w-3.5" />{eyebrow}</div>
    <h3 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">{title}</h3>
    <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{description}</p>
    <div className="mt-7 space-y-3">{bullets.map((item) => <div key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200"><span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', tone === 'sky' && 'bg-sky-500', tone === 'orange' && 'bg-orange-500', tone === 'violet' && 'bg-violet-500', tone === 'green' && 'bg-green-500')}><CheckCircle2 className="h-3.5 w-3.5" /></span>{item}</div>)}</div>
  </motion.div>
  );
};

type TransportType = 'road' | 'air' | 'sea';

const LoadCreationVisual = ({ text }: { text: ScenarioText }) => {
  const { ref, controls } = useScrollDownReveal('hidden', 'visible', 0.32);
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null);
  const transportOptions: { key: TransportType; label: string; Icon: typeof Truck }[] = [
    { key: 'road', label: text.loadTransportRoad, Icon: Truck },
    { key: 'air', label: text.loadTransportAir, Icon: Plane },
    { key: 'sea', label: text.loadTransportSea, Icon: Ship },
  ];
  const selectedOption = transportOptions.find((option) => option.key === selectedTransport);
  return (
  <motion.div ref={ref} initial="hidden" animate={controls} className="relative grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
    <div className="space-y-6">
      <motion.div custom={0} variants={messageVariants} className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/15">{text.loadUser}</motion.div>
      <motion.div custom={1} variants={messageVariants} className="ml-auto w-fit max-w-[90%] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500"><FileText className="h-5 w-5" /></span><div><p className="text-xs font-black text-slate-900 dark:text-white">{text.loadFile}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">PDF · 248 KB</p></div></div></motion.div>
      <motion.div custom={2} variants={messageVariants} className="w-fit max-w-[60%]">
        <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-primary"><BrainCircuit className="h-4 w-4" />LenaAI</span>
        <div className="rounded-2xl rounded-bl-md border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-slate-700 shadow-lg shadow-sky-500/10 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-slate-200">{text.loadAi}</div>
      </motion.div>
      <motion.div custom={3} variants={messageVariants} className="flex flex-wrap gap-2">
        {transportOptions.map(({ key, label, Icon }) => {
          const selected = selectedTransport === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedTransport(key)}
              className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors', selected ? 'border-primary bg-primary text-white' : 'border-primary/20 bg-white text-primary hover:bg-primary/5 dark:bg-slate-950')}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          );
        })}
      </motion.div>
    </div>
    <motion.div custom={4} variants={messageVariants} className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl shadow-sky-500/10 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"><div className="flex min-w-0 items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white"><Package className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{text.loadCanvas}</span></div><span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black text-primary">{text.loadProgress}</span></div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {[
          { label: 'Sarajevo, BA', Icon: MapPin },
          { label: 'Vienna, AT', Icon: MapPin },
          { label: '11,200 kg', Icon: Package },
        ].map(({ label, Icon }, index) => (
          <motion.div key={label} custom={5 + index} variants={messageVariants} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate text-[11px] font-black text-slate-800 dark:text-white">{label}</p>
          </motion.div>
        ))}
        <motion.div custom={8} variants={messageVariants} className={cn('flex items-center gap-1.5 rounded-lg border p-2 transition-colors', selectedOption ? 'border-primary/40 bg-primary/5 dark:bg-primary/10' : 'border-dashed border-slate-300 dark:border-slate-600')}>
          {selectedOption ? <selectedOption.Icon className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Truck className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
          <p className={cn('min-w-0 flex-1 truncate text-[11px] font-black', selectedOption ? 'text-slate-800 dark:text-white' : 'text-slate-400')}>{selectedOption ? `${selectedOption.label} · FTL` : text.loadTransportPending}</p>
        </motion.div>
      </div>
      <motion.div custom={9} variants={messageVariants} className="mx-4 mb-4 mt-auto flex items-center gap-1.5 rounded-lg bg-emerald-500/10 p-2 text-[11px] font-black text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{text.loadReady}</motion.div>
    </motion.div>
  </motion.div>
  );
};

const TrackingProgressBar = () => {
  const { ref, controls } = useScrollDownReveal({ width: 0 }, { width: '68%' });
  return (
    <div className="absolute left-[12%] right-[12%] top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20"><motion.div ref={ref} initial={{ width: 0 }} animate={controls} transition={{ duration: 1.2, delay: 0.45 }} className="h-full rounded-full bg-emerald-400" /></div>
  );
};

const TrackingVisual = ({ text }: { text: ScenarioText }) => {
  const { ref, controls } = useScrollDownReveal('hidden', 'visible', 0.3);
  return (
  <motion.div ref={ref} initial="hidden" animate={controls} className="relative space-y-6">
    <motion.div custom={0} variants={messageVariants} className="ml-auto w-fit rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/15">{text.trackingUser}</motion.div>
    <motion.div custom={1} variants={messageVariants} className="w-fit max-w-[60%]">
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-orange-600"><BrainCircuit className="h-4 w-4" />LenaAI</span>
      <div className="rounded-2xl rounded-bl-md border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-slate-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-slate-200">{text.trackingAi}</div>
    </motion.div>
    <motion.div custom={2} variants={messageVariants} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-2xl shadow-orange-500/10">
      <div className="relative flex h-32 flex-col justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_30%_40%,rgba(249,115,22,0.3),transparent_24%),linear-gradient(135deg,#0f172a,#431407)] p-5">
        <div className="relative flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/70"><span>Sarajevo</span><span>Vienna</span></div>
        <div className="relative h-11">
          <TrackingProgressBar />
          <span className="absolute left-[10%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-white bg-emerald-400" /><span className="absolute right-[10%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-white bg-sky-400" />
          <motion.span custom={3} variants={messageVariants} className="absolute left-[58%] top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-xl"><Truck className="h-5 w-5" /></motion.span>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/7 p-4"><div className="flex items-center gap-2 text-xs font-black text-emerald-300"><Route className="h-4 w-4" />{text.trackingLive}</div><p className="mt-3 text-lg font-black">FB-C-26052</p></div>
        <div className="rounded-2xl bg-white/7 p-4"><div className="flex items-center gap-2 text-xs font-black text-sky-300"><Clock className="h-4 w-4" />ETA</div><p className="mt-3 text-sm font-bold">{text.trackingEta}</p></div>
      </div>
      <div className="mx-5 mb-5 flex items-center justify-between gap-3 rounded-2xl bg-emerald-400 px-4 py-3 text-slate-950"><span className="flex items-center gap-2 text-xs font-black"><CheckCircle2 className="h-4 w-4" />{text.trackingCheckpoint}</span><span className="flex shrink-0 items-center gap-1 text-xs font-black">{text.trackingNow}<ArrowRight className="h-4 w-4" /></span></div>
    </motion.div>
  </motion.div>
  );
};

const HsVisual = ({ text }: { text: ScenarioText }) => {
  const { ref, controls } = useScrollDownReveal('hidden', 'visible', 0.3);
  return (
  <motion.div ref={ref} initial="hidden" animate={controls} className="relative space-y-6">
    <motion.div custom={0} variants={messageVariants} className="ml-auto w-fit rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-bold text-white">{text.hsUser}</motion.div>
    <motion.div custom={1} variants={messageVariants} className="ml-auto w-fit max-w-[90%] rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-violet-500/10 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><FileText className="h-5 w-5" /></span><div><p className="font-black text-slate-900 dark:text-white">{text.hsDocument}</p><p className="text-xs text-slate-400">18 product lines</p></div></div><div className="mt-5 space-y-2">{[84, 66, 92, 58].map((width) => <span key={width} className="block h-2 rounded-full bg-slate-100 dark:bg-slate-800" style={{ width: `${width}%` }} />)}</div></motion.div>
    <motion.div custom={2} variants={messageVariants} className="w-fit max-w-[60%]">
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-600"><BrainCircuit className="h-4 w-4" />LenaAI</span>
      <div className="rounded-2xl rounded-bl-md border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-slate-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-slate-200">{text.hsAi}</div>
    </motion.div>
    <motion.div custom={3} variants={messageVariants} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-2xl shadow-violet-500/10 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white"><Tags className="h-4 w-4 shrink-0 text-violet-500" /><span className="truncate">{text.hsDetected}</span></div><Search className="h-4 w-4 shrink-0 text-slate-400" /></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">{[['842611', 'Overhead travelling cranes', '96%'], ['750110', 'Nickel mattes', '91%'], ['681490', 'Articles of mica', '87%']].map(([code, label, confidence], index) => <motion.div key={code} custom={4 + index} variants={messageVariants} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"><span className="shrink-0 rounded-md bg-violet-500/10 px-1.5 py-1 font-mono text-[10px] font-black text-violet-600">{code}</span><span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">{label}</span><span className="shrink-0 text-[11px] font-black text-emerald-500">{confidence}</span></motion.div>)}</div>
      <motion.button custom={7} variants={messageVariants} type="button" className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20"><Database className="h-4 w-4" />{text.hsApply}</motion.button>
    </motion.div>
  </motion.div>
  );
};

const BookingVisual = ({ text }: { text: ScenarioText }) => {
  const { ref, controls } = useScrollDownReveal('hidden', 'visible', 0.3);
  return (
  <motion.div ref={ref} initial="hidden" animate={controls} className="relative space-y-6">
    <motion.div custom={0} variants={messageVariants} className="ml-auto w-fit rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-bold text-white">{text.bookUser}</motion.div>
    <motion.div custom={1} variants={messageVariants} className="w-fit max-w-[60%]">
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-green-600"><BrainCircuit className="h-4 w-4" />LenaAI</span>
      <div className="rounded-2xl rounded-bl-md border border-green-200 bg-green-50 p-4 text-sm leading-6 text-slate-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-slate-200">{text.bookAi}</div>
    </motion.div>
    <motion.div custom={2} variants={messageVariants} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-2xl shadow-green-500/10 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><PackageCheck className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="truncate font-black text-slate-900 dark:text-white">{text.bookCardTitle}</p>
            <p className="truncate text-xs text-slate-500">{text.bookCardSubtitle}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-600">{text.bookPrice}</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <motion.div custom={3} variants={messageVariants} className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3">
          <Coins className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-primary">{text.bookPriceLabel}</p><p className="truncate text-sm font-black text-slate-900 dark:text-white">{text.bookPrice}</p></div>
        </motion.div>
        <motion.div custom={4} variants={messageVariants} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <CalendarClock className="h-4 w-4 shrink-0 text-slate-500" />
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{text.bookTermsLabel}</p><p className="truncate text-sm font-black text-slate-900 dark:text-white">{text.bookTerms}</p></div>
        </motion.div>
      </div>
      <motion.button custom={5} variants={messageVariants} type="button" className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20"><PackageCheck className="h-4 w-4" />{text.bookAction}<ArrowRight className="h-4 w-4" /></motion.button>
      <motion.div custom={6} variants={messageVariants} className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 p-2 text-[11px] font-black text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{text.bookConfirmed}</motion.div>
    </motion.div>
  </motion.div>
  );
};

export const LenaScenarioSections = ({ lang }: { lang: Language }) => {
  const locale: ScenarioLocale = lang === 'bs' || lang === 'de' ? lang : 'en';
  const text = copy[locale];

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      <section className="relative py-20 sm:py-24">
        <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <ScenarioCopy eyebrow={text.loadEyebrow} title={text.loadTitle} description={text.loadDescription} bullets={text.loadBullets} tone="sky" />
          <LoadCreationVisual text={text} />
        </div>
      </section>

      <section className="relative py-20 sm:py-24">
        <div className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[1.18fr_0.82fr] lg:items-center">
          <div className="lg:order-2"><ScenarioCopy eyebrow={text.trackingEyebrow} title={text.trackingTitle} description={text.trackingDescription} bullets={text.trackingBullets} tone="orange" /></div>
          <div className="lg:order-1"><TrackingVisual text={text} /></div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24">
        <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <ScenarioCopy eyebrow={text.hsEyebrow} title={text.hsTitle} description={text.hsDescription} bullets={text.hsBullets} tone="violet" />
          <HsVisual text={text} />
        </div>
      </section>

      <section className="relative pt-20 sm:pt-24">
        <div className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[1.18fr_0.82fr] lg:items-center">
          <div className="lg:order-2"><ScenarioCopy eyebrow={text.bookEyebrow} title={text.bookTitle} description={text.bookDescription} bullets={text.bookBullets} tone="green" /></div>
          <div className="lg:order-1"><BookingVisual text={text} /></div>
        </div>
      </section>
    </div>
  );
};
