import { useId } from 'react';

type VehicleShape = 'van' | 'truck' | 'tractor' | 'trailer' | 'tanker' | 'car' | 'bus' | 'unknown';

/** Use body/category data only; a make or model must never select a branded image. */
export function vehicleShape(vehicle: { vehicle_type?: string; features?: Record<string, unknown> }): VehicleShape {
  const category = `${vehicle.features?.vehicle_class || ''} ${vehicle.vehicle_type || ''}`.toLowerCase();
  const body = String(vehicle.features?.body_type || '').toLowerCase();
  if(['trailer','semi_trailer'].includes(String(vehicle.features?.resource_type)))return 'trailer';
  if(vehicle.features?.resource_type==='tractor_unit')return 'tractor';
  if (/tanker|cistern/.test(body)) return 'tanker';
  if (/trailer|prikolic/.test(category)) return 'trailer';
  if (/tractor|teglja/.test(category)) return 'tractor';
  if (/van|kombi/.test(category)) return 'van';
  if (/bus|autobus/.test(category)) return 'bus';
  if (/passenger|car\b|automobil/.test(category)) return 'car';
  if (/truck|kamion/.test(category)) return 'truck';
  return 'unknown';
}

export function VehicleIllustration({ vehicle, label, compact = false }: {
  vehicle: { vehicle_type?: string; features?: Record<string, unknown> };
  label: string;
  compact?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const shape = vehicleShape(vehicle);
  const van = shape === 'van' || shape === 'bus' || shape === 'car';
  const trailer = shape === 'trailer';
  const tractor = shape === 'tractor';
  const flatbed = /flatbed|platform|chassis/.test(String(vehicle.features?.body_type || '').toLowerCase());
  const wheel = (x: number, y = 166) => <g key={x}>
    <circle cx={x} cy={y} r="19" fill="#172b46" />
    <circle cx={x} cy={y} r="11" fill="#94a9bd" stroke="#dbe7ee" strokeWidth="3" />
    <circle cx={x} cy={y} r="4" fill="#3e566e" />
  </g>;
  return <svg viewBox="0 0 440 215" role="img" aria-label={label} className={compact ? 'h-12 w-24 shrink-0' : 'h-auto w-full'}>
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#d7e8f0" /></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#24405e" /><stop offset="1" stopColor="#5b8ea9" /></linearGradient>
      <linearGradient id={`${id}-blue`} x1="0" x2="1"><stop stopColor="#00b9e8" /><stop offset="1" stopColor="#009bd1" /></linearGradient>
    </defs>
    {!compact && <><ellipse cx="220" cy="186" rx="186" ry="9" fill="#7899b0" opacity=".12" /><path d="M20 190h400M50 199h340" stroke="#a4c9da" strokeWidth="1" opacity=".25" /></>}
    {shape === 'unknown' ? <g stroke="#8aa8ba" strokeWidth="2" strokeDasharray="6 5" fill={`url(#${id}-body)`}>
      <path d="M74 150v-41l34-30h70l35 30h142v41z" /><path d="M116 85h51l25 28h-89z" fill={`url(#${id}-glass)`} />
      {wheel(125, 151)}{wheel(316, 151)}
    </g> : van ? <>
      <path d={shape === 'car' ? 'M58 155v-29l45-12 39-34h113l53 37 62 11 12 27z' : 'M55 156V73q0-14 15-14h223l53 48 27 13q9 4 9 15v21z'} fill={`url(#${id}-body)`} stroke="#88a9bc" strokeWidth="1.5" />
      <path d={shape === 'car' ? 'M122 113l28-25h47v25zm85 0V88h43l36 25z' : 'M266 68h23l48 44h-71zm-52 0h40v44h-40z'} fill={`url(#${id}-glass)`} />
      {shape === 'bus' && [78, 120, 162].map(x => <rect key={x} x={x} y="69" width="33" height="42" rx="3" fill={`url(#${id}-glass)`} />)}
      {shape === 'van' && <><path d="M76 77h119v59H76zM204 66v86M263 116v35" fill="none" stroke="#b4cbd7" /><path d="M72 132h123" stroke="#00afe0" strokeWidth="3" /><text x="88" y="112" fill="#009fcf" fontSize="18" fontWeight="700" fontFamily="Arial, sans-serif">freightbook</text></>}
      <path d="M57 146h47m48 0h131m48 0h48" stroke={`url(#${id}-blue)`} strokeWidth="7" />
      <rect x="352" y="126" width="24" height="8" rx="3" fill="#fff" stroke="#b0c7d1" />
      <rect x="51" y="128" width="5" height="14" rx="2" fill="#f98173" />
      <path d="M236 123h13" stroke="#708fa5" strokeWidth="3" strokeLinecap="round" />
      {wheel(126, 155)}{wheel(307, 155)}
    </> : <>
      {!trailer && <>
        <path d={tractor ? 'M251 161V68q0-8 8-8h52l36 52 13 9v40z' : 'M301 161V67q0-8 8-8h28l37 53 14 9v40z'} fill={`url(#${id}-body)`} stroke="#88a9bc" strokeWidth="1.5" />
        <path d={tractor ? 'M263 70h42l27 41h-69z' : 'M313 70h19l27 41h-46z'} fill={`url(#${id}-glass)`} />
        <path d={tractor ? 'M258 139h96' : 'M309 139h72'} stroke={`url(#${id}-blue)`} strokeWidth="8" />
        <path d={tractor ? 'M333 116h13v-16' : 'M362 116h13v-16'} fill="none" stroke="#46667c" strokeWidth="3" />
        <rect x={tractor ? 263 : 314} y="119" width="12" height="3" rx="1.5" fill="#7e9daf" />
        <rect x={tractor ? 343 : 371} y="147" width="14" height="6" rx="2" fill="#fff" />
      </>}
      {shape === 'tanker' ? <><rect x="49" y="66" width="241" height="82" rx="37" fill={`url(#${id}-body)`} stroke="#88a9bc" strokeWidth="1.5" /><path d="M114 68v78m100-78v78" stroke="#acc4d1" strokeWidth="5" /><path d="M68 106h205" stroke="#00afe0" strokeWidth="4" /></> : !tractor && <>
        {!flatbed && <><rect x="42" y="44" width={trailer ? 344 : 251} height="108" rx="5" fill={`url(#${id}-body)`} stroke="#88a9bc" strokeWidth="1.5" /><path d={trailer ? 'M48 131h332' : 'M48 131h239'} stroke={`url(#${id}-blue)`} strokeWidth="12" />
          <text x={trailer ? 118 : 87} y="103" fill="#009fcf" fontSize="24" fontWeight="700" fontFamily="Arial, sans-serif">freightbook</text>
          {/curtain|cerad/.test(String(vehicle.features?.body_type || '').toLowerCase()) && [65, 105, 145, 185, 225, 265].map(x => <path key={x} d={`M${x} 48v92`} stroke="#b0cbd9" opacity=".5" />)}
        </>}
        <path d={trailer ? 'M44 153h341' : 'M44 153h250'} stroke="#46647a" strokeWidth="7" />
      </>}
      {tractor && <><rect x="83" y="150" width="170" height="12" rx="3" fill="#46647a" /><rect x="150" y="141" width="60" height="7" rx="3" fill="#253f57" /></>}
      {trailer ? <>{wheel(104)}{wheel(145)}{wheel(186)}<path d="M330 159v20h19" stroke="#708fa5" strokeWidth="4" fill="none" /></> : <>{wheel(tractor ? 119 : 96)}{wheel(tractor ? 162 : 139)}{wheel(tractor ? 301 : 341)}</>}
    </>}
  </svg>;
}
