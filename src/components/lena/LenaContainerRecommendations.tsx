import { useEffect, useState } from 'react';
import { Container, Copy, Info, Loader2 } from 'lucide-react';
import { api, type LoadScanResult } from '../../services/api';
import { lenaFieldChoices } from '../../lib/lenaCatalog';
import { containerRecommendationText, type ContainerFactor, type ContainerRecommendationResult } from '../../lib/containerRecommendations';

type Props = {
  scan: LoadScanResult;
  lang?: string | null;
  disabled?: boolean;
  onCopy?: (type: string, quantity: number, label: string) => void;
};

export const LenaContainerRecommendations = ({ scan, lang, disabled, onCopy }: Props) => {
  const text = containerRecommendationText(lang);
  const containerLabels = new Map(lenaFieldChoices(lang, 'containerSelections', scan.transportType).map(choice => [choice.value, choice.label]));
  const containerLabel = (type: string) => containerLabels.get(type) || type;
  const [response, setResponse] = useState<{ key: string; data?: ContainerRecommendationResult; error?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  // Only cargo inputs trigger recalculation. Selecting a container does not change the advice.
  const key = JSON.stringify({
    transportType: scan.transportType, weightKg: scan.weightKg, volumeM3: scan.volumeM3,
    pallets: scan.pallets, quantityMeasure: scan.quantityMeasure, dimensionScope: scan.dimensionScope || undefined,
    lengthM: scan.lengthM, widthM: scan.widthM, heightM: scan.heightM,
    cargoType: scan.cargoType, goodsType: scan.goodsType, hsCodes: scan.hsCodes,
    requiresAdr: scan.requiresAdr, temperatureMin: scan.temperatureMin, temperatureMax: scan.temperatureMax,
    characteristics: scan.characteristics, specialRequirements: scan.specialRequirements,
  });
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void api.loads.recommendContainers(JSON.parse(key)).then(({ data }) => {
        if (!cancelled) setResponse({ key, data });
      }).catch(() => {
        if (!cancelled) setResponse({ key, error: true });
      });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, retry]);
  const current = response?.key === key ? response : null;
  const translate = (code: string) => text[code as keyof typeof text] || code;

  return <section className="mb-3 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3" aria-label={text.title} aria-live="polite">
    <h3 className="flex items-center gap-2 text-xs font-black text-primary"><Container className="h-4 w-4" />{text.title}</h3>
    <p className="text-[11px] text-slate-600 dark:text-slate-300">{text.advice}</p>
    {!!scan.containerSelections?.length && <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{text.field}: {scan.containerSelections.map(({ type, quantity }) => `${quantity} × ${containerLabel(type)}`).join(', ')}</p>}
    {!current && <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" />{text.loading}</p>}
    {current?.error && <p className="text-xs text-rose-600">{text.failed} <button type="button" className="underline" onClick={() => { setResponse(null); setRetry(value => value + 1); }}>{text.retry}</button></p>}
    {current?.data?.candidates.slice(0, 3).map((option, index) => {
      const c = option.calculation;
      const formula = `max(ceil(${c.volumeM3} / ${option.capacity.usableVolumeM3}), ceil(${c.weightKg} / ${option.capacity.payloadKg})${c.unitsPerContainer === null ? '' : `, ${c.byUnits}`}) = ${option.quantity}`;
      const explanation = option.reasons.map(translate).join('\n');
      const selected = scan.containerSelections?.length === 1 && scan.containerSelections[0].type === option.type && Number(scan.containerSelections[0].quantity) === option.quantity;
      return <article key={option.type} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase text-primary">{index === 0 ? text.recommended : `${text.alternative} ${index}`}</span>
          <span className="text-[10px] text-slate-500">{option.score}% {text.match}</span>
        </div>
        <p className="text-base font-black text-slate-900 dark:text-white">{option.quantity} × {containerLabel(option.type)}</p>
        <p className="text-[10px] text-slate-500">{text.coverage}: {option.coverage}%</p>
        <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-600 dark:text-slate-300">{option.reasons.map(reason => <li key={reason}>{translate(reason)}</li>)}</ul>
        <p className="text-[10px] text-slate-500">{text.volume}: {option.volumeUtilization}% · {text.weight}: {option.weightUtilization}%</p>
        <p className="text-[11px] text-amber-700 dark:text-amber-300"><strong>{text.note}: </strong>{text.estimate_only}</p>
        <details className="text-[11px] text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer font-semibold text-primary" title={`${formula}\n${explanation}`}><Info className="mr-1 inline h-3 w-3" />{text.formula}</summary>
          <div className="mt-2 space-y-2">
            <p>{text.countFormula}</p><p className="break-words font-mono">{formula}</p>
            <p>{text.scoreFormula}</p><p>{text.countProxy}</p>
            <dl className="space-y-1">{(Object.keys(option.factors) as ContainerFactor[]).map(factor => <div key={factor} className="flex justify-between gap-3"><dt>{text[factor]} ({option.weights[factor]})</dt><dd>{option.factors[factor] ?? text.unknown}</dd></div>)}</dl>
            {option.notes.filter(note => note !== 'estimate_only').map(note => <p key={note}>{translate(note)}</p>)}
            <a href={option.capacity.source} target="_blank" rel="noreferrer" className="text-primary underline">{text.source}</a>
          </div>
        </details>
        {onCopy && <button type="button" disabled={disabled || selected} onClick={() => onCopy(option.type, option.quantity, `${option.quantity} × ${containerLabel(option.type)}`)} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:cursor-default disabled:opacity-50"><Copy className="h-3.5 w-3.5" />{selected ? text.selected : text.copy}</button>}
      </article>;
    })}
    {current?.data && current.data.candidates.length === 0 && current.data.warnings.map(warning => <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">{translate(warning)}</p>)}
  </section>;
};
