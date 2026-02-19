import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MemberLayout } from '@/components/layout/MemberLayout';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, Bell, CheckCircle2, MessageCircle, Users, ChevronLeft, ChevronRight, CalendarRange, X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { updateScheduleStatus, getSchedules, createSchedule, deleteSchedule, getMembers, getEventRoles } from '@/lib/supabase-queries';
import { useAuth } from '@/lib/auth';
import { useDashboardData } from '@/lib/dashboard-data';
import { PremiumToast, ToastType } from '@/components/ui/PremiumToast';

// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001'; // REMOVED

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

// Helper for Robust Params
const getSearchParamsTyped = (locationSearch: string) => {
    const routerParams = new URLSearchParams(locationSearch);
    if (routerParams.get('date')) return routerParams;
    return new URLSearchParams(window.location.search);
};

export function MemberAgendaPage() {
    const { profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate(); // Navigation hook
    const { events, invites, mySchedules, myRegistrations, refetch } = useDashboardData();

    const currentRole = profile?.role || 'membro';
    const canManage = ['admin', 'pastor_chefe', 'pastor_lider', 'lider'].includes(currentRole);

    // Toast State
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
        visible: false,
        message: '',
        type: 'success'
    });

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ visible: true, message, type });
    };

    // --- URL-DRIVEN STATE (Single Source of Truth) ---

    // 1. Robust Params Extraction (Router -> Window -> SearchParams)
    const params = getSearchParamsTyped(location.search);
    const dateParam = params.get('date');
    const eventParam = params.get('event');

    // Debug Log
    console.log('📍 [Agenda Sync] State:', { dateParam, eventParam });

    const selectedScaleDate = useMemo(() => {
        if (dateParam) {
            const [y, m, d] = dateParam.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        }
        return new Date();
    }, [dateParam]);

    // 2. Local State for Calendar Viewport (Month)
    // Initialize aggressively from whatever param source worked
    // 2. Calendar Viewport (Month) - Priority: Manual Override > URL > Today
    const [manualScaleDate, setManualScaleDate] = useState<Date | null>(null);

    // Reset manual override whenever the URL date changes (navigation occurred)
    useEffect(() => {
        setManualScaleDate(null);
    }, [dateParam]);

    const scaleDate = useMemo(() => {
        // A. User manually engaged with calendar controls
        if (manualScaleDate) return manualScaleDate;

        // B. URL dictates the month
        if (dateParam) {
            const [y, m] = dateParam.split('-').map(Number);
            return new Date(y, m - 1, 1);
        }

        // C. Default to current month
        return new Date();
    }, [manualScaleDate, dateParam]);

    // 4. Auto-select Event Card based on URL ID
    const [selectedEventIndex, setSelectedEventIndex] = useState(0);

    useEffect(() => {
        if (eventParam && events.length > 0) {
            // Filter events for the selected day exactly how the UI does

            // Wait.. selectedScaleDate might be noon local, ISO might be different? 
            // Better to use the dateParam string directly if available to match logic.
            const targetDateStr = dateParam || new Date().toISOString().substring(0, 10);

            const dayEvents = events.filter(e => e.start_date.substring(0, 10) === targetDateStr);
            const index = dayEvents.findIndex(e => e.id === eventParam);

            if (index !== -1) {
                console.log('✅ [Agenda URL] Found event index:', index);
                setSelectedEventIndex(index);
            } else {
                setSelectedEventIndex(0);
            }
        } else {
            setSelectedEventIndex(0);
        }
    }, [eventParam, events, dateParam, selectedScaleDate]); // React to URL & Data changes

    const [allSchedules, setAllSchedules] = useState<any[]>([]);

    // Management State
    const [isNewScaleOpen, setIsNewScaleOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [eventRoles, setEventRoles] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<{ [memberId: string]: string }>({}); // { memberId: role }
    const [notificationStatus, setNotificationStatus] = useState<'idle' | 'success'>('idle');
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);





    useEffect(() => {
        const loadData = async () => {
            // Optimization: Fetch only current year schedules, or +/- 6 months
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString();
            const endOfYear = new Date(today.getFullYear(), 11, 31).toISOString();

            const churchId = profile?.church_id;
            if (!churchId) return;

            const [{ data: schedulesData }, rolesData] = await Promise.all([
                getSchedules(churchId, startOfYear, endOfYear),
                // getMembers removed from here for lazy loading
                getEventRoles()
            ]);
            if (schedulesData) setAllSchedules(schedulesData);
            if (rolesData) setEventRoles(rolesData);
        };
        loadData();
    }, []);

    // Lazy load members when modal creates
    useEffect(() => {
        if (isNewScaleOpen && allMembers.length === 0 && !isLoadingMembers) {
            const loadMembers = async () => {
                setIsLoadingMembers(true);
                if (!profile?.church_id) return;
                const { data } = await getMembers(profile.church_id);
                if (data) setAllMembers(data);
                setIsLoadingMembers(false);
            };
            loadMembers();
        }
    }, [isNewScaleOpen, allMembers.length, isLoadingMembers]);

    const getEventsForDay = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const targetDateStr = `${year}-${month}-${day}`;

        return events.filter(e => {
            const eventDateStr = e.start_date.substring(0, 10);
            return eventDateStr === targetDateStr;
        });
    };

    const getSchedulesForEvent = (eventId: string) => {
        return allSchedules.filter(s => s.event_id === eventId);
    };

    const handleRespondInvite = async (scheduleId: string, status: 'confirmado' | 'recusado', eventTitle: string) => {
        try {
            const { error } = await updateScheduleStatus(scheduleId, status);
            if (error) throw error;

            showToast(status === 'confirmado' ? `Presença confirmada em: ${eventTitle}` : `Escala recusada para: ${eventTitle}`, status === 'confirmado' ? 'success' : 'warning');
            await refetch();
            // Local refresh
            if (profile?.church_id) {
                const { data } = await getSchedules(profile.church_id);
                if (data) setAllSchedules(data);
            }
        } catch (error) {
            console.error(error);
            showToast('Erro ao atualizar status.', 'error');
        }
    };



    const handleNotifyTeam = () => {
        const eventsToday = getEventsForDay(selectedScaleDate);
        const daySchedules = eventsToday.flatMap(e => getSchedulesForEvent(e.id));
        const pending = daySchedules.filter(s => s.status === 'pending' || !s.status || s.status === 'pendente');

        if (pending.length === 0) {
            showToast('Nenhuma pendência para notificar hoje.', 'warning');
            return;
        }

        setNotificationStatus('success');
        showToast(`🔔 Notificação Push enviada para ${pending.length} membros.`, 'success');
        setTimeout(() => setNotificationStatus('idle'), 3000);
    };

    const handleDeleteSchedule = async (scheduleId: string) => {
        if (!confirm('Tem certeza que deseja remover esta escala?')) return;
        try {
            const { error } = await deleteSchedule(scheduleId);
            if (error) throw error;
            showToast('Escala removida com sucesso.', 'success');
            await refetch();
            // Local refresh
            if (profile?.church_id) {
                const { data } = await getSchedules(profile.church_id);
                if (data) setAllSchedules(data);
            }
        } catch (error) {
            console.error(error);
            showToast('Erro ao remover escala.', 'error');
        }
    };

    const handleCreateSchedule = async () => {
        const memberEntries = Object.entries(selectedMembers);
        if (!selectedEventId || memberEntries.length === 0) return;

        setIsSubmitting(true);
        try {
            await Promise.all(memberEntries.map(([memberId, role]) =>
                createSchedule({
                    church_id: profile?.church_id || '',
                    event_id: selectedEventId,
                    member_id: memberId,
                    role: role,
                    status: 'pendente'
                })
            ));

            showToast('Escalas criadas com sucesso!', 'success');
            await refetch();
            // Local refresh
            if (profile?.church_id) {
                const { data } = await getSchedules(profile.church_id);
                if (data) setAllSchedules(data);
            }

            setIsNewScaleOpen(false);
            setSelectedMembers({});
        } catch (error) {
            console.error('Error creating schedule:', error);
            showToast('Erro ao criar escalas.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleIndividualWhatsApp = (member: any, event: any) => {
        if (!event || !member) return;

        const dateStr = new Date(event.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
        const timeStr = new Date(event.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const message = `Olá *${member?.full_name || 'Voluntário'}*! 👋\n\n` +
            `Você foi escalado para servir no *${event.title}*.\n` +
            `📅 Data: *${dateStr}*\n` +
            `⏰ Horário: *${timeStr}*\n\n` +
            `Por favor, confirme sua presença no App ChurchFlow!`;

        const text = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return { day: '', month: '', time: '', year: '', weekday: '' };

        // Robust parsing to avoid timezone shift for the date part
        const parts = dateString.substring(0, 10).split('-');
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);

        // Time parsing (if present in ISO)
        let timeStr = '--:--';
        if (dateString.includes('T')) {
            const tDate = new Date(dateString);
            timeStr = tDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        return {
            day: date.getDate(),
            month: date.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
            time: timeStr,
            year: date.getFullYear(),
            weekday: date.toLocaleString('pt-BR', { weekday: 'short' })
        };
    };



    const Layout = (profile?.role === 'admin' || profile?.role === 'pastor_chefe' || profile?.role === 'pastor_lider' || profile?.role === 'lider') ? DashboardLayout : MemberLayout;

    return (
        <Layout>
            <PremiumToast
                isVisible={toast.visible}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="h-full flex flex-col gap-2"
            >
                {/* Balanced Glass Header - Compacted */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[28px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="space-y-0.5 relative z-10">
                        <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                            <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">Escalas & Eventos</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            Agenda <span className="font-serif italic text-gold font-normal text-3xl">do</span> Reino
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-lg">
                            Suas Escalas, Eventos e Convites
                        </p>
                    </div>

                    {/* Integrated Stats Section - Compacted */}
                    <div className="hidden lg:flex items-center gap-4 border-x border-marinho/5 px-4 mx-2 relative z-10">
                        {[
                            { label: 'Minhas Escalas', value: mySchedules.filter(s => s.status === 'confirmado').length, color: 'text-marinho' },
                            { label: 'Eventos Inscritos', value: myRegistrations.length, color: 'text-sage' },
                            { label: 'Convites', value: invites.length, color: invites.length > 0 ? 'text-rose-500' : 'text-slate-300' }
                        ].map((stat, i) => (
                            <div key={i} className="text-center space-y-0 min-w-[60px]">
                                <p className={cn("text-base font-display font-bold italic leading-none tracking-tight", stat.color)}>{stat.value}</p>
                                <p className="text-[5px] font-black text-marinho/30 uppercase tracking-[0.2em]">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 relative z-10 w-full md:w-auto">
                        {canManage && (
                            <button
                                onClick={() => setIsNewScaleOpen(true)}
                                className="h-11 px-6 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2 group"
                            >
                                <Plus className="w-4 h-4 text-gold group-hover:rotate-90 transition-transform" />
                                <span>Nova Escala</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* === ESCALAS & VOLUNTARIADO === */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 overflow-hidden flex flex-col min-h-0"
                >
                    <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden h-full">
                        {/* Calendar Section - Dominant 75% */}
                        <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col items-stretch h-full min-h-0">
                            <div className="card-3d flex-1 flex flex-col p-3 overflow-hidden bg-white/40 backdrop-blur-xl shadow-premium rounded-[20px] border border-white/60 min-h-0">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-2 shrink-0 px-1">
                                    <div className="flex flex-col">
                                        <h2 className="text-lg font-display font-bold text-marinho italic capitalize leading-none">
                                            {scaleDate.toLocaleDateString('pt-BR', { month: 'long' })}
                                        </h2>
                                        <span className="text-[9px] font-black text-sage uppercase tracking-widest mt-0.5">{scaleDate.getFullYear()}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white/60 p-1 rounded-xl border border-white/40 shadow-sm">
                                        <button
                                            onClick={() => setManualScaleDate(new Date(scaleDate.getFullYear(), scaleDate.getMonth() - 1, 1))}
                                            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-marinho/40 hover:text-marinho"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setManualScaleDate(new Date(scaleDate.getFullYear(), scaleDate.getMonth() + 1, 1))}
                                            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-marinho/40 hover:text-marinho"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Calendar Grid - Premium Design */}
                                <div className="grid grid-cols-7 grid-rows-[auto_repeat(6,1fr)] gap-1 font-sans flex-1 min-h-0">
                                    {/* Day Headers - Weekend Highlighted */}
                                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day, idx) => (
                                        <div
                                            key={day}
                                            className={cn(
                                                "py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-center",
                                                idx === 0 ? "text-gold" : idx === 6 ? "text-sage" : "text-marinho/40"
                                            )}
                                        >
                                            {day}
                                        </div>
                                    ))}

                                    {/* Day Cells - Premium Styling */}
                                    {Array.from({ length: 42 }).map((_, i) => {
                                        const startDay = new Date(scaleDate.getFullYear(), scaleDate.getMonth(), 1).getDay();
                                        const daysInMonth = new Date(scaleDate.getFullYear(), scaleDate.getMonth() + 1, 0).getDate();

                                        const dayNumber = i - startDay + 1;
                                        const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                                        const date = new Date(scaleDate.getFullYear(), scaleDate.getMonth(), dayNumber);
                                        const dayOfWeek = date.getDay();

                                        const isSelected = isCurrentMonth &&
                                            date.getDate() === selectedScaleDate.getDate() &&
                                            date.getMonth() === selectedScaleDate.getMonth() &&
                                            date.getFullYear() === selectedScaleDate.getFullYear();

                                        const isToday = isCurrentMonth &&
                                            date.getDate() === new Date().getDate() &&
                                            date.getMonth() === new Date().getMonth() &&
                                            date.getFullYear() === new Date().getFullYear();

                                        const dayEvents = isCurrentMonth ? getEventsForDay(date) : [];
                                        const isSunday = dayOfWeek === 0;
                                        const isSaturday = dayOfWeek === 6;
                                        const hasSchedule = dayEvents.some(e => mySchedules.some(s => s.event_id === e.id));

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    if (isCurrentMonth) {
                                                        // URL-Driven Navigation
                                                        const y = date.getFullYear();
                                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                                        const d = String(date.getDate()).padStart(2, '0');
                                                        navigate(`?date=${y}-${m}-${d}`);
                                                    }
                                                }}
                                                className={cn(
                                                    "relative rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-0 group/day",
                                                    // Base states
                                                    isCurrentMonth ? (
                                                        isSelected
                                                            ? "bg-marinho text-white shadow-lg shadow-marinho/30 z-10 scale-105 border-2 border-marinho"
                                                            : isToday
                                                                ? "bg-gradient-to-b from-marinho/10 to-marinho/5 border-2 border-gold/40 ring-1 ring-gold/20"
                                                                : isSunday
                                                                    ? "bg-gradient-to-b from-gold/10 to-gold/5 border border-gold/20 hover:border-gold/40 hover:shadow-md hover:-translate-y-0.5"
                                                                    : isSaturday
                                                                        ? "bg-gradient-to-b from-sage/10 to-sage/5 border border-sage/20 hover:border-sage/40 hover:shadow-md hover:-translate-y-0.5"
                                                                        : "bg-white/40 border border-white/60 hover:bg-white hover:border-gold/20 hover:shadow-md hover:-translate-y-0.5"
                                                    ) : "bg-transparent text-slate-200 border-transparent opacity-20 select-none pointer-events-none",
                                                    // Scheduled indicator - gold left border
                                                    isCurrentMonth && hasSchedule && !isSelected && "border-l-2 border-l-gold"
                                                )}
                                            >
                                                {/* Today Badge */}
                                                {isToday && !isSelected && (
                                                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gold text-white text-[6px] font-black uppercase tracking-wider rounded-full shadow-sm">
                                                        Hoje
                                                    </span>
                                                )}

                                                {/* Day Number */}
                                                <span className={cn(
                                                    "text-sm font-semibold transition-colors",
                                                    isSelected
                                                        ? "text-white"
                                                        : isToday
                                                            ? "text-marinho font-black"
                                                            : isSunday
                                                                ? "text-gold font-semibold group-hover/day:text-gold"
                                                                : isSaturday
                                                                    ? "text-sage font-semibold group-hover/day:text-sage"
                                                                    : "text-slate-600 group-hover/day:text-marinho"
                                                )}>
                                                    {isCurrentMonth ? dayNumber : ''}
                                                </span>

                                                {/* Event Indicators */}
                                                {isCurrentMonth && dayEvents.length > 0 && (
                                                    <div className="absolute bottom-1 flex gap-0.5 items-center justify-center w-full">
                                                        {dayEvents.slice(0, 3).map((event, idx) => {
                                                            const isMySchedule = mySchedules.some(s => s.event_id === event.id);
                                                            return (
                                                                <div
                                                                    key={event.id || idx}
                                                                    className={cn(
                                                                        "w-1.5 h-1.5 rounded-full transition-transform group-hover/day:scale-125",
                                                                        isSelected
                                                                            ? "bg-gold"
                                                                            : isMySchedule
                                                                                ? "bg-gold shadow-sm shadow-gold/30"
                                                                                : "bg-marinho/30"
                                                                    )}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Gradient overlay for days with events */}
                                                {isCurrentMonth && dayEvents.length > 0 && !isSelected && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-gold/5 to-transparent rounded-b-xl pointer-events-none" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Status do Dia - Compact 25% */}
                        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col h-full min-h-0">
                            <div className="card-3d flex-1 p-2 flex flex-col gap-2 bg-white/40 backdrop-blur-xl border border-white/60 shadow-premium rounded-[20px] h-full overflow-hidden">
                                <div className="flex items-center justify-between shrink-0 pb-2 border-b border-marinho/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-soft flex items-center justify-center text-marinho border border-slate-50">
                                            <CalendarRange className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-display font-bold text-marinho italic leading-tight">Status do Dia</h3>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                {selectedScaleDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>

                                    {getEventsForDay(selectedScaleDate).length > 1 && (
                                        <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                            <button
                                                onClick={() => setSelectedEventIndex(prev => prev > 0 ? prev - 1 : getEventsForDay(selectedScaleDate).length - 1)}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded-md text-slate-400 hover:text-[#1e1b4b] transition-all"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-[9px] font-black text-slate-400 px-1 min-w-[30px] text-center">
                                                {selectedEventIndex + 1} / {getEventsForDay(selectedScaleDate).length}
                                            </span>
                                            <button
                                                onClick={() => setSelectedEventIndex(prev => prev < getEventsForDay(selectedScaleDate).length - 1 ? prev + 1 : 0)}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded-md text-slate-400 hover:text-[#1e1b4b] transition-all"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-hidden relative">
                                    {getEventsForDay(selectedScaleDate).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                                            <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20">
                                                <CalendarRange className="w-7 h-7 text-gold" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-marinho">Nenhum evento hoje</span>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Navegue pelo calendário para ver outros dias</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <AnimatePresence mode="wait">
                                            {(() => {
                                                const events = getEventsForDay(selectedScaleDate);
                                                const safeIndex = selectedEventIndex >= events.length ? 0 : selectedEventIndex;
                                                const event = events[safeIndex];

                                                if (!event) return null;

                                                const eventSchedules = getSchedulesForEvent(event.id);
                                                const mySchedule = mySchedules.find(s => s.event_id === event.id);
                                                const { time, day, month } = formatDate(event.start_date);

                                                return (
                                                    <motion.div
                                                        key={event.id}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="h-full flex flex-col"
                                                    >
                                                        {/* Card Visual Premium - Compacted */}
                                                        <div className="relative w-full bg-[#1e1b4b] rounded-xl overflow-hidden shadow-lg shrink-0 mb-2 group h-[100px]">
                                                            <div className="absolute inset-0">
                                                                {event.image_url ? (
                                                                    <img src={event.image_url} alt="" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-[#1e1b4b] via-[#2e2a5b] to-[#1e1b4b]" />
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b] via-[#1e1b4b]/60 to-transparent" />
                                                            </div>

                                                            <div className="relative p-2.5 h-full flex flex-col justify-between">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-0.5 text-center min-w-[32px]">
                                                                        <span className="block text-[6px] font-black text-white/60 uppercase tracking-wider">{month}</span>
                                                                        <span className="block text-base font-display font-black text-white leading-none">{day}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <div className="bg-[#d4af37] text-[#1e1b4b] px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                                            <Clock className="w-2 h-2" /> {time}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <span className="text-[6px] font-black text-[#d4af37] uppercase tracking-widest mb-0.5 block">
                                                                        {event.event_type || 'Evento'}
                                                                    </span>
                                                                    <h3 className="font-display text-sm font-bold italic text-white leading-tight truncate">
                                                                        {event.title}
                                                                    </h3>
                                                                </div>

                                                                {mySchedule && (
                                                                    <div className="mt-1 pt-1 border-t border-white/10">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-white text-[8px]">Sua função: <strong className="text-[#d4af37]">{mySchedule.role}</strong></span>
                                                                            <span className={`px-1.5 py-0 rounded text-[6px] font-black uppercase ${mySchedule.status === 'confirmado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#d4af37]/20 text-[#d4af37]'}`}>
                                                                                {mySchedule.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                                                                            </span>
                                                                        </div>

                                                                        {mySchedule.status === 'pendente' && (
                                                                            <div className="flex gap-1.5">
                                                                                <button
                                                                                    onClick={() => handleRespondInvite(mySchedule.id, 'confirmado', event.title)}
                                                                                    className="flex-1 h-6 bg-[#d4af37] text-[#1e1b4b] text-[7px] font-black uppercase tracking-widest rounded-lg hover:bg-white transition-all flex items-center justify-center gap-1"
                                                                                >
                                                                                    <Check className="w-2 h-2" /> Aceitar
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRespondInvite(mySchedule.id, 'recusado', event.title)}
                                                                                    className="h-6 px-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-red-500/20 transition-all"
                                                                                >
                                                                                    <X className="w-2 h-2" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 flex flex-col bg-slate-50/50 rounded-xl border border-slate-100 mb-2 min-h-0 overflow-hidden">
                                                            {/* Fixed Header */}
                                                            <div className="flex items-center justify-between p-2.5 pb-2 border-b border-slate-100 shrink-0">
                                                                <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                                    <Users className="w-2.5 h-2.5" /> Equipe Escalada
                                                                </span>
                                                                <span className="bg-white px-1.5 py-0.5 rounded shadow-sm text-[7px] font-bold text-slate-500">{eventSchedules.length}</span>
                                                            </div>

                                                            {/* Scrollable Volunteer List */}
                                                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 pt-2">
                                                                {eventSchedules.length === 0 ? (
                                                                    <p className="text-[9px] text-slate-400 italic py-4 text-center">Ninguém escalado ainda.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5">
                                                                        {eventSchedules.map(schedule => (
                                                                            <div key={schedule.id} className="flex items-center gap-2.5 p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm transition-all hover:border-[#1e1b4b]/10 group/item">
                                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold border shrink-0 ${schedule.id === mySchedule?.id ? 'bg-[#1e1b4b] text-[#d4af37] border-[#1e1b4b]' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                                                    {schedule.members?.full_name?.charAt(0) || '?'}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className={`text-[10px] font-bold truncate ${schedule.id === mySchedule?.id ? 'text-[#1e1b4b]' : 'text-slate-600'}`}>
                                                                                        {schedule.members?.full_name}
                                                                                        {schedule.id === mySchedule?.id && <span className="ml-1 text-[8px] text-[#d4af37]">(Você)</span>}
                                                                                    </p>
                                                                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none">{schedule.role}</p>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                    {canManage && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={() => handleIndividualWhatsApp(schedule.members, event)}
                                                                                                className="w-6 h-6 rounded-lg hover:bg-green-50 text-slate-300 hover:text-green-500 flex items-center justify-center transition-colors"
                                                                                            >
                                                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleDeleteSchedule(schedule.id)}
                                                                                                className="w-6 h-6 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors"
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                    {schedule.status === 'confirmado' && (
                                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-60" />
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })()}
                                        </AnimatePresence>
                                    )}
                                </div>

                                {/* Admin Action Footer */}
                                {canManage && getEventsForDay(selectedScaleDate).length > 0 && (
                                    <div className="p-3 border-t border-slate-100 bg-slate-50/30 -mx-3 -mb-3 rounded-b-2xl">
                                        <button
                                            onClick={handleNotifyTeam}
                                            disabled={notificationStatus === 'success'}
                                            className={cn(
                                                "w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2",
                                                notificationStatus === 'success'
                                                    ? "bg-emerald-500 text-white shadow-none"
                                                    : "bg-[#1e1b4b] text-[#d4af37] hover:bg-[#2e2a5b]"
                                            )}
                                        >
                                            {notificationStatus === 'success' ? (
                                                <><CheckCircle2 className="w-4 h-4" /> Enviado!</>
                                            ) : (
                                                <><Bell className="w-4 h-4 text-[#d4af37]" /> Notificar Pendentes</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>


            <AnimatePresence>
                {isNewScaleOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewScaleOpen(false)} className="absolute inset-0 bg-[#1e1b4b]/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden shadow-2xl z-10">
                            <div className="bg-[#1e1b4b] p-5 text-white flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Plus className="w-5 h-5 text-[#d4af37]" />
                                    <h3 className="font-display font-bold italic">Configurar Escala</h3>
                                </div>
                                <button onClick={() => setIsNewScaleOpen(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {/* Evento Selection */}
                                <div>
                                    <label className="text-[8px] font-black text-[#1e1b4b]/40 uppercase tracking-widest block mb-1">Evento</label>
                                    <select value={selectedEventId} onChange={e => { setSelectedEventId(e.target.value); setSelectedMembers({}); }} className="w-full h-9 px-3 bg-slate-50 rounded-lg text-[11px] font-bold outline-none border border-slate-100 focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all">
                                        <option value="">Selecione um evento...</option>
                                        {events.slice(0, 15).map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.title} - {new Date(ev.start_date).toLocaleDateString()}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Show existing schedules for selected event */}
                                {selectedEventId && (() => {
                                    const existingSchedules = allSchedules.filter(s => s.event_id === selectedEventId);
                                    if (existingSchedules.length > 0) {
                                        return (
                                            <div>
                                                <label className="text-[8px] font-black text-[#1e1b4b]/40 uppercase tracking-widest block mb-1">
                                                    Já Escalados ({existingSchedules.length})
                                                </label>
                                                <div className="space-y-1 bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                                    {existingSchedules.map(s => (
                                                        <div key={s.id} className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-100">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-500">
                                                                    {s.members?.full_name?.charAt(0) || '?'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-slate-700">{s.members?.full_name}</p>
                                                                    <p className="text-[7px] text-slate-400 uppercase">{s.role}</p>
                                                                </div>
                                                            </div>
                                                            <span className={cn(
                                                                "text-[6px] font-black uppercase px-1.5 py-0.5 rounded-full",
                                                                s.status === 'confirmado'
                                                                    ? "bg-emerald-100 text-emerald-600"
                                                                    : "bg-amber-100 text-amber-600"
                                                            )}>
                                                                {s.status === 'confirmado' ? '✓' : '⏳'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Add New Members Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[8px] font-black text-[#1e1b4b]/40 uppercase tracking-widest">Adicionar Membros</label>
                                        {Object.keys(selectedMembers).length > 0 && (
                                            <span className="text-[7px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">
                                                {Object.keys(selectedMembers).length} novo{Object.keys(selectedMembers).length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className="max-h-[160px] overflow-y-auto p-1.5 bg-slate-50 rounded-lg space-y-1 border border-slate-100 custom-scrollbar">
                                        {isLoadingMembers ? (
                                            <div className="flex flex-col items-center justify-center py-4 text-slate-400 gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-[9px] italic">Carregando membros...</span>
                                            </div>
                                        ) : allMembers.length === 0 ? (
                                            <p className="text-[9px] text-slate-400 text-center py-2 italic">Nenhum membro encontrado.</p>
                                        ) : (
                                            allMembers.filter(m => {
                                                // Hide members already scheduled for this event
                                                if (!selectedEventId) return true;
                                                return !allSchedules.some(s => s.event_id === selectedEventId && s.member_id === m.id);
                                            }).map(m => {
                                                const isSelected = m.id in selectedMembers;
                                                const selectedRole = selectedMembers[m.id] || '';
                                                return (
                                                    <div
                                                        key={m.id}
                                                        className={cn(
                                                            "p-1.5 rounded-md transition-all",
                                                            isSelected
                                                                ? "bg-[#1e1b4b] shadow-sm"
                                                                : "hover:bg-white hover:shadow-sm"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {/* Checkbox */}
                                                            <div
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        const { [m.id]: _, ...rest } = selectedMembers;
                                                                        setSelectedMembers(rest);
                                                                    } else {
                                                                        setSelectedMembers({ ...selectedMembers, [m.id]: eventRoles[0]?.label || 'Voluntário' });
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer",
                                                                    isSelected
                                                                        ? "bg-gold border-gold"
                                                                        : "border-slate-300 bg-white"
                                                                )}
                                                            >
                                                                {isSelected && <Check className="w-2 h-2 text-[#1e1b4b]" />}
                                                            </div>

                                                            {/* Avatar */}
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0",
                                                                isSelected
                                                                    ? "bg-gold/20 text-gold"
                                                                    : "bg-slate-200 text-slate-500"
                                                            )}>
                                                                {m.full_name?.charAt(0) || '?'}
                                                            </div>

                                                            {/* Name */}
                                                            <span
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        const { [m.id]: _, ...rest } = selectedMembers;
                                                                        setSelectedMembers(rest);
                                                                    } else {
                                                                        setSelectedMembers({ ...selectedMembers, [m.id]: eventRoles[0]?.label || 'Voluntário' });
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "text-[10px] font-bold truncate flex-1 cursor-pointer",
                                                                    isSelected ? "text-white" : "text-slate-600"
                                                                )}
                                                            >
                                                                {m.full_name}
                                                            </span>

                                                            {/* Per-member role dropdown when selected */}
                                                            {isSelected && (
                                                                <select
                                                                    value={selectedRole}
                                                                    onClick={e => e.stopPropagation()}
                                                                    onChange={e => setSelectedMembers({ ...selectedMembers, [m.id]: e.target.value })}
                                                                    className="h-5 px-1 bg-gold/20 border border-gold/30 rounded text-[8px] font-bold text-gold outline-none cursor-pointer"
                                                                >
                                                                    {eventRoles.map(r => <option key={r.id} value={r.label} className="text-slate-700 bg-white">{r.label}</option>)}
                                                                </select>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <p className="text-[7px] text-slate-400 mt-1 text-center">Selecione membros e escolha a função</p>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleCreateSchedule}
                                    disabled={isSubmitting || !selectedEventId || Object.keys(selectedMembers).length === 0}
                                    className="w-full h-10 bg-[#1e1b4b] text-[#d4af37] rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a2660] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Adicionar à Escala {Object.keys(selectedMembers).length > 0 && `(${Object.keys(selectedMembers).length})`}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
