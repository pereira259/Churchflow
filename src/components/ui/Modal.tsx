import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    hideHeader?: boolean;
    headerAction?: ReactNode;
    footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, hideHeader = false, headerAction, footer }: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Backdrop with high blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-marinho/40 backdrop-blur-xl"
                    />

                    {/* Luxury Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-3xl max-h-[85vh] bg-white/80 backdrop-blur-2xl rounded-4xl shadow-glass-xl border border-white/60 flex flex-col overflow-hidden texture-engraving sm:my-8"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-marinho via-sage to-gold z-50" />

                        <div className={`flex flex-col h-full overflow-hidden ${hideHeader ? 'p-0' : 'p-5'}`}>
                            {!hideHeader && (
                                <div className="flex items-center justify-between mb-4 flex-none">
                                    <div className="space-y-0.5">
                                        <h2 className="font-display text-xl font-bold text-marinho italic">{title}</h2>
                                        <div className="h-0.5 w-8 bg-gold/30 rounded-full" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {headerAction}
                                        <button
                                            onClick={onClose}
                                            className="h-8 w-8 flex items-center justify-center bg-marinho/5 hover:bg-marinho text-marinho/40 hover:text-white rounded-xl transition-all duration-300 shadow-inner-soft hover:shadow-premium"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={`relative z-10 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-marinho/10 hover:scrollbar-thumb-marinho/20 ${hideHeader ? '' : 'pr-2'}`}>
                                {children}
                            </div>

                            {/* Sticky Footer Area */}
                            {footer && (
                                <div className="flex-none pt-5 mt-auto border-t border-slate-100/60 z-20 relative">
                                    {footer}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
