import { motion } from 'framer-motion';
import { LucideIcon, Search, FolderOpen, UserX, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type EmptyStateProps = {
    title: string;
    description: string;
    icon?: LucideIcon;
    action?: ReactNode;
    type?: 'search' | 'data' | 'users' | 'calendar';
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon: Icon,
    action,
    type = 'data',
    className
}: EmptyStateProps) {

    // Abstract geometric patterns based on ChurchFlow brand
    const renderIllustration = () => {
        switch (type) {
            case 'search':
                return (
                    <svg className="w-32 h-32 text-marinho/5" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="85" cy="85" r="45" stroke="currentColor" strokeWidth="4" className="animate-pulse" style={{ animationDuration: '3s' }} />
                        <path d="M120 120L150 150" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="opacity-50" />
                        <circle cx="20" cy="160" r="10" fill="#d4af37" className="opacity-20" />
                        <circle cx="170" cy="30" r="6" fill="#1e1b4b" className="opacity-20" />
                    </svg>
                );
            case 'users':
                return (
                    <svg className="w-32 h-32 text-marinho/5" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="100" cy="80" r="30" stroke="currentColor" strokeWidth="4" />
                        <path d="M50 160C50 132.386 72.3858 110 100 110C127.614 110 150 132.386 150 160" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="160" cy="60" r="3" fill="#d4af37" className="opacity-40" />
                        <circle cx="40" cy="90" r="4" fill="#1e1b4b" className="opacity-30" />
                        <rect x="70" y="140" width="60" height="4" rx="2" fill="currentColor" className="opacity-20" />
                    </svg>
                );
            case 'calendar':
                return (
                    <svg className="w-32 h-32 text-marinho/5" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="40" y="40" width="120" height="120" rx="20" stroke="currentColor" strokeWidth="4" />
                        <path d="M40 80H160" stroke="currentColor" strokeWidth="2" />
                        <path d="M70 20V50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <path d="M130 20V50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="100" cy="110" r="2" fill="#d4af37" />
                        <circle cx="130" cy="110" r="2" fill="#d4af37" />
                        <circle cx="70" cy="110" r="2" fill="#d4af37" />
                    </svg>
                );
            default: // data/generic
                return (
                    <svg className="w-32 h-32 text-marinho/5" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="50" y="50" width="100" height="100" rx="10" stroke="currentColor" strokeWidth="3" transform="rotate(-10 100 100)" className="opacity-50" />
                        <rect x="50" y="50" width="100" height="100" rx="10" stroke="currentColor" strokeWidth="3" transform="rotate(5 100 100)" />
                        <circle cx="100" cy="100" r="15" stroke="#d4af37" strokeWidth="2" className="opacity-40" />
                        <path d="M40 20L50 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M160 180L150 170" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
        }
    }

    const DefaultIcon = type === 'search' ? Search :
        type === 'users' ? UserX :
            type === 'calendar' ? CalendarX :
                FolderOpen;

    const UsedIcon = Icon || DefaultIcon;

    return (
        <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in zoom-in-95 duration-500", className)}>
            <div className="relative mb-4">
                {/* Background Illustration */}
                <div className="absolute inset-0 flex items-center justify-center -translate-y-2 scale-150 pointer-events-none select-none">
                    {renderIllustration()}
                </div>

                {/* Floating Icon */}
                <motion.div
                    initial={{ y: 0 }}
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 w-16 h-16 bg-gradient-to-br from-white to-cream-50 rounded-2xl shadow-lg border border-white/50 flex items-center justify-center ring-4 ring-cream-50/50"
                >
                    <UsedIcon className="w-7 h-7 text-marinho/60" strokeWidth={1.5} />
                </motion.div>
            </div>

            <div className="space-y-1 max-w-sm relative z-10">
                <h3 className="font-display font-bold text-lg text-marinho">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    {description}
                </p>
            </div>

            {action && (
                <div className="mt-8 relative z-10">
                    {action}
                </div>
            )}
        </div>
    );
}
