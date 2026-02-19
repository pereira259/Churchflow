import { MemberLayout } from '@/components/layout/MemberLayout';

import { motion } from 'framer-motion';
import {
    LogOut, Camera, Edit3, Award, CalendarHeart, Church, Check, Loader2,
    Settings, Search, Users, MapPin, ChevronRight, QrCode, Share2, X, User
} from 'lucide-react';
import { ManagementDrawer } from '@/components/profile/ManagementDrawer';
import { useTutorial } from '@/contexts/TutorialContext';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { ImageCropperModal } from '@/components/ui/ImageCropperModal';
import { PremiumToast, ToastType } from '@/components/ui/PremiumToast';
import { ChurchSelectionModal } from '@/components/ChurchSelectionModal';
import { WelcomePortal } from '@/components/onboarding/WelcomePortal';
import { QuestLog } from '@/components/onboarding/QuestLog';
import { ProfileParticles } from '@/components/profile/ProfileParticles';


const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

export function MemberProfilePage() {
    const { profile, signOut, refreshProfile } = useAuth();
    const { resetTutorials: _resetTutorials, welcomePortalOpen, closeWelcomePortal, startOnboarding } = useTutorial();
    // ... (This line update is tricky with replace_file_content if I don't see the exact line. Let's look at MemberProfilePage again.
    // Line 9: `import { useTutorial } from '@/contexts/TutorialContext';`
    // Line 39: `const { resetTutorials, welcomePortalOpen, closeWelcomePortal } = useTutorial();`
    // Line 621-625: Usage of WelcomePortal.

    // I will use multi_replace for this to be safe, or just separate calls.
    // Let's do separate calls. First, update the hook usage.
    const navigate = useNavigate();

    const [memberData, setMemberData] = useState<any>(null);
    const [churchName, setChurchName] = useState('—');
    const [scales, setScales] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [hasCheckin, setHasCheckin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
    });


    const [isUploading, setIsUploading] = useState(false);

    const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
        visible: false,
        message: '',
        type: 'success'
    });

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmation, setResetConfirmation] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    // Management Drawer Navigation
    const [isManagementDrawerOpen, setIsManagementDrawerOpen] = useState(false);
    const [isSearchChurchOpen, setIsSearchChurchOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isChurchInfoModalOpen, setIsChurchInfoModalOpen] = useState(false);
    const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

    // Cropper State
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);


    const closeManagementDrawer = () => setIsManagementDrawerOpen(false);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ visible: true, message, type });
    };

    useEffect(() => {
        if (profile?.id) {
            // Only trigger loading if we truly have no data
            if (!memberData && scales.length === 0) {
                setLoading(true);
            }
            fetchData();
        }
    }, [profile?.id]);




    const fetchData = async () => {
        if (!supabase || !profile) return;

        // Legacy admin restore removed to prevent super_admin conflicts

        try {
            // Fetch member info
            const { data: member } = await supabase
                .from('members')
                .select('*, groups(name, category)')
                .eq('user_id', profile.id)
                .maybeSingle();

            if (member) {
                setMemberData(member);

                // Fetch scales for this member
                const { data: scalesData } = await supabase
                    .from('scales')
                    .select('*, ministries(name)')
                    .eq('member_id', member.id)
                    .gte('date', new Date().toISOString().split('T')[0])
                    .order('date', { ascending: true })
                    .limit(3);

                setScales(scalesData || []);

                // If member has small group linked directly
                if (member.groups) {
                    setGroups([{
                        id: member.small_group_id,
                        name: member.groups.name,
                        category: member.groups.category || 'Pequeno Grupo'
                    }]);
                } else {
                    setGroups([]);
                }
            }

            // Check for checkins
            if (member?.id) {
                const { count: checkinCount } = await supabase
                    .from('event_checkins')
                    .select('*', { count: 'exact', head: true })
                    .eq('member_id', member.id);
                setHasCheckin((checkinCount || 0) > 0);
            }

            // Fetch church name & settings
            if (profile.church_id) {
                const { data: church, error: churchError } = await supabase
                    .from('churches')
                    .select('*')
                    .eq('id', profile.church_id)
                    .single();

                if (churchError) {
                    console.error('❌ Church Fetch Error:', churchError);
                    setChurchName(`Erro: ${churchError.code || 'Desconhecido'}`);
                } else if (church) {
                    setChurchName(church.name);
                }
            }

        } catch (err) {
            console.error('Error fetching profile data:', err);
        } finally {
            setLoading(false);
        }
    };



    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !profile) return;

        // Validation - Enhanced
        if (!editForm.full_name?.trim()) {
            showToast('Nome completo é obrigatório', 'error');
            return;
        }
        if (editForm.full_name.trim().split(' ').length < 2) {
            showToast('Por favor, informe seu nome e sobrenome', 'warning');
            return;
        }
        if (editForm.phone && editForm.phone.replace(/\D/g, '').length < 10) {
            showToast('Telefone inválido (mínimo 10 dígitos)', 'warning');
            return;
        }

        try {
            setIsUpdating(true);
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: editForm.full_name.trim(),
                    phone: editForm.phone,
                })
                .eq('id', profile.id);

            if (error) throw error;

            // Also update members table if it exists
            await supabase
                .from('members')
                .update({
                    full_name: editForm.full_name.trim(),
                    phone: editForm.phone,
                })
                .eq('user_id', profile.id);

            await refreshProfile();
            showToast('Perfil atualizado com sucesso!', 'success');
            setIsEditModalOpen(false);
        } catch (err: any) {
            showToast(err.message || 'Erro ao atualizar perfil', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setTempImage(reader.result?.toString() || null);
            setIsCropperOpen(true);
        });
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again if cancelled
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!supabase || !profile) return;
        setIsCropperOpen(false); // Close immediately

        try {
            setIsUploading(true);

            // Upload to storage
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
            const filePath = `avatars/${profile.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('church-assets')
                .upload(filePath, croppedBlob, {
                    contentType: 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('church-assets')
                .getPublicUrl(filePath);

            // Update user profile
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            // Also update members table
            await supabase
                .from('members')
                .update({ avatar_url: publicUrl })
                .eq('user_id', profile.id);

            await refreshProfile();
            showToast('Foto atualizada com sucesso!', 'success');
        } catch (err: any) {
            console.error('Upload Error:', err);
            showToast('Erro ao atualizar foto', 'error');
        } finally {
            setIsUploading(false);
            setTempImage(null);
        }
    };





    const handleResetChurch = async () => {
        if (!supabase || !profile) return;
        if (resetConfirmation !== 'RESET') {
            showToast('Digite RESET para confirmar', 'warning');
            return;
        }

        try {
            setIsResetting(true);

            // 1. Update user - clear church_id and reset role to 'membro' if not admin
            const isActuallyAdmin = profile.role === 'admin' || profile.role === 'super_admin';
            const { error: userError } = await supabase
                .from('users')
                .update({
                    church_id: null,
                    role: isActuallyAdmin ? profile.role : 'membro'
                })
                .eq('id', profile.id);

            if (userError) throw userError;

            // 2. Remove from members table
            await supabase
                .from('members')
                .delete()
                .eq('user_id', profile.id);

            showToast('Vínculo com a igreja removido!', 'success');

            // 3. Refresh and Close
            await refreshProfile();
            setIsResetModalOpen(false);
            setResetConfirmation('');

            // Force reload to clean up dashboard states
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err: any) {
            showToast(err.message || 'Erro ao resetar convite', 'error');
        } finally {
            setIsResetting(false);
        }
    };



    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (loading || useAuth().loading) {
        return (
            <MemberLayout>
                <div className="h-full flex flex-col overflow-hidden animate-pulse">
                    {/* Banner Skeleton */}
                    <div className="relative h-24 md:h-28 rounded-b-[2rem] bg-slate-200 shrink-0" />

                    {/* Main Content Hub */}
                    <div className="w-full max-w-[1240px] mx-auto px-4 -mt-20 relative z-10 flex-1 min-h-0 pb-1">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start h-full">
                            {/* Left Column Skeleton */}
                            <div className="lg:col-span-4 flex flex-col gap-4">
                                <div className="bg-white rounded-[2rem] p-6 flex flex-col items-center">
                                    <div className="w-28 h-28 rounded-full bg-slate-200 mb-4 border-4 border-white" />
                                    <div className="w-32 h-6 bg-slate-200 rounded-full mb-2" />
                                    <div className="w-20 h-4 bg-slate-200 rounded-full mb-6" />
                                    <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-100 py-4">
                                        <div className="h-10 bg-slate-100 rounded-xl" />
                                        <div className="h-10 bg-slate-100 rounded-xl" />
                                    </div>
                                    <div className="w-full h-12 bg-slate-200 rounded-xl mt-4" />
                                </div>
                            </div>

                            {/* Right Column Skeleton */}
                            <div className="lg:col-span-8 flex flex-col gap-5">
                                <div className="h-32 bg-slate-200 rounded-[2rem] w-full" />
                                <div className="h-64 bg-white rounded-[2rem] p-6 border border-slate-100" />
                            </div>
                        </div>
                    </div>
                </div>
            </MemberLayout>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Erro de Perfil</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Não foi possível carregar seu perfil de usuário. Isso pode ocorrer devido a problemas de conexão ou permissões.
                    </p>
                    <div className="bg-slate-100 p-3 rounded-lg text-left text-xs font-mono text-slate-600 mb-6 overflow-auto max-h-32">
                        <p>User ID: {useAuth().user?.id || 'N/A'}</p>
                        <p>Loading: {loading ? 'True' : 'False'}</p>
                        <p>Auth Loading: {useAuth().loading ? 'True' : 'False'}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-[#1e1b4b] text-white rounded-xl font-bold uppercase tracking-wider hover:bg-[#2e2a5b] transition-colors"
                    >
                        Tentar Novamente
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="w-full mt-3 py-3 text-slate-500 font-bold text-xs uppercase hover:text-red-500"
                    >
                        Sair e fazer login novamente
                    </button>
                </div>
            </div>
        );
    }

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'super_admin': return 'Super Admin';
            case 'admin': return 'Administrador';
            case 'pastor_chefe': return 'Pastor Chefe';
            case 'pastor_lider': return 'Pastor Líder';
            case 'lider': return 'Líder';
            case 'financeiro': return 'Financeiro';
            case 'visitante': return 'Visitante';
            default: return 'Membro';
        }
    };



    const userProfile = profile;

    // --- Gamification Logic ---
    const quests = [
        {
            id: 1,
            title: "Perfil de Reino",
            description: "Complete seus dados pessoais e adicione uma foto.",
            completed: !!(userProfile?.full_name && userProfile.avatar_url),
            xp: 50,
            icon: <User className="w-4 h-4" />
        },
        {
            id: 2,
            title: "Primeiro Passo",
            description: "Faça check-in em um culto ou evento.",
            completed: hasCheckin,
            xp: 100,
            icon: <MapPin className="w-4 h-4" />
        },
        {
            id: 3,
            title: "Comunhão",
            description: "Entre em um Grupo Pequeno (Célula).",
            completed: groups.length > 0,
            xp: 150,
            icon: <Users className="w-4 h-4" />
        }
    ];

    const completedQuestsCount = quests.filter(q => q.completed).length;

    return (
        <MemberLayout>
            <motion.div
                variants={container}
                initial={loading && !memberData ? "hidden" : false}
                animate="show"
                className="h-full flex flex-col overflow-hidden"
            >
                {/* Ultra Premium Banner */}
                <div className="relative h-24 md:h-28 rounded-b-[2rem] overflow-hidden shrink-0 shadow-2xl">
                    <div className="absolute inset-0 bg-[#0f172a]">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#2e2a5b] to-[#0f172a]"></div>
                        <ProfileParticles />
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#d4af37] rounded-full blur-[150px] opacity-[0.15] -translate-y-1/2 translate-x-1/4"></div>
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[130px] opacity-[0.12] translate-y-1/3 -translate-x-1/4"></div>
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    </div>
                </div>

                {/* Main Content Hub */}
                <div className="w-full max-w-[1240px] mx-auto px-4 -mt-20 relative z-10 flex-1 min-h-0 pb-1">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start h-full">

                        {/* Column 1: Pure Identity (Left Side - 4 cols) */}
                        <motion.div variants={item} className="lg:col-span-4 flex flex-col gap-4">
                            {/* Premium Profile Card */}
                            <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-indigo-950/5 border border-white/60 p-4 md:p-6 flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="absolute top-0 inset-x-0 h-24 md:h-32 bg-gradient-to-b from-slate-50 to-transparent opacity-80" />

                                {/* Avatar with Status Badge */}
                                <div className="relative mb-3 md:mb-4 mt-1 md:mt-2">
                                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-[3px] md:border-[4px] border-white shadow-2xl bg-gradient-to-br from-[#d4af37] to-[#b39025] flex items-center justify-center text-[#1e1b4b] font-display text-2xl md:text-4xl font-bold italic relative overflow-hidden ring-1 ring-slate-100/50">
                                        {userProfile.avatar_url ? (
                                            <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(userProfile.full_name)
                                        )}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-sm">
                                            <Camera className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarFileSelect} disabled={isUploading} />
                                        </label>
                                    </div>

                                    {/* Status Dot */}
                                    <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-5 h-5 md:w-6 md:h-6 bg-emerald-500 border-[3px] md:border-[4px] border-white rounded-full shadow-lg tooltip-trigger" title="Membro Ativo"></div>

                                    <button onClick={() => setIsEditModalOpen(true)} className="absolute bottom-0 -left-0 md:bottom-1 md:-left-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-900 text-white border-[2px] border-white flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors z-10">
                                        <Edit3 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                    </button>
                                </div>

                                {/* Identity Info */}
                                <h1 className="font-display text-lg md:text-2xl font-bold italic text-[#1e1b4b] leading-tight mb-1 tracking-tight">{userProfile.full_name}</h1>

                                <div className="flex flex-wrap justify-center items-center gap-1.5 md:gap-2 mb-4 md:mb-6">
                                    <span className="px-2.5 py-0.5 md:px-3 md:py-1 rounded-full bg-[#1e1b4b]/5 border border-[#1e1b4b]/10 text-[#1e1b4b] text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em]">{getRoleLabel(userProfile.role)}</span>
                                    {userProfile.church_id && (
                                        <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border border-slate-100">
                                            <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-300" /> {churchName}
                                        </span>
                                    )}
                                </div>

                                {/* Quick Stats (Minimalist) */}
                                <div className="w-full grid grid-cols-2 gap-2 md:gap-4 border-t border-slate-100/80 py-3 md:py-4 mb-2">
                                    <div
                                        onClick={() => setIsAchievementsModalOpen(true)}
                                        className="text-center group/stat cursor-pointer p-1 rounded-xl hover:bg-slate-50 transition-colors"

                                    >
                                        <div className="flex items-center justify-center gap-1.5 text-[#d4af37] mb-0.5 group-hover/stat:scale-110 transition-transform">
                                            <Award className="w-5 h-5" />
                                            <span className="font-display font-bold italic text-xl">{completedQuestsCount}</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest group-hover/stat:text-[#d4af37] transition-colors">Conquistas</p>
                                    </div>
                                    <div className="text-center border-l border-slate-100/80 group/stat cursor-default">
                                        <div className="flex items-center justify-center gap-1.5 text-[#1e1b4b] mb-0.5 group-hover/stat:scale-110 transition-transform">
                                            <CalendarHeart className="w-5 h-5 text-slate-300" />
                                            <span className="font-display font-bold italic text-xl">{scales.length}</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Escalas</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="w-full space-y-3 mt-auto">

                                    {/* QR Code Button - only if connected to church */}
                                    {userProfile.church_id && (
                                        <button
                                            onClick={() => setIsQrModalOpen(true)}
                                            className="w-full py-3.5 rounded-xl bg-[#1e1b4b] text-white hover:bg-[#2e2a5b] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 group/qr shadow-lg shadow-[#1e1b4b]/20"
                                        >
                                            <QrCode className="w-4 h-4 text-[#d4af37]" /> CONVITE DIGITAL
                                        </button>
                                    )}
                                    <button onClick={handleLogout} className="w-full py-3.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 group/logout border border-slate-100 hover:border-red-100">
                                        Sair <LogOut className="w-3.5 h-3.5 group-hover/logout:translate-x-0.5 transition-transform" />
                                    </button>

                                </div>
                            </div>
                        </motion.div>

                        {/* Column 2: Focus & Action (Right Side - 8 cols) */}
                        <motion.div variants={item} className="lg:col-span-8 flex flex-col gap-5">

                            {/* Management / Primary Action Hero */}
                            {(() => {
                                const isLeader = ['admin', 'pastor', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro'].includes(userProfile.role || '');
                                const hasChurch = !!userProfile.church_id;

                                if (isLeader && hasChurch) {
                                    return (
                                        <div onClick={() => setIsManagementDrawerOpen(true)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#d4af37] via-[#b39025] to-[#8a6d1b] p-[2px] shadow-xl shadow-[#d4af37]/20 cursor-pointer hover:scale-[1.01] hover:shadow-2xl hover:shadow-[#d4af37]/30 transition-all group shrink-0">
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                                            <div className="relative bg-white/10 backdrop-blur-md rounded-[1.9rem] p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner ring-1 ring-white/30 backdrop-blur-sm">
                                                        <Settings className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <h2 className="font-display text-2xl font-bold italic text-white mb-1 drop-shadow-sm">Painel Gerencial</h2>
                                                        <p className="text-white/90 text-xs font-medium max-w-md antialiased flex items-center gap-1.5">
                                                            <Church className="w-3 h-3 text-white/70" /> {churchName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white text-white group-hover:text-[#b39025] transition-all shadow-lg ring-1 ring-white/20">
                                                    <ChevronRight className="w-6 h-6" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (hasChurch) {
                                    // Card visual e informativo para membros
                                    return (
                                        <div onClick={() => setIsChurchInfoModalOpen(true)} className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-[2px] shadow-xl shadow-slate-900/10 shrink-0 cursor-pointer hover:scale-[1.01] hover:shadow-2xl hover:shadow-slate-900/20 transition-all group">
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
                                            <div className="relative bg-white/5 backdrop-blur-md rounded-[1.9rem] p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner ring-1 ring-white/10">
                                                        <Church className="w-7 h-7 text-slate-300" />
                                                    </div>
                                                    <div>
                                                        <h2 className="font-display text-2xl font-bold italic text-white mb-1">Minha Igreja</h2>
                                                        <p className="text-slate-400 text-xs font-medium">{churchName}</p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <Check className="w-3 h-3" /> Membro
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div onClick={() => setIsSearchChurchOpen(true)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-600 to-indigo-800 p-[2px] shadow-xl shadow-indigo-900/20 cursor-pointer hover:scale-[1.01] hover:shadow-2xl hover:shadow-indigo-900/30 transition-all group shrink-0">
                                        <div className="relative bg-white/10 backdrop-blur-md rounded-[1.9rem] p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner ring-1 ring-white/30">
                                                    <Search className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h2 className="font-display text-2xl font-bold italic text-white mb-1">Encontrar Igreja</h2>
                                                    <p className="text-white/80 text-xs font-medium">Conecte-se a uma comunidade local agora mesmo.</p>
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white text-white group-hover:text-indigo-600 transition-all shadow-lg ring-1 ring-white/20 flex-shrink-0">
                                                <ChevronRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Journey Quest Log - The Main content for Members */}
                            <div className="w-full shrink-0">
                                <QuestLog quests={quests} />
                            </div>

                            {/* Groups Section - Only if exists or as a subtle CTA */}
                            {groups.length > 0 ? (
                                <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white/50 p-6 shadow-lg shadow-slate-200/50">
                                    <h3 className="font-display text-sm font-bold italic text-[#1e1b4b] mb-4 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-[#d4af37]" /> Seus Grupos
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {groups.map(group => (
                                            <div key={group.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all cursor-pointer group/item">
                                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100 group-hover/item:scale-110 transition-transform group-hover/item:shadow-md">{group.category === 'Louvor' ? '🎸' : '🙏'}</div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#1e1b4b]">{group.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{group.category || 'Pequeno Grupo'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                // Subtle CTA instead of "Empty Card"
                                <div className="border border-dashed border-slate-200 rounded-[2rem] p-5 flex items-center justify-center gap-3 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer opacity-70 hover:opacity-100 group/empty">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover/empty:scale-110 transition-transform">
                                        <Users className="w-5 h-5 text-slate-400 group-hover/empty:text-[#1e1b4b]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover/empty:text-[#1e1b4b]">Encontrar um Pequeno Grupo</span>
                                </div>
                            )}

                        </motion.div>
                    </div>

                    {/* Danger Zone */}
                    {profile?.church_id && (
                        <div className="mt-6 md:mt-8 border-t border-slate-100 pt-6 md:pt-8 mb-20 md:mb-0">
                            <div className="bg-red-50/30 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-red-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                                <div className="text-left">
                                    <h4 className="text-red-900 font-display font-bold text-base md:text-lg italic tracking-tight">Zona de Perigo</h4>
                                    <p className="text-red-600/70 text-[10px] md:text-xs font-medium mt-1">Se você criou esta igreja por engano ou deseja recomeçar, use esta opção para desvincular seu perfil ministerial.</p>
                                </div>
                                <button onClick={() => setIsResetModalOpen(true)} className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-white border border-red-200 text-red-500 rounded-xl font-bold text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all whitespace-nowrap shadow-sm">Reiniciar Configuração</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit Profile Modal */}
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Perfil">
                    <form onSubmit={handleUpdateProfile} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Nome Completo</label>
                            <input type="text" value={editForm.full_name} onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm" required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Telefone</label>
                            <input type="text" value={editForm.phone} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm" />
                        </div>

                        {profile?.church_id && (
                            <div className="pt-2 border-t border-slate-100 mt-4">
                                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 block mb-2">Vínculo Ministerial</label>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Church className="w-3.5 h-3.5 text-[#d4af37]" />
                                        <span className="text-xs font-semibold text-slate-600 truncate max-w-[150px]">{churchName}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setIsResetModalOpen(true);
                                        }}
                                        className="text-[9px] font-black uppercase text-red-500 hover:text-red-600 tracking-wider"
                                    >
                                        Desvincular
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50">Cancelar</button>
                            <button type="submit" disabled={isUpdating} className="flex-[2] py-3 rounded-xl bg-[#1e1b4b] text-white font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Reset Church Modal */}
                <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reiniciar Perfil Ministerial">
                    <div className="space-y-6 py-4">
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                            <h4 className="text-red-900 font-bold text-sm">Ação Irreversível</h4>
                            <p className="text-red-700 text-xs mt-1 leading-relaxed">Você será desvinculado da igreja atual e perderá o status de Administrador. Seu perfil voltará ao status de "Membro".</p>
                        </div>
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-center">Digite <span className="text-red-500">RESET</span> para confirmar</p>
                            <input type="text" value={resetConfirmation} onChange={e => setResetConfirmation(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-red-200 text-center font-black tracking-widest text-marinho outline-none focus:ring-2 focus:ring-red-500/10" placeholder="DIGITE AQUI..." />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-400 font-bold text-xs uppercase hover:bg-slate-50">Voltar</button>
                            <button onClick={handleResetChurch} disabled={isResetting || resetConfirmation !== 'RESET'} className="flex-[2] py-3.5 rounded-xl bg-red-500 text-white font-bold text-xs uppercase shadow-lg shadow-red-500/20 disabled:opacity-30">Confirmar Reset</button>
                        </div>
                    </div>
                </Modal>

                {/* Management Drawer Component */}
                <ManagementDrawer
                    isOpen={isManagementDrawerOpen}
                    onClose={closeManagementDrawer}
                    profile={profile}
                    churchName={churchName}
                    onChurchUpdate={fetchData}
                    onSuspender={() => {
                        setIsManagementDrawerOpen(false);
                        setIsResetModalOpen(true);
                    }}
                />

                {/* Church Search Modal */}
                {/* Church Info Modal */}
                <Modal isOpen={isChurchInfoModalOpen} onClose={() => setIsChurchInfoModalOpen(false)} title="Minha Igreja">
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 shadow-inner">
                                <Church className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="font-display text-xl font-bold italic text-[#1e1b4b] mb-1">{churchName}</h3>
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                Membro Ativo
                            </span>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Endereço</p>
                                <p className="text-sm font-bold text-slate-700">Verificar com a liderança</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Liderança</p>
                                <p className="text-sm font-bold text-slate-700">Equipe Pastoral</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setIsChurchInfoModalOpen(false)} className="flex-1 py-3.5 rounded-xl bg-[#1e1b4b] text-white font-bold text-xs uppercase shadow-lg shadow-[#1e1b4b]/20 hover:bg-[#2e2a5b]">
                            Fechar
                        </button>
                    </div>

                </Modal>

                <Modal isOpen={isAchievementsModalOpen} onClose={() => setIsAchievementsModalOpen(false)} title="Minhas Conquistas">
                    <div className="py-4 space-y-4">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d4af37]/10 mb-3 relative">
                                <Award className="w-8 h-8 text-[#d4af37]" />
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">
                                    {completedQuestsCount}/{quests.length}
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-[#1e1b4b]">Jornada do Membro</h3>
                            <p className="text-xs text-slate-500 max-w-[200px] mx-auto">Complete as missões para subir de nível na sua igreja.</p>
                        </div>

                        <div className="space-y-2">
                            {quests.map((quest) => (
                                <div key={quest.id} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${quest.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${quest.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                        {quest.completed ? <Check className="w-5 h-5" /> : quest.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-sm font-bold ${quest.completed ? 'text-emerald-900' : 'text-slate-700'}`}>{quest.title}</h4>
                                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{quest.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${quest.completed ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {quest.completed ? 'Concluído' : `+${quest.xp} XP`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>

                {/* QR Code Modal */}
                {
                    isQrModalOpen && userProfile.church_id && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-[#1e1b4b]/60 backdrop-blur-sm"
                                onClick={() => setIsQrModalOpen(false)}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative bg-white rounded-2xl p-4 max-w-[280px] w-full shadow-2xl"
                            >
                                <button
                                    onClick={() => setIsQrModalOpen(false)}
                                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>

                                <div className="text-center mb-3">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1e1b4b]/5 text-[#1e1b4b] mb-2">
                                        <QrCode className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-display text-base font-bold italic text-[#1e1b4b]">Meu QR Code</h3>
                                    <p className="text-slate-400 text-[10px]">Convite e chave de acesso</p>
                                </div>

                                <div className="bg-[#1e1b4b] rounded-xl p-3 mb-3 flex items-center justify-center">
                                    <div className="bg-white p-2 rounded-lg">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                                `${window.location.origin}/convite/${profile?.id}?c=${userProfile.church_id}`
                                            )}`}
                                            alt="QR Code"
                                            className="w-[140px] h-[140px]"
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-2 mb-3 border border-slate-100">
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Igreja Conectada</p>
                                    <p className="text-xs font-bold text-[#1e1b4b]">{churchName}</p>
                                </div>

                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `Convite de ${profile?.full_name}`,
                                                text: `Conecte-se à ${churchName} usando meu convite!`,
                                                url: `${window.location.origin}/convite/${profile?.id}`
                                            });
                                        } else {
                                            navigator.clipboard.writeText(`${window.location.origin}/convite/${profile?.id}`);
                                            showToast('Link copiado!', 'success');
                                        }
                                    }}
                                    className="w-full py-3 rounded-xl bg-[#d4af37] text-[#1e1b4b] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#c49f2f] transition-all active:scale-95 shadow-lg shadow-[#d4af37]/20"
                                >
                                    <Share2 className="w-4 h-4" /> Compartilhar Convite
                                </button>
                            </motion.div>
                        </div>
                    )
                }

                {/* Cropper Modal */}
                <ImageCropperModal
                    isOpen={isCropperOpen}
                    imageSrc={tempImage}
                    onClose={() => setIsCropperOpen(false)}
                    onCropComplete={handleCropComplete}
                />

                < ChurchSelectionModal
                    isOpen={isSearchChurchOpen}
                    onClose={() => {
                        setIsSearchChurchOpen(false);
                        fetchData(); // Refresh data if they joined a church
                    }}
                />

                < PremiumToast
                    isVisible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
                />

                <WelcomePortal
                    isOpen={welcomePortalOpen}
                    onClose={closeWelcomePortal}
                    onStart={startOnboarding}
                />
            </motion.div >
        </MemberLayout>
    );
}
