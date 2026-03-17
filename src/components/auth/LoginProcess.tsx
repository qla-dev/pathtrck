import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, X } from 'lucide-react';

import { Language, Role } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

type LoginLabels = {
  logIn: string;
  getStarted: string;
  username: string;
  password: string;
};

type LoginProcessProps = {
  lang: Language;
  labels: LoginLabels;
  onComplete: (role: Role, lang: Language) => void;
  onClose?: () => void;
  onGetStarted?: () => void;
};

export const LoginProcess = ({ lang, labels, onComplete, onClose, onGetStarted }: LoginProcessProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [loginData, setLoginData] = useState({
    username: 'driver_demo',
    password: 'demo12345',
    role: 'driver' as Role,
  });
  const [isSwitchingToSetup, setIsSwitchingToSetup] = useState(false);

  const canProceed = Boolean(loginData.username && loginData.password && loginData.role);
  const handleGetStarted = () => {
    if (!onGetStarted || isSwitchingToSetup) return;
    setIsSwitchingToSetup(true);
    setTimeout(() => onGetStarted(), 260);
  };

  return (
    <motion.div
      className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex justify-center items-start pt-6 p-4 pb-28 relative"
      initial={{ opacity: 0 }}
      animate={isSwitchingToSetup ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <motion.div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-[32rem] rounded-full bg-primary/15 blur-3xl"
        initial={{ opacity: 0, y: -60, scale: 0.9 }}
        animate={{ opacity: 1, y: -20, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <motion.div
        className="max-w-md w-full z-10"
        initial={{ opacity: 0, y: 34, scale: 0.965, filter: 'blur(10px)' }}
        animate={
          isSwitchingToSetup
            ? { opacity: 0, y: -16, scale: 0.975, filter: 'blur(8px)' }
            : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Card className="w-full">
          <div className="space-y-6">
          <div className="text-center">
            <User className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold dark:text-white mb-6">{labels.logIn}</h2>
            <p className="text-slate-500 text-sm">
              {u('login.signInDesc', 'Sign in and enter the app immediately.')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{labels.username}</label>
              <input
                type="text"
                placeholder="johndoe123"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                value={loginData.username}
                onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{labels.password}</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                value={loginData.password}
                onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLoginData((prev) => ({ ...prev, role: 'user' }))}
                className={cn(
                  'h-11 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer',
                  loginData.role === 'user' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500'
                )}
              >
                {u('onboarding.customerTitle', "I'm a Customer")}
              </button>
              <button
                onClick={() => setLoginData((prev) => ({ ...prev, role: 'driver' }))}
                className={cn(
                  'h-11 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer',
                  loginData.role === 'driver' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500'
                )}
              >
                {u('onboarding.driverTitle', "I'm a Driver")}
              </button>
            </div>
          </div>
          </div>
        </Card>
      </motion.div>

      <motion.button
        onClick={() => onClose?.()}
        aria-label={u('login.close', 'Close login')}
        className="fixed top-4 right-4 z-[150] h-10 w-10 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary shadow-lg flex items-center justify-center cursor-pointer transition-all"
        disabled={isSwitchingToSetup}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      >
        <X className="w-5 h-5" />
      </motion.button>

      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[140] px-4 pb-4"
        initial={{ opacity: 0, y: 22 }}
        animate={isSwitchingToSetup ? { opacity: 0, y: 18 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.1 }}
      >
        <div className="max-w-md w-full mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleGetStarted}
              disabled={isSwitchingToSetup}
              className="flex-1 cursor-pointer"
              size="lg"
            >
              {labels.getStarted}
            </Button>
            <Button
              onClick={() => loginData.role && onComplete(loginData.role, lang)}
              disabled={!canProceed || isSwitchingToSetup}
              className="flex-1 cursor-pointer"
              size="lg"
            >
              {labels.logIn}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
