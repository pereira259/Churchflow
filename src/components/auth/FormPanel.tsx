import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ChurchFlowLogo } from '@/components/branding/ChurchFlowLogo';
import { SocialButtons } from './SocialButtons';
import { AuthMode } from '@/types/auth.types';

interface FormPanelProps {
    mode: AuthMode;
}

export function FormPanel({ mode }: FormPanelProps) {
    const isLogin = mode === 'login';
    const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
    });

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err) {
            setError('Erro ao conectar com Google. Tente novamente.');
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(formData.email, formData.password);
                if (error) throw error;
                // Redirect handled by AuthContext or Router
                window.location.href = '/';
            } else {
                if (!formData.fullName) {
                    throw new Error('Nome completo é obrigatório');
                }
                const { error } = await signUp(formData.email, formData.password, formData.fullName);
                if (error) throw error;
                setSuccess('Conta criada com sucesso! Verifique seu email.');
            }
        } catch (err: any) {
            console.error(err);
            if (err.message.includes('invalid login') || err.message.includes('Invalid login')) {
                setError('Email ou senha incorretos.');
            } else if (err.message.includes('already registered')) {
                setError('Este email já está cadastrado.');
            } else {
                setError(err.message || 'Ocorreu um erro. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!formData.email) {
            setError('Digite seu email para recuperar a senha.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await resetPassword(formData.email);
            if (error) throw error;
            setSuccess('Email de recuperação enviado!');
            setShowForgotPassword(false);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white custom-scrollbar overflow-hidden">
            <motion.div
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[240px] space-y-2"
            >
                {/* Header */}
                <div className="text-center space-y-0.5">
                    <div className="md:hidden flex justify-center mb-1">
                        <ChurchFlowLogo className="w-6 h-6 text-[#1e1b4b]" />
                    </div>
                    <h1 className="font-display text-xl font-bold text-[#1e1b4b]">
                        {isLogin ? 'Entrar' : 'Criar Conta'}
                    </h1>
                    <p className="text-slate-500 text-[10px]">
                        {isLogin ? 'Bem-vindo de volta!' : 'Preencha seus dados'}
                    </p>
                </div>

                {/* Social Login */}
                <SocialButtons isLoading={isLoading} onGoogleClick={handleGoogleSignIn} />

                <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px]">
                        <span className="px-2 bg-white text-slate-400 font-bold uppercase tracking-wider scale-90">
                            {isLogin ? 'ou' : 'ou email'}
                        </span>
                    </div>
                </div>

                {/* Messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-red-500 text-[10px] text-center bg-red-50 p-1.5 rounded border border-red-100"
                        >
                            {error}
                        </motion.div>
                    )}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-emerald-600 text-[10px] text-center bg-emerald-50 p-1.5 rounded border border-emerald-100"
                        >
                            {success}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-2">
                    {!isLogin && (
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-[#1e1b4b] transition-colors" />
                            <input
                                type="text"
                                placeholder="Nome completo"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-1 focus:ring-[#1e1b4b]/10 transition-all font-medium"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-[#1e1b4b] transition-colors" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-1 focus:ring-[#1e1b4b]/10 transition-all font-medium"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-[#1e1b4b] transition-colors" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Senha"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-1 focus:ring-[#1e1b4b]/10 transition-all font-medium"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    {isLogin && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-[10px] font-semibold text-slate-500 hover:text-[#1e1b4b] transition-colors"
                            >
                                Esqueci a senha
                            </button>
                        </div>
                    )}

                    {showForgotPassword && isLogin && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-1"
                        >
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={isLoading}
                                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-[10px] transition-all"
                            >
                                Enviar link
                            </button>
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2 bg-[#1e1b4b] hover:bg-[#1e1b4b]/90 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#1e1b4b]/20 mt-2 group text-xs"
                    >
                        {isLoading ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'ENTRAR' : 'CRIAR'}
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

