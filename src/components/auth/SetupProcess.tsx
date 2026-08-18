import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Camera,
  CheckCircle2,
  Globe,
  Package as PackageIcon,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react';

import { Language, Role } from '../../types';
import { cn } from '../../lib/cn';
import { ui, trFuelType } from '../../i18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import { GOOGLE_CLIENT_ID } from '../../lib/googleIdentity';
import { APPLE_CLIENT_ID } from '../../lib/appleIdentity';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AppleSignInButton } from './AppleSignInButton';

type SetupLabels = {
  username: string;
  password: string;
  selectFuel: string;
  licensePlate: string;
  completeSetup: string;
};

type SetupProcessProps = {
  lang: Language;
  labels: SetupLabels;
  onComplete: (role: Role, lang: Language) => void;
  onClose?: () => void;
};

type CustomerType = 'private' | 'forwarder' | null;
type DriverType = 'private' | 'company' | null;

export const SetupProcess = ({ lang, labels, onComplete, onClose }: SetupProcessProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [step, setStep] = useState(2);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [role, setRole] = useState<Role>(null);
  const [customerType, setCustomerType] = useState<CustomerType>(null);
  const [driverType, setDriverType] = useState<DriverType>(null);
  const [driverData, setDriverData] = useState({
    username: '',
    password: '',
    name: '',
    country: '',
    idVerified: false,
  });
  const [driverCompany, setDriverCompany] = useState({ name: '', taxId: '', address: '' });
  const [customerCompany, setCustomerCompany] = useState({ name: '', taxId: '', address: '' });
  const [carData, setCarData] = useState({ make: '', model: '', year: '', fuelType: '', plate: '' });
  const [socialError, setSocialError] = useState('');
  const [socialSubmitting, setSocialSubmitting] = useState(false);

  const handleGoogleCredential = async (idToken: string) => {
    if (!role) return;
    setSocialError('');
    setSocialSubmitting(true);
    try {
      const result = await api.auth.google(idToken, role);
      if ('needs_registration' in result) return;
      onComplete(result.user.role?.name as Role || role, lang);
    } catch (error) {
      setSocialError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setSocialSubmitting(false);
    }
  };

  const handleAppleCredential = async (identityToken: string, fullName?: string) => {
    if (!role) return;
    setSocialError('');
    setSocialSubmitting(true);
    try {
      const result = await api.auth.apple(identityToken, fullName, role);
      if ('needs_registration' in result) return;
      onComplete(result.user.role?.name as Role || role, lang);
    } catch (error) {
      setSocialError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setSocialSubmitting(false);
    }
  };

  const isLongStep = useMemo(() => [3, 4, 6, 8].includes(step), [step]);
  const stepClass = cn(
    'flex flex-col gap-6',
    isLongStep && 'h-[calc(100vh-16rem)] overflow-y-auto -mr-6 pr-6 [scrollbar-gutter:stable]'
  );
  const headerClass = cn('flex flex-col items-center text-center gap-4 pt-2', isLongStep && 'sticky top-0 z-10 bg-white dark:bg-slate-900');
  const stepVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 96 : -96,
      rotate: dir > 0 ? 4 : -4,
      scale: 0.96,
      y: 0,
      filter: 'blur(3px)',
    }),
    center: {
      opacity: 1,
      x: 0,
      rotate: 0,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -96 : 96,
      rotate: dir > 0 ? -3 : 3,
      scale: 0.97,
      y: 0,
      filter: 'blur(3px)',
    }),
  };

  const canProceed =
    step === 2 ? Boolean(role) :
    step === 7 ? Boolean(customerType) :
    step === 8 ? Boolean(customerCompany.name && customerCompany.taxId) :
    step === 3 ? Boolean(driverData.username && driverData.password && driverData.name && driverData.country && driverData.idVerified) :
    step === 6 ? Boolean(driverCompany.name && driverCompany.taxId) :
    step === 4 ? Boolean(carData.make && carData.model && carData.fuelType && carData.plate) :
    false;

  const handleBack = () => {
    setTransitionDirection(-1);
    if (step === 2) onClose?.();
    else if (step === 7) setStep(2);
    else if (step === 8) setStep(7);
    else if (step === 3) setStep(2);
    else if (step === 6) setStep(3);
    else if (step === 4) setStep(driverType === 'company' ? 6 : 3);
  };

  const handleNext = () => {
    setTransitionDirection(1);
    if (step === 2 && role) {
      setStep(role === 'user' ? 7 : 3);
      return;
    }
    if (step === 7 && customerType) {
      if (customerType === 'private') onComplete('user', lang);
      else setStep(8);
      return;
    }
    if (step === 8 && customerCompany.name && customerCompany.taxId) {
      onComplete('user', lang);
      return;
    }
    if (step === 3 && driverData.username && driverData.password && driverData.name && driverData.country && driverData.idVerified) {
      setStep(driverType === 'company' ? 6 : 4);
      return;
    }
    if (step === 6 && driverCompany.name && driverCompany.taxId) {
      setStep(4);
      return;
    }
    if (step === 4 && carData.make && carData.model && carData.fuelType && carData.plate) {
      onComplete('driver', lang);
    }
  };

  return (
    <motion.div
      className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex justify-center items-start pt-6 p-4 pb-28 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <motion.div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-[32rem] rounded-full bg-primary/15 blur-3xl"
        initial={{ opacity: 0, y: -60, scale: 0.9 }}
        animate={{ opacity: 1, y: -20, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 34, scale: 0.965, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="max-w-md w-full z-10"
      >
        <Card className="w-full">
          <div>
            <AnimatePresence mode="wait" initial={false} custom={transitionDirection}>
              <motion.div
                key={step}
                custom={transitionDirection}
                variants={stepVariants}
                className={stepClass}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformOrigin: transitionDirection > 0 ? '100% 50%' : '0% 50%' }}
              >
            {step === 2 && (
              <>
                <div className={headerClass}>
                  <User className="w-12 h-12 text-primary" />
                  <h2 className="text-2xl font-bold dark:text-white">{u('onboarding.whoAreYou', 'Who are you?')}</h2>
                  <p className="text-slate-500 text-sm">{u('onboarding.roleSubtitle', 'Select your role to personalize your experience')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <button onClick={() => setRole('user')} className={cn('w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer', role === 'user' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-primary')}>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><PackageIcon className="text-blue-600" /></div>
                    <div><p className="font-bold dark:text-white">{u('onboarding.customerTitle', "I'm a Customer")}</p><p className="text-xs text-slate-500">{u('onboarding.customerDesc', 'I want to track packages and post loads')}</p></div>
                  </button>
                  <button onClick={() => { setRole('driver'); setDriverType('private'); }} className={cn('w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer', role === 'driver' && driverType === 'private' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-primary')}>
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Truck className="text-emerald-600" /></div>
                    <div><p className="font-bold dark:text-white">{u('onboarding.driverTitle', "I'm a Driver")}</p><p className="text-xs text-slate-500">{u('onboarding.driverDesc', 'I want to manage deliveries and loads')}</p></div>
                  </button>
                  <button onClick={() => { setRole('driver'); setDriverType('company'); }} className={cn('w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer', role === 'driver' && driverType === 'company' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-primary')}>
                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Globe className="text-violet-600" /></div>
                    <div><p className="font-bold dark:text-white">{u('setup.forwardingCompanyTitle', 'Freight Forwarding Company')}</p><p className="text-xs text-slate-500">{u('setup.forwardingCompanyDesc', 'I manage a fleet of drivers')}</p></div>
                  </button>
                </div>

                {role && (GOOGLE_CLIENT_ID || APPLE_CLIENT_ID) && (
                  <div className="flex flex-col gap-4">
                    {socialError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{socialError}</div>}
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[11px] font-bold uppercase text-slate-400">{u('login.or', 'or')}</span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <GoogleSignInButton onCredential={handleGoogleCredential} lang={lang} />
                    {APPLE_CLIENT_ID && (
                      <AppleSignInButton onCredential={handleAppleCredential} label={u('login.continueWithApple', 'Continue with Apple')} />
                    )}
                  </div>
                )}
              </>
            )}

            {step === 7 && (
              <>
                <div className={headerClass}>
                  <PackageIcon className="w-12 h-12 text-primary" />
                  <h2 className="text-2xl font-bold dark:text-white">{u('onboarding.customerTypeTitle', 'Customer Type')}</h2>
                  <p className="text-slate-500 text-sm">{u('onboarding.customerTypeDesc', 'Choose whether you are private party or freight forwarder')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <button onClick={() => setCustomerType('private')} className={cn('w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer', customerType === 'private' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-primary')}>
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center"><User className="text-cyan-600" /></div>
                    <div><p className="font-bold dark:text-white">{u('onboarding.privateParty', 'Private Party')}</p><p className="text-xs text-slate-500">{u('onboarding.privatePartyDesc', 'Individual customer account')}</p></div>
                  </button>
                  <button onClick={() => setCustomerType('forwarder')} className={cn('w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left cursor-pointer', customerType === 'forwarder' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-primary')}>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Globe className="text-blue-600" /></div>
                    <div><p className="font-bold dark:text-white">{u('onboarding.freightForwarder', 'Freight Forwarder')}</p><p className="text-xs text-slate-500">{u('onboarding.freightForwarderDesc', 'Registered logistics company (Spedicija)')}</p></div>
                  </button>
                </div>
              </>
            )}

            {(step === 8 || step === 6) && (
              <>
                <div className={headerClass}>
                  <Globe className="w-12 h-12 text-primary" />
                  <h2 className="text-2xl font-bold dark:text-white">{u('onboarding.companyInfo', 'Company Information')}</h2>
                  <p className="text-slate-500 text-sm">{u('onboarding.companyInfoDesc', 'Enter your registered business details')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.companyName', 'Company Name')}</label><input type="text" placeholder="Swift Logistics Ltd" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={step === 8 ? customerCompany.name : driverCompany.name} onChange={(e) => step === 8 ? setCustomerCompany({ ...customerCompany, name: e.target.value }) : setDriverCompany({ ...driverCompany, name: e.target.value })} /></div>
                  <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.taxId', 'Tax ID / VAT Number')}</label><input type="text" placeholder="EU123456789" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={step === 8 ? customerCompany.taxId : driverCompany.taxId} onChange={(e) => step === 8 ? setCustomerCompany({ ...customerCompany, taxId: e.target.value }) : setDriverCompany({ ...driverCompany, taxId: e.target.value })} /></div>
                  <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.businessAddress', 'Business Address')}</label><textarea placeholder="123 Logistics Way, Berlin, Germany" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors h-24 resize-none" value={step === 8 ? customerCompany.address : driverCompany.address} onChange={(e) => step === 8 ? setCustomerCompany({ ...customerCompany, address: e.target.value }) : setDriverCompany({ ...driverCompany, address: e.target.value })} /></div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className={headerClass}>
                  <ShieldCheck className="w-12 h-12 text-primary" />
                  <h2 className="text-2xl font-bold dark:text-white">{u('onboarding.driverVerification', 'Driver Verification')}</h2>
                  <p className="text-slate-500 text-sm">{u('onboarding.driverVerificationDesc', 'We need a few more details to get you on the road')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{labels.username}</label><input type="text" placeholder="johndoe123" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.username} onChange={(e) => setDriverData({ ...driverData, username: e.target.value })} /></div>
                    <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{labels.password}</label><input type="password" placeholder="••••••••" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.password} onChange={(e) => setDriverData({ ...driverData, password: e.target.value })} /></div>
                  </div>
                  <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.fullName', 'Full Name')}</label><input type="text" placeholder="Full name" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.name} onChange={(e) => setDriverData({ ...driverData, name: e.target.value })} /></div>
                  <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.country', 'Country')}</label><input type="text" placeholder={u('onboarding.selectCountry', 'Select Country')} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.country} onChange={(e) => setDriverData({ ...driverData, country: e.target.value })} /></div>
                  <button onClick={() => setDriverData({ ...driverData, idVerified: !driverData.idVerified })} className={cn('w-full p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer', driverData.idVerified ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-primary/50')}>{driverData.idVerified ? <CheckCircle2 className="text-emerald-500 w-8 h-8" /> : <Camera className="text-slate-400 w-8 h-8" />}<span className={cn('text-sm font-bold', driverData.idVerified ? 'text-emerald-600' : 'text-slate-500')}>{driverData.idVerified ? u('onboarding.idUploaded', 'ID Photo Uploaded') : u('onboarding.idUpload', 'Upload Photo of ID')}</span></button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className={headerClass}>
                  <Truck className="w-12 h-12 text-primary" />
                  <h2 className="text-2xl font-bold dark:text-white">{u('setup.vehicleDetails', 'Vehicle Details')}</h2>
                  <p className="text-slate-500 text-sm">{u('setup.vehicleDetailsDesc', 'Provide your vehicle details')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('setup.make', 'Make')}</label><input type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.make} onChange={(e) => setCarData({ ...carData, make: e.target.value })} /></div>
                    <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('setup.model', 'Model')}</label><input type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.model} onChange={(e) => setCarData({ ...carData, model: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{u('setup.year', 'Year')}</label><input type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.year} onChange={(e) => setCarData({ ...carData, year: e.target.value })} /></div>
                    <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{labels.selectFuel}</label><select className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.fuelType} onChange={(e) => setCarData({ ...carData, fuelType: e.target.value })}><option value="">{labels.selectFuel}</option><option value="Diesel">{trFuelType(lang, 'Diesel')}</option><option value="Gasoline">{trFuelType(lang, 'Gasoline')}</option><option value="Electric">{trFuelType(lang, 'Electric')}</option><option value="Hybrid">{trFuelType(lang, 'Hybrid')}</option></select></div>
                  </div>
                  <div className="flex flex-col gap-4"><label className="text-xs font-bold text-slate-500 uppercase block">{labels.licensePlate}</label><input type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.plate} onChange={(e) => setCarData({ ...carData, plate: e.target.value })} /></div>
                </div>
              </>
            )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      <motion.button
        onClick={() => onClose?.()}
        aria-label={u('setup.close', 'Close setup')}
        className="fixed top-4 right-4 z-[150] h-10 w-10 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary shadow-lg flex items-center justify-center cursor-pointer transition-all"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      >
        <X className="w-5 h-5" />
      </motion.button>

      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[140] px-4 pb-4"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.1 }}
      >
        <div className="max-w-md w-full mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack} disabled={socialSubmitting} className="flex-1 cursor-pointer" size="lg">
              {step === 2 ? u('setup.cancelSetup', 'Cancel') : u('common.back', 'Back')}
            </Button>
            <Button onClick={handleNext} disabled={!canProceed || socialSubmitting} className="flex-1 cursor-pointer" size="lg">
              {socialSubmitting ? u('login.signingIn', 'Signing in...') : step === 4 ? labels.completeSetup : u('common.continue', 'Continue')}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
