import { MemberLayout } from "@/components/layout/MemberLayout";
import { BookOpen, Video, FileText, Headphones } from "lucide-react";

export function MemberStudiesPage() {
    return (
        <MemberLayout>
            <div className="p-4 space-y-6 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-[#1e1b4b]">
                            Estudos
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Cresça em conhecimento e graça
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-[#d4af37]" />
                    </div>
                </div>

                {/* Featured Study */}
                <div className="bg-[#1e1b4b] rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-[#1e1b4b]/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-2xl -mr-10 -mt-10" />

                    <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                        Série do MêS
                    </span>
                    <h2 className="text-xl font-bold mb-2">Identidade em Cristo</h2>
                    <p className="text-white/60 text-sm mb-4 line-clamp-2">
                        Descubra quem você realmente é através das escrituras e fortaleça sua fundação espiritual.
                    </p>
                    <button className="w-full py-3 bg-white text-[#1e1b4b] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">
                        Começar Agora
                    </button>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center gap-2 active:scale-95 transition-transform">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Video className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-700 text-xs">Vídeos</span>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center gap-2 active:scale-95 transition-transform">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-700 text-xs">Áudios</span>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center gap-2 active:scale-95 transition-transform">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-700 text-xs">Artigos</span>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center gap-2 active:scale-95 transition-transform">
                        <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-700 text-xs">Planos</span>
                    </div>
                </div>

                {/* Recent Items */}
                <div>
                    <h3 className="font-display font-bold text-[#1e1b4b] mb-3">Recentes</h3>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700 text-sm">Fundamentos da Fé</h4>
                                    <p className="text-xs text-slate-400">Aula {i} • 15 min</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MemberLayout>
    );
}
