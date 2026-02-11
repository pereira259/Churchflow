import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';

export interface PageIntroProps {
    isOpen: boolean;
    onClose: () => void;
    onStartTour?: () => void;
    title: string;
    description: string;
    features: { icon: any; label: string; description: string }[];
}

export function PageIntro({ isOpen, onClose, onStartTour, title, description, features }: PageIntroProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md"
                    />

                    {/* Content Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                            delay: 0.1
                        }}
                        className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(30,27,75,0.4)] border border-white/40 overflow-hidden"
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#d4af37]/10 via-transparent to-transparent rounded-full -mr-32 -mt-32 blur-3xl" />

                        <div className="p-8 md:p-10 relative z-10">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-8">
                                <div className="space-y-2">
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="inline-flex items-center px-3 py-1 bg-[#1e1b4b]/5 border border-[#1e1b4b]/10 rounded-full"
                                    >
                                        <Sparkles className="h-3.5 w-3.5 text-[#d4af37] mr-2" />
                                        <span className="text-[10px] font-black text-[#1e1b4b]/60 uppercase tracking-widest">Aperto de Mão</span>
                                    </motion.div>
                                    <h2 className="text-3xl font-black italic text-[#1e1b4b] leading-tight flex items-center gap-3">
                                        {title}
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium max-w-xs">{description}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Features Grid */}
                            <div className="grid grid-cols-1 gap-4 mb-10">
                                {features.map((feature, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ x: -30, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 + (i * 0.1) }}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-slate-100/50 hover:border-[#d4af37]/20 transition-colors group"
                                    >
                                        <div className="h-12 w-12 rounded-xl bg-[#1e1b4b]/5 flex items-center justify-center text-[#1e1b4b] group-hover:bg-[#1e1b4b] group-hover:text-[#d4af37] transition-all">
                                            <feature.icon className="h-6 w-6" strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-[#1e1b4b] mb-0.5">{feature.label}</p>
                                            <p className="text-xs text-slate-400 font-bold">{feature.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                                    className="w-full sm:flex-1 h-14 bg-[#1e1b4b] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#1e1b4b]/20 flex items-center justify-center gap-2 group"
                                >
                                    Vamos Começar
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </motion.button>

                                {onStartTour && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onStartTour();
                                        }}
                                        className="w-full sm:w-auto h-14 px-8 border border-slate-200 text-[#1e1b4b] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                    >
                                        Explorar Detalhes
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar (Decoration) */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 4, ease: "linear" }}
                            className="absolute bottom-0 left-0 h-1 bg-[#d4af37]/30"
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
