import { motion } from 'framer-motion';
import { Sparkles, Book, Calendar, ChevronRight, Play, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyHomeProps {
    onNavigate: (view: 'bible' | 'chat' | 'plans') => void;
}

export function StudyHome({ onNavigate }: StudyHomeProps) {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fdfbf7] p-8">
            <div className="max-w-5xl mx-auto space-y-10">

                {/* Hero Section - Daily Focus */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative rounded-[2.5rem] overflow-hidden bg-[#1e1b4b] text-white p-10 md:p-14 shadow-2xl shadow-[#1e1b4b]/20 min-h-[300px] flex flex-col justify-center"
                >
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37] rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 max-w-2xl space-y-6">
                        <div className="flex items-center gap-3 text-[#d4af37]/80 font-bold tracking-widest text-[10px] uppercase">
                            <Star className="h-3 w-3 fill-current" />
                            <span>Devocional Diário</span>
                        </div>

                        <h1 className="font-display font-bold text-4xl md:text-5xl leading-tight">
                            "O Senhor é o meu pastor; <br /> <span className="text-[#d4af37] italic">nada me faltará.</span>"
                        </h1>

                        <p className="font-serif text-lg text-white/60 italic">
                            Salmos 23:1
                        </p>

                        <button
                            onClick={() => onNavigate('bible')}
                            className="mt-4 flex items-center gap-3 bg-white text-[#1e1b4b] px-8 py-4 rounded-full font-bold text-sm hover:bg-[#d4af37] hover:text-white transition-all shadow-lg group w-fit"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Começar Leitura de Hoje
                        </button>
                    </div>
                </motion.div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 1. Assistente AI */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => onNavigate('chat')}
                        className="group bg-white p-8 rounded-[2rem] border border-[#1e1b4b]/5 hover:border-[#d4af37]/30 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="h-14 w-14 rounded-2xl bg-[#fdfbf7] flex items-center justify-center mb-6 group-hover:bg-[#1e1b4b] transition-colors">
                            <Sparkles className="h-7 w-7 text-[#1e1b4b] group-hover:text-[#d4af37] transition-colors" />
                        </div>
                        <h3 className="font-display font-bold text-xl text-[#1e1b4b] mb-2">Aprender com ChurchFlow</h3>
                        <p className="text-sm text-[#1e1b4b]/60 leading-relaxed mb-4">
                            Tire dúvidas teológicas, explore contextos históricos e aprofunde seus estudos com nossa IA.
                        </p>
                        <div className="flex items-center text-[#d4af37] text-xs font-black uppercase tracking-widest gap-2">
                            <span>Iniciar Chat</span>
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.div>

                    {/* 2. Bíblia */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => onNavigate('bible')}
                        className="group bg-white p-8 rounded-[2rem] border border-[#1e1b4b]/5 hover:border-[#d4af37]/30 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="h-14 w-14 rounded-2xl bg-[#fdfbf7] flex items-center justify-center mb-6 group-hover:bg-[#1e1b4b] transition-colors">
                            <Book className="h-7 w-7 text-[#1e1b4b] group-hover:text-[#d4af37] transition-colors" />
                        </div>
                        <h3 className="font-display font-bold text-xl text-[#1e1b4b] mb-2">Bíblia Sagrada</h3>
                        <p className="text-sm text-[#1e1b4b]/60 leading-relaxed mb-4">
                            Leia a palavra de Deus em qualquer lugar. Versão ACF atualizada e otimizada para estudo.
                        </p>
                        <div className="flex items-center text-[#d4af37] text-xs font-black uppercase tracking-widest gap-2">
                            <span>Ler Agora</span>
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.div>

                    {/* 3. Planos */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        onClick={() => onNavigate('plans')}
                        className="group bg-white p-8 rounded-[2rem] border border-[#1e1b4b]/5 hover:border-[#d4af37]/30 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="h-14 w-14 rounded-2xl bg-[#fdfbf7] flex items-center justify-center mb-6 group-hover:bg-[#1e1b4b] transition-colors">
                            <Calendar className="h-7 w-7 text-[#1e1b4b] group-hover:text-[#d4af37] transition-colors" />
                        </div>
                        <h3 className="font-display font-bold text-xl text-[#1e1b4b] mb-2">Planos de Leitura</h3>
                        <p className="text-sm text-[#1e1b4b]/60 leading-relaxed mb-4">
                            Siga trilhas de conhecimento e mantenha a disciplina devocional com planos estruturados.
                        </p>
                        <div className="flex items-center text-[#d4af37] text-xs font-black uppercase tracking-widest gap-2">
                            <span>Ver Planos</span>
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.div>
                </div>

                {/* Motivation Section */}
                <div className="flex items-center justify-between bg-[#1e1b4b]/5 rounded-3xl p-8 border border-[#1e1b4b]/5">
                    <div>
                        <h3 className="font-bold text-[#1e1b4b] text-lg mb-1">Seu Progresso da Semana</h3>
                        <p className="text-sm text-[#1e1b4b]/60">Você leu a bíblia 3 dias seguidos. Continue assim!</p>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7].map(day => (
                            <div key={day} className={cn(
                                "h-10 w-3 rounded-full",
                                day <= 3 ? "bg-[#d4af37]" : "bg-[#1e1b4b]/10"
                            )} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
