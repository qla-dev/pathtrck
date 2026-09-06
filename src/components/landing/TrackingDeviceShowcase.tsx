import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, Globe2, MapPin, Package, Pause, Plane, Play, Ship, Truck } from 'lucide-react';
import type { Language } from '../../types';
import './trackingDeviceShowcase.css';

const COPY = {
  en: {
    eyebrow: 'ONE CONNECTED JOURNEY', title: 'Every mile. Every mode.', accent: 'Always in view.',
    intro: 'From the first pickup to the final doorstep. Follow road, sea and air shipments in one shared workspace, wherever you work.',
    demo: 'Illustrative tracking preview', live: 'In transit', shipment: 'Shipment', eta: 'Estimated arrival',
    modes: ['The final mile', 'Across the ocean', 'Above the borders'],
    descriptions: ['The vessel arrives. The truck takes over. Follow the delivery route, next stop and shipment progress all the way to the door.', 'Follow the sea leg, with port milestones and onward delivery in the same shipment overview.', 'Keep urgent air freight in view. Follow the flight leg and the road connection that takes it to its destination.'],
    labels: ['Road', 'Sea', 'Air'], stages: ['Collected', 'In transit', 'Delivered'],
    next: ['Next stop · Berlin warehouse', 'Next port · Rotterdam', 'Next airport · Frankfurt'],
    footer: 'Different transports. One clear picture.', pause: 'Pause animation', play: 'Play animation', progress: 'Journey progress',
  },
  bs: {
    eyebrow: 'JEDNO POVEZANO PUTOVANJE', title: 'Svaki kilometar. Svaki prijevoz.', accent: 'Uvijek na vidiku.',
    intro: 'Od prvog preuzimanja do konačne isporuke. Pratite cestovne, pomorske i zračne pošiljke na jednom mjestu, gdje god radili.',
    demo: 'Ilustrativni prikaz praćenja', live: 'U tranzitu', shipment: 'Pošiljka', eta: 'Očekivani dolazak',
    modes: ['Posljednji kilometar', 'Preko okeana', 'Iznad granica'],
    descriptions: ['Brod stiže. Kamion preuzima. Pratite rutu dostave, sljedeću stanicu i napredak pošiljke sve do vrata.', 'Pratite pomorsku dionicu, lučke događaje i nastavak dostave u istom pregledu pošiljke.', 'Pratite hitne zračne pošiljke. Pogledajte let i cestovnu vezu koja vodi do konačnog odredišta.'],
    labels: ['Cesta', 'More', 'Zrak'], stages: ['Preuzeto', 'U tranzitu', 'Isporučeno'],
    next: ['Sljedeće · Skladište Berlin', 'Sljedeća luka · Rotterdam', 'Sljedeći aerodrom · Frankfurt'],
    footer: 'Različiti prijevozi. Jedan jasan pregled.', pause: 'Pauziraj animaciju', play: 'Pokreni animaciju', progress: 'Napredak putovanja',
  },
  de: {
    eyebrow: 'EINE VERBUNDENE REISE', title: 'Jeder Kilometer. Jeder Transport.', accent: 'Immer im Blick.',
    intro: 'Von der Abholung bis zur Haustür. Verfolgen Sie Straßen-, See- und Luftfrachtsendungen an einem Ort, wo immer Sie arbeiten.',
    demo: 'Illustrative Tracking-Vorschau', live: 'Unterwegs', shipment: 'Sendung', eta: 'Voraussichtliche Ankunft',
    modes: ['Die letzte Meile', 'Über den Ozean', 'Über die Grenzen'],
    descriptions: ['Das Schiff kommt an. Der Lkw übernimmt. Verfolgen Sie Lieferroute, nächsten Halt und Sendungsfortschritt bis zur Haustür.', 'Verfolgen Sie die Seestrecke, Hafenereignisse und anschließende Zustellung in derselben Sendungsübersicht.', 'Behalten Sie dringende Luftfracht im Blick. Sehen Sie den Flug und die Straßenverbindung zum endgültigen Ziel.'],
    labels: ['Straße', 'See', 'Luft'], stages: ['Abgeholt', 'Unterwegs', 'Zugestellt'],
    next: ['Nächster Halt · Lager Berlin', 'Nächster Hafen · Rotterdam', 'Nächster Flughafen · Frankfurt'],
    footer: 'Verschiedene Transporte. Ein klarer Überblick.', pause: 'Animation pausieren', play: 'Animation abspielen', progress: 'Transportfortschritt',
  },
};
const ROUTES = [
  { from: 'Rotterdam', to: 'Berlin', icon: Truck, color: '#06b6d4', time: '16:40', code: 'FB–2048', percent: 72 },
  { from: 'Singapore', to: 'Rotterdam', icon: Ship, color: '#8b5cf6', time: '08:20', code: 'FB–2048', percent: 58 },
  { from: 'Singapore', to: 'Frankfurt', icon: Plane, color: '#f59e0b', time: '11:35', code: 'FB–3092', percent: 64 },
];
type Text = typeof COPY.en;

