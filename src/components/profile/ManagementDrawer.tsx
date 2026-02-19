import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Check, Church, Building, ShieldCheck, CreditCard,
    Globe, Loader2, Search, UserPlus,
    Lock, CheckCircle2, QrCode, Trash2, PlusCircle, Copy
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PremiumToast, ToastType } from '@/components/ui/PremiumToast';

interface ManagementDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    churchName: string;
    onChurchUpdate: () => void;
    onSuspender: () => void;
}

export function ManagementDrawer({
    isOpen,
    onClose,
    profile,
    onChurchUpdate,
    onSuspender
}: ManagementDrawerProps) {
    const [drawerScreen, setDrawerScreen] = useState<'menu' | 'institutional' | 'admins' | 'finance' | 'multi' | 'prefs' | 'invite'>('menu');
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [admins, setAdmins] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({ visible: false, message: '', type: 'success' });

    // Pix & Settings State
    const [churchSettings, setChurchSettings] = useState<any>({
        name: '',
        phone: '',
        email: '',
        address: '',
        cep: '',
        city: '',
        state: '',
        pix_key: '',
        bank_info: '',
        pix_keys: [],
        theme_color: '#1e1b4b',
        notifications_enabled: true
    });
    const [selectedPixType, setSelectedPixType] = useState<'cnpj' | 'cpf' | 'email' | 'phone' | 'random'>('cnpj');
    const [isAddingPixKey, setIsAddingPixKey] = useState(false);
    const [newPixForm, setNewPixForm] = useState({ label: '', key: '', bank_info: '' });

    // Load initial settings
    useEffect(() => {
        if (isOpen && profile?.church_id) {
            fetchSettings();
        }
    }, [isOpen, profile?.church_id]);

    // Sub-effects
    useEffect(() => {
        if (isOpen) {
            if (drawerScreen === 'admins') fetchAdmins();
        }
    }, [drawerScreen, isOpen]);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ visible: true, message, type });
    };

    const fetchSettings = async () => {
        if (!supabase || !profile?.church_id) return;
        const { data: church } = await supabase
            .from('churches')
            .select('*')
            .eq('id', profile.church_id)
            .single();

        if (church) {
            setChurchSettings({
                name: church.name || '',
                phone: church.phone || '',
                email: church.email || '',
                address: church.address || '',
                cep: church.cep || '',
                city: church.city || '',
                state: church.state || '',
                pix_key: church.pix_key || '',
                bank_info: church.bank_info || '',
                pix_keys: church.pix_keys || [],
                theme_color: church.theme_color || '#1e1b4b',
                notifications_enabled: church.notifications_enabled ?? true
            });
        }
    };

    const fetchAdmins = async () => {
        if (!supabase || !profile?.church_id) return;
        try {
            setLoadingAdmins(true);
            const { data } = await supabase
                .from('users')
                .select('id, full_name, role, avatar_url')
                .eq('church_id', profile.church_id)
                .in('role', ['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro']);
            setAdmins(data || []);
        } catch (err) {
            console.error('Error fetching admins:', err);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const handleUpdateChurchSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !profile?.church_id) return;

        try {
            setIsUpdating(true);

            // Geocode
            const finalSettings = { ...churchSettings };
            const query = `${churchSettings.address}, ${churchSettings.city}, ${churchSettings.state}, ${churchSettings.cep}, Brazil`;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                const data = await res.json();
                if (data && data.length > 0) {
                    finalSettings.latitude = parseFloat(data[0].lat);
                    finalSettings.longitude = parseFloat(data[0].lon);
                }
            } catch (err) {
                console.error('Geocoding error:', err);
            }

            const payload: any = { ...finalSettings };

            // Clean up payload
            const { error } = await supabase.from('churches').update(payload).eq('id', profile.church_id);
            if (error) throw error;

            showToast('Configurações salvas!', 'success');
            onChurchUpdate();
            setDrawerScreen('menu');
        } catch (err: any) {
            showToast(err.message || 'Erro ao salvar', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePromoteLeader = async (userId: string, newRole: string) => {
        if (!supabase) return;
        try {
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            showToast('Permissões atualizadas!', 'success');
            fetchAdmins();
        } catch (err: any) {
            showToast('Erro ao atualizar permissão', 'error');
        }
    };

    const handleSearchMembers = async (query: string) => {
        setMemberSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        if (!supabase || !profile?.church_id) return;
        const { data } = await supabase
            .from('members')
            .select('id, full_name, user_id, photo_url')
            .eq('church_id', profile.church_id)
            .ilike('full_name', `%${query}%`)
            .limit(5);
        setSearchResults(data || []);
    };

    const handlePromoteMember = async (userId: string, targetRole: string) => {
        if (!userId) {
            showToast('Membro sem usuário vinculado', 'warning');
            return;
        }
        await handlePromoteLeader(userId, targetRole);
        setMemberSearch('');
        setSearchResults([]);
    };

    const handleAddPixKey = () => {
        setIsAddingPixKey(true);
        setNewPixForm({ label: '', key: '', bank_info: '' });
    };

    const handleConfirmAddPixKey = () => {
        if (newPixForm.label && newPixForm.key) {
            setChurchSettings((prev: any) => ({
                ...prev,
                pix_keys: [...(prev.pix_keys || []), {
                    label: newPixForm.label,
                    key: newPixForm.key,
                    bank_info: newPixForm.bank_info // Support bank info for extra keys
                }]
            }));
            setIsAddingPixKey(false);
            setNewPixForm({ label: '', key: '', bank_info: '' });
        }
    };

    const handleRemovePixKey = (index: number) => {
        setChurchSettings((prev: any) => ({
            ...prev,
            pix_keys: prev.pix_keys.filter((_: any, i: number) => i !== index)
        }));
    };

    // UI Helpers
    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'pastor_chefe': return 'Pastor Chefe';
            case 'pastor_lider': return 'Pastor Líder';
            case 'lider': return 'Líder';
            case 'financeiro': return 'Financeiro';
            default: return 'Membro';
        }
    };

    // PIX Masking
    const formatPixKey = (value: string, type: string) => {
        const clean = value.replace(/\D/g, '');
        if (type === 'cnpj') return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5').substring(0, 18);
        if (type === 'cpf') return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4').substring(0, 14);
        if (type === 'phone') return clean.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3').substring(0, 15);
        return value;
    };

    const handlePixKeyChange = (text: string) => {
        if (selectedPixType === 'email' || selectedPixType === 'random') {
            setChurchSettings((prev: any) => ({ ...prev, pix_key: text }));
        } else {
            setChurchSettings((prev: any) => ({ ...prev, pix_key: formatPixKey(text, selectedPixType) }));
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm z-[9990]"
                    />
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-4 right-4 bottom-auto max-h-[calc(100vh-2rem)] w-full max-w-sm bg-white/95 backdrop-blur-2xl z-[9999] rounded-[2.5rem] shadow-[-20px_0_50px_rgba(15,23,42,0.1)] border border-white/40 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 pb-4 relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#d4af37]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center justify-between relative z-10">
                                {drawerScreen !== 'menu' ? (
                                    <button onClick={() => setDrawerScreen('menu')} className="w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-[#1e1b4b] hover:scale-110 transition-all shadow-sm flex items-center justify-center">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <div className="w-10" />
                                )}
                                <h3 className="font-display font-bold italic text-[#1e1b4b] text-lg">
                                    {drawerScreen === 'menu' ? 'Gestão Hub' :
                                        drawerScreen === 'institutional' ? 'Institucional' :
                                            drawerScreen === 'admins' ? 'Liderança' :
                                                drawerScreen === 'finance' ? 'Financeiro' : 'Configurações'}
                                </h3>
                                <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100"><Check className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-2 pb-8 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {drawerScreen === 'menu' ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="grid grid-cols-2 gap-3"
                                    >
                                        <button onClick={() => setDrawerScreen('institutional')} className="col-span-2 p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center gap-4 hover:shadow-lg hover:shadow-indigo-100/50 transition-all group text-left">
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                <Building className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[#1e1b4b]">Institucional</h4>
                                                <p className="text-[10px] text-slate-400 font-medium">Dados da Igreja</p>
                                            </div>
                                        </button>

                                        <button onClick={() => setDrawerScreen('admins')} className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/50 transition-all group flex flex-col gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-700">Liderança</h4>
                                                <p className="text-[10px] text-slate-400">Admins & Permissões</p>
                                            </div>
                                        </button>

                                        <button onClick={() => setDrawerScreen('finance')} className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/50 transition-all group flex flex-col gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-700">Financeiro</h4>
                                                <p className="text-[10px] text-slate-400">Chaves Pix & Dados</p>
                                            </div>
                                        </button>

                                        <button onClick={() => setDrawerScreen('multi')} className="col-span-2 p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-all opacity-50 cursor-not-allowed">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                                                    <Globe className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-bold text-slate-500">Multisite / Filiais</h4>
                                                    <p className="text-[10px] text-slate-400">Em Breve</p>
                                                </div>
                                            </div>
                                            <Lock className="w-4 h-4 text-slate-300" />
                                        </button>

                                        <button onClick={onSuspender} className="col-span-2 mt-4 p-4 rounded-xl border border-red-100 bg-red-50/50 text-red-600 font-bold text-xs hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                            <Trash2 className="w-4 h-4" /> Zona de Perigo
                                        </button>
                                    </motion.div>
                                ) : drawerScreen === 'institutional' ? (
                                    <motion.form
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onSubmit={handleUpdateChurchSettings}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-4">
                                            {/* Church Name */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Nome da Igreja</label>
                                                <div className="relative group">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                                        <Church className="w-4 h-4" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={churchSettings.name}
                                                        onChange={e => setChurchSettings({ ...churchSettings, name: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium text-[#1e1b4b]"
                                                        placeholder="Ex: Igreja Batista Central"
                                                    />
                                                </div>
                                            </div>

                                            {/* Location Group */}
                                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5 mb-2">
                                                    <Globe className="w-3 h-3 text-[#d4af37]" /> Localização
                                                </h4>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-semibold text-slate-400 ml-1">CEP</label>
                                                        <input
                                                            type="text"
                                                            value={churchSettings.cep}
                                                            onChange={e => setChurchSettings({ ...churchSettings, cep: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-semibold text-slate-400 ml-1">Estado (UF)</label>
                                                        <input
                                                            type="text"
                                                            value={churchSettings.state}
                                                            onChange={e => setChurchSettings({ ...churchSettings, state: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-center uppercase font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                            maxLength={2}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-semibold text-slate-400 ml-1">Cidade</label>
                                                    <input
                                                        type="text"
                                                        value={churchSettings.city}
                                                        onChange={e => setChurchSettings({ ...churchSettings, city: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-semibold text-slate-400 ml-1">Endereço Completo</label>
                                                    <input
                                                        type="text"
                                                        value={churchSettings.address}
                                                        onChange={e => setChurchSettings({ ...churchSettings, address: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button type="submit" disabled={isUpdating} className="w-full py-4 rounded-xl bg-[#1e1b4b] text-white font-bold text-sm shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Salvar
                                            </button>
                                        </div>
                                    </motion.form>
                                ) : drawerScreen === 'admins' ? (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                                <UserPlus className="w-3.5 h-3.5" /> Adicionar Líder
                                            </h4>
                                            <div className="relative group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={memberSearch}
                                                    onChange={(e) => handleSearchMembers(e.target.value)}
                                                    placeholder="Buscar membro..."
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-sm"
                                                />
                                            </div>
                                            <AnimatePresence>
                                                {searchResults.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden"
                                                    >
                                                        {searchResults.map(member => (
                                                            <div key={member.id} className="p-3 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    {member.photo_url ? (
                                                                        <img src={member.photo_url} className="w-8 h-8 rounded-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">{member.full_name[0]}</div>
                                                                    )}
                                                                    <span className="text-sm font-medium text-slate-700">{member.full_name}</span>
                                                                </div>
                                                                <button onClick={() => handlePromoteMember(member.user_id, 'lider')} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100">
                                                                    Promover
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Liderança Atual
                                            </h4>
                                            {loadingAdmins ? (
                                                <div className="flex justify-center py-8 text-slate-400">
                                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-200" />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {admins.map(admin => (
                                                        <div key={admin.id} className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#d4af37]/30 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative">
                                                                    <div className="w-10 h-10 rounded-full bg-[#1e1b4b] text-white flex items-center justify-center font-bold ring-2 ring-white shadow-md">
                                                                        {admin.avatar_url ? <img src={admin.avatar_url} className="w-full h-full object-cover rounded-full" /> : admin.full_name[0]}
                                                                    </div>
                                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#d4af37] border-2 border-white flex items-center justify-center">
                                                                        <ShieldCheck className="w-2 h-2 text-[#1e1b4b]" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-[#1e1b4b]">{admin.full_name}</p>
                                                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider bg-slate-50 px-1.5 py-0.5 rounded-md inline-block mt-0.5">{getRoleLabel(admin.role)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : drawerScreen === 'finance' ? (
                                    <motion.form
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onSubmit={handleUpdateChurchSettings}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Chave PIX Principal</h4>
                                                <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[9px] font-bold border border-emerald-100 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> PIX Ativo
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                                <div className="flex p-1 bg-white rounded-lg shadow-sm mb-3">
                                                    {['cnpj', 'cpf', 'email', 'phone', 'random'].map(type => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setSelectedPixType(type as any)}
                                                            className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all ${selectedPixType === type ? 'bg-[#1e1b4b] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            {type === 'random' ? 'Aleatória' : type}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={churchSettings.pix_key}
                                                    onChange={e => handlePixKeyChange(e.target.value)}
                                                    placeholder={`Chave PIX (${selectedPixType.toUpperCase()})`}
                                                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none text-sm font-mono text-[#1e1b4b] text-center tracking-wide placeholder:text-slate-300 focus:border-indigo-500 transition-colors"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Titular e Banco (Ex: David - Nubank)</label>
                                                <input
                                                    type="text"
                                                    value={churchSettings.bank_info}
                                                    onChange={e => setChurchSettings({ ...churchSettings, bank_info: e.target.value })}
                                                    placeholder="Nome do Titular e Banco"
                                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Chaves Adicionais</h4>
                                                <button type="button" onClick={handleAddPixKey} className="text-[10px] font-bold uppercase text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-all"><PlusCircle className="w-3.5 h-3.5" /> Nova Chave</button>
                                            </div>

                                            <AnimatePresence>
                                                {isAddingPixKey && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3 overflow-hidden"
                                                    >
                                                        <input type="text" placeholder="Rótulo (ex: Ofertas de Amor)" value={newPixForm.label} onChange={e => setNewPixForm({ ...newPixForm, label: e.target.value })} className="w-full px-3 py-2 bg-white rounded-lg border border-indigo-100 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                        <input type="text" placeholder="Chave PIX" value={newPixForm.key} onChange={e => setNewPixForm({ ...newPixForm, key: e.target.value })} className="w-full px-3 py-2 bg-white rounded-lg border border-indigo-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                        <input type="text" placeholder="Titular e Banco (Opcional)" value={newPixForm.bank_info} onChange={e => setNewPixForm({ ...newPixForm, bank_info: e.target.value })} className="w-full px-3 py-2 bg-white rounded-lg border border-indigo-100 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                        <div className="flex justify-end gap-2 pt-1">
                                                            <button type="button" onClick={() => setIsAddingPixKey(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                                            <button type="button" onClick={handleConfirmAddPixKey} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 hover:scale-105 transition-transform">Confirmar</button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="grid gap-2">
                                                {churchSettings.pix_keys?.map((item: any, idx: number) => (
                                                    <div key={idx} className="p-3 flex items-center justify-between rounded-xl bg-white border border-slate-100 shadow-sm group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                                                                <QrCode className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-700">{item.label}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">{item.key}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button type="button" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Copy className="w-3.5 h-3.5" /></button>
                                                            <button type="button" onClick={() => handleRemovePixKey(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {churchSettings.pix_keys?.length === 0 && (
                                                    <p className="text-center text-[10px] text-slate-400 italic py-4">Nenhuma chave extra cadastrada.</p>
                                                )}
                                            </div>
                                        </div>

                                        <button type="submit" disabled={isUpdating} className="w-full py-4 rounded-xl bg-[#1e1b4b] text-white font-bold text-sm shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Salvar Financeiro
                                        </button>
                                    </motion.form>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    <PremiumToast
                        isVisible={toast.visible}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
                    />
                </>
            )}
        </AnimatePresence>
    );
}
