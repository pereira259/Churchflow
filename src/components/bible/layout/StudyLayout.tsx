import { BookOpen, Sparkles, CalendarCheck, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import React from 'react';
type StudyView = 'home' | 'bible' | 'chat' | 'plans';

interface StudyLayoutProps {
    currentView: StudyView;
    onViewChange: (view: StudyView) => void;
    children: React.ReactNode;
}

export function StudyLayout({ currentView, onViewChange, children }: StudyLayoutProps) {

    const studyCards = [
        {
            id: 'bible',
            label: 'Bíblia Sagrada',
            icon: BookOpen,
            description: 'Mergulhe nas Escrituras com ferramentas de estudo profundo.',
            color: 'from-marinho via-marinho/95 to-marinho/90',
            iconBg: 'bg-gold/20',
            iconColor: 'text-gold',
            accent: 'gold',
            pattern: 'radial-gradient(circle at 0% 0%, rgba(201, 169, 98, 0.15) 0%, transparent 50%)'
        },
        {
            id: 'chat',
            label: 'Assistente Teológico',
            icon: Sparkles,
            description: 'Tire dúvidas e explore contextos bíblicos com nossa IA.',
            color: 'from-sage via-sage/95 to-sage/90',
            iconBg: 'bg-white/20',
            iconColor: 'text-white',
            accent: 'white',
            pattern: 'radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)'
        },
        {
            id: 'plans',
            label: 'Planos de Leitura',
            icon: CalendarCheck,
            description: 'Organize sua jornada de fé com devocionais guiados.',
            color: 'from-gold via-gold/95 to-gold/90',
            iconBg: 'bg-marinho/20',
            iconColor: 'text-marinho',
            accent: 'marinho',
            pattern: 'radial-gradient(circle at 50% 0%, rgba(30, 27, 75, 0.1) 0%, transparent 70%)'
        },
    ];

    // HOME VIEW
    if (currentView === 'home') {
        return (
            <div className="flex flex-col h-full bg-[#fdfbf7] relative overflow-hidden custom-scrollbar">
                {/* Divine Light Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-96 bg-gradient-to-b from-gold/15 via-gold/5 to-transparent blur-3xl pointer-events-none opacity-50" />

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-marinho/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

                <div className="flex-1 flex flex-col p-6 md:p-10 relative z-10 max-w-7xl mx-auto w-full">
                    {/* Header */}
                    <header className="mb-10 md:mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-px w-12 bg-gold/30 hidden md:block" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/80">Sanctuarium</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-marinho flex items-baseline gap-3">
                                <span className="font-display italic">Estudo</span>
                                <span className="text-gold font-serif italic text-3xl md:text-5xl">&</span>
                                <span className="font-display italic">Palavra</span>
                            </h1>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <p className="text-sm md:text-lg text-marinho/50 font-medium max-w-xl leading-relaxed italic border-l-2 border-gold/20 pl-4">
                                    "A exposição das tuas palavras concede luz e dá entendimento aos simples."
                                </p>
                                <span className="text-[10px] font-bold text-gold/60 uppercase tracking-widest">— Salmos 119:130</span>
                            </div>
                        </motion.div>
                    </header>

                    {/* Cards Grid */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 flex-1 content-start"
                    >
                        {studyCards.map((card, index) => (
                            <motion.button
                                key={card.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: 0.2 + index * 0.15,
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 20
                                }}
                                onClick={() => onViewChange(card.id as StudyView)}
                                className={cn(
                                    "group relative aspect-[4/5] md:aspect-auto md:h-[420px] p-8 rounded-[2.5rem] bg-gradient-to-br text-white text-left",
                                    "transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2 active:scale-95",
                                    "border border-white/10 overflow-hidden",
                                    card.color
                                )}
                            >
                                {/* Patterns & Glows */}
                                <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700" style={{ background: card.pattern }} />
                                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-700" />

                                <div className="relative z-10 h-full flex flex-col">
                                    {/* Icon Container with Glassmorphism */}
                                    <div className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center mb-8",
                                        "backdrop-blur-md shadow-lg border border-white/20",
                                        card.iconBg
                                    )}>
                                        <card.icon
                                            className={cn("h-8 w-8 transition-transform duration-500 group-hover:scale-110", card.iconColor)}
                                            strokeWidth={1.5}
                                        />
                                    </div>

                                    {/* Text Content */}
                                    <div className="mt-auto">
                                        <h3 className="text-2xl md:text-3xl font-display font-bold italic mb-3 leading-tight group-hover:translate-x-1 transition-transform duration-300">
                                            {card.label}
                                        </h3>
                                        <p className="text-sm md:text-base text-white/70 font-medium leading-relaxed mb-8 max-w-[200px]">
                                            {card.description}
                                        </p>

                                        {/* Action Link */}
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                                            <span>Começar agora</span>
                                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                                                <ArrowLeft className="h-4 w-4 rotate-180" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Hover Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </motion.button>
                        ))}
                    </motion.div>

                    {/* Footer Info */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-12 md:mt-20 flex items-center justify-center gap-8 opacity-40"
                    >
                        <div className="h-px flex-1 bg-marinho/10" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-marinho whitespace-nowrap">Conectados pela Palavra</span>
                        <div className="h-px flex-1 bg-marinho/10" />
                    </motion.div>
                </div>
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
