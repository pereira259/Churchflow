import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    UserPlus,
    MoreHorizontal,
    Mail,
    Phone,
    Calendar,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    Square,
    Loader2,
    Send,
    CheckCircle2,
    X,
    AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { getMembers, Member } from '@/lib/supabase-queries';
import { MemberForm } from '@/components/forms/MemberForm';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

// Church ID padrão - REMOVED
// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001';

export function VisitantesPage() {
    const { profile } = useAuth();
    const churchId = profile?.church_id;
    const [visitantes, setVisitantes] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [genderFilter] = useState('Todos');
    const [selectedVisitantes, setSelectedVisitantes] = useState<string[]>([]);
    const [isNewVisitorOpen, setIsNewVisitorOpen] = useState(false);
    const [showWelcomeConfirm, setShowWelcomeConfirm] = useState(false);
    const [welcomeProgress, setWelcomeProgress] = useState({ current: 0, total: 0, sending: false });
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadData();
    }, [churchId]);

    const loadData = async () => {
        if (!churchId) return;
        setLoading(true);
        try {
            const { data } = await getMembers(churchId);
            if (data) {
                const filtered = data.filter(m =>
                    m.status === 'visitante' ||
                    m.status === 'interessado'
                );
                setVisitantes(filtered);
            }
        } catch (error) {
            console.error('Error fetching visitantes:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredList = visitantes.filter(v => {
        let matchesSearch = v.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.phone && v.phone.includes(searchTerm));

        // Filtro de Gênero
        if (genderFilter !== 'Todos') {
            matchesSearch = matchesSearch && (v.gender?.toLowerCase() === genderFilter.toLowerCase());
        }

        if (statusFilter === 'Novos') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return matchesSearch && new Date(v.created_at) >= sevenDaysAgo;
        }

        if (statusFilter === 'Em Visita') {
            return matchesSearch && v.status === 'visitante';
        }

        return matchesSearch;
    });

    const openWhatsApp = (name: string, phone?: string) => {
        if (!phone) return false;
        const cleanedPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
        const message = encodeURIComponent(`Olá ${name}! Seja muito bem-vindo à nossa igreja. Como podemos te ajudar? ✨`);
        window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
        return true;
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleBulkWelcome = () => {
        if (selectedVisitantes.length === 0) return;
        setShowWelcomeConfirm(true);
    };

    const confirmBulkWelcome = async () => {
        const selectedList = visitantes.filter(v => selectedVisitantes.includes(v.id));
        setWelcomeProgress({ current: 0, total: selectedList.length, sending: true });
        setShowWelcomeConfirm(false);

        let successCount = 0;
        for (let i = 0; i < selectedList.length; i++) {
            const visitor = selectedList[i];
            setWelcomeProgress(prev => ({ ...prev, current: i + 1 }));

            if (visitor.phone) {
                openWhatsApp(visitor.full_name, visitor.phone);
                successCount++;
                // Delay between each message to prevent browser blocking
                if (i < selectedList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        }

        setWelcomeProgress({ current: 0, total: 0, sending: false });
        setSelectedVisitantes([]);

        if (successCount > 0) {
            showToast(`✅ Mensagem de boas-vindas enviada para ${successCount} visitante${successCount > 1 ? 's' : ''}!`, 'success');
        } else {
            showToast('⚠️ Nenhum visitante tinha telefone cadastrado.', 'error');
        }
    };

    const toggleSelectAll = () => {
        if (selectedVisitantes.length === filteredList.length) {
            setSelectedVisitantes([]);
        } else {
            setSelectedVisitantes(filteredList.map(v => v.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedVisitantes(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-2">
                {/* Balanced Glass Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[28px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="space-y-0.5 relative z-10">
                        <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                            <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">Gestão de Relacionamento</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            Visitantes <span className="font-serif italic text-gold font-normal text-3xl">&</span> Amigos
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-lg">
                            Boas-Vindas, Integração e Acolhimento
                        </p>
                    </div>

                    {/* Integrated Stats Section */}
                    <div className="hidden lg:flex items-center gap-6 xl:gap-10 border-x border-marinho/5 px-6 xl:px-10 mx-4 xl:mx-6 relative z-10">
                        {[
                            { label: 'Total Visitantes', value: visitantes.length, color: 'text-marinho' },
                            {
                                label: 'Novos (7 dias)', value: visitantes.filter(v => {
                                    const weekAgo = new Date();
                                    weekAgo.setDate(weekAgo.getDate() - 7);
                                    return new Date(v.created_at) >= weekAgo;
                                }).length, color: 'text-sage'
                            },
                            { label: 'Interessados', value: visitantes.filter(v => v.status === 'interessado').length, color: 'text-gold' }
                        ].map((stat, i) => (
                            <div key={i} className="text-center space-y-0">
                                <p className={cn("text-xl font-display font-bold italic leading-none tracking-tight", stat.color)}>{stat.value}</p>
                                <p className="text-[7px] font-black text-marinho/30 uppercase tracking-[0.2em]">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                        <button
                            onClick={handleBulkWelcome}
                            disabled={selectedVisitantes.length === 0}
                            title="Enviar mensagem de boas-vindas via WhatsApp para os visitantes selecionados"
                            className={cn(
                                "h-11 px-6 bg-sage text-white rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sage/20 transition-all border border-white/20 active:scale-95 disabled:opacity-50 disabled:shadow-none",
                            )}
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span>Boas-vindas {selectedVisitantes.length > 0 && `(${selectedVisitantes.length})`}</span>
                        </button>

                        <button
                            onClick={() => setIsNewVisitorOpen(true)}
                            className="h-11 px-7 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2.5 group"
                        >
                            <UserPlus className="h-4 w-4 text-gold group-hover:scale-110 transition-transform" />
                            <span>Novo Cadastro</span>
                        </button>
                    </div>
                </header>

                {/* Filters & Search */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-2 pb-1">
                    <div className="md:col-span-4 relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-marinho/20 group-focus-within:text-marinho/40 transition-colors" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, e-mail ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-premium pl-10 h-10 text-[10px] shadow-sm w-full bg-white/60 focus:bg-white transition-all border-white/40"
                        />
                    </div>
                    <div className="md:col-span-8 flex items-center gap-2">
                        <div className="h-10 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-1 flex items-center gap-1 shadow-sm font-black text-[9px] uppercase tracking-widest flex-1">
                            {[
                                { key: 'Todos', count: visitantes.length },
                                {
                                    key: 'Novos', count: visitantes.filter(v => {
                                        const weekAgo = new Date();
                                        weekAgo.setDate(weekAgo.getDate() - 7);
                                        return new Date(v.created_at) >= weekAgo;
                                    }).length
                                },
                                { key: 'Em Visita', count: visitantes.filter(v => v.status === 'visitante').length }
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg transition-all flex-1 flex items-center justify-center gap-1.5",
                                        statusFilter === f.key ? "bg-marinho text-white shadow-md" : "text-slate-400 hover:text-marinho"
                                    )}
                                >
                                    {f.key}
                                    <span className={cn(
                                        "text-[8px] px-1.5 py-0.5 rounded-full",
                                        statusFilter === f.key ? "bg-white/20" : "bg-slate-100"
                                    )}>{f.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Visitor Table */}
                <div className="card-3d flex-1 min-h-0 flex flex-col texture-engraving overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-marinho/10">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-50">
                                <tr className="border-b border-marinho/5">
                                    <th className="px-6 py-4 w-12">
                                        <button onClick={toggleSelectAll} className="text-marinho/30 hover:text-marinho transition-colors">
                                            {selectedVisitantes.length === filteredList.length && filteredList.length > 0 ? (
                                                <CheckSquare className="h-4 w-4 text-sage" />
                                            ) : (
                                                <Square className="h-4 w-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest">Identidade</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest">Contato</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest">Última Visita</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-marinho/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-marinho/20" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Estabelecendo conexão segura...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredList.length === 0 ? (

                                    <tr>
                                        <td colSpan={6} className="py-16">
                                            <EmptyState
                                                title="Nenhum visitante ainda"
                                                description="Cadastre os visitantes que chegarem à igreja para acompanhar a jornada de integração e acolhimento."
                                                type="users"
                                                icon={UserPlus}
                                                action={
                                                    <button
                                                        onClick={() => setIsNewVisitorOpen(true)}
                                                        className="px-6 py-3 bg-marinho text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-marinho/90 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-marinho/20 hover:scale-[1.02]"
                                                    >
                                                        <UserPlus className="w-4 h-4 text-gold" />
                                                        Novo Cadastro
                                                    </button>
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : filteredList.map((visitante) => (
                                    <tr
                                        key={visitante.id}
                                        className={cn(
                                            "table-row-premium group",
                                            selectedVisitantes.includes(visitante.id) && "bg-sage/[0.03]"
                                        )}
                                    >
                                        <td className="px-6 py-3">
                                            <button
                                                onClick={() => toggleSelect(visitante.id)}
                                                className={cn(
                                                    "transition-colors",
                                                    selectedVisitantes.includes(visitante.id) ? "text-sage" : "text-marinho/10 group-hover:text-marinho/30"
                                                )}
                                            >
                                                {selectedVisitantes.includes(visitante.id) ? <CheckSquare className="h-4.5 w-4.5" /> : <Square className="h-4.5 w-4.5" />}
                                            </button>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-marinho to-marinho-light flex items-center justify-center text-white font-display text-sm font-black italic shadow-sm overflow-hidden avatar-premium">
                                                    {visitante.photo_url ? (
                                                        <img src={visitante.photo_url} alt={visitante.full_name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        visitante.full_name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-display text-sm font-bold text-marinho italic group-hover:text-gold transition-colors">{visitante.full_name}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-0.5">{visitante.status === 'interessado' ? 'Potencial Membro' : 'Visitante Casual'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold group-hover:text-marinho transition-colors">
                                                    <Mail className="w-3 h-3 text-marinho/20" />
                                                    {visitante.email || '-'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-black">
                                                    <Phone className="w-3 h-3 text-marinho/10" />
                                                    {visitante.phone || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className={cn(
                                                "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] border shadow-sm",
                                                visitante.status === 'interessado'
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : "bg-gold/5 text-gold border-gold/10"
                                            )}>
                                                <div className={cn("w-1 h-1 rounded-full", visitante.status === 'interessado' ? "bg-emerald-600" : "bg-gold")} />
                                                {visitante.status}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold group-hover:text-slate-600 transition-colors">
                                                <Calendar className="w-3.5 h-3.5 opacity-30" />
                                                {new Date(visitante.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openWhatsApp(visitante.full_name, visitante.phone)}
                                                    className={cn(
                                                        "p-2 bg-white border border-slate-100 rounded-xl transition-all",
                                                        visitante.phone ? "text-sage hover:bg-sage hover:text-white hover:shadow-soft hover:translate-y-[-2px]" : "text-slate-200 opacity-50 cursor-not-allowed"
                                                    )}
                                                    title={visitante.phone ? "Enviar WhatsApp" : "Telefone não cadastrado"}
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                </button>
                                                <button className="p-2 bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-marinho hover:shadow-soft hover:translate-y-[-2px] transition-all">
                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 border-t border-marinho/5 bg-marinho/[0.01] flex items-center justify-between">
                        <p className="text-[9px] font-black text-marinho/30 uppercase tracking-[0.25em]">Relacionamento Eclesiástico • {filteredList.length} Registros</p>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mr-2">Página 1 de 1</span>
                            <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-marinho/20 shadow-sm cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                            <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-marinho shadow-sm hover:translate-y-[-1px] transition-all"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Novo Visitante */}
            <AnimatePresence>
                {isNewVisitorOpen && (
                    <Modal
                        isOpen={isNewVisitorOpen}
                        onClose={() => setIsNewVisitorOpen(false)}
                        title="Novo Amigo"
                    >
                        <MemberForm
                            churchId={churchId!}
                            onSuccess={() => {
                                setIsNewVisitorOpen(false);
                                loadData();
                            }}
                            onCancel={() => setIsNewVisitorOpen(false)}
                            initialData={{ status: 'visitante' } as any}
                        />
                    </Modal>
                )}
            </AnimatePresence>

            {/* Modal de Confirmação de Boas-Vindas */}
            <AnimatePresence>
                {showWelcomeConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-marinho/60 backdrop-blur-sm"
                            onClick={() => setShowWelcomeConfirm(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-[24px] p-6 max-w-md w-full shadow-2xl border border-white/20"
                        >
                            <div className="text-center">
                                <div className="w-14 h-14 bg-sage/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Send className="w-7 h-7 text-sage" />
                                </div>
                                <h3 className="text-xl font-black text-marinho mb-2">Enviar Boas-Vindas</h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    Você está prestes a enviar uma mensagem de boas-vindas para{' '}
                                    <span className="font-bold text-marinho">{selectedVisitantes.length}</span> visitante{selectedVisitantes.length > 1 ? 's' : ''} via WhatsApp.
                                </p>

                                <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prévia da mensagem:</p>
                                    <p className="text-sm text-slate-600 italic">
                                        "Olá [Nome]! Seja muito bem-vindo à nossa igreja. Como podemos te ajudar? ✨"
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowWelcomeConfirm(false)}
                                        className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmBulkWelcome}
                                        className="flex-1 h-11 bg-sage text-white rounded-xl text-sm font-bold hover:bg-sage/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sage/20"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Confirmar Envio
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Indicador de Progresso */}
            <AnimatePresence>
                {welcomeProgress.sending && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-marinho text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4"
                    >
                        <Loader2 className="w-5 h-5 animate-spin text-gold" />
                        <div>
                            <p className="text-sm font-bold">Enviando boas-vindas...</p>
                            <p className="text-xs text-white/70">{welcomeProgress.current} de {welcomeProgress.total}</p>
                        </div>
                        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gold rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(welcomeProgress.current / welcomeProgress.total) * 100}%` }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast de Sucesso/Erro */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className={cn(
                            "fixed top-6 left-1/2 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3",
                            toast.type === 'success' ? "bg-sage text-white" : "bg-amber-500 text-white"
                        )}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        <p className="text-sm font-bold">{toast.message}</p>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
