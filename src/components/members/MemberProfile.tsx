import { useState, useEffect } from 'react';
import { Member, getMemberTimeline, updateMemberSystemRole } from '@/lib/supabase-queries';
import { useAuth } from '@/lib/auth';
import {
    User, Mail, Phone, Calendar, MapPin,
    Heart, Users, Clock, Edit3, X,
    MessageCircle,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Shield,
    ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MemberProfileProps {
    member: Member;
    onClose: () => void;
    onEdit: () => void;
}

export function MemberProfile({ member, onClose, onEdit }: MemberProfileProps) {
    const { isAdmin, isPastor } = useAuth();
    const [activeTab, setActiveTab] = useState<'sobre' | 'historico' | 'grupos'>('sobre');
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    // Role Management State
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [updatingRole, setUpdatingRole] = useState(false);
    const [localRole, setLocalRole] = useState(member.church_role || 'Membro');
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        if (activeTab === 'historico') {
            loadTimeline();
        }
    }, [activeTab]);

    const loadTimeline = async () => {
        setLoadingTimeline(true);
        try {
            const { data } = await getMemberTimeline(member.id);
            setTimeline(data || []);
        } finally {
            setLoadingTimeline(false);
        }
    };

    const handleRoleChange = async (newRole: string) => {
        setUpdatingRole(true);
        try {
            const { error, warning } = await updateMemberSystemRole(member.id, newRole);

            if (error) {
                console.error("Erro ao atualizar permissão:", error);
                alert("Erro ao atualizar: " + error.message);
                return;
            }

            if (warning) {
                console.warn(warning);
            }

            // Update local visual state
            const roleDisplayMap: Record<string, string> = {
                'admin': 'Admin',
                'pastor_chefe': 'Pastor Chefe',
                'pastor_lider': 'Pastor Líder',
                'lider': 'Líder',
                'financeiro': 'Financeiro',
                'membro': 'Membro',
                'visitante': 'Visitante'
            };
            setLocalRole(roleDisplayMap[newRole] || newRole);
            setShowRoleMenu(false);

            // Show success confirmation
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);

        } finally {
            setUpdatingRole(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Não informado';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const openWhatsApp = (phone: string) => {
        const cleanedPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
        window.open(`https://wa.me/${finalPhone}`, '_blank');
    };

    return (
        <div className="relative flex flex-col h-full bg-white overflow-hidden">
            {/* Success Toast */}
            <AnimatePresence>
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 20 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
                    >
                        <div className="bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-auto backdrop-blur-sm bg-opacity-90 ring-2 ring-white/20">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wide">Permissão Atualizada!</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fixed Header Banner */}
            <div className="relative h-20 bg-marinho shrink-0">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)]" />
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md group"
                >
                    <X className="h-4 w-4 transform group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            {/* Main Header Area - Fixed Overlap and Alignment */}
            <div className="relative px-6 pb-3 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-6 -mt-8 relative z-10">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative shrink-0"
                    >
                        <div className="h-20 w-20 rounded-2xl border-4 border-white bg-slate-100 shadow-xl flex items-center justify-center overflow-hidden">
                            {member.photo_url ? (
                                <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="bg-slate-50 w-full h-full flex items-center justify-center">
                                    <User className="h-10 w-10 text-slate-300" />
                                </div>
                            )}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white ${member.status === 'membro' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} />
                    </motion.div>

                    <div className="flex-1 min-w-0 pt-6 flex justify-between items-center">
                        <div className="min-w-0">
                            <h2 className="text-xl font-black text-marinho leading-none truncate font-display italic">
                                {member.full_name}
                            </h2>
                            <div className="flex gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-marinho/5 text-marinho uppercase border border-marinho/10">
                                    {member.church_role || 'Membro'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${member.status === 'membro' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                    {member.status}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-marinho text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-marinho/90 transition-all shadow-lg shadow-marinho/10 active:scale-95"
                        >
                            <Edit3 className="h-3.5 w-3.5" />
                            Editar
                        </button>
                    </div>
                </div>
            </div>

            {/* Tight Tab Nav */}
            <div className="px-6 bg-white border-b border-slate-100 shrink-0">
                <div className="flex gap-6">
                    {['sobre', 'historico', 'grupos'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`relative pb-3 pt-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'text-marinho' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div layoutId="tabBadge" className="absolute bottom-0 left-0 right-0 h-0.5 bg-marinho rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Multi-Column Content Area */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/30">
                <AnimatePresence mode="wait">
                    {activeTab === 'sobre' && (
                        <motion.div
                            key="sobre"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            {/* Column 1: Core Details */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <p className="text-[7px] text-slate-400 font-black uppercase mb-0.5">Nascimento</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3 w-3 text-blue-500" />
                                            <p className="text-[11px] font-bold text-marinho">{formatDate(member.birth_date)}</p>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <p className="text-[7px] text-slate-400 font-black uppercase mb-0.5">Entrada</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3 text-emerald-500" />
                                            <p className="text-[11px] font-bold text-marinho">{formatDate(member.joining_date)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-900/5 rounded-xl border border-slate-900/5 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[7px] text-slate-400 font-black uppercase">Gênero</p>
                                        <p className="text-[10px] text-marinho font-bold">{member.gender || 'Não informado'}</p>
                                    </div>
                                    <div className="h-px bg-slate-900/5" />
                                    <div className="flex justify-between items-center">
                                        <p className="text-[7px] text-slate-400 font-black uppercase">Ministério</p>
                                        <p className="text-[10px] text-marinho font-bold truncate ml-2 text-right">{member.ministry || 'Sem ministério'}</p>
                                    </div>
                                </div>

                                {member.notes && (
                                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                        <p className="text-[7px] text-amber-600 font-black uppercase mb-1">Observações</p>
                                        <p className="text-[10px] text-amber-900 leading-tight italic">"{member.notes}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Column 2: Contact Info */}
                            <div className="space-y-3">
                                <h3 className="text-[8px] font-black text-marinho/30 uppercase tracking-widest pl-1">Contato</h3>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100">
                                        <div className="h-6 w-6 bg-blue-50 rounded flex items-center justify-center text-blue-500"><Mail className="h-3 w-3" /></div>
                                        <span className={cn("text-[10px] font-medium truncate", member.email ? "text-slate-600" : "text-slate-300 italic")}>{member.email || '+ Adicionar e-mail'}</span>
                                    </div>
                                    <div
                                        onClick={() => member.phone && openWhatsApp(member.phone)}
                                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-6 w-6 bg-emerald-50 rounded flex items-center justify-center text-emerald-500"><Phone className="h-3 w-3" /></div>
                                            <span className={cn("text-[10px] font-medium font-mono", member.phone ? "text-slate-600" : "text-slate-300 italic")}>{member.phone || '+ Adicionar telefone'}</span>
                                        </div>
                                        {member.phone && <MessageCircle className="h-3 w-3 text-emerald-500" />}
                                    </div>
                                    <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100">
                                        <div className="h-6 w-6 bg-amber-50 rounded flex items-center justify-center text-amber-500"><MapPin className="h-3 w-3" /></div>
                                        <span className={cn("text-[10px] font-medium truncate", member.address ? "text-slate-600" : "text-slate-300 italic")}>{member.address || '+ Adicionar endereço'}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'historico' && (
                        <div className="space-y-4 py-2">
                            {loadingTimeline ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#1e1b4b]/40">Carregando Histórico...</p>
                                </div>
                            ) : timeline.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 opacity-60">
                                    <Clock className="h-6 w-6 mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">Nenhuma atividade registrada</p>
                                </div>
                            ) : (
                                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                    {timeline.map((item, idx) => (
                                        <motion.div
                                            key={item.id + idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="relative"
                                        >
                                            <div className={cn(
                                                "absolute -left-[23px] top-1 h-5 w-5 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10",
                                                item.type === 'registration' ? "bg-blue-500" : "bg-emerald-500"
                                            )}>
                                                {item.type === 'registration' ? <Calendar className="h-2 w-2 text-white" /> : <Clock className="h-2 w-2 text-white" />}
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-[10px] font-black text-marinho uppercase tracking-tight">{item.title}</h4>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                        {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-600 font-medium mb-2">{item.description}</p>
                                                <div className="flex items-center gap-1.5">
                                                    {item.status === 'confirmado' ? (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md">
                                                            <CheckCircle2 className="h-2.5 w-2.5" />
                                                            <span className="text-[7px] font-black uppercase">Confirmado</span>
                                                        </div>
                                                    ) : item.status === 'cancelado' || item.status === 'recusado' ? (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md">
                                                            <AlertCircle className="h-2.5 w-2.5" />
                                                            <span className="text-[7px] font-black uppercase">{item.status}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            <span className="text-[7px] font-black uppercase font-bold">Pendente</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'grupos' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-xl border border-slate-100">
                                <p className="text-[7px] text-marinho font-black uppercase mb-2">Pequeno Grupo</p>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-marinho/40" />
                                    <p className="text-xs font-bold text-marinho">{member.groups?.name || 'Inativo'}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-100">
                                <p className="text-[7px] text-pink-500 font-black uppercase mb-2">Discipulado</p>
                                <div className="flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-pink-300" />
                                    <p className="text-xs font-bold text-marinho">{member.discipled_by?.full_name || 'Individual'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Minimal ID Footer & System Actions */}
            <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0 relative">

                <div className="flex items-center gap-2">
                    {/* System Role Manager (Admin/Pastor Only) */}
                    {(isAdmin || isPastor) && (
                        <div className="relative">
                            <button
                                onClick={() => setShowRoleMenu(!showRoleMenu)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                                    showRoleMenu ? "bg-marinho text-white shadow-md" : "bg-white text-slate-500 hover:text-marinho hover:bg-slate-50 border border-slate-200"
                                )}
                                title="Alterar nível de acesso"
                            >
                                <Shield className="h-3.5 w-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-wider">
                                    {updatingRole ? 'Atualizando...' : (localRole || 'Acesso')}
                                </span>
                            </button>

                            {/* Role Select Menu */}
                            <AnimatePresence>
                                {showRoleMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full right-0 mb-3 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30"
                                    >
                                        <div className="bg-marinho px-4 py-3 border-b border-white/10">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Definir Autonomia</p>
                                            <p className="text-[8px] text-white/50 mt-0.5">Isso altera o que o usuário pode ver no sistema.</p>
                                        </div>
                                        <div className="p-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                            {[
                                                { id: 'membro', label: 'Membro', icon: User, color: 'text-slate-400', desc: 'Acesso básico ao app' },
                                                { id: 'lider', label: 'Líder', icon: Users, color: 'text-indigo-500', desc: 'Gestão de pequenos grupos' },
                                                { id: 'financeiro', label: 'Financeiro', icon: Shield, color: 'text-emerald-500', desc: 'Gestão de caixa e tesouraria' },
                                                { id: 'pastor_lider', label: 'Pastor Líder', icon: Heart, color: 'text-marinho', desc: 'Visão de rede e supervisão' },
                                                { id: 'pastor_chefe', label: 'Pastor Chefe', icon: Heart, color: 'text-marinho', desc: 'Acesso total à igreja' },
                                                ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: ShieldAlert, color: 'text-amber-600', desc: 'Super usuário do sistema' }] : [])
                                            ].map((role) => (
                                                <button
                                                    key={role.id}
                                                    disabled={updatingRole}
                                                    onClick={() => handleRoleChange(role.id)}
                                                    className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-lg group transition-colors disabled:opacity-50"
                                                >
                                                    <div className={cn("mt-0.5 p-1.5 rounded-md bg-slate-50 group-hover:bg-white border border-slate-100 group-hover:border-slate-200 transition-colors", role.color)}>
                                                        <role.icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-700 group-hover:text-marinho transition-colors">{role.label}</span>
                                                            {localRole?.toLowerCase() === role.label.toLowerCase() && (
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] font-medium text-slate-400 leading-tight mt-0.5">{role.desc}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        {updatingRole && (
                                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-marinho" />
                                                <span className="text-[9px] font-bold text-marinho uppercase tracking-wider">Salvando...</span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="h-4 w-px bg-slate-200 mx-1" />

                    <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[7px] font-black text-emerald-600 uppercase">Sistema Ativo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