function RouteScreen({ mode, text }: { mode: number; text: Text }) {
  const route = ROUTES[mode];
  const Icon = route.icon;
  return <div className="tracking-device-screen" style={{ '--route-color': route.color } as React.CSSProperties}>
    <div className="tracking-screen-top"><span className="tracking-screen-brand"><Package size={14} /> FreightBook</span><span className="tracking-screen-status"><i />{text.live}</span></div>
    <div className="tracking-screen-heading"><span>{text.shipment} {route.code}</span><strong>{route.from} <ArrowUpRight size={15} /> {route.to}</strong></div>
    <div className={`tracking-route-map tracking-route-map-${mode}`}>
      <svg viewBox="0 0 500 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path className="tracking-map-land" d="M0 0H205L194 24 219 45 186 69 201 98 170 114 167 146 125 160 106 197 72 213 38 250H0ZM500 0H367L356 31 322 48 341 78 298 92 309 124 344 139 337 175 380 191 408 223 500 232Z" />
        <g className="tracking-map-roads"><path d="M0 63L103 80 155 43 198 45M18 250L87 165 159 130 192 77M347 0L383 72 329 108 401 161 500 185M324 58L423 107 495 76M376 164L423 250" /></g>
        <path className="tracking-map-route-base" d="M75 179C158 191 169 66 257 93S349 167 428 61" />
        <path className="tracking-map-route" d="M75 179C158 191 169 66 257 93S349 167 428 61" />
        <circle cx="75" cy="179" r="6" fill="white" stroke={route.color} strokeWidth="3" /><circle cx="428" cy="61" r="6" fill="white" stroke={route.color} strokeWidth="3" />
        <g className="tracking-moving-marker"><circle r="15" fill={route.color} /><Icon x={-8} y={-8} width={16} height={16} color="white" /><animateMotion dur={`${12 + mode * 3}s`} repeatCount="indefinite" path="M75 179C158 191 169 66 257 93S349 167 428 61" /></g>
        <text x="63" y="210">{route.from}</text><text x="365" y="40">{route.to}</text>
      </svg>
      <div className="tracking-map-chip"><Icon size={12} />{text.labels[mode]}</div>
    </div>
    <div className="tracking-screen-bottom"><div className="tracking-arrival"><span>{text.eta}</span><strong>{route.time}<small> UTC</small></strong></div><div className="tracking-next-stop"><MapPin size={13} />{text.next[mode]}</div>
      <div className="tracking-progress" role="img" aria-label={`${text.progress}: ${route.percent}%`}><span style={{ width: `${route.percent}%` }} /></div>
      <div className="tracking-stages">{text.stages.map((stage, i) => <span key={stage}><i>{i === 0 ? <Check size={8} /> : i + 1}</i>{stage}</span>)}</div>
    </div>
  </div>;
}

export function TrackingDeviceShowcase({ lang }: { lang: Language }) {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.15 });
  const playing = visible && !paused && !reduced;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % 3), 6500);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    ref.current?.querySelectorAll('svg').forEach(svg => {
      if (playing) svg.unpauseAnimations(); else svg.pauseAnimations();
    });
  }, [playing]);
  return <div ref={ref} className={`tracking-showcase ${playing ? '' : 'tracking-showcase-paused'}`}>
    <div className="tracking-showcase-intro"><span className="tracking-eyebrow"><Globe2 size={14} />{text.eyebrow}</span><h2>{text.title}<br /><em>{text.accent}</em></h2><p>{text.intro}</p></div>
    <div className="tracking-device-stage">
      <div className="tracking-stage-glow" aria-hidden="true" />
      {[2, 1, 0].map(mode => <div key={mode} className={`tracking-device tracking-device-${mode} ${active === mode ? 'tracking-device-active' : ''}`}>
        <div className="tracking-device-bezel"><div className="tracking-device-camera" /><RouteScreen mode={mode} text={text} /></div>
        {mode === 2 && <div className="tracking-desktop-stand" aria-hidden="true" />}
      </div>)}
      <span className="tracking-demo-label">{text.demo}</span>
    </div>
    <div className="tracking-story-grid">{ROUTES.map((route, i) => <button type="button" key={route.code + i} aria-pressed={active === i} onClick={() => { setActive(i); setPaused(true); }} className={`tracking-story ${active === i ? 'tracking-story-active' : ''}`} style={{ '--route-color': route.color } as React.CSSProperties}>
      <span className="tracking-story-icon"><route.icon size={20} /></span><span><small>0{i + 1} / {text.labels[i]}</small><strong>{text.modes[i]}</strong><span>{text.descriptions[i]}</span></span>
    </button>)}</div>
    <div className="tracking-showcase-footer"><span><Globe2 size={15} />{text.footer}</span><button type="button" onClick={() => setPaused(value => !value)} disabled={!!reduced} aria-label={paused || reduced ? text.play : text.pause}>{paused || reduced ? <Play size={14} /> : <Pause size={14} />}{paused || reduced ? text.play : text.pause}</button></div>
  </div>;
}
