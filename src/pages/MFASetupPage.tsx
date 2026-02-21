import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MFASetupPage() {
    const { user, refreshProfile } = useAuth();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const enroll = async () => {
            try {
                const { data, error } = await supabase.auth.mfa.enroll({
                    factorType: 'totp',
                    issuer: 'ChurchFlow',
                    friendlyName: user?.email || 'ChurchFlow User'
                });

                if (error) throw error;

                setFactorId(data.id);
                setQrCode(data.totp.qr_code);
            } catch (err: any) {
                setError(err.message || 'Erro ao iniciar configuração de MFA');
            } finally {
                setLoading(false);
            }
        };

        if (user) enroll();
    }, [user]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!factorId || code.length !== 6) return;

        setVerifying(true);
        setError(null);

        try {
            // Primeiro cria o challenge
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;

            // Depois verifica
            const { data, error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code
            });

            if (verifyError) throw verifyError;

            // Sucesso!
            await refreshProfile();
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Código inválido. Tente novamente.');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-[#1e1b4b] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-[#c9a962]/20"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e1b4b]/5 rounded-full mb-4">
                        <ShieldCheck className="w-8 h-8 text-[#1e1b4b]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#1e1b4b]">Configurar MFA</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Proteja sua conta com autenticação em duas etapas.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div className="bg-[#1e1b4b]/5 p-6 rounded-2xl flex flex-col items-center border border-dashed border-[#1e1b4b]/20">
                        {qrCode ? (
                            <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 mb-4 border-4 border-white shadow-sm" />
                        ) : (
                            <div className="w-48 h-48 bg-slate-200 animate-pulse rounded-lg mb-4" />
                        )}
                        <p className="text-[10px] text-center text-slate-500 max-w-[200px]">
                            Escaneie este código no Google Authenticator ou similar.
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
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
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:border-[#c9a962] focus:ring-2 focus:ring-[#c9a962]/20 transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={verifying || code.length !== 6}
                            className="w-full bg-[#1e1b4b] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1e1b4b]/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-[#1e1b4b]/20"
                        >
                            {verifying ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    ATIVAR SEGURANÇA
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
