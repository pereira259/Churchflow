import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormPanel } from '@/components/auth/FormPanel';
import { VisualPanel } from '@/components/auth/VisualPanel';
import { AuthMode } from '@/types/auth.types';

export function SwapAuthPage() {
    const [mode, setMode] = useState<AuthMode>('login');

    const toggleMode = () => {
        setMode(prev => prev === 'login' ? 'signup' : 'login');
    };

    const isLogin = mode === 'login';

    return (
        <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 lg:p-8 font-sans">
            <div className="w-full max-w-[700px] h-[450px] lg:h-[480px] bg-white rounded-2xl shadow-xl overflow-hidden relative flex flex-col md:flex-row">

                {/* Desktop Layout (Split Screen with Swap) */}
                <motion.div
                    className="hidden md:flex w-full h-full relative overflow-hidden"
                    layout // Anima mudanças de layout (flex-direction)
                    style={{
                        flexDirection: isLogin ? 'row' : 'row-reverse'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {/* Form Side */}
                    <motion.div
                        layout // Participa da animação de troca
                        className="w-1/2 h-full bg-white relative z-10"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isLogin ? "login-form" : "signup-form"}
                                className="w-full h-full"
                                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <FormPanel mode={mode} />
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* Visual Side */}
                    <motion.div
                        layout // Participa da animação de troca
                        className="w-1/2 h-full relative z-0"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <VisualPanel mode={mode} onToggle={toggleMode} />
                    </motion.div>
                </motion.div>

                {/* Mobile Layout (Stacked) */}
                <div className="md:hidden w-full h-full flex flex-col relative">
                    <div className="relative w-full flex-1 overflow-hidden">
                        <AnimatePresence mode="wait">
                            {isLogin ? (
                                <motion.div
                                    key="mobile-login"
                                    className="absolute inset-0"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <FormPanel mode="login" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="mobile-signup"
                                    className="absolute inset-0"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <FormPanel mode="signup" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile Toggle Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                        <p className="text-sm text-slate-600 mb-2">
                            {isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}
                        </p>
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-[#1e1b4b] font-bold text-sm hover:underline"
                        >
                            {isLogin ? "Criar conta gratuitamente" : "Fazer login"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

