import { BookOpen, Sparkles, CalendarCheck, ArrowLeft, Loader2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, useMemo, useRef } from 'react';
import { getDailyWord } from '@/lib/daily-word';
import { toBlob } from 'html-to-image';

type StudyView = 'home' | 'bible' | 'chat' | 'plans';

interface StudyLayoutProps {
    currentView: StudyView;
    onViewChange: (view: StudyView) => void;
    children: React.ReactNode;
}

export function StudyLayout({ currentView, onViewChange, children }: StudyLayoutProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const shareCardRef = useRef<HTMLDivElement>(null);
    const dailyWord = useMemo(() => getDailyWord(), []);

    const studyCards = [
        {
            id: 'bible',
            label: 'Bíblia',
            icon: BookOpen,
            description: 'Leia e estude a Palavra',
            color: 'from-marinho to-marinho/80',
            iconBg: 'bg-gold/20',
            iconColor: 'text-gold'
        },
        {
            id: 'chat',
            label: 'Assistente IA',
            icon: Sparkles,
            description: 'Tire dúvidas bíblicas',
            color: 'from-sage to-sage/80',
            iconBg: 'bg-white/20',
            iconColor: 'text-white'
        },
        {
            id: 'plans',
            label: 'Planos de Leitura',
            icon: CalendarCheck,
            description: 'Devocionais diários',
            color: 'from-gold to-gold/80',
            iconBg: 'bg-marinho/20',
            iconColor: 'text-marinho'
        },
    ];

    // Automatic Night Mode logic (18h to 06h) - Copied from JornalContent for consistency
    const isNight = useMemo(() => {
        const hour = new Date().getHours();
        return hour >= 18 || hour < 6;
    }, []);

    const handleShareImage = async () => {
        if (!shareCardRef.current) return;

        setIsGenerating(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 200));

            const blob = await toBlob(shareCardRef.current, {
                cacheBust: true,
                pixelRatio: 2,
            });

            if (!blob) throw new Error('Blob could not be generated');

            const fileName = `Palavra-do-Dia-${new Date().toISOString().split('T')[0]}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Palavra do Dia',
                    text: `Confira a Palavra do Dia: "${dailyWord.text}" — ${dailyWord.reference}`,
                });
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Erro ao compartilhar imagem:', error);
            alert('Erro ao processar imagem para compartilhar.');
        } finally {
            setIsGenerating(false);
        }
    };

    // HOME VIEW
    if (currentView === 'home') {
        return (
            <div className="flex flex-col h-full p-5 bg-cream-50 overflow-auto">
                {/* Header */}
                <header className="mb-4">
                    <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-3">
                        <span className="font-display italic">Estudo</span>
                        <span className="text-gold font-serif italic">&</span>
                        <span className="font-display italic">Palavra</span>
                    </h1>
                    <p className="text-xs text-marinho/50 mt-1 font-medium">
                        Escolha como deseja estudar hoje
                    </p>
                </header>

                {/* Daily Verse Section - NOW ON TOP */}
                <motion.section
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="shrink-0 mb-4"
                >
                    <div ref={shareCardRef} className={cn(
                        "relative rounded-2xl p-5 md:p-6 overflow-hidden shadow-lg transition-all duration-1000",
                        isNight
                            ? "bg-gradient-to-br from-[#020617] via-[#111827] to-[#1e1b4b] ring-1 ring-white/5"
                            : "bg-[#1e1b4b]"
                    )}>
                        {isNight && (
                            <>
                                <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                                <div className="absolute bottom-[-20%] right-0 w-48 h-48 bg-[#d4af37]/5 rounded-full blur-[80px]" />
                            </>
                        )}

                        <div className="absolute top-0 right-0 p-3 opacity-5 font-display font-black text-5xl text-[#d4af37] select-none pointer-events-none">"</div>
                        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-[#d4af37]/10 rounded-full blur-xl" />

                        <div className="relative z-10 flex flex-col items-center text-center gap-3">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37]">
                                    Palavra do Dia
                                </span>
                                <button
                                    onClick={handleShareImage}
                                    disabled={isGenerating}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-300 border border-transparent",
                                        isGenerating ? "bg-white/10 text-white/40 cursor-wait" : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white hover:border-white/10"
                                    )}
                                >
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                                    <span className="text-[9px] font-black uppercase tracking-widest">{isGenerating ? 'Gerando...' : 'Compartilhar'}</span>
                                </button>
                            </div>

                            <motion.h2
                                key={dailyWord.text}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="font-display text-xl md:text-2xl font-bold italic text-white leading-snug max-w-2xl mt-1"
                            >
                                "{dailyWord.text}"
                            </motion.h2>

                            <motion.span
                                key={dailyWord.reference}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="font-serif text-[#d4af37]/80 text-xs tracking-widest uppercase font-bold"
                            >
                                {dailyWord.reference}
                            </motion.span>
                        </div>
                    </div>
                </motion.section>

                {/* Cards Grid - BELOW VERSE */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                    {studyCards.map((card, index) => (
                        <motion.button
                            key={card.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.08 }}
                            onClick={() => onViewChange(card.id as StudyView)}
                            className={cn(
                                "group relative p-5 rounded-2xl bg-gradient-to-br text-white text-left overflow-hidden",
                                "transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]",
                                card.color
                            )}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center mb-3",
                                card.iconBg
                            )}>
                                <card.icon className={cn("h-5 w-5", card.iconColor)} strokeWidth={1.5} />
                            </div>

                            <h3 className="text-lg font-display font-bold italic mb-0.5">
                                {card.label}
                            </h3>
                            <p className="text-xs text-white/70">
                                {card.description}
                            </p>

                            <div className="absolute bottom-3 right-3 h-7 w-7 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                <ArrowLeft className="h-3.5 w-3.5 rotate-180 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </motion.button>
                    ))}
                </motion.div>
            </div>
        );
    }

    // OTHER VIEWS
    return (
        <div className="flex flex-col h-full bg-[#fdfbf7] overflow-hidden">
            <div className="shrink-0 px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-marinho/5 flex items-center gap-3">
                <button
                    onClick={() => onViewChange('home')}
                    className="h-8 w-8 rounded-xl bg-marinho/5 hover:bg-marinho hover:text-white flex items-center justify-center transition-all group"
                >
                    <ArrowLeft className="h-4 w-4 text-marinho group-hover:text-white" />
                </button>
                <span className="text-sm font-bold text-marinho/60">Voltar para Estudo</span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                {children}
            </div>
        </div>
    );
}
