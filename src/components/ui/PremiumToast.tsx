import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastProps {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function PremiumToast({ message, type = 'success', isVisible, onClose, action }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 4000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    // const colors = {
    //     success: 'bg-emerald-500',
    //     error: 'bg-red-500',
    //     warning: 'bg-amber-500'
    // };

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertCircle className="w-5 h-5 text-amber-500" />
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 pointer-events-none"
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 pointer-events-auto flex items-start gap-4 ring-1 ring-black/5">
                        <div className={`p-2 rounded-full bg-slate-50 border border-slate-100 shrink-0`}>
                            {icons[type]}
                        </div>

                        <div className="flex-1 pt-1">
                            <h4 className={`font-display font-bold text-sm ${type === 'success' ? 'text-emerald-900' : type === 'error' ? 'text-red-900' : 'text-amber-900'}`}>
                                {type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Atenção'}
                            </h4>
                            <p className="text-slate-500 text-xs font-medium mt-0.5 leading-relaxed">
                                {message}
                            </p>

                            {action && (
                                <button
                                    onClick={action.onClick}
                                    className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#1e1b4b] underline decoration-[#d4af37] decoration-2 underline-offset-2 hover:text-[#d4af37] transition-colors"
                                >
                                    {action.label}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
