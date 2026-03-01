import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronRight, MessageSquare, Package as PackageIcon, Clock3, RotateCcw, Share2, Star } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Language, Package as PackageData } from '../../types';
import { MOCK_PACKAGES } from '../../mockData';
import { getSmartStatusUpdate } from '../../services/geminiService';
import { ui, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const TrackingView = ({ lang }: { lang: Language }) => {
  const [selectedPackage, setSelectedPackage] = useState<PackageData>(MOCK_PACKAGES[0]);
  const [smartStatus, setSmartStatus] = useState<string>("");
  const [rightTab, setRightTab] = useState<'tracker' | 'map' | 'timeline' | 'return' | 'share' | 'review'>('tracker');
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  useEffect(() => {
    getSmartStatusUpdate(selectedPackage.status, selectedPackage.history[0].location).then(setSmartStatus);
  }, [selectedPackage]);

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Sidebar List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder={u('common.searchTracking', 'Search tracking number...')}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
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
        <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          <button
            onClick={() => setRightTab('tracker')}
            className={cn(
              'h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'tracker' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <PackageIcon className="w-4 h-4" />
            {lang === 'bs' ? 'Tracker' : lang === 'de' ? 'Tracker' : 'Tracker'}
          </button>
          <button
            onClick={() => setRightTab('map')}
            className={cn(
              'h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'map' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <MapPin className="w-4 h-4" />
            {lang === 'bs' ? 'Mapa' : lang === 'de' ? 'Karte' : 'Map'}
          </button>
          <button
            onClick={() => setRightTab('timeline')}
            className={cn(
              'h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'timeline' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Clock3 className="w-4 h-4" />
            {lang === 'bs' ? 'Timeline' : lang === 'de' ? 'Timeline' : 'Timeline'}
          </button>
          <button
            onClick={() => setRightTab('return')}
            className={cn(
              'h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'return' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            {lang === 'bs' ? 'Povrat' : lang === 'de' ? 'Rueckgabe' : 'Return'}
          </button>
          <button
            onClick={() => setRightTab('share')}
            className={cn(
              'h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'share' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Share2 className="w-4 h-4" />
            {lang === 'bs' ? 'Podijeli' : lang === 'de' ? 'Teilen' : 'Share'}
          </button>
          <button
            onClick={() => setRightTab('review')}
            className={cn(
              'h-9 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
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

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-4">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                  <MessageSquare className="text-primary w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase">{lang === 'bs' ? 'Pametni status (AI)' : lang === 'de' ? 'Smart-Status (KI)' : 'Smart Status (AI)'}</p>
                  <p className="text-sm dark:text-slate-200 italic">"{smartStatus}"</p>
                </div>
              </div>
            </div>
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

        {rightTab === 'share' && (
          <Card title={lang === 'bs' ? 'Podijeli pracenje' : lang === 'de' ? 'Tracking teilen' : 'Share Tracking'}>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {lang === 'bs' ? 'Javni link' : lang === 'de' ? 'Oeffentlicher Link' : 'Public Link'}
                </p>
                <p className="text-sm font-mono mt-2 break-all text-slate-700 dark:text-slate-200">
                  https://pathtracker.ai/t/{selectedPackage.trackingNumber}
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


