import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, QrCode, Music, ArrowRight, X, CheckCircle2, Play } from 'lucide-react';
import { useState, useEffect } from 'react';

import { PageIntroConfig } from '@/lib/page-intros';

interface WelcomePortalProps {
    isOpen?: boolean;
    onClose: () => void;
    onStart?: () => void;
    introConfig?: PageIntroConfig | { title: string; description: string; steps: any[] };
}

export function WelcomePortal({ isOpen = true, onClose, onStart }: WelcomePortalProps) {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 100 }); // % coordinates relative to container
    const [isDemoPlaying, setIsDemoPlaying] = useState(true);

    // Auto-Play Sequence
    useEffect(() => {
        if (!isOpen || !isDemoPlaying) return;

        const sequence = async () => {
            // Initial Delay
            await new Promise(r => setTimeout(r, 800));

            // Step 1: Move to Card 1 (Escalas)
            setCursorPos({ x: 50, y: 45 });
            await new Promise(r => setTimeout(r, 600)); // Travel time
            setHoveredCard(0);
            await new Promise(r => setTimeout(r, 1500)); // Read time

            // Step 2: Move to Card 2 (Check-in)
            setCursorPos({ x: 50, y: 62 });
            await new Promise(r => setTimeout(r, 600));
            setHoveredCard(1);
            await new Promise(r => setTimeout(r, 1500));

            // Step 3: Move to Card 3 (Repertory)
            setCursorPos({ x: 50, y: 78 });
            await new Promise(r => setTimeout(r, 600));
            setHoveredCard(2);
            await new Promise(r => setTimeout(r, 1500));

            // Step 4: Move to CTA
            setCursorPos({ x: 75, y: 92 });
            setHoveredCard(null);
            await new Promise(r => setTimeout(r, 800));

            // Loop or End? Let's stop at the button to encourage click
            // setIsDemoPlaying(false); 
        };

        sequence();

        return () => setIsDemoPlaying(false);
    }, [isOpen]);

    // Human Interaction Override
    const handleHumanInteraction = () => {
        setIsDemoPlaying(false);
        setHoveredCard(null);
    };

    const features = [
        {
            id: 1,
            icon: Calendar,
            title: "Escalas",
            description: "Nunca mais perca datas.",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            animation: (isActive: boolean) => (
                <motion.div
                    animate={isActive ? { rotate: [0, -10, 10, -10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                >
                    <Calendar className="w-6 h-6" />
                </motion.div>
            )
        },
        {
            id: 2,
            icon: QrCode,
            title: "Check-in",
            description: "Entrada rápida via QR Code.",
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20",
            animation: (isActive: boolean) => (
                <div className="relative">
                    <QrCode className="w-6 h-6" />
                    {isActive && (
                        <motion.div
                            initial={{ top: 0, opacity: 0.8 }}
                            animate={{ top: "100%", opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                        />
                    )}
                </div>
            )
        },
        {
            id: 3,
            icon: Music,
            title: "Repertório",
            description: "Cifras e letras integradas.",
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
            animation: (isActive: boolean) => (
                <motion.div
                    animate={isActive ? { y: [0, -4, 0] } : {}}
                    transition={{ duration: 0.6, repeat: Infinity }}
                >
                    <Music className="w-6 h-6" />
                </motion.div>
            )
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md z-[200]"
                    />

                    {/* Modal Container */}
                    <div
                        className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none"
                        onMouseMove={handleHumanInteraction}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="pointer-events-auto relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/40 flex flex-col max-h-[85vh]"
                        >
                            {/* Cinematic Overlay - Mini Ghost Cursor */}
                            {isDemoPlaying && (
                                <motion.div
                                    className="absolute z-50 pointer-events-none drop-shadow-2xl"
                                    animate={{
                                        left: `${cursorPos.x}%`,
                                        top: `${cursorPos.y}%`
                                    }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="#1e1b4b" stroke="white" strokeWidth="2" />
                                    </svg>
                                    <div className="absolute -bottom-6 left-4 bg-[#1e1b4b] text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap opacity-80">
                                        Demonstração
                                    </div>
                                </motion.div>
                            )}

                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            {/* Scrollable Content */}
                            <div className="relative overflow-y-auto custom-scrollbar p-8">
                                <button
                                    onClick={onClose}
                                    className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors z-10"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Header */}
                                <div className="text-center mb-8 pt-2">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/10 text-[#d4af37] text-[9px] font-black uppercase tracking-widest mb-3">
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        <span>Tour Rápido</span>
                                    </div>
                                    <h2 className="text-2xl font-display font-bold italic text-[#1e1b4b] mb-1">
                                        Bem-vindo
                                    </h2>
                                    <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-xs mx-auto">
                                        Sua jornada ministerial começa aqui.
                                    </p>
                                </div>

                                {/* Cards */}
                                <div className="space-y-3 mb-8">
                                    {features.map((feature, idx) => (
                                        <motion.div
                                            key={feature.id}
                                            onHoverStart={() => {
                                                handleHumanInteraction(); // Stop demo on hover
                                                setHoveredCard(idx);
                                            }}
                                            onHoverEnd={() => setHoveredCard(null)}
                                            animate={{
                                                scale: hoveredCard === idx ? 1.05 : 1,
                                                borderColor: hoveredCard === idx ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0)'
                                            }}
                                            className={`p-3.5 rounded-2xl border ${feature.border} ${hoveredCard === idx ? 'bg-white shadow-xl shadow-indigo-900/5' : 'bg-slate-50/50'} transition-all cursor-pointer flex items-center gap-3.5 group`}
                                        >
                                            <div className={`w-10 h-10 shrink-0 rounded-xl ${feature.bg} flex items-center justify-center ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                                                {feature.animation(hoveredCard === idx)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-[#1e1b4b] mb-0.5">{feature.title}</h3>
                                                <p className="text-[10px] text-slate-500 leading-snug font-medium">{feature.description}</p>
                                            </div>
                                            <motion.div
                                                animate={{
                                                    opacity: hoveredCard === idx ? 1 : 0,
                                                    x: hoveredCard === idx ? 0 : -5
                                                }}
                                                className="text-[#d4af37]"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={onStart}
                                        className="w-full h-12 bg-[#1e1b4b] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2e2a6b] transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 group relative overflow-hidden"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            Vamos Começar
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                        {/* Shine Effect */}
                                        <motion.div
                                            initial={{ x: '-100%' }}
                                            animate={{ x: '100%' }}
                                            transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent z-0"
                                        />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full h-10 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-[#1e1b4b] transition-colors"
                                    >
                                        Pular Introdução
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
