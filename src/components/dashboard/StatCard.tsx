import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    description?: string;
    accentColor?: 'sage' | 'slate' | 'gold';
}

export function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    accentColor = 'sage'
}: StatCardProps) {
    const accentClasses = {
        sage: 'bg-sage-100 text-sage-600',
        slate: 'bg-slate-100 text-slate-600',
        gold: 'bg-gold/20 text-gold-dark',
    };

    const trendPositive = trend && trend > 0;
    const trendNegative = trend && trend < 0;

    return (
        <div className="card-premium p-8 group hover:shadow-glass-lg transition-all duration-500 texture-engraving">
            {/* Icon */}
            <div className={cn(
                "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 transition-transform duration-300 group-hover:scale-105",
                accentClasses[accentColor]
            )}>
                <Icon className="h-7 w-7" />
            </div>

            {/* Title */}
            <p className="text-sm font-medium text-charcoal-500 tracking-wide uppercase mb-3">
                {title}
            </p>

            {/* Value - Large Serif Number */}
            <div className="flex items-end gap-4 mb-2">
                <span className="font-display text-5xl font-semibold text-charcoal-900 tracking-tight leading-none">
                    {value}
                </span>

                {/* Trend Badge */}
                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-1",
                        trendPositive && "bg-sage-100 text-sage-600",
                        trendNegative && "bg-red-50 text-red-600",
                        !trendPositive && !trendNegative && "bg-charcoal-100 text-charcoal-500"
                    )}>
                        {trendPositive && <TrendingUp className="h-3 w-3" />}
                        {trendNegative && <TrendingDown className="h-3 w-3" />}
                        <span>{trend > 0 ? '+' : ''}{trend}%</span>
                    </div>
                )}
            </div>

            {/* Description */}
            {description && (
                <p className="text-sm text-charcoal-400 mt-2">{description}</p>
            )}
        </div>
    );
}
