import { Language } from '../../types';
import { translateTriplet } from '../../i18n';
import { FrightItem } from './FrightItem';
import { Offer } from './FrightTypes';

const tr = translateTriplet;

type FrightListProps = {
  offers: Offer[];
  lang: Language;
};

export const FrightList = ({ offers, lang }: FrightListProps) => (
  <section className="space-y-4">
    <div className="text-xs text-slate-500">
      {offers.length} {tr(lang, 'offers found', 'ponuda pronadjeno', 'Angebote gefunden')}
    </div>

    {offers.map((offer) => (
      <FrightItem key={offer.id} offer={offer} lang={lang} />
    ))}

    {!offers.length && (
      <article className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-base font-bold dark:text-white mb-2">
          {tr(lang, 'No routes found', 'Nema pronadjenih ruta', 'Keine Routen gefunden')}
        </p>
        <p className="text-sm text-slate-500">
          {tr(
            lang,
            'Try a different start or end city.',
            'Pokusajte drugi grad polaska ili dolaska.',
            'Probieren Sie eine andere Start- oder Zielstadt.'
          )}
        </p>
      </article>
    )}

    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-4">
      <p className="text-sm font-bold dark:text-white mb-1">
        {tr(lang, 'Quick request', 'Brzi zahtjev', 'Schnellanfrage')}
      </p>
      <p className="text-sm text-slate-500">
        {tr(
          lang,
          'Fill in a short form so our operations team can send an individual offer.',
          'Popunite kratak obrazac i nas operativni tim ce poslati individualnu ponudu.',
          'Senden Sie ein kurzes Formular, damit unser Team ein individuelles Angebot schicken kann.'
        )}
      </p>
    </article>
  </section>
);
