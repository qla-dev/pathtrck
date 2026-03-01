import { motion } from 'motion/react';
import { Plus, X, MapPin } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';

type PostLoadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
};

export const PostLoadModal = ({ isOpen, onClose, lang }: PostLoadModalProps) => {
  if (!isOpen) return null;
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Plus className="text-primary w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white">{u('postLoadModal.title', 'Post New Load')}</h3>
              <p className="text-xs text-slate-500">{u('postLoadModal.subtitle', 'Create a new logistics request for drivers')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{u('postLoadModal.pickup', 'Pickup Location')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder={u('postLoadModal.cityCountry', 'City, Country')} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{u('postLoadModal.delivery', 'Delivery Destination')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder={u('postLoadModal.cityCountry', 'City, Country')} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{u('postLoadModal.weight', 'Cargo Weight (kg)')}</label>
              <input type="number" placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{u('postLoadModal.type', 'Cargo Type')}</label>
              <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none">
                <option>{u('postLoadModal.generalCargo', 'General Cargo')}</option>
                <option>{u('postLoadModal.perishable', 'Perishable')}</option>
                <option>{u('postLoadModal.hazardous', 'Hazardous')}</option>
                <option>{u('postLoadModal.fragile', 'Fragile')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{u('postLoadModal.notes', 'Additional Notes')}</label>
            <textarea placeholder={u('postLoadModal.notesPlaceholder', 'Special handling instructions...')} className="w-full h-24 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none text-sm" />
          </div>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>{u('common.cancel', 'Cancel')}</Button>
          <Button className="flex-1" onClick={onClose}>{u('common.postLoad', 'Post Load')}</Button>
        </div>
      </motion.div>
    </div>
  );
};

