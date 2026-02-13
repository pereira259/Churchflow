import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, MessageCircle, Check, X, ChevronRight,
    UserMinus, Cake, Sprout, RotateCcw, AlertTriangle,
    Loader2
} from 'lucide-react';
import { PastoralAlert, ALERT_SEVERITY, markAlertRead, markAlertActioned, dismissAlert } from '@/lib/pastoral-engine';
import { cn } from '@/lib/utils';

const ALERT_TYPE_CONFIG = {
    inatividade: { icon: UserMinus, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Ausência' },
    sobrecarga: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', label: 'Sobrecarga' },
    aniversario: { icon: Cake, color: 'text-pink-500', bg: 'bg-pink-50', label: 'Aniversário' },
    retorno: { icon: ChevronRight, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Retorno' },
    novo_convertido: { icon: Sprout, color: 'text-green-500', bg: 'bg-green-50', label: 'Novo Membro' },
    follow_up_pendente: { icon: RotateCcw, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Follow-up' }
} as const;

interface PastoralAlertsFeedProps {
    alerts: PastoralAlert[];
    loading: boolean;
    onRefresh: () => void;
    compact?: boolean;
}

export function PastoralAlertsFeed({ alerts, loading, onRefresh, compact = false }: PastoralAlertsFeedProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleAction = async (alert: PastoralAlert) => {
        setProcessingId(alert.id);
        if (alert.suggested_message && alert.members?.phone) {
            const phone = alert.members.phone.replace(/\D/g, '');
            const finalPhone = phone.startsWith('55') ? phone : `55${phone}`;
            const message = encodeURIComponent(alert.suggested_message);
            window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
        }
        await markAlertActioned(alert.id);
        onRefresh();
        setProcessingId(null);
    };

    const handleDismiss = async (id: string) => {
        setProcessingId(id);
        await dismissAlert(id);
        onRefresh();
        setProcessingId(null);
    };

    const handleMarkRead = async (id: string) => {
        await markAlertRead(id);
        onRefresh();
    };

    const unreadCount = alerts.filter(a => !a.is_read).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-marinho/30" />
            </div>
        );
    }

    // Compact mode for Dashboard widget
    if (compact) {
        const displayAlerts = alerts.filter(a => !a.is_read).slice(0, 5);
        return (
            <div className="space-y-1.5">
                {displayAlerts.length === 0 ? (
                    <div className="flex flex-col items-center py-4 text-center">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                            <Check className="h-4 w-4 text-emerald-400" />
                        </div>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Tudo em dia!</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">Nenhum alerta pastoral pendente.</p>
                    </div>
                ) : (
                    displayAlerts.map((alert) => {
                        const config = ALERT_TYPE_CONFIG[alert.type];
                        const Icon = config.icon;
                        return (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2.5 p-2 rounded-xl border border-white/80 bg-white/50 shadow-sm hover:bg-white hover:shadow-md transition-all group cursor-pointer"
                                onClick={() => handleMarkRead(alert.id)}
                            >
                                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-display font-bold text-marinho italic truncate">{alert.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={cn("px-1 py-0.5 rounded text-[7px] font-black uppercase", ALERT_SEVERITY[alert.severity].color)}>
                                            {ALERT_SEVERITY[alert.severity].label}
                                        </span>
                                        <span className="text-[7px] text-slate-400 font-bold">
                                            {alert.members?.full_name}
                                        </span>
                                    </div>
                                </div>
                                {alert.suggested_message && alert.members?.phone && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleAction(alert); }}
                                        disabled={processingId === alert.id}
                                        className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shrink-0 opacity-0 group-hover:opacity-100"
                                    >
                                        {processingId === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
                                    </button>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>
        );
    }

    // Full mode
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Bell className="h-4 w-4 text-marinho" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 text-white rounded-full text-[7px] font-black flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[9px] font-black text-marinho uppercase tracking-widest">Alertas do Motor Pastoral</span>
                </div>
            </div>

            <AnimatePresence>
                {alerts.map((alert) => {
                    const config = ALERT_TYPE_CONFIG[alert.type];
                    const Icon = config.icon;
                    const isExpanded = expandedId === alert.id;

                    return (
                        <motion.div
                            key={alert.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className={cn(
                                "rounded-xl border overflow-hidden transition-all",
                                alert.is_read ? "bg-white/50 border-slate-100" : "bg-white border-slate-200 shadow-sm",
                                alert.is_actioned && "opacity-50"
                            )}
                        >
                            <button
                                onClick={() => {
                                    setExpandedId(isExpanded ? null : alert.id);
                                    if (!alert.is_read) handleMarkRead(alert.id);
                                }}
                                className="w-full flex items-center gap-3 p-3 text-left"
                            >
                                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                                    <Icon className={cn("h-4 w-4", config.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-[11px] font-bold text-marinho truncate", !alert.is_read && "font-display italic")}>
                                        {alert.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase", ALERT_SEVERITY[alert.severity].color)}>
                                            {ALERT_SEVERITY[alert.severity].label}
                                        </span>
                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">
                                            {config.label}
                                        </span>
                                    </div>
                                </div>
                                {!alert.is_read && <div className="h-2 w-2 rounded-full bg-marinho shrink-0" />}
                                <ChevronRight className={cn("h-3 w-3 text-slate-300 transition-transform", isExpanded && "rotate-90")} />
                            </button>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-3 pb-3 space-y-2.5 border-t border-slate-100 pt-2.5">
                                            {alert.description && (
                                                <p className="text-[10px] text-slate-600 leading-relaxed">{alert.description}</p>
                                            )}
                                            {alert.suggested_action && (
                                                <div className="flex items-start gap-2 p-2 bg-blue-50/50 rounded-lg">
                                                    <span className="text-[8px]">💡</span>
                                                    <p className="text-[9px] text-blue-700 font-medium">{alert.suggested_action}</p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {alert.suggested_message && alert.members?.phone && (
                                                    <button
                                                        onClick={() => handleAction(alert)}
                                                        disabled={processingId === alert.id}
                                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {processingId === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
                                                        Enviar Mensagem
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDismiss(alert.id)}
                                                    disabled={processingId === alert.id}
                                                    className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
