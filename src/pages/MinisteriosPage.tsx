import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Users, Plus, Loader2, Music, Heart,
    BookOpen, Coffee, Shield, Search, Trash2, UsersRound, X, Check
} from 'lucide-react';
import {
    getMinistries, createMinistry, updateMinistry, deleteMinistry, Ministry, getMinistryMembers,
    getMembers, addMemberToMinistry, removeMemberFromMinistry, Member
} from '@/lib/supabase-queries';
import { Modal } from '@/components/ui/Modal';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';

// Church ID padrão - REMOVED
// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001';

// Mapeamento de ícones por nome (simples)
const getIconForMinistry = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('louvor') || n.includes('musica')) return <Music className="h-5 w-5" />;
    if (n.includes('infantil') || n.includes('kids')) return <Heart className="h-5 w-5" />;
    if (n.includes('ensino') || n.includes('ebs')) return <BookOpen className="h-5 w-5" />;
    if (n.includes('recepcao') || n.includes('boas')) return <Coffee className="h-5 w-5" />;
    if (n.includes('seguranca') || n.includes('diaconia')) return <Shield className="h-5 w-5" />;
    return <Users className="h-5 w-5" />; // Default
};

export function MinisteriosPage() {
    const { profile } = useAuth();
    const churchId = profile?.church_id;
    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Member Selection State
    const [showMemberSelect, setShowMemberSelect] = useState(false);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Form State
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        leader: '',
        next_event: '',
        members_count: 0
    });
    // State for members list in modal
    const [minMembers, setMinMembers] = useState<{ id: string, full_name: string, photo_url?: string }[]>([]);

    const [ministryToDelete, setMinistryToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [churchId]);

    const loadData = async () => {
        if (!churchId) return;
        setLoading(true);
        try {
            const { data: ministriesData } = await getMinistries(churchId);
            setMinistries(ministriesData || []);

            const { data: membersData } = await getMembers(churchId);
            setAllMembers(membersData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMinistryMembers = async (ministryId: string) => {
        const { data } = await getMinistryMembers(ministryId);
        setMinMembers(data || []);
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ name: '', description: '', leader: '', next_event: '', members_count: 0 });
        setMinMembers([]);
        setShowModal(true);
    };

    const handleEdit = async (ministry: Ministry) => {
        setEditingId(ministry.id);
        setFormData({
            name: ministry.name,
            description: ministry.description || '',
            leader: ministry.leader || '',
            next_event: ministry.next_event || '',
            members_count: ministry.members_count || 0
        });

        // Fetch members
        await loadMinistryMembers(ministry.id);
        setShowModal(true);
    };

    const handleOpenMemberSelect = async () => {
        // Only load if not loaded or if just created
        if (allMembers.length === 0) {
            if (!churchId) return;
            setLoadingMembers(true);
            const { data } = await getMembers(churchId);
            setAllMembers(data || []);
            setLoadingMembers(false);
        }
        setShowMemberSelect(true);
    };

    const handleAddMember = async (memberId: string) => {
        if (!editingId) return; // Can only add to existing ministry

        await addMemberToMinistry(memberId, editingId);
        await loadMinistryMembers(editingId);
        await loadData(); // Refresh main list to update members_count
        setShowMemberSelect(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!editingId) return;

        await removeMemberFromMinistry(memberId, editingId);
        await loadMinistryMembers(editingId);
        await loadData(); // Refresh main list to update members_count
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        let error;

        if (editingId) {
            // Update
            const res = await updateMinistry(editingId, {
                name: formData.name,
                description: formData.description,
                leader: formData.leader,
                next_event: formData.next_event,
                members_count: minMembers.length // Auto-update count based on list
            });
            error = res.error;
        } else {
            // Create
            if (!churchId) return;
            const res = await createMinistry({
                church_id: churchId,
                name: formData.name,
                description: formData.description,
                leader: formData.leader,
                next_event: formData.next_event,
                members_count: 0 // Start with 0
            });
            error = res.error;
        }

        if (error) {
            console.error('Error saving ministry:', error);
            alert('Erro ao salvar ministério. Verifique se as colunas foram criadas no banco.');
        } else {
            await loadData();
            setShowModal(false);
            setFormData({ name: '', description: '', leader: '', next_event: '', members_count: 0 });
        }
        setSubmitting(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening card
        setMinistryToDelete(id);
    };

    const confirmDelete = async () => {
        if (!ministryToDelete) return;

        try {
            const { error } = await deleteMinistry(ministryToDelete);
            if (error) {
                alert('Erro ao excluir ministério.');
            } else {
                await loadData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setMinistryToDelete(null);
        }
    };

    const filtered = ministries.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAllMembers = allMembers.filter(m =>
        m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-2">
                {/* Balanced Glass Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[28px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="space-y-0.5 relative z-10">
                        <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                            <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">Gestão de Liderança</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            Ministérios <span className="font-serif italic text-gold font-normal text-3xl">&</span> Equipes
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-lg">
                            Gestão de Liderança e Escalas Voluntárias
                        </p>
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                        <div className="relative group/search flex-1 md:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/search:text-gold transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar ministério..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-marinho placeholder:text-slate-400 focus:ring-2 focus:ring-gold/10 focus:border-gold/30 transition-all outline-none shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="h-11 px-6 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4 text-gold" />
                            <span className="hidden sm:inline">Novo</span>
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex items-center justify-center flex-1">
                        <Loader2 className="h-10 w-10 animate-spin text-gold" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 overflow-y-auto pb-12 px-1 custom-scrollbar">
                        {filtered.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20">
                                <div className="w-16 h-16 bg-gold/10 rounded-3xl flex items-center justify-center mb-4 border border-gold/20 shadow-sm">
                                    <Users className="h-8 w-8 text-gold" />
                                </div>
                                <p className="text-sm font-bold text-marinho mb-1">Crie seu primeiro ministério</p>
                                <p className="text-[11px] text-slate-400 max-w-xs text-center">
                                    Organize suas equipes de louvor, mídia, recepção e outras áreas de serviço.
                                </p>
                            </div>
                        )}
                        {filtered.map(ministry => (
                            <div
                                key={ministry.id}
                                onClick={() => handleEdit(ministry)}
                                className="group bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:shadow-marinho/5 hover:border-gold/30 transition-all cursor-pointer relative overflow-hidden"
                            >
                                {/* Decorative Gradient Orb */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-marinho/5 to-transparent rounded-bl-full -mr-8 -mt-8 group-hover:from-gold/10 transition-colors duration-500" />

                                <div className="flex items-start justify-between mb-3 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-50 to-white flex items-center justify-center text-marinho shadow-sm border border-slate-100 group-hover:scale-105 group-hover:border-gold/20 transition-all duration-300">
                                            {getIconForMinistry(ministry.name)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-serif font-bold text-marinho group-hover:text-marinho/80 transition-colors leading-tight">
                                                {ministry.name}
                                            </h3>
                                            {ministry.description && (
                                                <p className="text-[10px] text-slate-400 line-clamp-1 font-medium mt-0.5">
                                                    {ministry.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(ministry.id, e)}
                                        className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-50 relative z-10">
                                    <div className="flex items-center gap-2">
                                        {(ministry.members_count || 0) === 0 ? (
                                            <span className="text-[9px] font-bold text-gold bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                <Plus className="h-3 w-3" />
                                                Adicionar
                                            </span>
                                        ) : (
                                            <>
                                                <div className="flex -space-x-1.5">
                                                    {[...Array(Math.min(3, ministry.members_count || 0))].map((_, i) => (
                                                        <div key={i} className="h-5 w-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[7px] text-slate-400 font-bold overflow-hidden">
                                                            <Users className="h-2.5 w-2.5" />
                                                        </div>
                                                    ))}
                                                    {(ministry.members_count || 0) > 3 && (
                                                        <div className="h-5 w-5 rounded-full bg-marinho text-white border border-white flex items-center justify-center text-[7px] font-bold z-10">
                                                            +{ministry.members_count! - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                    {ministry.members_count === 1 ? '1 Membro' : `${ministry.members_count} Membros`}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Líder</p>
                                        <p className="text-[10px] font-bold text-marinho truncate max-w-[80px]">{ministry.leader || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Ministério" : "Novo Ministério"}>
                <form onSubmit={handleSave} className="p-0">
                    <div className="p-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest pl-1">Nome do Ministério</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-9 pl-3 text-xs bg-slate-50 text-marinho font-bold border-0 rounded-xl focus:ring-1 focus:ring-marinho/20 transition-all placeholder:text-marinho/20 shadow-inner"
                                placeholder="Ex: Louvor e Adoração"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-0.5">
                                <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest pl-1">Líder</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.leader}
                                    onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                                    className="w-full h-9 pl-3 text-xs bg-slate-50 text-slate-700 font-medium border-0 rounded-xl focus:ring-1 focus:ring-marinho/20 shadow-inner"
                                    placeholder="Nome do líder"
                                />
                            </div>
                            <div className="space-y-0.5 relative">
                                <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest pl-1">Próximo Evento</label>
                                <CustomDatePicker
                                    value={formData.next_event}
                                    onChange={(date) => setFormData({ ...formData, next_event: date })}
                                    placeholder="Data"
                                    className="w-full h-9 pl-3 pr-2 text-xs bg-slate-50 text-slate-700 font-medium border-0 rounded-xl focus:ring-1 focus:ring-marinho/20 shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-dashed border-marinho/10">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-[10px] font-black text-marinho/80 uppercase tracking-widest flex items-center gap-1.5">
                                    <Users className="h-3 w-3" />
                                    Membros
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="bg-marinho/10 text-marinho border border-marinho/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                        {minMembers.length}
                                    </span>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={handleOpenMemberSelect}
                                            className="flex items-center gap-1 bg-marinho text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-marinho/90 transition-colors shadow-sm"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Adicionar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-2 min-h-[60px] max-h-32 overflow-y-auto custom-scrollbar shadow-inner">
                                {minMembers.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {minMembers.map((member) => (
                                            <div key={member.id} className="group/card flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200/60 shadow-sm hover:border-marinho/20 transition-colors relative">
                                                <div className="h-6 w-6 rounded-md bg-slate-100 border border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                                    {member.photo_url ? (
                                                        <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Users className="h-3 w-3 text-slate-400" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-700 truncate leading-tight flex-1">{member.full_name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    <X className="h-2 w-2" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center mb-2 border border-gold/20">
                                            <UsersRound className="h-5 w-5 text-gold" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium text-center">
                                            {editingId ? "Nenhum membro adicionado" : "Salve para adicionar membros"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 pb-4 pt-0">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-10 btn-premium flex items-center justify-center gap-2 shadow-sm text-[10px] font-black tracking-widest uppercase hover:scale-[1.01] active:scale-95 transition-all"
                        >
                            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            <span>{editingId ? 'Salvar Alterações' : 'Criar Ministério'}</span>
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showMemberSelect} onClose={() => setShowMemberSelect(false)} title="Adicionar Membro">
                <div className="p-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar membro..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="w-full h-10 pl-9 text-xs bg-slate-50 border-0 rounded-xl focus:ring-1 focus:ring-marinho/20 font-medium"
                        />
                    </div>

                    <div className="h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {loadingMembers ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-marinho/30" /></div>
                        ) : filteredAllMembers.filter(m => !minMembers.some(existing => existing.id === m.id)).length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-4">Nenhum membro disponível.</p>
                        ) : (
                            filteredAllMembers
                                .filter(m => !minMembers.some(existing => existing.id === m.id))
                                .map(member => (
                                    <button
                                        key={member.id}
                                        onClick={() => handleAddMember(member.id)}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-white shadow-sm">
                                            {member.photo_url ? (
                                                <img src={member.photo_url} className="h-full w-full object-cover" />
                                            ) : (
                                                <Users className="h-4 w-4 m-2 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-700 group-hover:text-marinho">{member.full_name}</p>
                                            <p className="text-[10px] text-slate-400">{member.church_role || 'Membro'}</p>
                                        </div>
                                        <Plus className="h-4 w-4 ml-auto text-slate-300 group-hover:text-marinho" />
                                    </button>
                                ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!ministryToDelete} onClose={() => setMinistryToDelete(null)} title="Excluir Ministério">
                <div className="p-4 space-y-4">
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-2 animate-pulse">
                            <Trash2 className="h-6 w-6 text-red-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                            Tem certeza que deseja excluir este ministério?
                        </p>
                        <p className="text-xs text-slate-500 mx-auto leading-relaxed">
                            Esta ação removerá o ministério e desvinculará todos os membros.<br />Esta ação não pode ser desfeita.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={() => setMinistryToDelete(null)}
                            className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="flex-1 h-10 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors shadow-sm uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
