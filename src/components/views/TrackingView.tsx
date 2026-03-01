import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, ChevronRight, Package as PackageIcon, Clock3, RotateCcw, Share2, Star, Bot, Route, Lock, Coins, Loader2, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Language, Package as PackageData } from '../../types';
import { MOCK_PACKAGES } from '../../mockData';
import { getSmartStatusUpdate } from '../../services/geminiService';
import { ui, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { Conversation } from '../chat/types';

export const TrackingView = ({ lang }: { lang: Language }) => {
  const [selectedPackage, setSelectedPackage] = useState<PackageData>(MOCK_PACKAGES[0]);
  const [smartStatus, setSmartStatus] = useState<string>("");
  const [rightTab, setRightTab] = useState<'tracker' | 'dispatch' | 'map' | 'timeline' | 'return' | 'returnRoutes' | 'share' | 'review'>('tracker');
  const [dispatchDraft, setDispatchDraft] = useState('');
  const [returnTokens, setReturnTokens] = useState(36);
  const [returnRoutesUnlocked, setReturnRoutesUnlocked] = useState(false);
  const [isUnlockingReturnRoutes, setIsUnlockingReturnRoutes] = useState(false);
  const [unlockStep, setUnlockStep] = useState(0);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  useEffect(() => {
    getSmartStatusUpdate(selectedPackage.status, selectedPackage.history[0].location).then(setSmartStatus);
  }, [selectedPackage]);

  useEffect(() => {
    setReturnRoutesUnlocked(false);
    setIsUnlockingReturnRoutes(false);
    setUnlockStep(0);
  }, [selectedPackage.id]);

  useEffect(() => {
    if (!isUnlockingReturnRoutes) return;
    const timer = setInterval(() => {
      setUnlockStep((prev) => (prev + 1) % 3);
    }, 700);
    return () => clearInterval(timer);
  }, [isUnlockingReturnRoutes]);

  const dispatchConversation = useMemo<Conversation>(
    () => ({
      id: `dispatch-${selectedPackage.id}`,
      name: 'Lena / Route Ops',
      role: lang === 'bs' ? 'Dispečer' : lang === 'de' ? 'Disponentin' : 'Dispatch Manager',
      channel: 'inapp',
      online: true,
      unread: 0,
      lastTime: 'now',
      messages: [
        {
          id: 'd0',
          sender: 'system',
          text:
            smartStatus ||
            (lang === 'bs'
              ? 'AI status se ažurira...'
              : lang === 'de'
                ? 'KI-Status wird aktualisiert...'
                : 'AI status is updating...'),
          time: lang === 'bs' ? 'AI' : lang === 'de' ? 'KI' : 'AI',
        },
        { id: 'd1', sender: 'other', text: 'Truck PT-19 reached Vienna checkpoint.', time: '09:10' },
        { id: 'd2', sender: 'me', text: 'Received. Updating ETA for customer now.', time: '09:12' },
        { id: 'd3', sender: 'other', text: 'Please share updated ETA once AI route sync completes.', time: '09:24' },
      ],
    }),
    [selectedPackage.id, smartStatus, lang]
  );

  const handleDispatchSend = () => {
    if (!dispatchDraft.trim()) return;
    setDispatchDraft('');
  };

  const handleAiDispatchCompose = () => {
    const seed =
      smartStatus ||
      (lang === 'bs'
        ? 'Azuriraj ETA i posalji status klijentu.'
        : lang === 'de'
          ? 'ETA aktualisieren und Status an den Kunden senden.'
          : 'Update ETA and send status to customer.');
    setDispatchDraft(seed);
  };

  const returnRouteSuggestions = useMemo(
    () => [
      {
        id: 's1',
        title: `${selectedPackage.destination} -> Vienna, AT`,
        deadhead: '42 km',
        cargo: lang === 'bs' ? 'Farmaceutski artikli' : lang === 'de' ? 'Pharma-Ware' : 'Pharma cargo',
        payout: 'EUR 740',
        eta: '03h 25m',
        confidence: 97,
      },
      {
        id: 's2',
        title: `${selectedPackage.destination} -> Zagreb, HR`,
        deadhead: '18 km',
        cargo: lang === 'bs' ? 'Potrosna roba' : lang === 'de' ? 'Verbrauchsgueter' : 'Retail goods',
        payout: 'EUR 520',
        eta: '02h 40m',
        confidence: 94,
      },
      {
        id: 's3',
        title: `${selectedPackage.destination} -> Berlin, DE`,
        deadhead: '61 km',
        cargo: lang === 'bs' ? 'Tehnicka oprema' : lang === 'de' ? 'Technische Ausruestung' : 'Technical equipment',
        payout: 'EUR 1,180',
        eta: '06h 10m',
        confidence: 92,
      },
    ],
    [selectedPackage.destination, lang]
  );

  const unlockSteps = [
    lang === 'bs' ? 'AI analizira aktivne koridore...' : lang === 'de' ? 'KI analysiert aktive Korridore...' : 'AI is scanning active corridors...',
    lang === 'bs' ? 'Filtriranje po profitabilnosti i deadhead km...' : lang === 'de' ? 'Filtere nach Profit und Leerfahrt-km...' : 'Filtering by profit and deadhead distance...',
    lang === 'bs' ? 'Finalizacija najboljih povratnih ruta...' : lang === 'de' ? 'Finalisiere beste Rueckrouten...' : 'Finalizing best return routes...',
  ];

  const handleUnlockReturnRoutes = () => {
    if (returnRoutesUnlocked || isUnlockingReturnRoutes || returnTokens < 10) return;
    setIsUnlockingReturnRoutes(true);
    setUnlockStep(0);
    setTimeout(() => {
      setIsUnlockingReturnRoutes(false);
      setReturnRoutesUnlocked(true);
      setReturnTokens((prev) => prev - 10);
    }, 2600);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Sidebar List */}
      <div className="lg:col-span-4 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder={u('common.searchTracking', 'Search tracking number...')}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-4">
          {MOCK_PACKAGES.map(pkg => (
            <button 
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg)}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all",
                selectedPackage.id === pkg.id 
                  ? "border-primary bg-primary/5 shadow-sm" 
                  : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pkg.carrier}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  pkg.status === 'Delivered' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                )}>{trPackageStatus(lang, pkg.status)}</span>
              </div>
              <p className="font-bold dark:text-white">{pkg.trackingNumber}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>{pkg.destination}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tracking Content (Amazon Inspired) */}
      <div className="lg:col-span-8 space-y-6">
        <div className="inline-flex h-12 items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          <button
            onClick={() => setRightTab('tracker')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'tracker' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <PackageIcon className="w-4 h-4" />
            {lang === 'bs' ? 'Tracker' : lang === 'de' ? 'Tracker' : 'Tracker'}
          </button>
          <button
            onClick={() => setRightTab('dispatch')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'dispatch' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Bot className="w-4 h-4" />
            {lang === 'bs' ? 'AI Dispečer' : lang === 'de' ? 'KI-Disponent' : 'AI Dispatch'}
          </button>
          <button
            onClick={() => setRightTab('map')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'map' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <MapPin className="w-4 h-4" />
            {lang === 'bs' ? 'Mapa' : lang === 'de' ? 'Karte' : 'Map'}
          </button>
          <button
            onClick={() => setRightTab('timeline')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'timeline' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Clock3 className="w-4 h-4" />
            {lang === 'bs' ? 'Timeline' : lang === 'de' ? 'Timeline' : 'Timeline'}
          </button>
          <button
            onClick={() => setRightTab('return')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'return' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            {lang === 'bs' ? 'Povrat' : lang === 'de' ? 'Rueckgabe' : 'Return'}
          </button>
          <button
            onClick={() => setRightTab('returnRoutes')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'returnRoutes' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Route className="w-4 h-4" />
            {lang === 'bs' ? 'Povratne rute' : lang === 'de' ? 'Rueckrouten' : 'Return Routes'}
          </button>
          <button
            onClick={() => setRightTab('share')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'share' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Share2 className="w-4 h-4" />
            {lang === 'bs' ? 'Podijeli' : lang === 'de' ? 'Teilen' : 'Share'}
          </button>
          <button
            onClick={() => setRightTab('review')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'review' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Star className="w-4 h-4" />
            {lang === 'bs' ? 'Recenzija' : lang === 'de' ? 'Bewertung' : 'Review'}
          </button>
        </div>

        {rightTab === 'tracker' && (
          <div className="amazon-card">
            <div className="amazon-header flex items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{lang === 'bs' ? 'Naručeno' : lang === 'de' ? 'Bestellt am' : 'Ordered on'}</p>
                  <p className="font-bold">Feb 26, 2026</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{lang === 'bs' ? 'Ukupno' : lang === 'de' ? 'Gesamt' : 'Total'}</p>
                  <p className="font-bold">€12.99</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{lang === 'bs' ? 'Šalje se za' : lang === 'de' ? 'Versand an' : 'Ship to'}</p>
                  <p className="font-bold text-primary flex items-center gap-1 cursor-pointer">
                    John Doe <ChevronRight className="w-3 h-3" />
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-slate-500">Order # {selectedPackage.trackingNumber}</p>
                <div className="flex gap-4 mt-1 text-xs font-medium text-primary">
                  <span className="cursor-pointer hover:underline">{lang === 'bs' ? 'Detalji narudžbe' : lang === 'de' ? 'Bestelldetails anzeigen' : 'View order details'}</span>
                  <span className="cursor-pointer hover:underline">{lang === 'bs' ? 'Račun' : lang === 'de' ? 'Rechnung' : 'Invoice'}</span>
                </div>
              </div>
            </div>
            <div className="amazon-body">
              <h2 className="text-xl font-bold text-emerald-600 mb-4">
                {selectedPackage.status === 'Delivered'
                  ? (lang === 'bs' ? 'Isporučeno danas' : lang === 'de' ? 'Heute zugestellt' : 'Delivered Today')
                  : (lang === 'bs' ? 'Dolazi do 20:00' : lang === 'de' ? 'Ankunft bis 20:00' : 'Arriving by 8 PM')}
              </h2>
              <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-8">
                <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" />
                <div className="absolute top-1/2 -translate-y-1/2 left-[37.5%] w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" />
                <div className="absolute top-1/2 -translate-y-1/2 left-[75%] w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" />
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-4 bg-slate-300 dark:bg-slate-700 rounded-full border-4 border-white dark:border-slate-900" />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>{lang === 'bs' ? 'Naručeno' : lang === 'de' ? 'Bestellt' : 'Ordered'}</span>
                <span>{lang === 'bs' ? 'Poslano' : lang === 'de' ? 'Versendet' : 'Shipped'}</span>
                <span>{lang === 'bs' ? 'Na dostavi' : lang === 'de' ? 'In Zustellung' : 'Out for delivery'}</span>
                <span>{lang === 'bs' ? 'Stiže' : lang === 'de' ? 'Ankunft' : 'Arriving'}</span>
              </div>
            </div>
          </div>
        )}

        {rightTab === 'dispatch' && (
          <div className="h-[620px]">
            <ChatConversationPanel
              activeConversation={dispatchConversation}
              draft={dispatchDraft}
              onDraftChange={setDispatchDraft}
              onSend={handleDispatchSend}
              messagePlaceholder={lang === 'bs' ? 'Piši poruku dispečeru...' : lang === 'de' ? 'Nachricht an Disposition schreiben...' : 'Write a message to dispatch...'}
              className="h-full"
              showAiDispatchButton
              aiDispatchLabel={lang === 'bs' ? 'Pisi uz AI dispecera' : lang === 'de' ? 'Mit KI-Dispo schreiben' : 'Write with AI Dispatch'}
              onAiDispatchClick={handleAiDispatchCompose}
            />
          </div>
        )}

        {rightTab === 'map' && (
          <Card title={u('tracking.liveLocation', 'Live Location')}>
            <div className="h-[520px] rounded-xl overflow-hidden relative">
               <MapContainer center={selectedPackage.currentLocation} zoom={13} className="h-full w-full">
                  <TileLayer 
                    url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    attribution="&copy; Google Maps"
                  />
                  <Marker position={selectedPackage.currentLocation}>
                    <Popup>
                      <div className="p-2">
                        <p className="font-bold">{selectedPackage.trackingNumber}</p>
                        <p className="text-xs text-slate-500">{trPackageStatus(lang, selectedPackage.status)}</p>
                      </div>
                    </Popup>
                  </Marker>
               </MapContainer>
            </div>
          </Card>
        )}

        {rightTab === 'timeline' && (
          <Card title={u('tracking.history', 'Tracking History')}>
            <div className="space-y-6">
              {selectedPackage.history.map((h, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-24 text-right">
                    <p className="text-xs font-bold dark:text-white">{h.date.split(',')[0]}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{h.date.split(',')[1]}</p>
                  </div>
                  <div className="relative">
                    <div className={cn("w-3 h-3 rounded-full mt-1", i === 0 ? "bg-primary" : "bg-slate-300 dark:bg-slate-700")} />
                    {i !== selectedPackage.history.length - 1 && <div className="absolute top-4 left-1.5 w-px h-full bg-slate-200 dark:bg-slate-800" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{trPackageStatus(lang, h.status)}</p>
                    <p className="text-xs text-slate-500">{h.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {rightTab === 'return' && (
          <Card title={lang === 'bs' ? 'Povrat i zamjena' : lang === 'de' ? 'Rueckgabe und Ersatz' : 'Return and Replace'}>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {lang === 'bs' ? 'Status zahtjeva' : lang === 'de' ? 'Antragsstatus' : 'Request Status'}
                </p>
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">
                  {lang === 'bs'
                    ? 'Rok za povrat je 14 dana. Preuzimanje je dostupno sutra u periodu 09:00-13:00.'
                    : lang === 'de'
                      ? 'Rueckgabefrist ist 14 Tage. Abholung morgen zwischen 09:00-13:00 verfuegbar.'
                      : 'Return window is 14 days. Pickup is available tomorrow between 09:00-13:00.'}
                </p>
              </div>
              <Button>{lang === 'bs' ? 'Pokreni zahtjev za povrat' : lang === 'de' ? 'Rueckgabe starten' : 'Start Return Request'}</Button>
            </div>
          </Card>
        )}

        {rightTab === 'returnRoutes' && (
          <Card title={lang === 'bs' ? 'AI povratne preporuke' : lang === 'de' ? 'KI Rueckrouten-Empfehlungen' : 'AI Return Route Suggestions'}>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/60">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {lang === 'bs' ? 'AI Return Engine' : lang === 'de' ? 'KI Return Engine' : 'AI Return Engine'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'bs'
                      ? 'Otkljucaj pametne povratne rute da ne vozis nazad prazan.'
                      : lang === 'de'
                        ? 'Entsperren Sie Rueckrouten, damit Sie nicht leer zurueckfahren.'
                        : 'Unlock smart return routes so you do not drive back empty.'}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  {returnTokens} {lang === 'bs' ? 'tokena' : lang === 'de' ? 'Tokens' : 'tokens'}
                </div>
              </div>

              <div className="relative">
                <div className={cn('space-y-3 transition-all', !returnRoutesUnlocked ? 'blur-[3px] select-none pointer-events-none' : '')}>
                  {returnRouteSuggestions.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold dark:text-white">{item.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{item.cargo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-primary">{item.payout}</p>
                          <p className="text-xs text-slate-500">
                            {lang === 'bs' ? 'ETA' : lang === 'de' ? 'ETA' : 'ETA'} {item.eta}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
                        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                          <span className="text-slate-500">{lang === 'bs' ? 'Deadhead' : lang === 'de' ? 'Leerfahrt' : 'Deadhead'}:</span>{' '}
                          <span className="font-bold dark:text-white">{item.deadhead}</span>
                        </div>
                        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                          <span className="text-slate-500">{lang === 'bs' ? 'Pouzdanost' : lang === 'de' ? 'Confidence' : 'Confidence'}:</span>{' '}
                          <span className="font-bold dark:text-white">{item.confidence}%</span>
                        </div>
                        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                          <span className="text-slate-500">{lang === 'bs' ? 'Status' : lang === 'de' ? 'Status' : 'Status'}:</span>{' '}
                          <span className="font-bold text-emerald-500">{lang === 'bs' ? 'Spremno' : lang === 'de' ? 'Bereit' : 'Ready'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!returnRoutesUnlocked && (
                  <div className="absolute inset-0 rounded-xl border border-dashed border-primary/40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200/20 bg-slate-950/75 text-center p-5">
                      {isUnlockingReturnRoutes ? (
                        <div className="space-y-4">
                          <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 text-primary flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                          <p className="text-sm font-bold text-white">
                            {lang === 'bs' ? 'AI trazi najbolje povratne rute' : lang === 'de' ? 'KI sucht die besten Rueckrouten' : 'AI is finding the best return routes'}
                          </p>
                          <p className="text-xs text-slate-300">{unlockSteps[unlockStep]}</p>
                          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${(unlockStep + 1) * 33.33}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 text-primary flex items-center justify-center">
                            <Lock className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-white">
                            {lang === 'bs' ? 'Otkljucaj AI povratne prijedloge' : lang === 'de' ? 'KI Rueckrouten entsperren' : 'Unlock AI return suggestions'}
                          </p>
                          <p className="text-xs text-slate-300">
                            {lang === 'bs'
                              ? 'Potrosi 10 tokena za premium povratne rute i vecu zaradu.'
                              : lang === 'de'
                                ? 'Verbrauchen Sie 10 Tokens fuer Premium-Rueckrouten und besseren Ertrag.'
                                : 'Spend 10 tokens to unlock premium return routes and higher earnings.'}
                          </p>
                          <Button onClick={handleUnlockReturnRoutes} className="w-full" disabled={returnTokens < 10}>
                            <Coins className="w-4 h-4 mr-2" />
                            {lang === 'bs' ? 'Otkljucaj za 10 tokena' : lang === 'de' ? 'Fuer 10 Tokens entsperren' : 'Unlock for 10 tokens'}
                          </Button>
                          {returnTokens < 10 && (
                            <p className="text-[11px] text-rose-300">
                              {lang === 'bs' ? 'Nedovoljno tokena za otkljucavanje.' : lang === 'de' ? 'Nicht genug Tokens zum Entsperren.' : 'Not enough tokens to unlock.'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {rightTab === 'share' && (
          <Card title={lang === 'bs' ? 'Podijeli pracenje' : lang === 'de' ? 'Tracking teilen' : 'Share Tracking'}>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {lang === 'bs' ? 'Javni link' : lang === 'de' ? 'Oeffentlicher Link' : 'Public Link'}
                </p>
                <p className="text-sm font-mono mt-2 break-all text-slate-700 dark:text-slate-200">
                  https://CARGO.AI/t/{selectedPackage.trackingNumber}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm">Email</Button>
                <Button variant="outline" size="sm">SMS</Button>
                <Button variant="outline" size="sm">WhatsApp</Button>
              </div>
            </div>
          </Card>
        )}

        {rightTab === 'review' && (
          <Card title={lang === 'bs' ? 'Recenzija isporuke' : lang === 'de' ? 'Lieferbewertung' : 'Delivery Review'}>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {lang === 'bs' ? 'Ocjena usluge' : lang === 'de' ? 'Service-Bewertung' : 'Service Rating'}
                </p>
                <div className="flex items-center gap-1 mt-2 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4" />
                </div>
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">
                  {lang === 'bs'
                    ? 'Napišite kratak komentar o brzini i kvaliteti dostave.'
                    : lang === 'de'
                      ? 'Schreiben Sie einen kurzen Kommentar zu Tempo und Qualitaet der Lieferung.'
                      : 'Write a short comment about delivery speed and quality.'}
                </p>
              </div>
              <Button variant="outline">{lang === 'bs' ? 'Napiši recenziju' : lang === 'de' ? 'Bewertung schreiben' : 'Write Review'}</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};


