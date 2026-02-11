import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function AwaitingApprovalPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get church data from navigation state
    const churchName = location.state?.churchName || 'Sua Igreja';
    const churchCity = location.state?.churchCity || '';
    const requestedAt = location.state?.requestedAt
        ? new Date(location.state.requestedAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
        : 'Hoje';

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-3 md:p-6 font-sans relative overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#d4af37]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '7s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl relative z-10"
            >
                {/* Main Card */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                        >
                            <Clock className="w-8 h-8 md:w-12 md:h-12 text-amber-400" />
                        </motion.div>
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                            className="absolute inset-0 rounded-full bg-amber-500/10"
                        />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl md:text-4xl font-display font-bold italic text-white mb-3 md:mb-4">
                        Aguardando Aprovação
                    </h1>

                    {/* Church Info */}
                    <div className="bg-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 border border-white/10">
                        <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Igreja Solicitada
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-white mb-1">{churchName}</div>
                        {churchCity && (
                            <div className="text-xs md:text-sm text-slate-300">{churchCity}</div>
                        )}
                        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10 text-[10px] md:text-xs text-slate-400">
                            Solicitado em: {requestedAt}
                        </div>
                    </div>

                    {/* Status Message */}
                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                        <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                            Sua solicitação está sendo analisada pela nossa equipe.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="text-xs md:text-sm font-bold">Normalmente aprovamos em até 24 horas</span>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-left">
                            <Mail className="w-5 h-5 md:w-6 md:h-6 text-indigo-400 mb-2" />
                            <h3 className="text-xs md:text-sm font-bold text-white mb-1">Notificação por Email</h3>
                            <p className="text-[10px] md:text-xs text-slate-400">
                                Você será notificado quando sua igreja for aprovada
                            </p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-left">
                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 mb-2" />
                            <h3 className="text-xs md:text-sm font-bold text-white mb-1">Acesso Completo</h3>
                            <p className="text-[10px] md:text-xs text-slate-400">
                                Após aprovação, você terá acesso total ao painel admin
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate('/entrar-na-igreja')}
                            className="h-11 md:h-12 px-6 md:px-8 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="h-11 md:h-12 px-6 md:px-8 bg-[#d4af37] hover:bg-[#b5952f] text-[#1e1b4b] rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-900/20"
                        >
                            Fazer Logout
                        </button>
                    </div>
                </div>

                {/* Footer Note */}
                <p className="mt-6 md:mt-8 text-center text-slate-500 text-[10px] md:text-xs">
                    Dúvidas? Entre em contato: suporte@churchflow.com
                </p>
            </motion.div>
        </div>
    );
}
