import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, CheckCircle2, Loader2, Plus,
    Home, MessageCircle, Heart, AlertTriangle, FileText, RotateCcw
} from 'lucide-react';
import { PastoralNote, NOTE_TYPES, deletePastoralNote, updatePastoralNote } from '@/lib/pastoral-engine';
import { cn } from '@/lib/utils';

const TYPE_ICONS = {
    visita: Home,
    aconselhamento: MessageCircle,
    oracao: Heart,
    alerta: AlertTriangle,
    observacao: FileText,
    follow_up: RotateCcw
} as const;

interface PastoralTimelineProps {
    notes: PastoralNote[];
    loading: boolean;
    onAddNote: () => void;
    onRefresh: () => void;
}

export function PastoralTimeline({ notes, loading, onAddNote, onRefresh }: PastoralTimelineProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await deletePastoralNote(id);
        onRefresh();
        setDeletingId(null);
    };

    const toggleComplete = async (note: PastoralNote) => {
        setTogglingId(note.id);
        await updatePastoralNote(note.id, { completed: !note.completed });
        onRefresh();
        setTogglingId(null);
    };

    const relativeDate = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Hoje';
        if (diff === 1) return 'Ontem';
        if (diff < 7) return `${diff} dias atrás`;
        if (diff < 30) return `${Math.floor(diff / 7)} sem atrás`;
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p className="text-[9px] font-black uppercase tracking-widest text-marinho/40">Carregando Pastoral...</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-marinho/10 to-gold/10 flex items-center justify-center">
                        <Heart className="h-3 w-3 text-marinho" />
                    </div>
                    <span className="text-[9px] font-black text-marinho uppercase tracking-widest">Acompanhamento Pastoral</span>
                    {notes.length > 0 && (
                        <span className="text-[8px] font-bold text-marinho/30 bg-marinho/5 px-1.5 py-0.5 rounded-full">{notes.length}</span>
                    )}
                </div>
                <button
                    onClick={onAddNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-marinho text-white rounded-lg text-[8px] font-black uppercase tracking-wider hover:bg-marinho/90 transition-all active:scale-95 shadow-sm"
                >
                    <Plus className="h-3 w-3" />
                    Nota
                </button>
            </div>

            {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-marinho/5 flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-marinho/20" />
                    </div>
                    <p className="text-[10px] font-display font-bold text-marinho italic">Nenhuma nota pastoral</p>
                    <p className="text-[8px] text-marinho/40 mt-1">Registre visitas, aconselhamentos e acompanhamentos aqui.</p>
                </div>
            ) : (
                <div className="relative pl-5 space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-marinho/10 before:via-marinho/5 before:to-transparent">
                    <AnimatePresence>
                        {notes.map((note, idx) => {
                            const config = NOTE_TYPES[note.type];
                            const Icon = TYPE_ICONS[note.type];
                            return (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className={cn(
                                        "relative group",
                                        note.completed && "opacity-50"
                                    )}
                                >
                                    {/* Timeline dot */}
                                    <div className={cn(
                                        "absolute -left-[18px] top-2.5 h-4 w-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm z-10",
                                        note.completed ? "bg-emerald-400" : "bg-marinho"
                                    )}>
                                        {note.completed ? (
                                            <CheckCircle2 className="h-2 w-2 text-white" />
                                        ) : (
                                            <Icon className="h-1.5 w-1.5 text-white" />
                                        )}
                                    </div>

                                    {/* Card */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={cn("px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase border", config.color)}>
                                                    {config.icon} {config.label}
                                                </span>
                                                {note.is_private && (
                                                    <span className="px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase bg-red-50 text-red-400 border border-red-100">🔒 Privado</span>
                                                )}
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">
                                                {relativeDate(note.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-[10px] text-slate-700 font-medium leading-relaxed mb-2">{note.content}</p>

                                        {/* Tags */}
                                        {note.tags && note.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {note.tags.map((tag, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-marinho/5 text-marinho/50 rounded text-[7px] font-bold">#{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Follow-up & Actions */}
                                        <div className="flex items-center justify-between">
                                            {note.follow_up_date && (
                                                <div className={cn(
                                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-bold",
                                                    note.completed ? "bg-emerald-50 text-emerald-500" :
                                                        new Date(note.follow_up_date) < new Date() ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                                                )}>
                                                    <Clock className="h-2.5 w-2.5" />
                                                    Follow-up: {new Date(note.follow_up_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggleComplete(note)}
                                                    disabled={togglingId === note.id}
                                                    className="px-2 py-0.5 text-[7px] font-bold uppercase text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                                >
                                                    {togglingId === note.id ? '...' : note.completed ? 'Reabrir' : '✓ Concluir'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(note.id)}
                                                    disabled={deletingId === note.id}
                                                    className="px-2 py-0.5 text-[7px] font-bold uppercase text-red-400 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    {deletingId === note.id ? '...' : 'Excluir'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
