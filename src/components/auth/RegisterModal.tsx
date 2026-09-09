import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Crown,
  Building2,
  Warehouse,
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
import { RolePermissionsCard } from '../ui/RolePermissionsCard';
import { CompactCard } from '../ui/CompactCard';
import { ChoiceCard } from '../modals/PostLoadModal/ChoiceCard';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import { GOOGLE_CLIENT_ID } from '../../lib/googleIdentity';
import { APPLE_CLIENT_ID } from '../../lib/appleIdentity';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AppleSignInButton } from './AppleSignInButton';
import { SummaryRow } from '../modals/PostLoadModal/SummaryRow';

type SetupLabels = {
  username: string;
  password: string;
  selectFuel: string;
  licensePlate: string;
  completeSetup: string;
};

type RegisterModalProps = {
  lang: Language;
  labels: SetupLabels;
  onComplete: (role: Role, lang: Language) => void;
  onClose?: () => void;
};


export const RegisterModal = ({ lang, labels, onComplete, onClose }: RegisterModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [step, setStep] = useState(2);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [role, setRole] = useState<Role>(null);
  const [driverData, setDriverData] = useState({
    username: '',
    password: '',
    name: '',
    country: '',
  });
  const [customerCompany, setCustomerCompany] = useState({ name: '', taxId: '', address: '' });
  const [carData, setCarData] = useState({ make: '', model: '', year: '', fuelType: '', plate: '' });
  const [socialError, setSocialError] = useState('');
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const exitAction = useRef<(() => void) | null>(null);
  const closeWith = (action: () => void) => {
    if (exitAction.current) return;
    exitAction.current = action;
    setIsClosing(true);
  };
  const handleClose = () => { if (!socialSubmitting) closeWith(() => onClose?.()); };

  const handleGoogleCredential = async (idToken: string) => {
    if (!role) return;
    setSocialError('');
    setSocialSubmitting(true);
    try {
      const result = await api.auth.google(idToken, role);
      if ('needs_registration' in result) return;
      closeWith(() => onComplete(result.user.role?.name as Role || role, lang));
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
      closeWith(() => onComplete(result.user.role?.name as Role || role, lang));
    } catch (error) {
      setSocialError(error instanceof ApiError ? error.message : u('login.connectionError', 'Could not connect to the API.'));
    } finally {
      setSocialSubmitting(false);
    }
  };

  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step]);
  const steps = [
    { id: 2, title: u('register.roleStep', 'Account type') },
    { id: 3, title: u('setup.accountDetails', 'Account details') },
    ...(accountType === 'business' ? [{ id: 8, title: u('onboarding.companyInfo', 'Company information') }] : []),
    ...(role === 'driver' ? [{ id: 4, title: u('register.vehicleStep', 'Vehicle details') }] : []),
    { id: 9, title: u('register.reviewStep', 'Review') },
  ];
  const stepIndex = steps.findIndex((item) => item.id === step);
  const selectedRoleLabel = role === 'user' ? u('setup.customer', 'Customer')
    : role === 'driver' ? u('setup.independentCarrier', 'Independent carrier')
    : role === 'company' ? u('setup.transportCompany', 'Transport company')
    : role === 'warehouse' ? u('setup.warehouseCompany', 'Warehouse company') : '?';
  const rolePermissions = role === 'company' || role === 'warehouse'
    ? [u('register.ownWorkspace', 'Own the company workspace'), u('register.manageCompany', 'Manage all company data'), u('register.manageRoles', 'Manage team roles'), u('register.viewFinance', 'View finance')]
    : role === 'driver'
      ? [u('register.assignedLoads', 'View assigned loads'), u('register.deliveryStatus', 'Update delivery status'), u('register.routeNotes', 'Add route notes'), u('register.messageDispatch', 'Message dispatch')]
      : [u('register.postLoads', 'Post loads'), u('register.trackLoads', 'Track shipments'), ...(accountType === 'business' ? [u('register.ownWarehouse', 'Manage your own warehouse')] : [])];
  const headerClass = 'flex flex-col gap-2 [&>svg]:hidden [&>h2]:text-lg';
  const stepClass = 'flex flex-col gap-6';
  const stepVariants = {
    enter: { opacity: 0, y: 16 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  };

  const canProceed =
    step === 9 ? Boolean(role) :
    step === 2 ? Boolean(role) :
    step === 8 ? Boolean(customerCompany.name.trim() && customerCompany.taxId.trim()) :
    step === 3 ? Boolean(driverData.username.trim() && driverData.password && driverData.name.trim() && driverData.country.trim()) :
    step === 4 ? Boolean(carData.make.trim() && carData.model.trim() && carData.fuelType && carData.plate.trim()) :
    false;

  const handleBack = () => {
    setTransitionDirection(-1);
    if (stepIndex === 0) handleClose();
    else setStep(steps[stepIndex - 1].id);
  };
  const handleNext = () => {
    if (!canProceed || socialSubmitting) return;
    setTransitionDirection(1);
    if (step === 9) closeWith(() => onComplete(role, lang));
    else setStep(steps[stepIndex + 1].id);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <motion.dialog initial={{ opacity: 0 }} animate={{ opacity: isClosing ? 0 : 1 }} transition={{ duration: 0.2, ease: 'easeOut' }} ref={dialogRef} aria-labelledby="register-title" onCancel={(event) => { event.preventDefault(); handleClose(); }} className="fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-hidden border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:bg-slate-900 dark:text-white rounded-none">
        <motion.div className="flex h-full min-h-0 flex-col"
          initial={{ opacity: 0, y: 24, scale: 0.992 }}
          animate={isClosing ? { opacity: 0, y: 16, scale: 0.996 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => { if (isClosing) exitAction.current?.(); }}
          inert={isClosing}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-8">
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-primary">Freightbook.ai</p>
              <h1 id="register-title" className="text-xl font-bold">{u('register.title', 'Create your account')}</h1>
            </div>
            <button type="button" onClick={handleClose} disabled={socialSubmitting} aria-label={u('setup.close', 'Close setup')} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline-primary dark:border-slate-700 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </header>
          <nav aria-label={u('register.progress', 'Registration progress')} className="shrink-0 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60 sm:px-8">
            <ol className="relative flex w-full items-start">
              <li aria-hidden="true" className="pointer-events-none absolute top-4 h-px bg-slate-200 dark:bg-slate-700" style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }} />
              {steps.map((item, index) => <li key={item.id} className="relative z-10 min-w-0 flex-1 basis-0">
                <button type="button" disabled={index > stepIndex || socialSubmitting} aria-current={step === item.id ? 'step' : undefined} onClick={() => { setTransitionDirection(-1); setStep(item.id); }} className="flex w-full cursor-pointer flex-col items-center gap-2 px-2 disabled:cursor-default focus-visible:outline-primary">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold', index < stepIndex ? 'bg-emerald-500 text-white' : index === stepIndex ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800')}>
                    {index < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className={cn('text-center text-[11px] font-bold', index === stepIndex ? 'text-primary' : 'text-slate-500 dark:text-slate-400')}>{item.title}</span>
                </button>
              </li>)}
            </ol>
          </nav>
          <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid items-start gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
              <main className="min-w-0">
                <p className="mb-2 text-xs font-semibold text-slate-400">{u('postLoadModal.stepLabel', 'Step')} {stepIndex + 1} / {steps.length}</p>
                <h2 ref={headingRef} tabIndex={-1} className="mb-6 text-xl font-bold outline-none">{steps[stepIndex]?.title}</h2>
                <AnimatePresence mode="wait" initial={false} custom={transitionDirection}>
                  <motion.div key={step} custom={transitionDirection} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className={stepClass}>
            {step === 2 && (
              <>
                <div className={headerClass}>
                  <User className="w-12 h-12 text-primary" />
                  <p className="text-slate-500 text-sm">{u('onboarding.roleSubtitle', 'Select your role to personalize your experience')}</p>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label={u('setup.accountType', 'Account type')}>
                    <ChoiceCard compact active={accountType === 'individual'} title={u('setup.individual', 'Individual')} icon={User} className="pr-6" onClick={() => { if (accountType !== 'individual') { setAccountType('individual'); setRole(null); setSocialError(''); } }} />
                    <ChoiceCard compact active={accountType === 'business'} title={u('setup.business', 'Legal entity')} icon={Building2} className="pr-6" onClick={() => { if (accountType !== 'business') { setAccountType('business'); setRole(null); setSocialError(''); } }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {accountType === 'individual' ? <>
                      <CompactCard onClick={() => setRole('user')} selected={role === 'user'} icon={PackageIcon} tone="bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                        <p className="text-sm font-bold leading-5 text-slate-900 dark:text-white">{u('setup.customer', 'Customer')}</p>
                        <p className="text-xs leading-4 text-slate-500 dark:text-slate-400">{u('onboarding.customerDesc', 'I want to track packages and post loads')}</p>
                      </CompactCard>
                      <CompactCard onClick={() => setRole('driver')} selected={role === 'driver'} icon={Truck} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                        <p className="text-sm font-bold leading-5 text-slate-900 dark:text-white">{u('setup.independentCarrier', 'Independent carrier')}</p>
                        <p className="text-xs leading-4 text-slate-500 dark:text-slate-400">{u('onboarding.driverDesc', 'I want to manage deliveries and loads')}</p>
                      </CompactCard>
                    </> : <>
                      <CompactCard onClick={() => setRole('user')} selected={role === 'user'} icon={PackageIcon} tone="bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                        <p className="text-sm font-bold leading-5 text-slate-900 dark:text-white">{u('setup.customer', 'Customer')}</p>
                        <p className="text-xs leading-4 text-slate-500 dark:text-slate-400">{u('setup.businessCustomerDesc', 'Post and track loads, with or without your own warehouse')}</p>
                      </CompactCard>
                      <CompactCard onClick={() => setRole('company')} selected={role === 'company'} icon={Truck} tone="bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                        <p className="text-sm font-bold leading-5 text-slate-900 dark:text-white">{u('setup.transportCompany', 'Transport company')}</p>
                        <p className="text-xs leading-4 text-slate-500 dark:text-slate-400">{u('setup.transportCompanyDesc', 'Manage transport and your fleet, with or without your own warehouse')}</p>
                      </CompactCard>
                      <CompactCard onClick={() => setRole('warehouse')} selected={role === 'warehouse'} icon={Warehouse} tone="bg-orange-100 text-orange-600 dark:bg-orange-900/30">
                        <p className="text-sm font-bold leading-5 text-slate-900 dark:text-white">{u('setup.warehouseCompany', 'Warehouse company')}</p>
                        <p className="text-xs leading-4 text-slate-500 dark:text-slate-400">{u('setup.warehouseCompanyDesc', 'Manage your warehouses and storage operations')}</p>
                      </CompactCard>
                    </>}
                  </div>
                </div>


              </>
            )}

            {step === 8 && (
              <>
                <div className={headerClass}>
                  <Globe className="w-12 h-12 text-primary" />
                  <p className="text-slate-500 text-sm">{u('onboarding.companyInfoDesc', 'Enter your registered business details')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4"><label htmlFor="register-field-1" className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.companyName', 'Company Name')}</label><input id="register-field-1" type="text" placeholder="Swift Logistics Ltd" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={customerCompany.name} onChange={(e) => setCustomerCompany({ ...customerCompany, name: e.target.value })} /></div>
                  <div className="flex flex-col gap-4"><label htmlFor="register-field-2" className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.taxId', 'Tax ID / VAT Number')}</label><input id="register-field-2" type="text" placeholder="EU123456789" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={customerCompany.taxId} onChange={(e) => setCustomerCompany({ ...customerCompany, taxId: e.target.value })} /></div>
                  <div className="flex flex-col gap-4"><label htmlFor="register-field-3" className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.businessAddress', 'Business Address')}</label><textarea id="register-field-3" placeholder="123 Logistics Way, Berlin, Germany" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors h-24 resize-none" value={customerCompany.address} onChange={(e) => setCustomerCompany({ ...customerCompany, address: e.target.value })} /></div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className={headerClass}>
                  <ShieldCheck className="w-12 h-12 text-primary" />
                  <p className="text-slate-500 text-sm">{u('setup.accountDetailsDesc', 'Enter your details to set up your account')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-4"><label htmlFor="register-field-4" className="text-xs font-bold text-slate-500 uppercase block">{labels.username}</label><input id="register-field-4" type="text" autoComplete="username" placeholder="johndoe123" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.username} onChange={(e) => setDriverData({ ...driverData, username: e.target.value })} /></div>
                    <div className="flex flex-col gap-4"><label htmlFor="register-field-5" className="text-xs font-bold text-slate-500 uppercase block">{labels.password}</label><input id="register-field-5" type="password" autoComplete="new-password" placeholder="••••••••" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.password} onChange={(e) => setDriverData({ ...driverData, password: e.target.value })} /></div>
                  </div>
                  <div className="flex flex-col gap-4"><label htmlFor="register-field-6" className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.fullName', 'Full Name')}</label><input id="register-field-6" type="text" autoComplete="name" placeholder={u('onboarding.fullName', 'Full name')} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.name} onChange={(e) => setDriverData({ ...driverData, name: e.target.value })} /></div>
                  <div className="flex flex-col gap-4"><label htmlFor="register-field-7" className="text-xs font-bold text-slate-500 uppercase block">{u('onboarding.country', 'Country')}</label><input id="register-field-7" type="text" placeholder={u('onboarding.selectCountry', 'Select Country')} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={driverData.country} onChange={(e) => setDriverData({ ...driverData, country: e.target.value })} /></div>

                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className={headerClass}>
                  <Truck className="w-12 h-12 text-primary" />
                  <p className="text-slate-500 text-sm">{u('setup.vehicleDetailsDesc', 'Provide your vehicle details')}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-4"><label htmlFor="register-field-8" className="text-xs font-bold text-slate-500 uppercase block">{u('setup.make', 'Make')}</label><input id="register-field-8" type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.make} onChange={(e) => setCarData({ ...carData, make: e.target.value })} /></div>
                    <div className="flex flex-col gap-4"><label htmlFor="register-field-9" className="text-xs font-bold text-slate-500 uppercase block">{u('setup.model', 'Model')}</label><input id="register-field-9" type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.model} onChange={(e) => setCarData({ ...carData, model: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-4"><label htmlFor="register-field-10" className="text-xs font-bold text-slate-500 uppercase block">{u('setup.year', 'Year')}</label><input id="register-field-10" type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.year} onChange={(e) => setCarData({ ...carData, year: e.target.value })} /></div>
                    <div className="flex flex-col gap-4"><label htmlFor="register-field-11" className="text-xs font-bold text-slate-500 uppercase block">{labels.selectFuel}</label><select id="register-field-11" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.fuelType} onChange={(e) => setCarData({ ...carData, fuelType: e.target.value })}><option value="">{labels.selectFuel}</option><option value="Diesel">{trFuelType(lang, 'Diesel')}</option><option value="Gasoline">{trFuelType(lang, 'Gasoline')}</option><option value="Electric">{trFuelType(lang, 'Electric')}</option><option value="Hybrid">{trFuelType(lang, 'Hybrid')}</option></select></div>
                  </div>
                  <div className="flex flex-col gap-4"><label htmlFor="register-field-12" className="text-xs font-bold text-slate-500 uppercase block">{labels.licensePlate}</label><input id="register-field-12" type="text" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:border-primary focus:ring-0 outline-none transition-colors" value={carData.plate} onChange={(e) => setCarData({ ...carData, plate: e.target.value })} /></div>
                </div>
              </>
            )}

                    {step === 9 && <div className="space-y-5">
                      <p className="text-sm text-slate-500">{u('register.reviewDescription', 'Review your details before completing setup. You can go back to make changes.')}</p>
                      <Card contentClassName="p-4">
                        <SummaryRow label={u('onboarding.fullName', 'Full name')} value={driverData.name} />
                        <SummaryRow label={labels.username} value={driverData.username} />
                        <SummaryRow label={u('onboarding.country', 'Country')} value={driverData.country} />
                        {accountType === 'business' && <><SummaryRow label={u('onboarding.companyName', 'Company name')} value={customerCompany.name} /><SummaryRow label={u('onboarding.taxId', 'Tax ID / VAT number')} value={customerCompany.taxId} /><SummaryRow label={u('onboarding.businessAddress', 'Business address')} value={customerCompany.address} /></>}
                        {role === 'driver' && <><SummaryRow label={u('register.vehicleStep', 'Vehicle details')} value={[carData.make, carData.model].filter(Boolean).join(' ')} /><SummaryRow label={labels.licensePlate} value={carData.plate} /></>}
                      </Card>
                    </div>}
                  </motion.div>
                </AnimatePresence>
              </main>
              <aside className="min-w-0 space-y-4 lg:sticky lg:top-8">
                <Card contentClassName="p-5">
                  <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><User className="h-5 w-5" /></span><h2 className="font-bold">{u('register.summary', 'Your account')}</h2></div>
                  <div>
                  <SummaryRow label={u('setup.accountType', 'Account type')} value={accountType === 'business' ? u('setup.business', 'Legal entity') : u('setup.individual', 'Individual')} />
                  {driverData.name.trim() && <SummaryRow label={u('onboarding.fullName', 'Full name')} value={driverData.name} />}
                  {accountType === 'business' && customerCompany.name.trim() && <SummaryRow label={u('onboarding.companyName', 'Company name')} value={customerCompany.name} />}
                  {role === 'driver' && carData.plate.trim() && <SummaryRow label={labels.licensePlate} value={carData.plate} />}
                  </div>
                  <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800">{u('register.summaryHint', 'Your setup adapts to the account type and role you choose.')}</p>
                </Card>
                {role && <RolePermissionsCard
                  title={selectedRoleLabel}
                  permissions={rolePermissions}
                  permissionsLabel={u('register.permissions', 'permissions')}
                  icon={role === 'company' ? Crown : role === 'warehouse' ? Warehouse : role === 'driver' ? Truck : PackageIcon}
                  tone={role === 'company' || role === 'warehouse' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : role === 'driver' ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300' : 'bg-sky-500/15 text-sky-600 dark:text-sky-300'}
                  shell={role === 'company' || role === 'warehouse' ? 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/50 dark:from-amber-950/30 dark:to-slate-900' : role === 'driver' ? 'border-orange-200/80 bg-gradient-to-br from-orange-50 to-white dark:border-orange-900/50 dark:from-orange-950/30 dark:to-slate-900' : 'border-sky-200/80 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/50 dark:from-sky-950/30 dark:to-slate-900'}
                />}
              </aside>
            </div>
          </div>
          <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
            {socialError && <div role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{socialError}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={handleBack} disabled={socialSubmitting} className="h-10">{step === 2 ? u('setup.cancelSetup', 'Cancel') : u('common.back', 'Back')}</Button>
              <div className="flex flex-wrap items-center justify-end gap-3 max-sm:w-full">
                {step === 2 && role && (GOOGLE_CLIENT_ID || APPLE_CLIENT_ID) && <>
                  <fieldset disabled={socialSubmitting} className="flex min-w-0 flex-wrap gap-3 max-sm:w-full [&>button]:h-10 [&>button]:w-auto [&>button]:gap-2 [&>button]:px-4 max-sm:[&>button]:flex-1">
                    <GoogleSignInButton onCredential={handleGoogleCredential} label={u('login.continueWithGoogle', 'Continue with Google')} lang={lang} />
                    <AppleSignInButton onCredential={handleAppleCredential} label={u('login.continueWithApple', 'Continue with Apple')} />
                  </fieldset>
                  <span className="text-[11px] font-bold uppercase text-slate-400">{u('login.or', 'or')}</span>
                </>}
                <Button onClick={handleNext} disabled={!canProceed || socialSubmitting} className="h-10 min-w-36 max-sm:flex-1">{socialSubmitting ? u('login.signingIn', 'Signing in...') : step === 9 ? labels.completeSetup : u('common.continue', 'Continue')}</Button>
              </div>
            </div>
          </footer>
        </motion.div>
      </motion.dialog>
    </div>
  );
};
