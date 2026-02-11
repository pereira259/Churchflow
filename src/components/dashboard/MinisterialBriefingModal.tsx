
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Copy, Check, FileText, Share2 } from 'lucide-react';

interface MinisterialBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        visitors: number;
        members: number;
        offerings: number;
        baptisms: number;
        birthdays: number;
    };
    churchName?: string;
}

export function MinisterialBriefingModal({ isOpen, onClose, stats, churchName = "ChurchFlow" }: MinisterialBriefingModalProps) {
    const [copied, setCopied] = useState(false);
    const [reportText, setReportText] = useState('');

    useEffect(() => {
        const date = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

        const text = `*Briefing Ministerial - ${date}* 🏛️
_${churchName}_

*Pessoas* 👥
• Visitantes: *${stats.visitors}*
• Membros Ativos: *${stats.members}*
• Batismos (Mês): *${stats.baptisms}*
• Aniversariantes (Semana): *${stats.birthdays}*

*Financeiro* 💰
• Arrecadação: *${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.offerings)}*

_"Todo o crescimento vem do Senhor."_ 🙏
#GestãoMinisterial #ChurchFlow`;

        setReportText(text);
    }, [stats, churchName]);

    const handleCopy = () => {
        navigator.clipboard.writeText(reportText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
        window.open(url, '_blank');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Briefing Ministerial"
        >
            <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-6 text-sm md:text-base font-sans leading-relaxed text-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileText className="w-24 h-24" />
                    </div>

                    {/* Preview-like display */}
                    <div className="whitespace-pre-wrap font-mono text-xs md:text-sm bg-white border border-slate-200 p-4 rounded-xl shadow-inner text-slate-600">
                        {reportText}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-2 h-12 bg-white border border-marinho/10 text-marinho font-bold rounded-xl hover:bg-marinho/5 hover:border-marinho/20 transition-all shadow-sm active:scale-95 group"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-600">Copiado!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4 text-marinho/40 group-hover:text-marinho transition-colors" />
                                <span>Copiar Texto</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 h-12 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-sm uppercase tracking-wider"
                    >
                        <Share2 className="w-4 h-4" />
                        <div>
                            <span className="opacity-70 text-[10px] block leading-none mb-0.5">Enviar no</span>
                            WhatsApp
                        </div>
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-[10px] text-marinho/40 uppercase font-black tracking-widest">
                        Gere relatórios rápidos para manter a liderança informada
                    </p>
                </div>
            </div>
        </Modal>
    );
}
