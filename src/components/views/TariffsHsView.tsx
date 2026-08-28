import { useEffect, useState } from 'react';
import { CheckCircle2, Database, Hash, Layers3, RefreshCw, Tags } from 'lucide-react';

import { api, type TariffCategory } from '../../services/api';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import type { Language } from '../../types';
import { TariffTable } from '../tariffs/TariffTable';
import { HorizontalScrollMenu } from '../ui/HorizontalScrollMenu';
import { PageHeader } from '../ui/PageHeader';

type CategoryMeta = {
  total: number;
  categories: number;
  coded: number;
  selectable: number;
};

const CATEGORY_TONES = [
  'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
  'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
  'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
];

export const TariffsHsView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [categories, setCategories] = useState<TariffCategory[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta>({ total: 0, categories: 0, coded: 0, selectable: 0 });
  const [selectedSection, setSelectedSection] = useState('');
  const [subcategories, setSubcategories] = useState<TariffCategory[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    setError('');
    api.tariffs.categories(lang)
      .then((response) => {
        if (!active) return;
        setCategories(response.data);
        setCategoryMeta({
          total: response.meta?.total ?? 0,
          categories: response.meta?.categories ?? response.data.length,
          coded: response.meta?.coded ?? 0,
          selectable: response.meta?.selectable ?? 0,
        });
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : u('tariffs.error', 'The tariff catalog could not be loaded.'));
      })
      .finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, [lang, refreshToken]);

  useEffect(() => {
    if (!selectedSection) {
      setSubcategories([]);
      setSelectedChapter('');
      return;
    }

    let active = true;
    api.tariffs.categories(lang, selectedSection)
      .then((response) => {
        if (active) setSubcategories(response.data);
      })
      .catch(() => {
        if (active) setSubcategories([]);
      })
      .finally(() => undefined);
    return () => { active = false; };
  }, [lang, refreshToken, selectedSection]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        icon={Tags}
        title={u('tariffs.title', 'Tariffs & HS')}
        subtitle={u('tariffs.subtitle', 'Search the complete multilingual customs tariff hierarchy.')}
        tone="violet"
        actions={(
          <button type="button" onClick={() => setRefreshToken((current) => current + 1)} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-white/70 px-3 text-xs font-bold text-violet-600 dark:border-violet-500/20 dark:bg-white/5 dark:text-violet-300">
            <RefreshCw className={cn('h-3.5 w-3.5', categoriesLoading && 'animate-spin')} />
            {u('tariffs.refresh', 'Refresh')}
          </button>
        )}
        stats={[
          { label: u('tariffs.records', 'Records'), value: categoryMeta.total.toLocaleString(), icon: Database, tone: 'bg-sky-500/10 text-sky-500' },
          { label: u('tariffs.codes', 'Tariff codes'), value: categoryMeta.coded.toLocaleString(), icon: Hash, tone: 'bg-violet-500/10 text-violet-500' },
          { label: u('tariffs.selectable', 'Selectable leaves'), value: categoryMeta.selectable.toLocaleString(), icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-500' },
          { label: u('tariffs.sections', 'Main categories'), value: categoryMeta.categories.toLocaleString(), icon: Layers3, tone: 'bg-amber-500/10 text-amber-500' },
        ]}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">{u('tariffs.categories', 'Main categories')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{u('tariffs.categoriesSubtitle', 'Choose a section to narrow the tariff table.')}</p>
          </div>
          {selectedSection && (
            <div className="min-w-0 flex-1 lg:max-w-[72%]">
              <HorizontalScrollMenu className="min-w-0" ariaLabel={u('tariffs.subcategories', 'Subcategories')}>
                <button type="button" onClick={() => setSelectedChapter('')} className={cn('inline-flex h-9 shrink-0 items-center rounded-xl border px-3 text-xs font-bold transition-colors', !selectedChapter ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
                  {u('tariffs.allSubcategories', 'All subcategories')} <span className={cn('ml-1.5 text-[10px]', !selectedChapter ? 'text-white/75' : 'text-slate-400')}>({subcategories.length})</span>
                </button>
                {subcategories.map((subcategory) => (
                  <button key={subcategory.id} type="button" onClick={() => setSelectedChapter(subcategory.id)} className={cn('inline-flex h-9 max-w-72 shrink-0 items-center rounded-xl border px-3 text-left text-xs font-bold transition-colors', selectedChapter === subcategory.id ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
                    <span className="truncate">{subcategory.label}</span>
                    <span className={cn('ml-2 shrink-0 text-[10px]', selectedChapter === subcategory.id ? 'text-white/75' : 'text-slate-400')}>{subcategory.selectableCount}</span>
                  </button>
                ))}
              </HorizontalScrollMenu>
            </div>
          )}
        </div>
        <div className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
          <button type="button" onClick={() => { setSelectedSection(''); setSelectedChapter(''); }} className={cn('min-h-24 rounded-2xl border p-4 text-left transition-all', !selectedSection ? 'border-primary bg-primary text-white shadow-lg shadow-primary/15' : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200')}>
            <Layers3 className="h-5 w-5" />
            <p className="mt-3 text-sm font-black">{u('tariffs.allCategories', 'All categories')}</p>
            <p className={cn('mt-1 text-xs', !selectedSection ? 'text-white/75' : 'text-slate-500')}>{categoryMeta.total.toLocaleString()} {u('tariffs.records', 'records')}</p>
          </button>
          {categoriesLoading
            ? Array.from({ length: 5 }, (_, index) => <div key={index} className="min-h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)
            : categories.map((category, index) => (
              <button key={category.id} type="button" onClick={() => { setSelectedSection(category.id); setSelectedChapter(''); }} className={cn('min-h-24 rounded-2xl border p-4 text-left transition-all', selectedSection === category.id ? 'border-primary bg-primary text-white shadow-lg shadow-primary/15' : CATEGORY_TONES[index % CATEGORY_TONES.length])}>
                <Tags className="h-5 w-5" />
                <p title={category.label} className="mt-3 line-clamp-2 text-sm font-black leading-5">{category.label}</p>
                <p className={cn('mt-1 text-xs', selectedSection === category.id ? 'text-white/75' : 'opacity-70')}>{category.selectableCount.toLocaleString()} {u('tariffs.selectableShort', 'selectable')}</p>
              </button>
            ))}
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
      <TariffTable lang={lang} section={selectedSection} chapter={selectedChapter} refreshKey={refreshToken} />
    </div>
  );
};
