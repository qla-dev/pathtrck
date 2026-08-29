import React from 'react';
import { motion } from 'motion/react';
import { User } from 'lucide-react';

import { BrandWordmark } from '../ui/BrandWordmark';

type AuthVisualPanelProps = {
  title: string;
  subtitle: string;
};

export const AuthVisualPanel = ({ title, subtitle }: AuthVisualPanelProps) => (
  <motion.aside
    className="relative hidden h-full overflow-hidden bg-[#03142f] lg:block"
    initial={{ opacity: 0, x: -24 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
  >
    <img
      src="/payment-panel-logistics-plane-v2.jpg"
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-center"
    />
    <div className="absolute inset-0 bg-gradient-to-br from-sky-600/75 via-blue-900/72 to-slate-950/92" />
    <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white xl:p-12">
      <div className="max-w-lg">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/15 backdrop-blur-sm">
          <User className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight xl:text-5xl">{title}</h1>
        <p className="mt-3 text-base text-white/80">{subtitle}</p>
      </div>

      <BrandWordmark className="text-3xl text-white xl:text-4xl" />
    </div>
  </motion.aside>
);
