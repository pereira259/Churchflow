import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Trophy, Star } from 'lucide-react';


interface Quest {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    xp: number;
}

interface QuestLogProps {
    quests: Quest[];
}

export function QuestLog({ quests }: QuestLogProps) {
    // Component logic is now simpler, purely presentation
    const completedQuests = quests.filter(q => q.completed).length;
    const progress = quests.length > 0 ? (completedQuests / quests.length) * 100 : 0;
    const totalXp = quests.reduce((acc, q) => q.completed ? acc + q.xp : acc, 0);

    if (progress === 100 && quests.length > 0) {
        // Optional: specific UI for 100% completion
    }

    return (
        <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[1rem] p-3 shadow-xl relative overflow-hidden group">
            {/* Decorative BG */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#d4af37]/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#d4af37]/10 rounded-md text-[#d4af37]">
                        <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-[#1e1b4b] text-xs leading-none">Jornada</h3>
                        <p className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">{totalXp} XP</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-sm font-black text-[#d4af37]">{Math.round(progress)}%</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full mb-3 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#d4af37] to-amber-300 rounded-full"
                />
            </div>

            {/* List */}
            <div className="space-y-1">
                {quests.map((quest) => (
                    <div key={quest.id} className="group/quest">
                        <div className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white/60 transition-colors border border-transparent hover:border-white/40 cursor-help" title={quest.description}>
                            {quest.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                                <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-[10px] font-bold leading-tight ${quest.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                    {quest.title}
                                </h4>
                                <p className="text-[8px] text-slate-400 leading-tight mt-0.5 hidden group-hover/quest:block transition-all">
                                    {quest.description}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {!quest.completed && (
                                    <span className="text-[7px] font-bold text-[#d4af37] bg-[#d4af37]/10 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                        <Star className="w-1.5 h-1.5 fill-current" />
                                        +{quest.xp}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
