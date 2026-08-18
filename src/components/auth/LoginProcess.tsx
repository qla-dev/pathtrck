import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Banknote, Building2, Crown, RefreshCw, Truck, User, X } from 'lucide-react';

import { Language, Role } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import { GOOGLE_CLIENT_ID } from '../../lib/googleIdentity';
import { GoogleSignInButton } from './GoogleSignInButton';

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
  const roleOptions = [
    { id: 'superadmin' as const, label: u('login.superadmin', 'Superadmin'), icon: Crown },
    { id: 'user' as const, label: u('onboarding.customerTitle', "I'm a Customer"), icon: User },
    { id: 'driver' as const, label: u('onboarding.driverTitle', "I'm a Driver"), icon: Truck },
    { id: 'company' as const, label: u('login.logisticsCompany', 'Logistics Company'), icon: Building2 },
    { id: 'finance' as const, label: u('login.financeAdministration', 'Finance & Administration'), icon: Banknote },
  ];
  const [loginData, setLoginData] = useState({
    username: 'superadmin_demo',
    password: 'demo12345',
    role: 'superadmin' as Role,
  });
  const [isSwitchingToSetup, setIsSwitchingToSetup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<{ token: string; email?: string; name?: string } | null>(null);
  const [quickLoginRole, setQuickLoginRole] = useState<Role>(null);

  const canProceed = pendingGoogleAuth
    ? Boolean(loginData.role && loginData.role !== 'superadmin')
    : Boolean(loginData.username && loginData.password);
  const handleGetStarted = () => {
    if (!onGetStarted || isSwitchingToSetup) return;
    setIsSwitchingToSetup(true);
    setTimeout(() => onGetStarted(), 260);
  };

  const quickRoleLogin = async (roleId: Exclude<Role, null>) => {
    if (isSubmitting) return;
    const demoUsername = roleId === 'user' ? 'customer_demo' : `${roleId}_demo`;
    setQuickLoginRole(roleId);
    setIsSubmitting(true);
    setLoginError('');
    try {
      const result = await api.auth.login(demoUsername, 'demo12345');
      const authenticatedRole = result.user.role?.name as Role;
      onComplete(authenticatedRole || roleId, lang);
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setIsSubmitting(false);
      setQuickLoginRole(null);
    }
  };

  const finishGoogleRegistration = async () => {
    if (!pendingGoogleAuth || !loginData.role || isSubmitting) return;
    setIsSubmitting(true);
    setLoginError('');
    try {
      const result = await api.auth.google(pendingGoogleAuth.token, loginData.role);
      if ('needs_registration' in result) return;
      const authenticatedRole = result.user.role?.name as Role;
      setPendingGoogleAuth(null);
      onComplete(authenticatedRole || loginData.role, lang);
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (pendingGoogleAuth) return finishGoogleRegistration();
    if (!canProceed || isSubmitting) return;
    setIsSubmitting(true);
    setLoginError('');
    try {
      const result = await api.auth.login(loginData.username, loginData.password);
      const authenticatedRole = result.user.role?.name as Role;
      onComplete(authenticatedRole || loginData.role, lang);
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelGoogleRegistration = () => {
    setPendingGoogleAuth(null);
    setLoginError('');
    setLoginData((prev) => ({ ...prev, role: prev.role || 'superadmin' }));
  };

  const handleGoogleCredential = async (idToken: string) => {
    setLoginError('');
    setIsSubmitting(true);
    try {
      const result = await api.auth.google(idToken);
      if ('needs_registration' in result) {
        setPendingGoogleAuth({ token: idToken, email: result.email, name: result.name });
        setLoginData((prev) => ({ ...prev, role: null }));
        return;
      }
      const authenticatedRole = result.user.role?.name as Role;
      onComplete(authenticatedRole || loginData.role, lang);
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : u('login.socialSignInFailed', 'Sign-in was not completed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <User className="w-12 h-12 text-primary" />
              <h2 className="text-2xl font-bold dark:text-white">{labels.logIn}</h2>
              <p className="text-slate-500 text-sm">
                {u('login.signInDesc', 'Sign in and enter the app immediately.')}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {loginError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{loginError}</div>}

              {pendingGoogleAuth ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-slate-600 dark:text-slate-300">
                  {u('login.googleFinishSignup', 'Choose a role below to finish creating your account with Google.')}{' '}
                  <button type="button" onClick={cancelGoogleRegistration} className="font-bold text-primary hover:underline cursor-pointer">
                    {u('login.cancel', 'Cancel')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    <label className="text-xs font-bold text-slate-500 uppercase block">{labels.username}</label>
                    <input
                      type="text"
                      placeholder="johndoe123"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={loginData.username}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-xs font-bold text-slate-500 uppercase block">{labels.password}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors"
                      value={loginData.password}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {!pendingGoogleAuth && GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[11px] font-bold uppercase text-slate-400">{u('login.or', 'or')}</span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <GoogleSignInButton onCredential={handleGoogleCredential} lang={lang} />
                </>
              )}

              {pendingGoogleAuth && (
                <div className="grid grid-cols-2 gap-4">
                  {roleOptions.filter((option) => option.id !== 'superadmin').map((option) => {
                    const Icon = option.icon;
                    const selected = loginData.role === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setLoginData((prev) => ({ ...prev, role: option.id }))}
                        className={cn(
                          'min-h-16 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 text-left',
                          selected ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-primary/40'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="leading-tight">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        className="hidden sm:flex fixed bottom-4 left-4 z-30 flex-col gap-2 w-44"
        initial={{ opacity: 0, x: -16 }}
        animate={isSwitchingToSetup ? { opacity: 0, x: -16 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <span className="pl-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {u('login.quickLogin', 'Quick login')}
        </span>
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const isLoading = quickLoginRole === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => void quickRoleLogin(option.id)}
              disabled={isSubmitting || isSwitchingToSetup}
              className="flex w-full min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-left text-sm font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <Icon className="h-4 w-4 shrink-0" />}
              <span className="leading-tight">{option.label}</span>
            </button>
          );
        })}
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
              onClick={handleLogin}
              disabled={!canProceed || isSwitchingToSetup || isSubmitting}
              className="flex-1 cursor-pointer"
              size="lg"
            >
              {isSubmitting
                ? u('login.signingIn', 'Signing in...')
                : pendingGoogleAuth
                  ? u('login.finishSignup', 'Finish sign-up')
                  : labels.logIn}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
