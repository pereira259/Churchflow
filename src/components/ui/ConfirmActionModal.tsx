import { AlertTriangle, Check } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: 'danger' | 'warning' | 'info';
    // confirmationKeyword?: string; // Reserved for future use
}

export function ConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isLoading = false,
    variant = 'info',
    // confirmationKeyword
}: ConfirmationModalProps) {

    // For now, we won't implement the keyword input inside the modal to keep it simple,
    // or we can add it if strictly needed. The prompt() replacement would require it.
    // Let's implement a simple version first.

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            hideHeader={false}
        >
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl shrink-0 ${variant === 'danger' ? 'bg-red-500/10 text-red-600' :
                        variant === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-blue-500/10 text-blue-600'
                        }`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <p className="text-slate-600 leading-relaxed pt-1 font-medium">
                        {message}
                    </p>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all text-sm uppercase tracking-wider"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 h-12 rounded-xl font-black text-white uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${variant === 'danger'
                            ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/20'
                            : 'bg-gradient-to-r from-[#d4af37] to-[#b5952f] text-[#1e1b4b] shadow-[#d4af37]/20'
                            }`}
                    >
                        {isLoading ? (
                            'Processando...'
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                {confirmText}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
