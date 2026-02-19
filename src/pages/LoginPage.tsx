import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Phone, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth, getRedirectPath } from '@/lib/auth';
import { ChurchFlowLogo } from '@/components/branding/ChurchFlowLogo';

export function LoginPage() {
    const navigate = useNavigate();
    const { signIn, signUp, signInWithGoogle, resetPassword, user, profile, loading: authLoading } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: '',
    });

    // Password strength indicator
    const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 6) return { strength: 1, label: 'Fraca', color: 'bg-red-500' };
        if (password.length < 10) return { strength: 2, label: 'Média', color: 'bg-yellow-500' };
        if (password.length < 14) return { strength: 3, label: 'Boa', color: 'bg-blue-500' };
        return { strength: 4, label: 'Forte', color: 'bg-green-500' };
    };

    const passwordStrength = !isLogin ? getPasswordStrength(formData.password) : null;

    // Redireciona se já está logado
    useEffect(() => {
        if (!authLoading && user && profile) {
            const redirectPath = getRedirectPath(profile.role);
            navigate(redirectPath, { replace: true });
        }
    }, [user, profile, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (isLogin) {
                // LOGIN
                const { error } = await signIn(formData.email, formData.password);
                if (error) {
                    console.error('[Login] Auth error:', error);
                    const msg = error.message?.toLowerCase() || '';

                    if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
                        setError('Email ou senha incorretos');
                    } else if (msg.includes('email not confirmed')) {
                        setError('Confirme seu email antes de entrar');
                    } else {
                        setError('Erro ao fazer login. Verifique seus dados.');
                    }
                } else {
                    // Successful login
                    window.location.href = '/';
                }
            } else {
                // CADASTRO
                if (!formData.fullName.trim()) {
                    setError('Nome completo é obrigatório');
                    setLoading(false);
                    return;
                }

                if (formData.password.length < 6) {
                    setError('A senha deve ter pelo menos 6 caracteres');
                    setLoading(false);
                    return;
                }

                const { error } = await signUp(
                    formData.email,
                    formData.password,
                    formData.fullName,
                    formData.phone
                );

                if (error) {
                    const msg = error.message?.toLowerCase() || '';
                    if (msg.includes('already registered') || msg.includes('already_registered')) {
                        setError('Este email já está cadastrado. Faça login.');
                    } else {
                        setError('Erro ao criar conta. Tente novamente.');
                    }
                } else {
                    setSuccess('Conta criada com sucesso! Redirecionando...');
                    // Auto-login ou redirecionamento direto
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                }
            }
        } catch (err) {
            setError('Erro inesperado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setError('Erro ao conectar com Google. Tente novamente.');
            setLoading(false);
        }
        // Se sucesso, o redirect acontece automaticamente
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await resetPassword(resetEmail);

        if (error) {
            setError('Erro ao enviar email de recuperação. Verifique o endereço.');
        } else {
            setResetSent(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#1e1b4b] via-[#1e1b4b] to-[#0f0d2e] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#d4af37]/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-[#d4af37]/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-[380px] relative z-10 scale-[0.95] md:scale-100"
            >
                {/* Logo */}
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center mb-2">
                        <ChurchFlowLogo className="w-14 h-14" />
                    </div>
                    <h1 className="font-display text-2xl font-bold italic text-white tracking-tight">
                        Church<span className="text-[#d4af37]">Flow</span>
                    </h1>
                    <p className="text-white/60 text-xs mt-1 font-medium max-w-[240px] mx-auto leading-tight">
                        Gestão inteligente para uma igreja em movimento
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-5">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                        <button
                            type="button"
                            data-testid="login-tab-button"
                            onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${isLogin
                                ? 'bg-white text-[#1e1b4b] shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            data-testid="signup-tab-button"
                            onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${!isLogin
                                ? 'bg-white text-[#1e1b4b] shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Criar Conta
                        </button>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm flex items-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5 shrink-0" />
                            {success}
                        </motion.div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {!isLogin && (
                            <>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        data-testid="signup-fullname-input"
                                        placeholder="Como podemos te chamar?"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-2 focus:ring-[#1e1b4b]/10 transition-all"
                                        required={!isLogin}
                                        autoFocus
                                        aria-label="Digite seu nome completo"
                                    />
                                </div>

                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        placeholder="Telefone (opcional)"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-2 focus:ring-[#1e1b4b]/10 transition-all"
                                        aria-label="Digite seu telefone (opcional)"
                                    />
                                </div>
                            </>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                data-testid="login-email-input"
                                placeholder="Seu melhor email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-2 focus:ring-[#1e1b4b]/10 transition-all"
                                required
                                autoFocus={isLogin}
                                aria-label="Digite seu email"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                data-testid="login-password-input"
                                placeholder={isLogin ? "Sua senha" : "Crie uma senha segura"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-2 focus:ring-[#1e1b4b]/10 transition-all"
                                required
                                minLength={6}
                                aria-label={isLogin ? "Digite sua senha" : "Crie uma senha com pelo menos 6 caracteres"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {!isLogin && formData.password && passwordStrength && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-1"
                            >
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.strength
                                                ? passwordStrength.color
                                                : 'bg-slate-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Força da senha: <span className="font-bold">{passwordStrength.label}</span>
                                </p>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            data-testid="login-submit-button"
                            disabled={loading}
                            className="w-full py-2.5 bg-[#1e1b4b] hover:bg-[#1e1b4b]/90 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e1b4b]/20"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Acessar minha igreja' : 'Começar gratuitamente'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px]">
                            <span className="px-2 bg-white text-slate-400 font-bold uppercase tracking-wider">ou</span>
                        </div>
                    </div>

                    {/* Google Sign In */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full py-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar com Google
                    </button>

                    {isLogin && (
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="w-full mt-3 text-xs text-slate-500 hover:text-[#1e1b4b] transition-colors font-medium"
                        >
                            Esqueci minha senha
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-white/40 text-[10px] mt-4 space-y-0.5">
                    <p>© 2025 ChurchFlow.</p>
                    <p>Todos os direitos reservados.</p>
                </div>
            </motion.div>

            {/* Forgot Password Modal */}
            <AnimatePresence>
                {showForgotPassword && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        onClick={() => setShowForgotPassword(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-[#1e1b4b]">Recuperar Senha</h3>
                                <button
                                    onClick={() => setShowForgotPassword(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label="Fechar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {resetSent ? (
                                <div className="text-center py-4">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <p className="text-slate-700 mb-2 font-medium">Email enviado com sucesso!</p>
                                    <p className="text-sm text-slate-500">
                                        Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setResetSent(false);
                                            setResetEmail('');
                                        }}
                                        className="mt-4 px-6 py-2 bg-[#1e1b4b] text-white rounded-lg font-bold hover:bg-[#1e1b4b]/90 transition-colors"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="space-y-4">
                                    <p className="text-sm text-slate-600">
                                        Digite seu email e enviaremos um link para redefinir sua senha.
                                    </p>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            placeholder="Seu email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1e1b4b] focus:ring-2 focus:ring-[#1e1b4b]/10 transition-all"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-[#1e1b4b] hover:bg-[#1e1b4b]/90 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
