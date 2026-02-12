import { MemberLayout } from '@/components/layout/MemberLayout';
import { motion } from 'framer-motion';
import { QrCode, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function MemberCheckinPage() {
    const { profile } = useAuth();

    // Loading removido por solicitação - UI renderiza com dados parciais se necessário
    // if (loading) return <Loader... />

    const qrData = JSON.stringify({
        id: profile?.id,
        name: profile?.full_name,
        type: 'membro_checkin'
    });

    return (
        <MemberLayout>
            <div className="flex flex-col h-[calc(100vh-8rem)] md:h-auto md:min-h-full items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-sm w-full bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-[#1e1b4b]/10 border border-slate-100"
                >
                    <div className="mb-8">
                        <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1e1b4b]/5 text-[#1e1b4b] mb-4">
                            <QrCode className="w-8 h-8" />
                        </span>
                        <h1 className="font-display text-2xl font-bold italic text-[#1e1b4b]">Check-in</h1>
                        <p className="text-slate-400 text-sm mt-2">Aproxime o QR Code do leitor na entrada</p>
                    </div>

                    <div className="aspect-square bg-[#1e1b4b] rounded-3xl p-6 mb-8 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                        <div className="relative bg-white p-4 rounded-2xl">
                            {profile?.id ? (
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                                    alt="QR Code"
                                    className="w-full h-full mix-blend-multiply"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                                    QR Code Indisponível
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1e1b4b] to-transparent opacity-0 group-hover:opacity-20 transition-opacity" />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 px-4 rounded-xl">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">
                            {profile?.status || 'Membro'}
                        </span>
                    </div>
                </motion.div>
            </div>
        </MemberLayout>
    );
}
