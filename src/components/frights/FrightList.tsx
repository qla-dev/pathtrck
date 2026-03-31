import { Language } from '../../types';
import { ui } from '../../i18n';
import { FrightItem } from './FrightItem';
import { Offer } from './FrightTypes';

type FrightListProps = {
  offers: Offer[];
  lang: Language;
};

export const FrightList = ({ offers, lang }: FrightListProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return (
    <section className="space-y-4">
      <div className="text-xs text-slate-500">
        {offers.length} {u('legacy.frightList.offersFound', 'offers found')}
      </div>

      {offers.map((offer) => (
        <FrightItem key={offer.id} offer={offer} lang={lang} />
      ))}

      {!offers.length && (
        <article className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-base font-bold dark:text-white mb-2">
            {u('legacy.frightList.noRoutesFound', 'No routes found')}
          </p>
          <p className="text-sm text-slate-500">
            {u('legacy.frightList.tryDifferentCity', 'Try a different start or end city.')}
          </p>
        </article>
      )}

      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-4">
        <p className="text-sm font-bold dark:text-white mb-1">
          {u('legacy.frightList.quickRequest', 'Quick request')}
        </p>
        <p className="text-sm text-slate-500">
          {u(
            'legacy.frightList.quickRequestDescription',
            'Fill in a short form so our operations team can send an individual offer.'
          )}
        </p>
      </article>
    </section>
  );
};
