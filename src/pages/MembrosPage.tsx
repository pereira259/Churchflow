import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    UserPlus,
    Mail,
    Phone,
    MessageCircle,
    CheckSquare,
    Square,
    Send,
    Edit2,
    Trash2,
    Loader2,
    AlertOctagon,
    Filter,
    Eye
} from 'lucide-react';
import { MemberProfile } from '@/components/members/MemberProfile';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { getMembers, deleteMember, Member } from '@/lib/supabase-queries';
import { useAuth } from '@/lib/auth';
import { Modal } from '@/components/ui/Modal';
import { MemberForm } from '@/components/forms/MemberForm';

// Church ID padrão
// Church ID padrão - REMOVED
// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001';

export function MembrosPage() {
    const { profile } = useAuth();
    const churchId = profile?.church_id;
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [ministryFilter, setMinistryFilter] = useState('Todos');
    const [smallGroupFilter, setSmallGroupFilter] = useState('Todos'); // 'Todos', 'Sim', 'Não'
    const [discipledFilter, setDiscipledFilter] = useState('Todos'); // 'Todos', 'Sim', 'Não'
    const [ministries, setMinistries] = useState<string[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    // Statistics State
    const [stats, setStats] = useState({ total: 0, members: 0, visitors: 0, cell: 0 });

    // Welcome Notification State
    const [welcomeNotification, setWelcomeNotification] = useState<{ name: string, phone: string } | null>(null);

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);

    // Error Notification State
    const [errorNotification, setErrorNotification] = useState<string | null>(null);

    const [viewingMember, setViewingMember] = useState<Member | null>(null);

    // Profile
    const openProfileModal = (member: Member) => {
        setViewingMember(member);
    };

    const handleEditFromProfile = () => {
        if (viewingMember) {
            setEditingMember(viewingMember);
            setViewingMember(null);
            setShowModal(true);
        }
    };

    // Carrega membros
    useEffect(() => {
        if (churchId) {
            loadMembers();
        }
    }, [churchId]);

    const loadMembers = async () => {
        if (!churchId) return;
        setLoading(true);
        const { data } = await getMembers(churchId);
        if (data) {
            setMembers(data);

            // Stats
            const total = data.length;
            const membersCount = data.filter(m => m.status === 'membro').length;
            const visitorsCount = data.filter(m => m.status === 'visitante').length;
            const cellCount = data.filter(m => m.has_small_group).length;
            setStats({ total, members: membersCount, visitors: visitorsCount, cell: cellCount });

            // Extrair ministérios únicos para o filtro
            const uniqueMinistries = Array.from(new Set(data.map(m => m.ministry).filter(Boolean))) as string[];
            setMinistries(uniqueMinistries.sort());
        }
        setLoading(false);
    };

    // Filtros
    const filteredMembers = useMemo(() => {
        return members.filter((member: Member) => {
            const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            const matchesStatus = statusFilter === 'Todos' || member.status === statusFilter.toLowerCase();
            const matchesMinistry = ministryFilter === 'Todos' || member.ministry === ministryFilter;

            const matchesSmallGroup = smallGroupFilter === 'Todos'
                ? true
                : smallGroupFilter === 'Sim' ? member.has_small_group : !member.has_small_group;

            const matchesDiscipled = discipledFilter === 'Todos'
                ? true
                : discipledFilter === 'Sim' ? member.is_discipled : !member.is_discipled;

            return matchesSearch && matchesStatus && matchesMinistry && matchesSmallGroup && matchesDiscipled;
        });
    }, [members, searchTerm, statusFilter, ministryFilter, smallGroupFilter, discipledFilter]);

    // WhatsApp
    const openWhatsApp = (name: string, phone?: string) => {
        if (!phone) return;
        const cleanedPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
        const message = encodeURIComponent(`Olá ${name}! Graça e paz.`);
        window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
    };

    // Seleção
    const toggleSelectAll = () => {
        if (selectedMembers.length === filteredMembers.length) {
            setSelectedMembers([]);
        } else {
            setSelectedMembers(filteredMembers.map((m: Member) => m.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedMembers((prev: string[]) =>
            prev.includes(id) ? prev.filter((item: string) => item !== id) : [...prev, id]
        );
    };

    // Modal
    const openCreateModal = () => {
        setEditingMember(null);
        setShowModal(true);
    };

    const openEditModal = (member: Member) => {
        setEditingMember(member);
        setShowModal(true);
    };

    const handleSuccess = async (data?: any) => {
        await loadMembers();
        setShowModal(false);

        if (!editingMember && data) {
            setWelcomeNotification({
                name: data.full_name,
                phone: data.phone
            });
        }
    };

    const handleDelete = (member: Member) => {
        setDeleteConfirmation({ id: member.id, name: member.full_name });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;

        const { error } = await deleteMember(deleteConfirmation.id);

        if (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir membro.');
        } else {
            await loadMembers();
            setDeleteConfirmation(null);
        }
    };

    const statuses = ['Todos', 'Visitante', 'Interessado', 'Membro', 'Inativo'];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'membro': return 'bg-emerald-500';
            case 'interessado': return 'bg-blue-500';
            case 'visitante': return 'bg-amber-500';
            case 'inativo': return 'bg-slate-400';
            default: return 'bg-slate-400';
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-2">
                {/* Balanced Glass Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[28px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="space-y-0.5 relative z-10">
                        <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                            <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">Gestão Ministerial</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            Membros <span className="font-serif italic text-gold font-normal text-3xl">&</span> Comunidade
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-lg">
                            Administração de Membros, Visitantes e Integração
                        </p>
                    </div>

                    {/* Integrated Stats Section */}
                    <div className="hidden xl:flex items-center gap-8 border-x border-marinho/5 px-8 mx-4 relative z-10">
                        {[
                            { label: 'Total Pessoas', value: stats.total, color: 'text-marinho' },
                            { label: 'Membros Ativos', value: stats.members, color: 'text-sage' },
                            { label: 'Visitantes', value: stats.visitors, color: 'text-gold' },
                            { label: 'Em Grupos', value: stats.cell, color: 'text-marinho' }
                        ].map((stat, i) => (
                            <div key={i} className="text-center space-y-0">
                                <p className={cn("text-xl font-display font-bold italic leading-none tracking-tight", stat.color)}>{stat.value}</p>
                                <p className="text-[7px] font-black text-marinho/30 uppercase tracking-[0.2em]">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                        <AnimatePresence>
                            {selectedMembers.length > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="h-11 px-6 bg-sage text-white rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sage/20 transition-all border border-white/20 active:scale-95"
                                >
                                    <Send className="h-4 w-4" />
                                    <span>Mensagem ({selectedMembers.length})</span>
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={openCreateModal}
                            className="h-11 px-7 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2.5 group"
                        >
                            <UserPlus className="h-4 w-4 text-gold group-hover:scale-110 transition-transform" />
                            <span>Novo Cadastro</span>
                        </button>
                    </div>
                </header>



                <section className="grid grid-cols-1 md:grid-cols-12 gap-2 pb-1">
                    <div className="md:col-span-4 relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-marinho/20 group-focus-within:text-marinho/40 transition-colors" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou e-mail..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-premium pl-10 h-10 text-[10px] shadow-sm w-full bg-white/60 focus:bg-white transition-all border-white/40"
                        />
                    </div>

                    <div className={cn("md:col-span-2 relative group", ministryFilter !== 'Todos' && "ring-2 ring-gold/50 rounded-xl")}>
                        <select
                            value={ministryFilter}
                            onChange={(e) => setMinistryFilter(e.target.value)}
                            className="input-premium h-10 py-0 text-[10px] shadow-sm w-full appearance-none pr-8 cursor-pointer pl-3 text-marinho font-bold bg-white/60 focus:bg-white transition-all border-white/40"
                        >
                            <option value="Todos">Ministérios</option>
                            {ministries.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <Filter className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none transition-colors", ministryFilter !== 'Todos' ? "text-gold" : "text-marinho/20 group-hover:text-marinho/40")} />
                    </div>

                    <div className={cn("md:col-span-2 relative group", statusFilter !== 'Todos' && "ring-2 ring-gold/50 rounded-xl")}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-premium h-10 py-0 text-[10px] shadow-sm w-full appearance-none pr-8 cursor-pointer pl-3 text-marinho font-bold bg-white/60 focus:bg-white transition-all border-white/40"
                        >
                            <option value="Todos">Status</option>
                            {statuses.filter(s => s !== 'Todos').map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <Filter className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none transition-colors", statusFilter !== 'Todos' ? "text-gold" : "text-marinho/20 group-hover:text-marinho/40")} />
                    </div>

                    <div className={cn("md:col-span-2 relative group", smallGroupFilter !== 'Todos' && "ring-2 ring-gold/50 rounded-xl")}>
                        <select
                            value={smallGroupFilter}
                            onChange={(e) => setSmallGroupFilter(e.target.value)}
                            className="input-premium h-10 py-0 text-[10px] shadow-sm w-full appearance-none pr-8 cursor-pointer pl-3 text-marinho font-bold bg-white/60 focus:bg-white transition-all border-white/40"
                        >
                            <option value="Todos">Grupo</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                        </select>
                        <Filter className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none transition-colors", smallGroupFilter !== 'Todos' ? "text-gold" : "text-marinho/20 group-hover:text-marinho/40")} />
                    </div>

                    <div className={cn("md:col-span-2 relative group", discipledFilter !== 'Todos' && "ring-2 ring-gold/50 rounded-xl")}>
                        <select
                            value={discipledFilter}
                            onChange={(e) => setDiscipledFilter(e.target.value)}
                            className="input-premium h-10 py-0 text-[10px] shadow-sm w-full appearance-none pr-8 cursor-pointer pl-3 text-marinho font-bold bg-white/60 focus:bg-white transition-all border-white/40"
                        >
                            <option value="Todos">Discipulado</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                        </select>
                        <Filter className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none transition-colors", discipledFilter !== 'Todos' ? "text-gold" : "text-marinho/20 group-hover:text-marinho/40")} />
                    </div>
                </section>

                {/* Tabela Section */}
                <div className="card-3d flex-1 min-h-0 flex flex-col texture-engraving overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-marinho/30" />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-marinho/10">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-marinho/5">
                                        <th className="px-6 py-4 w-12">
                                            <button onClick={toggleSelectAll} className="text-marinho/30 hover:text-marinho transition-colors">
                                                {selectedMembers.length === filteredMembers.length && filteredMembers.length > 0 ? (
                                                    <CheckSquare className="h-5 w-5 text-sage" />
                                                ) : (
                                                    <Square className="h-5 w-5" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest">Nome</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest">Contato</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest text-center">Grupos</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-marinho/40 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-marinho/5">
                                    <AnimatePresence mode='popLayout'>
                                        {filteredMembers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-marinho/40">
                                                    Nenhum membro encontrado
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredMembers.map((member: Member) => (
                                                <motion.tr
                                                    key={member.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    className={cn(
                                                        "group transition-colors",
                                                        selectedMembers.includes(member.id) ? "bg-sage/[0.03]" : "hover:bg-marinho/[0.01]"
                                                    )}
                                                >
                                                    <td className="px-6 py-3">
                                                        <button
                                                            onClick={() => toggleSelect(member.id)}
                                                            className={cn(
                                                                "transition-colors",
                                                                selectedMembers.includes(member.id) ? "text-sage" : "text-marinho/10 group-hover:text-marinho/30"
                                                            )}
                                                        >
                                                            {selectedMembers.includes(member.id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-3 cursor-pointer" onClick={() => openProfileModal(member)}>
                                                        <div className="flex items-center gap-3 group-hover:opacity-80 transition-opacity">
                                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cream-100 to-cream-200 border border-white shadow-sm flex items-center justify-center font-display text-sm font-bold text-marinho overflow-hidden">
                                                                {member.photo_url ? (
                                                                    <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    member.full_name[0]
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-display text-base font-bold text-marinho italic tracking-tight group-hover:text-gold transition-colors">{member.full_name}</p>
                                                                <p className="text-[9px] font-bold text-marinho/30 uppercase tracking-widest">{member.ministry || 'Sem ministério'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="text-[11px] font-medium text-marinho/60 space-y-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <Mail className="h-3 w-3 opacity-40" />
                                                                <span>{member.email || '-'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="h-3 w-3 opacity-40" />
                                                                <span>{member.phone || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {member.has_small_group && (
                                                                <div className="h-6 w-6 rounded-full bg-marinho/10 flex items-center justify-center text-marinho" title="Participa de Grupo">
                                                                    <div className="h-2 w-2 rounded-full bg-marinho" />
                                                                </div>
                                                            )}
                                                            {member.is_discipled && (
                                                                <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-gold" title="Em Discipulado">
                                                                    <div className="h-2 w-2 rounded-full bg-gold" />
                                                                </div>
                                                            )}
                                                            {!member.has_small_group && !member.is_discipled && (
                                                                <span className="text-[10px] text-marinho/20">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-lg bg-marinho/5">
                                                            <div className={cn("h-1.5 w-1.5 rounded-full", getStatusColor(member.status))} />
                                                            <span className="text-[9px] font-bold text-marinho uppercase tracking-widest">{member.status}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => member.phone && openWhatsApp(member.full_name, member.phone)}
                                                                className={cn(
                                                                    "h-9 w-9 glass rounded-xl inline-flex items-center justify-center transition-all shadow-sm",
                                                                    member.phone ? "text-sage hover:bg-sage hover:text-white" : "text-slate-200 cursor-not-allowed opacity-50"
                                                                )}
                                                                title={member.phone ? "WhatsApp" : "Sem telefone cadastrado"}
                                                            >
                                                                <MessageCircle className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openProfileModal(member)}
                                                                className="h-9 w-9 glass rounded-xl inline-flex items-center justify-center text-marinho/30 hover:text-marinho hover:bg-white transition-all shadow-sm"
                                                                title="Ver Perfil"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(member)}
                                                                className="h-9 w-9 glass rounded-xl inline-flex items-center justify-center text-marinho/30 hover:text-marinho hover:bg-white transition-all shadow-sm"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(member)}
                                                                className="h-9 w-9 glass rounded-xl inline-flex items-center justify-center text-red-400/50 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="px-6 py-3 border-t border-marinho/5 bg-marinho/[0.01] flex items-center justify-between">
                        <p className="text-[9px] font-black text-marinho/30 uppercase tracking-widest">
                            Exibindo {filteredMembers.length} de {members.length} pessoas
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Criação/Edição */}
            <AnimatePresence>
                {/* Profile Modal */}
                <Modal
                    isOpen={!!viewingMember}
                    onClose={() => setViewingMember(null)}
                    hideHeader
                >
                    {viewingMember && (
                        <MemberProfile
                            member={viewingMember}
                            onClose={() => setViewingMember(null)}
                            onEdit={handleEditFromProfile}
                        />
                    )}
                </Modal>

                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title={editingMember ? 'Editar Membro' : 'Novo Membro'}
                >
                    <MemberForm
                        onSuccess={handleSuccess}
                        onCancel={() => setShowModal(false)}
                        initialData={editingMember}
                        churchId={churchId || ''}
                    />
                </Modal>
            </AnimatePresence>

            <Modal
                isOpen={!!welcomeNotification}
                onClose={() => setWelcomeNotification(null)}
                title="Cadastro Realizado!"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 bg-marinho/5 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
                        <MessageCircle className="h-10 w-10 text-marinho" strokeWidth={1.5} />
                    </div>

                    <p className="text-charcoal-600 text-sm mb-6 leading-relaxed">
                        O membro <strong className="text-marinho font-bold">{welcomeNotification?.name}</strong> foi adicionado com sucesso.
                        <br /><span className="text-xs text-stone- stone-500 mt-1 block">Envie uma mensagem de boas-vindas agora.</span>
                    </p>

                    <div className="w-full space-y-3">
                        <button
                            onClick={() => {
                                if (welcomeNotification) {
                                    const message = encodeURIComponent(`Olá ${welcomeNotification.name}, a paz do Senhor! Seja muito bem-vindo(a) à nossa família ChurchFlow! Estamos felizes em tê-lo conosco. Qualquer dúvida, conte com a gente! 🙏✨`);
                                    const phone = welcomeNotification.phone?.replace(/\D/g, '') || '';
                                    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                                    setWelcomeNotification(null);
                                }
                            }}
                            className="w-full h-12 rounded-xl btn-premium text-white font-bold shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <Send className="h-4 w-4" />
                            Enviar Mensagem
                        </button>

                        <button
                            onClick={() => setWelcomeNotification(null)}
                            className="w-full h-10 rounded-xl text-marinho/50 font-semibold text-xs hover:text-marinho hover:bg-marinho/5 transition-all"
                        >
                            Agora não, obrigado
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                title="Excluir Membro?"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
                        <Trash2 className="h-10 w-10 text-red-600" strokeWidth={1.5} />
                    </div>

                    <p className="text-charcoal-600 text-sm mb-6 leading-relaxed">
                        Tem certeza que deseja excluir <strong className="text-red-600">{deleteConfirmation?.name}</strong>?
                        <br /><span className="text-xs text-stone-500 mt-1 block">Essa ação não pode ser desfeita.</span>
                    </p>

                    <div className="w-full space-y-3">
                        <button
                            onClick={confirmDelete}
                            className="w-full h-12 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Sim, Excluir
                        </button>

                        <button
                            onClick={() => setDeleteConfirmation(null)}
                            className="w-full h-10 rounded-xl text-stone-500 font-semibold text-xs hover:text-marinho hover:bg-stone-100 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={!!errorNotification}
                onClose={() => setErrorNotification(null)}
                title="Atenção!"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
                        <AlertOctagon className="h-10 w-10 text-orange-600" strokeWidth={1.5} />
                    </div>

                    <p className="text-charcoal-600 text-sm mb-6 leading-relaxed">
                        {errorNotification}
                    </p>

                    <button
                        onClick={() => setErrorNotification(null)}
                        className="w-full h-12 rounded-xl bg-marinho text-white font-bold shadow-lg hover:scale-[1.02] transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </Modal>
        </DashboardLayout >
    );
}
