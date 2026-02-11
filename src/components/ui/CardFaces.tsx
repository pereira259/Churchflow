import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardFrontProps {
    icon: LucideIcon;
    label: string;
    value: string;
    badge?: {
        text: string;
        variant: 'success' | 'error' | 'warning';
    };
    hint?: string;
}

/**
 * CardFront - Standardized front face for flip cards
 */
export function CardFront({ icon: Icon, label, value, badge, hint = 'Hover para detalhes' }: CardFrontProps) {
    const badgeColors = {
        success: 'bg-sage/10 text-sage',
        error: 'bg-red-50 text-red-500',
        warning: 'bg-amber-50 text-amber-600'
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <motion.div
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-marinho/10 to-marinho/5 flex items-center justify-center text-marinho shadow-inner"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Icon className="w-5 h-5" />
                    </motion.div>
                    <p className="text-[9px] font-black text-marinho/40 uppercase tracking-wider">{label}</p>
                </div>
                {badge && (
                    <div className={cn('px-2.5 py-1 rounded-full text-[8px] font-black uppercase shadow-sm', badgeColors[badge.variant])}>
                        {badge.text}
                    </div>
                )}
            </div>
            <p className="text-3xl font-display font-black italic text-marinho leading-none mb-2">{value}</p>
            <div className="flex items-center gap-1.5 text-slate-400 mt-auto">
                <span className="text-[9px] uppercase tracking-wider">{hint}</span>
                <motion.span
                    className="text-sm"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    ⟲
                </motion.span>
            </div>
        </div>
    );
}

interface CardBackProps {
    title: string;
    children: ReactNode;
}

/**
 * CardBack - Standardized back face container for flip cards
 */
export function CardBack({ title, children }: CardBackProps) {
    return (
        <div className="h-full flex flex-col justify-between text-white">
            <div>
                <p className="text-[8px] font-bold text-white/60 uppercase tracking-wider mb-2">{title}</p>
                {children}
            </div>
        </div>
    );
}
