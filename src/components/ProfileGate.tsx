import { useAuth } from '@/lib/auth';
import { useMemo, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserCheck, Church, ArrowRight, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ChurchSelectionModal } from '@/components/ChurchSelectionModal';

interface ProfileCompleteness {
    isComplete: boolean;
    hasName: boolean;
    hasChurch: boolean;
    progress: number;
    missingSteps: ('name' | 'church')[];
}

export function useProfileCompleteness(): ProfileCompleteness {
    const { profile } = useAuth();

    return useMemo(() => {
        // Super Admins bypass all gates
        if (profile?.role === 'super_admin') {
            return {
                isComplete: true,
                hasName: true,
                hasChurch: true,
                progress: 100,
                missingSteps: []
            };
        }

        const hasName = !!(profile?.full_name && profile.full_name.trim().split(' ').length >= 2);
        const hasChurch = !!profile?.church_id;

        const steps = [hasName, hasChurch];
        const completed = steps.filter(Boolean).length;
        const progress = Math.round((completed / steps.length) * 100);

        const missingSteps: ('name' | 'church')[] = [];
        if (!hasName) missingSteps.push('name');
        if (!hasChurch) missingSteps.push('church');

        return { isComplete: hasName && hasChurch, hasName, hasChurch, progress, missingSteps };
    }, [profile?.full_name, profile?.church_id, profile?.role]);
}

// ── Inline 2-step wizard ────────────────────────────────────────────────
interface WizardProps {
    onClose?: () => void;
    completeness: ProfileCompleteness;
}

