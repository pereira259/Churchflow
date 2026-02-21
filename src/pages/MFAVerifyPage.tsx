import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, ArrowRight, Loader2, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MFAVerifyPage() {
    const { user, refreshProfile } = useAuth();
    const [code, setCode] = useState('');
    const [rememberDevice, setRememberDevice] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const getFactors = async () => {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) {
                setError('Erro ao carregar fatores de MFA');
                return;
            }
            // Pega o primeiro fator TOTP ativo
            const totpFactor = data.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (totpFactor) {
                setFactorId(totpFactor.id);
            } else {
                setError('Nenhum fator MFA configurado.');
                // Opcional: redirecionar para setup?
            }
        };

        if (user) getFactors();
    }, [user]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!factorId || code.length !== 6) return;

        setLoading(true);
        setError(null);

        try {
            // Cria challenge
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;

            // Verifica
            const { data, error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code
            });

            if (verifyError) throw verifyError;

            // Sucesso!
            if (rememberDevice) {
                const expiration = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 dias
                localStorage.setItem(`mfa_remember_${user?.id}`, JSON.stringify({
                    token: factorId,
                    expires: expiration
                }));
            }

            await refreshProfile();
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Código inválido. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-[#c9a962]/20"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e1b4b]/5 rounded-full mb-4">
                        <Smartphone className="w-8 h-8 text-[#1e1b4b]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#1e1b4b]">Verificação MFA</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Digite o código de 6 dígitos gerado pelo seu aplicativo.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-[#1e1b4b] uppercase tracking-wider mb-1.5 block">
                            Código de 6 dígitos
                        </label>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:border-[#c9a962] focus:ring-2 focus:ring-[#c9a962]/20 transition-all font-bold"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer group" onClick={() => setRememberDevice(!rememberDevice)}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${rememberDevice ? 'bg-[#1e1b4b] border-[#1e1b4b]' : 'border-slate-300 group-hover:border-[#1e1b4b]'}`}>
                            {rememberDevice && <ShieldCheck className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs text-slate-600 font-medium select-none">Lembrar este dispositivo por 30 dias</span>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.length !== 6 || !factorId}
                        className="w-full bg-[#1e1b4b] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1e1b4b]/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-[#1e1b4b]/20"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                VERIFICAR AGORA
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-[#1e1b4b] transition-colors"
                    >
                        Voltar para o Login
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
