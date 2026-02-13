import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Calendar, Tag, Lock, Loader2 } from 'lucide-react';
import { createPastoralNote, NOTE_TYPES } from '@/lib/pastoral-engine';
import { cn } from '@/lib/utils';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    authorId: string;
    churchId: string;
    onSuccess: () => void;
}

const SUGGESTED_TAGS = ['urgente', 'crise', 'casamento', 'saúde', 'financeiro', 'família', 'espiritual', 'integração', 'batismo', 'discipulado'];

export function AddNoteModal({ isOpen, onClose, memberId, memberName, authorId, churchId, onSuccess }: AddNoteModalProps) {
    const [type, setType] = useState<string>('observacao');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [followUpDate, setFollowUpDate] = useState('');
    const [saving, setSaving] = useState(false);

    const reset = () => {
        setType('observacao');
        setContent('');
        setTags([]);
        setCustomTag('');
        setIsPrivate(false);
        setFollowUpDate('');
    };

    const handleSave = async () => {
        if (!content.trim()) return;
        setSaving(true);
        try {
            await createPastoralNote({
                member_id: memberId,
                author_id: authorId,
                church_id: churchId,
                type,
                content: content.trim(),
                tags,
                is_private: isPrivate,
                follow_up_date: followUpDate || null
            });
            reset();
            onSuccess();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const toggleTag = (tag: string) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const addCustomTag = () => {
        const trimmed = customTag.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            setTags(prev => [...prev, trimmed]);
            setCustomTag('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
            >
                {/* Header */}
                <div className="bg-marinho px-5 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Nova Nota Pastoral</h3>
                        <p className="text-sm font-display font-bold text-white italic mt-0.5">{memberName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Type selector */}
                    <div>
                        <label className="text-[8px] font-black text-marinho/40 uppercase tracking-widest block mb-2">Tipo</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {Object.entries(NOTE_TYPES).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setType(key)}
                                    className={cn(
                                        "px-2 py-2 rounded-lg text-[9px] font-bold border transition-all text-center",
                                        type === key
                                            ? "bg-marinho text-white border-marinho shadow-md"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-marinho/30"
                                    )}
                                >
                                    {config.icon} {config.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="text-[8px] font-black text-marinho/40 uppercase tracking-widest block mb-2">Descrição</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="O que aconteceu? O que foi conversado?"
                            rows={4}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:border-marinho focus:ring-1 focus:ring-marinho/20 outline-none resize-none transition-all"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="text-[8px] font-black text-marinho/40 uppercase tracking-widest block mb-2">
                            <Tag className="h-2.5 w-2.5 inline mr-1" />Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {SUGGESTED_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={cn(
                                        "px-2 py-1 rounded-lg text-[8px] font-bold transition-all border",
                                        tags.includes(tag)
                                            ? "bg-marinho text-white border-marinho"
                                            : "bg-slate-50 text-slate-400 border-slate-100 hover:border-marinho/20 hover:text-marinho"
                                    )}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                                placeholder="Tag custom..."
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] focus:border-marinho outline-none"
                            />
                            <button onClick={addCustomTag} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-colors">
                                +
                            </button>
                        </div>
                    </div>

                    {/* Follow-up date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[8px] font-black text-marinho/40 uppercase tracking-widest block mb-2">
                                <Calendar className="h-2.5 w-2.5 inline mr-1" />Follow-up
                            </label>
                            <input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] text-slate-600 focus:border-marinho outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[8px] font-black text-marinho/40 uppercase tracking-widest block mb-2">
                                <Lock className="h-2.5 w-2.5 inline mr-1" />Privacidade
                            </label>
                            <button
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-[10px] font-bold transition-all",
                                    isPrivate
                                        ? "bg-red-50 border-red-200 text-red-600"
                                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                )}
                            >
                                {isPrivate ? '🔒 Apenas eu' : '👥 Visível para liderança'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !content.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-marinho text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-marinho/90 transition-all shadow-lg shadow-marinho/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'Salvando...' : 'Salvar Nota'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