function ProfileWizard({ onClose, completeness }: WizardProps) {
    const { user, profile, refreshProfile } = useAuth();
    // const navigate = useNavigate();

    // Steps
    const [step, setStep] = useState(completeness.hasName ? 2 : 1);
    const [openChurchModal, setOpenChurchModal] = useState(false);

    // Step 1 state
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [saving, setSaving] = useState(false);
    const [nameError, setNameError] = useState('');

    // Step 1 save
    const handleSaveName = async () => {
        const trimmed = fullName.trim();
        if (trimmed.split(' ').length < 2) {
            setNameError('Digite seu nome completo (nome e sobrenome)');
            return;
        }
        setNameError('');
        setSaving(true);
        try {
            await supabase.from('users').update({ full_name: trimmed, phone: phone.trim() || null }).eq('id', user!.id);
            await refreshProfile();
            setStep(2);
        } catch { /* silent */ } finally { setSaving(false); }
    };

    return (
        <>
            {onClose && (
                <button onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors z-10">
                    <X className="w-4 h-4" />
                </button>
            )}

            <div className="p-6 pt-8">
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 1 ? 'bg-[#1e1b4b] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {completeness.hasName ? <Check className="w-4 h-4" /> : '1'}
                    </div>
                    <div className={`w-12 h-0.5 rounded-full transition-colors ${step >= 2 ? 'bg-[#1e1b4b]' : 'bg-slate-200'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 2 ? 'bg-[#1e1b4b] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        2
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            <div className="text-center mb-5">
                                <div className="w-12 h-12 rounded-xl bg-[#1e1b4b]/5 flex items-center justify-center mx-auto mb-3">
                                    <UserCheck className="w-6 h-6 text-[#1e1b4b]" />
                                </div>
                                <h3 className="font-display text-lg font-bold italic text-[#1e1b4b]">Dados Pessoais</h3>
                                <p className="text-slate-400 text-xs mt-1">Passo 1 de 2</p>
                            </div>

                            <div className="space-y-3 mb-5">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nome Completo</label>
                                    <input type="text" value={fullName} onChange={(e) => { setFullName(e.target.value); setNameError(''); }}
                                        placeholder="Ex: João da Silva"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/10 focus:border-[#1e1b4b] transition-all text-sm" />
                                    {nameError && <p className="text-red-500 text-[10px] mt-1 font-medium">{nameError}</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Telefone <span className="text-slate-300">(opcional)</span></label>
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/10 focus:border-[#1e1b4b] transition-all text-sm" />
                                </div>
                            </div>

                            <button onClick={handleSaveName} disabled={saving}
                                className="w-full py-3.5 rounded-xl bg-[#1e1b4b] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#2e2a5b] transition-colors shadow-lg shadow-[#1e1b4b]/20 active:scale-[0.98] disabled:opacity-60">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Próximo <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#1e1b4b]/5 flex items-center justify-center mx-auto mb-3">
                                    <Church className="w-6 h-6 text-[#1e1b4b]" />
                                </div>
                                <h3 className="font-display text-lg font-bold italic text-[#1e1b4b]">Encontrar Igreja</h3>
                                <p className="text-slate-400 text-xs mt-1">Passo 2 de 2</p>
                            </div>

                            <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
                                Tudo pronto! Agora conecte-se a uma igreja para acessar todos os recursos.
                            </p>

                            <button onClick={() => setOpenChurchModal(true)}
                                className="w-full py-4 rounded-xl bg-[#1e1b4b] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#2e2a5b] transition-colors shadow-lg shadow-[#1e1b4b]/20 active:scale-[0.98]">
                                Encontrar uma Igreja <ArrowRight className="w-4 h-4" />
                            </button>

                            <p className="text-[10px] text-slate-400 text-center mt-4">
                                Se não encontrar, você poderá criar a sua.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* External Modal for Church Search */}
                <ChurchSelectionModal
                    isOpen={openChurchModal}
                    onClose={() => {
                        setOpenChurchModal(false);
                        // If user joined (became hasChurch), refreshProfile inside modal handles data update.
                        // We check here if they joined and close everything if so.
                        refreshProfile().then(() => {
                            // The parent ProfileGate component will auto-close when isComplete becomes true :)
                        });
                    }}
                />
            </div>
        </>
    );
}

// ── Soft gate hook (for Jornal actions) ─────────────────────────────────
export function useProfileGate() {
    const completeness = useProfileCompleteness();
    const [showGateModal, setShowGateModal] = useState(false);

    const guardAction = useCallback((callback: () => void) => {
        if (completeness.isComplete) {
            callback();
        } else {
            setShowGateModal(true);
        }
    }, [completeness.isComplete]);

    const GateModal = useCallback(() => (
        <AnimatePresence>
            {showGateModal && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setShowGateModal(false)}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="h-1.5 bg-gradient-to-r from-[#d4af37] via-[#b39025] to-[#d4af37]" />
                        <ProfileWizard onClose={() => setShowGateModal(false)} completeness={completeness} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    ), [showGateModal, completeness]);

    return { ...completeness, guardAction, GateModal, showGateModal, setShowGateModal };
}

// ── Hard gate component (for wrapping pages) ────────────────────────────
interface ProfileGateProps {
    children: ReactNode;
    requires?: ('profile' | 'church')[];
}

export function ProfileGate({ children, requires = ['profile', 'church'] }: ProfileGateProps) {
    const { profile } = useAuth();
    const completeness = useProfileCompleteness();
    const navigate = useNavigate();

    // If profile loads and becomes complete, the gate automatically renders children
    // causing the overlay to disappear instantly.

    if (!profile) return <>{children}</>;

    const needsProfile = requires.includes('profile') && !completeness.hasName;
    const needsChurch = requires.includes('church') && !completeness.hasChurch;
    const isBlocked = needsProfile || needsChurch;

    if (!isBlocked) return <>{children}</>;

    return (
        <div className="relative h-full w-full">
            <div className="pointer-events-none select-none filter blur-[6px] opacity-40 h-full overflow-hidden">
                {children}
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.1 }}
                    className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    <div className="h-1.5 bg-gradient-to-r from-[#d4af37] via-[#b39025] to-[#d4af37]" />
                    <ProfileWizard onClose={() => navigate(-1 as any)} completeness={completeness} />
                </motion.div>
            </div>
        </div>
    );
}
