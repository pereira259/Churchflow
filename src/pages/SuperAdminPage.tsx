import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, Search, User, ArrowLeft, CheckCircle2, XCircle, Church, Calendar, MapPin, Mail, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserData {
    id: string;
    email: string;
    full_name?: string;
    can_create_church: boolean;
    created_at: string;
}

interface PendingChurch {
    id: string;
    name: string;
    city: string;
    state: string;
    email: string;
    phone: string;
    requested_at: string;
    requested_by: string;
    users?: {
        email: string;
        full_name?: string;
    };
}

interface Toast {
    type: 'success' | 'error';
    message: string;
}

export function SuperAdminPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserData[]>([]);
    const [pendingChurches, setPendingChurches] = useState<PendingChurch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'churches' | 'all_churches'>('churches');
    const [allChurches, setAllChurches] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);

    const SUPER_ADMIN_EMAIL = 'dp6274720@gmail.com';

    // Show toast notification
    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        if (!user) return;
        if (user.email !== SUPER_ADMIN_EMAIL) {
            navigate('/');
            return;
        }
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, email, can_create_church, created_at')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;
            setUsers(usersData || []);

            // Fetch Pending Churches (simplified query without foreign key relationship)
            const { data: churchesData, error: churchesError } = await supabase
                .from('churches')
                .select('id, name, city, state, email, phone, requested_at, requested_by')
                .eq('status', 'pending_approval')
                .order('requested_at', { ascending: false });

            // Fetch All Churches
            const { data: allChurchesData, error: allChurchesError } = await supabase
                .from('churches')
                .select('id, name, city, state, email, status, created_at, requested_at, requested_by')
                .order('created_at', { ascending: false });

            if (allChurchesError) throw allChurchesError;
            setAllChurches(allChurchesData || []);

            if (churchesError) {
                console.error('❌ Erro ao buscar igrejas pendentes:', churchesError);
                throw churchesError;
            }

            console.log('✅ Igrejas pendentes encontradas:', churchesData?.length || 0);
            console.log('📋 Dados:', churchesData);

            // Fetch user emails separately for each church
            const churchesWithUsers = await Promise.all(
                (churchesData || []).map(async (church: PendingChurch) => {
                    if (church.requested_by) {
                        const { data: userData } = await supabase
                            .from('users')
                            .select('email, full_name')
                            .eq('id', church.requested_by)
                            .single();

                        return { ...church, users: userData };
                    }
                    return church;
                })
            );

            setPendingChurches(churchesWithUsers);

        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (userId: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ can_create_church: !currentValue })
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u =>
                u.id === userId ? { ...u, can_create_church: !currentValue } : u
            ));
        } catch (err) {
            alert('Erro ao atualizar permissão.');
        }
    };

    const handleApprove = async (churchId: string, requestedBy: string) => {
        setProcessingId(churchId);
        try {
            console.log('🔵 Iniciando aprovação...', { churchId, requestedBy });

            // Get church data first (has user email already)
            const church = pendingChurches.find(c => c.id === churchId);
            if (!church) {
                throw new Error('Igreja não encontrada');
            }

            const userEmail = church.users?.email || church.email;
            console.log('📧 Email do pastor:', userEmail);

            // 1. Update church status to active
            console.log('1️⃣ Atualizando status da igreja...');
            const { error: churchError } = await supabase
                .from('churches')
                .update({
                    status: 'active',
                    approved_at: new Date().toISOString(),
                    approved_by: user?.id
                })
                .eq('id', churchId);

            if (churchError) {
                console.error('❌ Erro ao atualizar igreja:', churchError);
                throw churchError;
            }
            console.log('✅ Igreja atualizada para active');

            // VERIFICAÇÃO: Ler igreja após update para confirmar
            const { data: verifyChurch, error: _verifyError } = await supabase
                .from('churches')
                .select('id, name, status')
                .eq('id', churchId)
                .single();

            console.log('🔍 Verificação após UPDATE:', verifyChurch);

            if (verifyChurch?.status !== 'active') {
                console.error('⚠️ AVISO: Igreja ainda não está "active" no banco!', verifyChurch);
            }

            // OTIMIZAÇÃO: Remover da lista localmente enquanto aguarda refresh
            setPendingChurches(prev => prev.filter(c => c.id !== churchId));

            // 2. Update user to admin role
            console.log('2️⃣ Promovendo usuário para admin...');
            const { error: userError } = await supabase
                .from('users')
                .update({
                    church_id: churchId,
                    role: 'admin'
                })
                .eq('id', requestedBy);

            if (userError) {
                console.error('❌ Erro ao atualizar usuário:', userError);
                throw userError;
            }
            console.log('✅ Usuário promovido para admin');

            // 3. Create member record (pastor as admin)
            console.log('3️⃣ Criando registro de membro...');
            const { error: memberError } = await supabase
                .from('members')
                .insert({
                    church_id: churchId,
                    user_id: requestedBy,
                    full_name: userEmail?.split('@')[0] || 'Pastor',
                    email: userEmail,
                    status: 'membro',
                    church_role: 'Pastor/Admin'
                });

            if (memberError) {
                console.warn('⚠️ Erro ao criar membro (pode já existir):', memberError);
                // Não falha - membro pode já existir
            } else {
                console.log('✅ Membro criado');
            }

            // Refresh data
            console.log('4️⃣ Recarregando dados...');
            await fetchData();
            console.log('✅ Dados recarregados!');

            showToast('success', '✅ Igreja aprovada! O pastor agora tem acesso admin.');

        } catch (err: any) {
            console.error('❌ ERRO GERAL:', err);
            showToast('error', '❌ Erro ao aprovar: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (churchId: string) => {
        const reason = prompt('Motivo da rejeição (opcional):');

        setProcessingId(churchId);
        try {
            const { error } = await supabase
                .from('churches')
                .update({
                    status: 'rejected',
                    rejection_reason: reason || 'Sem motivo especificado'
                })
                .eq('id', churchId);

            if (error) throw error;

            await fetchData();
            showToast('success', '❌ Igreja rejeitada.');

        } catch (err: any) {
            console.error('Erro ao rejeitar igreja:', err);
            showToast('error', 'Erro ao rejeitar: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleToggleStatus = async (churchId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (!confirm(`Tem certeza que deseja alterar o status de ${currentStatus} para ${newStatus}?`)) return;

        setProcessingId(churchId);
        try {
            const { error } = await supabase
                .from('churches')
                .update({ status: newStatus })
                .eq('id', churchId);

            if (error) throw error;

            await fetchData();
            showToast('success', `Status alterado para ${newStatus}`);
        } catch (err: any) {
            console.error('Erro ao alterar status:', err);
            showToast('error', 'Erro: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (churchId: string) => {
        if (!confirm('ATENÇÃO: Isso excluirá PERMANENTEMENTE a igreja e todos os seus dados. Tem certeza?')) return;

        const confirmName = prompt('Digite "DELETAR" para confirmar:');
        if (confirmName !== 'DELETAR') return;

        setProcessingId(churchId);
        try {
            // Delete church (cascade should handle related data if configured, otherwise might fail)
            const { error } = await supabase
                .from('churches')
                .delete()
                .eq('id', churchId);

            if (error) throw error;

            await fetchData();
            showToast('success', 'Igreja excluída permanentemente.');
        } catch (err: any) {
            console.error('Erro ao excluir:', err);
            showToast('error', 'Erro ao excluir: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredChurches = pendingChurches.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAllChurches = allChurches.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.city || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e1b4b]">
                <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#1e1b4b] to-[#0f0d2e] font-sans text-slate-100 p-6 md:p-12">

            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/10 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#d4af37]/5 rounded-full blur-[100px] opacity-30" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-2xl">
                            <Shield className="w-8 h-8 text-[#d4af37]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Painel Supremo</h1>
                            <p className="text-slate-400">Gestão de Igrejas e Permissões</p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao App
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('churches')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'churches'
                            ? 'bg-[#d4af37] text-[#1e1b4b]'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <Church className="w-4 h-4 inline-block mr-2" />
                        Aprovações ({pendingChurches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'users'
                            ? 'bg-[#d4af37] text-[#1e1b4b]'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <User className="w-4 h-4 inline-block mr-2" />
                        Usuários
                    </button>
                    <button
                        onClick={() => setActiveTab('all_churches')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'all_churches'
                            ? 'bg-[#d4af37] text-[#1e1b4b]'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <Church className="w-4 h-4 inline-block mr-2" />
                        Todas Igrejas
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

                    {/* Toolbar */}
                    <div className="p-6 border-b border-white/5 bg-black/20 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-[#d4af37] transition-colors" />
                            <input
                                type="text"
                                placeholder={activeTab === 'churches' ? "Buscar igreja..." : "Buscar pastor por email..."}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-200 outline-none focus:border-[#d4af37]/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="hidden md:block text-slate-500 text-sm ml-auto">
                            {activeTab === 'churches' ? (
                                <>Total: <span className="text-white font-bold">{pendingChurches.length}</span> pendentes</>
                            ) : activeTab === 'all_churches' ? (
                                <>Total: <span className="text-white font-bold">{allChurches.length}</span> igrejas</>
                            ) : (
                                <>Total: <span className="text-white font-bold">{users.length}</span> usuários</>
                            )}
                        </div>
                    </div>

                    {/* Content: Churches Tab */}
                    {activeTab === 'churches' && (
                        <div className="p-6">
                            {filteredChurches.length === 0 ? (
                                <div className="text-center py-16">
                                    <Church className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                                    <p className="text-slate-400">Nenhuma igreja aguardando aprovação</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredChurches.map((church) => (
                                        <div key={church.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-white mb-1">{church.name}</h3>
                                                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                                        <MapPin className="w-3 h-3" />
                                                        {church.city}, {church.state}
                                                    </div>
                                                </div>
                                                <div className="w-12 h-12 rounded-xl bg-[#d4af37]/20 flex items-center justify-center">
                                                    <Church className="w-6 h-6 text-[#d4af37]" />
                                                </div>
                                            </div>

                                            {/* Church Details */}
                                            <div className="space-y-2 mb-4 pb-4 border-b border-white/5">
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Mail className="w-3 h-3" />
                                                    {church.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <User className="w-3 h-3" />
                                                    Pastor: {church.users?.email || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Calendar className="w-3 h-3" />
                                                    Solicitado em {new Date(church.requested_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(church.id, church.requested_by)}
                                                    disabled={processingId === church.id}
                                                    className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {processingId === church.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Check className="w-4 h-4" />
                                                            Aprovar
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(church.id)}
                                                    disabled={processingId === church.id}
                                                    className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Rejeitar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content: Users Tab */}
                    {activeTab === 'users' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5">
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Cadastro</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Permissão de Criador</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-slate-300 font-bold shrink-0">
                                                        {u.email.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-200 group-hover:text-white transition-colors">{u.email}</div>
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{u.id.split('-')[0]}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-sm text-slate-400">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-5 text-right">
                                                <button
                                                    onClick={() => togglePermission(u.id, u.can_create_church)}
                                                    className={`
                                                        relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 focus:ring-offset-[#1e1b4b]
                                                        ${u.can_create_church ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}
                                                    `}
                                                >
                                                    <span className="sr-only">Habilitar criação</span>
                                                    <span
                                                        className={`
                                                            inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300
                                                            ${u.can_create_church ? 'translate-x-7' : 'translate-x-1'}
                                                        `}
                                                    />
                                                </button>
                                                <div className="mt-2 text-[10px] font-medium uppercase tracking-wider">
                                                    {u.can_create_church ? (
                                                        <span className="text-emerald-400 flex items-center justify-end gap-1"><CheckCircle2 className="w-3 h-3" /> Habilitado</span>
                                                    ) : (
                                                        <span className="text-slate-500 flex items-center justify-end gap-1"><XCircle className="w-3 h-3" /> Restrito</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-16 text-center text-slate-500">
                                                <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                Nenhum usuário encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="mt-8 text-center text-slate-600 text-xs">
                    Painel Administrativo ChurchFlow • Acesso Restrito • {user?.email}
                </p>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="fixed top-6 right-6 z-50 max-w-md"
                    >
                        <div className={`
                            backdrop-blur-2xl border-2 rounded-2xl p-5 shadow-2xl flex items-start gap-4
                            ${toast.type === 'success'
                                ? 'bg-emerald-500/20 border-emerald-400/50'
                                : 'bg-red-500/20 border-red-400/50'
                            }
                        `}>
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                ${toast.type === 'success'
                                    ? 'bg-emerald-500/30'
                                    : 'bg-red-500/30'
                                }
                            `}>
                                {toast.type === 'success' ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-bold text-sm mb-1">
                                    {toast.type === 'success' ? 'Sucesso!' : 'Erro'}
                                </p>
                                <p className="text-slate-200 text-sm leading-relaxed">
                                    {toast.message}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
