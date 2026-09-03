import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Banknote, Building2, Crown, FileCheck2, Radio, RefreshCw, Truck, User, Users, Warehouse, X } from 'lucide-react';

import { Language, Role } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import { GOOGLE_CLIENT_ID } from '../../lib/googleIdentity';
import { APPLE_CLIENT_ID } from '../../lib/appleIdentity';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AppleSignInButton } from './AppleSignInButton';
import { AuthVisualPanel } from './AuthVisualPanel';

type PendingSocialAuth = { provider: 'google' | 'apple'; token: string; email?: string; name?: string };
type QuickLoginOption = {
  key: string;
  role: Exclude<Role, null>;
  username: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dividerBefore?: boolean;
};

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
    { id: 'warehouse' as const, label: u('login.warehouseCompany', 'Warehouse Company'), icon: Warehouse },
  ];
  const quickLoginOptions: QuickLoginOption[] = [
    { key: 'superadmin', role: 'superadmin', username: 'superadmin_demo', label: u('login.superadmin', 'Superadmin'), icon: Crown },
    { key: 'company-owner', role: 'company', username: 'company_demo', label: u('login.logisticsCompany', 'Logistics Company'), icon: Building2, dividerBefore: true },
    { key: 'warehouse-owner', role: 'company', username: 'warehouse_demo', label: u('login.warehouseCompany', 'Warehouse Company'), icon: Warehouse },
    { key: 'company-manager', role: 'manager', username: 'manager_demo', label: u('login.companyManager', 'Logistics Company Manager'), icon: Users, dividerBefore: true },
    { key: 'warehouse-manager', role: 'manager', username: 'warehouse_manager_demo', label: u('login.warehouseManager', 'Warehouse Manager'), icon: Users },
    { key: 'customer', role: 'user', username: 'customer_demo', label: u('common.customer', 'Customer'), icon: User, dividerBefore: true },
    { key: 'driver', role: 'driver', username: 'driver_demo', label: u('login.driverRole', 'Driver'), icon: Truck },
    { key: 'dispatcher', role: 'dispatcher', username: 'dispatcher_demo', label: u('login.dispatcher', 'Dispatcher'), icon: Radio },
    { key: 'customs-officer', role: 'customs_officer', username: 'customs_officer_demo', label: u('login.customsOfficer', 'Customs Agent'), icon: FileCheck2 },
    { key: 'finance', role: 'finance', username: 'finance_demo', label: u('login.financeAdministration', 'Finance & Administration'), icon: Banknote },
  ];
  const [loginData, setLoginData] = useState({
    username: 'superadmin_demo',
    password: 'demo12345',
    role: 'superadmin' as Role,
  });
  const [isSwitchingToSetup, setIsSwitchingToSetup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pendingSocialAuth, setPendingSocialAuth] = useState<PendingSocialAuth | null>(null);
  const [quickLoginKey, setQuickLoginKey] = useState<string | null>(null);

  const canProceed = pendingSocialAuth
    ? Boolean(loginData.role && loginData.role !== 'superadmin')
    : Boolean(loginData.username && loginData.password);
  const handleGetStarted = () => {
    if (!onGetStarted || isSwitchingToSetup) return;
    setIsSwitchingToSetup(true);
    setTimeout(() => onGetStarted(), 260);
  };

  const quickRoleLogin = async (option: QuickLoginOption) => {
    if (isSubmitting) return;
    setQuickLoginKey(option.key);
    setIsSubmitting(true);
    setLoginError('');
    try {
      const result = await api.auth.login(option.username, 'demo12345');
      const authenticatedRole = result.user.role?.name as Role;
      onComplete(authenticatedRole || option.role, lang);
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setIsSubmitting(false);
      setQuickLoginKey(null);
    }
  };

  const finishSocialRegistration = async () => {
    if (!pendingSocialAuth || !loginData.role || isSubmitting) return;
    setIsSubmitting(true);
    setLoginError('');
    try {
      const result = pendingSocialAuth.provider === 'google'
        ? await api.auth.google(pendingSocialAuth.token, loginData.role)
        : await api.auth.apple(pendingSocialAuth.token, pendingSocialAuth.name, loginData.role);
      if ('needs_registration' in result) return;
      const authenticatedRole = result.user.role?.name as Role;
      setPendingSocialAuth(null);
      onComplete(authenticatedRole || loginData.role, lang);
    } catch (error) {
      setLoginError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (pendingSocialAuth) return finishSocialRegistration();
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

  const cancelSocialRegistration = () => {
    setPendingSocialAuth(null);
    setLoginError('');
    setLoginData((prev) => ({ ...prev, role: prev.role || 'superadmin' }));
  };

  const handleGoogleCredential = async (idToken: string) => {
    setLoginError('');
    setIsSubmitting(true);
    try {
      const result = await api.auth.google(idToken);
      if ('needs_registration' in result) {
        setPendingSocialAuth({ provider: 'google', token: idToken, email: result.email, name: result.name });
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

  const handleAppleCredential = async (identityToken: string, fullName?: string) => {
    setLoginError('');
    setIsSubmitting(true);
    try {
      const result = await api.auth.apple(identityToken, fullName);
      if ('needs_registration' in result) {
        setPendingSocialAuth({ provider: 'apple', token: identityToken, email: result.email, name: fullName || result.name });
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
      className="relative grid h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 lg:grid-cols-2"
      initial={{ opacity: 0 }}
      animate={isSwitchingToSetup ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <AuthVisualPanel
        title={labels.logIn}
        subtitle={u('login.signInDesc', 'Sign in and enter the app immediately.')}
      />
      <motion.div
        className="pointer-events-none absolute right-0 top-0 h-80 w-[32rem] rounded-full bg-primary/15 blur-3xl lg:w-1/2"
        initial={{ opacity: 0, y: -60, scale: 0.9 }}
        animate={{ opacity: 1, y: -20, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <motion.div
        className="z-10 col-start-1 row-start-1 flex h-full w-full items-start justify-center overflow-y-auto px-4 pb-28 pt-6 lg:col-start-2"
        initial={{ opacity: 0, y: 34, scale: 0.965, filter: 'blur(10px)' }}
        animate={
          isSwitchingToSetup
            ? { opacity: 0, y: -16, scale: 0.975, filter: 'blur(8px)' }
            : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Card className="w-full max-w-md">
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

              {pendingSocialAuth ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-slate-600 dark:text-slate-300">
                  {u('login.socialFinishSignup', 'Choose a role below to finish creating your account.')}{' '}
                  <button type="button" onClick={cancelSocialRegistration} className="font-bold text-primary hover:underline cursor-pointer">
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

              {!pendingSocialAuth && (GOOGLE_CLIENT_ID || APPLE_CLIENT_ID) && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[11px] font-bold uppercase text-slate-400">{u('login.or', 'or')}</span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <GoogleSignInButton onCredential={handleGoogleCredential} label={u('login.continueWithGoogle', 'Continue with Google')} lang={lang} />
                  {APPLE_CLIENT_ID && (
                    <AppleSignInButton onCredential={handleAppleCredential} label={u('login.continueWithApple', 'Continue with Apple')} />
                  )}
                </>
              )}

              {pendingSocialAuth && (
                <div className="grid grid-cols-2 gap-4">
                  {roleOptions.filter((option) => option.id !== 'superadmin' && option.id !== 'warehouse').map((option) => {
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
        className="absolute bottom-3 right-[calc(50%+0.75rem)] z-30 hidden max-h-[calc(100dvh-1.5rem)] w-52 flex-col gap-2 overflow-y-auto pr-1 lg:flex"
        initial={{ opacity: 0, x: -16 }}
        animate={isSwitchingToSetup ? { opacity: 0, x: -16 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <span className="pl-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {u('login.quickLogin', 'Quick login')}
        </span>
        {quickLoginOptions.map((option) => {
          const Icon = option.icon;
          const isLoading = quickLoginKey === option.key;
          return (
            <React.Fragment key={option.key}>
              {option.dividerBefore && <div className="my-1 h-px w-full shrink-0 bg-white/35 dark:bg-slate-600/70" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => void quickRoleLogin(option)}
                disabled={isSubmitting || isSwitchingToSetup}
                className="flex w-full min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-left text-sm font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <Icon className="h-4 w-4 shrink-0" />}
                <span className="leading-tight">{option.label}</span>
              </button>
            </React.Fragment>
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
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[140] px-4 pb-4 lg:left-1/2"
        initial={{ opacity: 0, y: 22 }}
        animate={isSwitchingToSetup ? { opacity: 0, y: 18 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.1 }}
      >
        <div className="pointer-events-auto max-w-md w-full mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3">
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
                : pendingSocialAuth
                  ? u('login.finishSignup', 'Finish sign-up')
                  : labels.logIn}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
