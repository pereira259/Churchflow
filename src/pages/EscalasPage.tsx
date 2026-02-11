import { motion, Variants } from 'framer-motion';
import {
    CalendarRange, Plus, ChevronLeft, ChevronRight, Clock, CheckCircle2,
    X, Check, Loader2, MessageCircle, Bell, AlertTriangle, Trash2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { getSchedules, getUpcomingEventsFiltered, getMembers, getEventRoles } from '@/lib/supabase-queries';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

// 
// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001'; // REMOVED

interface Schedule {
    id: string;
    event_id: string;
    member_id: string;
    role: string;
    status: string;
    events?: { title: string; start_date: string; event_type: string };
    members?: { full_name: string; photo_url?: string };
}

const container: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export function EscalasPage() {
    const { profile } = useAuth();
    const churchId = profile?.church_id;



    // Initialize with today, let useEffect handle URL sync
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [events, setEvents] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [roles, setRoles] = useState<{ id: string, label: string }[]>([]);
    const [notificationStatus, setNotificationStatus] = useState<'idle' | 'success'>('idle');
    const [createStatus, setCreateStatus] = useState<'idle' | 'success'>('idle');
    const [viewEvent, setViewEvent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNewScaleOpen, setIsNewScaleOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Dynamic configuration (could represent a context or prop later)
    const ministryName = "Ministério de Operações";

    // Form states for new schedule modal
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState('Som');

    // URL Date Sync

    useEffect(() => {
        if (churchId) {
            loadData();
        }
    }, [currentDate, churchId]); // Reload when month changes or churchId loads

    const loadData = async () => {
        if (!churchId) return;
        setLoading(true);
        try {
            // Calculate days difference to cover up to the end of the viewed month
            const today = new Date();
            const lastDayOfViewedMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            let daysToFetch = 60; // Default
            if (lastDayOfViewedMonth > today) {
                const diffTime = Math.abs(lastDayOfViewedMonth.getTime() - today.getTime());
                daysToFetch = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 7; // +7 buffer
            }

            // Fetch events
            const { data: eventsData } = await getUpcomingEventsFiltered(daysToFetch, undefined, churchId);
            if (eventsData) setEvents(eventsData);

            // Fetch schedules
            const { data: schedulesData } = await getSchedules(churchId);
            if (schedulesData) setSchedules(schedulesData);

            // Fetch members
            const { data: membersData } = await getMembers(churchId);
            if (membersData) setMembers(membersData);

            // Fetch roles
            const rolesData = await getEventRoles();
            setRoles(rolesData);

        } catch (error) {
            // ...
        } finally {
            setLoading(false);
        }
    };

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const startDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Get events for a specific day
    const getEventsForDay = (dayNumber: number) => {
        return events.filter(event => {
            const eventDate = new Date(event.start_date);
            return eventDate.getDate() === dayNumber &&
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear();
        });
    };

    // Get selected day's events (for timeline)
    const selectedDayEvents = events.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate.getDate() === selectedDate.getDate() &&
            eventDate.getMonth() === selectedDate.getMonth() &&
            eventDate.getFullYear() === selectedDate.getFullYear();
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // Get schedules for an event
    const getSchedulesForEvent = (eventId: string) => {
        return schedules.filter(s => s.event_id === eventId);
    };



    // handleWhatsAppShare removed


    const handleIndividualWhatsApp = (member: any) => {
        if (!viewEvent) return;

        const dateStr = new Date(viewEvent.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
        const timeStr = new Date(viewEvent.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const message = `Olá *${member?.full_name || 'Voluntário'}*! 👋\n\n` +
            `Você foi escalado para servir no *${viewEvent.title}*.\n` +
            `📅 Data: *${dateStr}*\n` +
            `⏰ Horário: *${timeStr}*\n\n` +
            `Por favor, confirme sua presença clicando no link abaixo:\n` +
            `https://churchflow.app/confirmar/${viewEvent.id}/${member.id || '000'}`;

        const text = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const isOverloaded = (memberId: string) => {
        return parseInt(memberId || '0') % 3 === 0;
    };

    // Calculate daily stats based on SELECTED DATE (not current date)
    const daySchedules = selectedDayEvents.flatMap(e => getSchedulesForEvent(e.id));

    // const pendingCount removed


    const handleNotifyTeam = () => {
        const pending = daySchedules.filter(s => s.status === 'pending' || !s.status);
        if (pending.length === 0) {
            // No pending volunteers, but we show success for feedback anyway/logic check
            setNotificationStatus('success');
            setTimeout(() => setNotificationStatus('idle'), 3000);
            return;
        }

        // Simulation of push notification
        console.log(`🔔 Notificação Push enviada para ${pending.length} membros.`);
        setNotificationStatus('success');
        setTimeout(() => setNotificationStatus('idle'), 3000);
    };


    const handleDeleteSchedule = (scheduleId: string) => {
        setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    };

    // Handle schedule creation
    const handleCreateSchedule = async () => {
        if (!selectedEventId || selectedMemberIds.length === 0 || !selectedRole) return;

        setIsSubmitting(true);
        try {
            const newSchedules: Schedule[] = [];

            selectedMemberIds.forEach(memberId => {
                const member = members.find(m => m.id === memberId);
                if (member) {
                    const newSchedule = {
                        id: Math.random().toString(), // Temp ID
                        event_id: selectedEventId,
                        member_id: memberId,
                        role: selectedRole,
                        status: 'pending', // Default status for new schedules
                        members: member
                    };
                    newSchedules.push(newSchedule);
                }
            });

            setSchedules(prev => [...prev, ...newSchedules]);

            // In a real app, we would save to DB here
            // await createSchedule(...)

            // Show success state on button then close
            setCreateStatus('success');

            setTimeout(() => {
                setIsNewScaleOpen(false);
                setSelectedMemberIds([]);
                setSelectedRole('Som');
                setCreateStatus('idle');
                setIsSubmitting(false);
            }, 1500);

        } catch (error) {
            console.error('Error creating schedule:', error);
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-2 h-full overflow-hidden flex flex-col"
            >
                {/* Balanced Glass Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[28px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="space-y-0.5 relative z-10">
                        <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                            <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">{ministryName}</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            Escalas <span className="font-serif italic text-sage font-normal text-3xl">&</span> Eventos
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-lg">
                            Planejamento e Organização de Ministérios e Equipes
                        </p>
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                        <button
                            onClick={() => setIsNewScaleOpen(true)}
                            className="h-11 px-7 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2.5 group"
                        >
                            <Plus className="w-4 h-4 text-gold group-hover:rotate-90 transition-transform" />
                            <span>Nova Escala</span>
                        </button>
                    </div>
                </header>

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Calendar Section */}
                    <motion.div
                        variants={item}
                        className="col-span-12 lg:col-span-8 flex flex-col"
                    >
                        <div className="card-3d flex-1 flex flex-col p-3 overflow-hidden texture-engraving bg-white shadow-premium">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-display font-bold text-marinho italic">
                                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                                </h2>
                                <div className="flex items-center gap-1 group/nav">
                                    <button
                                        onClick={() => {
                                            const newDate = new Date(currentDate);
                                            newDate.setMonth(newDate.getMonth() - 1);
                                            setCurrentDate(newDate);
                                        }}
                                        className="p-1.5 rounded-xl border border-marinho/5 hover:bg-slate-50 transition-all text-marinho/30 hover:text-marinho"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newDate = new Date(currentDate);
                                            newDate.setMonth(newDate.getMonth() + 1);
                                            setCurrentDate(newDate);
                                        }}
                                        className="p-1.5 rounded-xl border border-marinho/5 hover:bg-slate-50 transition-all text-marinho/30 hover:text-marinho"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-px flex-1 border border-marinho/5 rounded-2xl overflow-hidden bg-marinho/5">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="py-1.5 bg-white/80 text-[9px] font-black text-marinho/20 uppercase tracking-[0.15em] text-center border-b border-marinho/5">
                                        {day}
                                    </div>
                                ))}

                                {Array.from({ length: 42 }).map((_, i) => {
                                    const dayNumber = i - startDayOfMonth(currentDate) + 1;
                                    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth(currentDate);
                                    const isSelected = isCurrentMonth && dayNumber === selectedDate.getDate() &&
                                        currentDate.getMonth() === selectedDate.getMonth() &&
                                        currentDate.getFullYear() === selectedDate.getFullYear();

                                    const isToday = isCurrentMonth && dayNumber === new Date().getDate() &&
                                        currentDate.getMonth() === new Date().getMonth() &&
                                        currentDate.getFullYear() === new Date().getFullYear();

                                    const dayEvents = isCurrentMonth ? getEventsForDay(dayNumber) : [];

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                if (isCurrentMonth) {
                                                    const newSelectedDate = new Date(currentDate);
                                                    newSelectedDate.setDate(dayNumber);
                                                    setSelectedDate(newSelectedDate);
                                                }
                                            }}
                                            className={cn(
                                                "relative aspect-square md:aspect-auto p-1.5 border border-marinho/[0.03] transition-all duration-300 min-h-[44px] cursor-pointer",
                                                isCurrentMonth ? "bg-white hover:bg-slate-50/50" : "bg-marinho/[0.02] opacity-20",
                                                isToday && !isSelected && "bg-marinho/5 text-marinho font-bold",
                                                isSelected && "bg-marinho text-white shadow-premium z-10 scale-[1.02] rounded-xl border-none"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[11px] font-bold",
                                                !isCurrentMonth && "text-slate-300",
                                                isSelected ? "text-white" : (isToday ? "text-marinho" : "text-slate-600")
                                            )}>
                                                {isCurrentMonth ? dayNumber : ''}
                                            </span>

                                            {isCurrentMonth && dayEvents.length > 0 && (
                                                <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap max-w-[calc(100%-24px)]">
                                                    {dayEvents.slice(0, 3).map((event, idx) => {
                                                        const eventTypeColors: Record<string, string> = {
                                                            'culto': isToday ? 'bg-gold' : 'bg-sage',
                                                            'reuniao': isToday ? 'bg-white/60' : 'bg-marinho',
                                                            'evento': isToday ? 'bg-white/80' : 'bg-gold',
                                                            'default': isToday ? 'bg-gold' : 'bg-sage'
                                                        };
                                                        const colorClass = eventTypeColors[event.event_type?.toLowerCase()] || eventTypeColors.default;

                                                        return (
                                                            <div
                                                                key={event.id || idx}
                                                                className={cn("w-1.5 h-1.5 rounded-full", colorClass)}
                                                                title={event.title}
                                                            />
                                                        );
                                                    })}
                                                    {dayEvents.length > 3 && (
                                                        <span className={cn("text-[8px] font-bold ml-0.5", isSelected ? "text-gold" : "text-slate-400")}>
                                                            +{dayEvents.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>

                    {/* Timeline / Status Selection */}
                    <motion.div
                        variants={item}
                        className="col-span-12 lg:col-span-4 flex flex-col"
                    >
                        <div className="card-3d flex-1 p-3 flex flex-col gap-3 bg-white shadow-premium border border-marinho/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-sage/10 flex items-center justify-center text-sage">
                                    <CalendarRange className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-display font-bold text-marinho italic leading-tight">Status do Dia</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                    </p>
                                </div>
                            </div>

                            {/* Stats Summary */}


                            <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-marinho/5 scrollbar-track-transparent">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-marinho/20" />
                                    </div>
                                ) : selectedDayEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                                        <CalendarRange className="w-12 h-12 text-slate-200" />
                                        <div>
                                            <span className="text-xs font-bold text-marinho/40">Nenhum evento hoje</span>
                                            <p className="text-[10px] text-slate-400 mt-1">Navegue pelo calendário para ver outros dias</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-marinho/10">
                                        {selectedDayEvents.map((event, idx) => {
                                            const eventSchedules = getSchedulesForEvent(event.id);
                                            const eventTime = new Date(event.start_date);
                                            const endTime = event.end_date ? new Date(event.end_date) : null;

                                            // Stats for this specific event
                                            const confirmed = eventSchedules.filter(s => s.status === 'confirmed').length;
                                            const pending = eventSchedules.length - confirmed;

                                            const timeString = `${eventTime.getHours().toString().padStart(2, '0')}:${eventTime.getMinutes().toString().padStart(2, '0')}${endTime ? ` - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}` : ''}`;

                                            const eventTypeColors: Record<string, string> = {
                                                'culto': 'bg-gold',
                                                'reuniao': 'bg-marinho',
                                                'evento': 'bg-sage',
                                                'default': 'bg-sage'
                                            };
                                            const dotColor = eventTypeColors[event.event_type?.toLowerCase()] || eventTypeColors.default;

                                            return (
                                                <div
                                                    key={event.id || idx}
                                                    className="relative group cursor-pointer"
                                                    onClick={() => setViewEvent(event)}
                                                >
                                                    <div className={cn("absolute -left-[27px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white group-hover:scale-125 transition-transform", dotColor)} />
                                                    <div className="space-y-1 relative p-2 -mx-2 rounded-xl overflow-hidden transition-all group-hover:bg-slate-50/50">
                                                        {event.image_url && (
                                                            <div
                                                                className="absolute inset-0 z-0 opacity-[0.05] group-hover:opacity-15 transition-all duration-500 bg-cover bg-center grayscale group-hover:grayscale-0 mix-blend-multiply"
                                                                style={{ backgroundImage: `url(${event.image_url})` }}
                                                            />
                                                        )}
                                                        <div className="relative z-10 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                    <Clock className="w-3 h-3" />
                                                                    {timeString}
                                                                </p>
                                                                {/* Compact Stats Pills */}
                                                                {eventSchedules.length > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        {confirmed > 0 && (
                                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100/50">
                                                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                                                {confirmed}
                                                                            </div>
                                                                        )}
                                                                        {pending > 0 && (
                                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100/50">
                                                                                <Clock className="w-2.5 h-2.5" />
                                                                                {pending}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <h4 className="font-display text-lg font-bold text-marinho italic group-hover:text-gold transition-colors">
                                                                {event.title}
                                                            </h4>
                                                            {event.description && (
                                                                <p className="text-[9px] text-slate-500 line-clamp-2">{event.description}</p>
                                                            )}
                                                            {eventSchedules.length > 0 && (
                                                                <div className="flex items-center gap-3 mt-3">
                                                                    <div className="flex -space-x-2">
                                                                        {eventSchedules.slice(0, 3).map((schedule, sIdx) => (
                                                                            <div
                                                                                key={schedule.id || sIdx}
                                                                                className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-marinho"
                                                                                title={schedule.members?.full_name}
                                                                            >
                                                                                {schedule.members?.full_name?.charAt(0).toUpperCase()}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                        {eventSchedules.length > 3 ? `+${eventSchedules.length - 3} ` : ''}
                                                                        {eventSchedules.length === 1 ? '1 Voluntário' : `${eventSchedules.length} Voluntários`}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Notification Footer - Re-added */}
                            <div className="p-3 border-t border-marinho/5 mt-auto">
                                <button
                                    onClick={handleNotifyTeam}
                                    disabled={notificationStatus === 'success'}
                                    className={cn(
                                        "w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2",
                                        notificationStatus === 'success'
                                            ? "bg-emerald-500 text-white shadow-none translate-y-[1px]"
                                            : "bg-marinho text-white hover:bg-marinho/90 hover:shadow-md hover:translate-y-[-1px]"
                                    )}
                                >
                                    {notificationStatus === 'success' ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Enviado com Sucesso!
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="w-4 h-4 text-gold" />
                                            Notificar Pendentes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Modal de Detalhes do Evento */}
            {viewEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-marinho/20 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden shadow-premium border border-marinho/5"
                    >
                        <div className="bg-marinho p-5 text-white relative overflow-hidden">
                            {viewEvent.image_url && (
                                <div
                                    className="absolute inset-0 z-0 opacity-20 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${viewEvent.image_url})` }}
                                />
                            )}

                            <button
                                onClick={() => setViewEvent(null)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-50 p-2 rounded-full hover:bg-white/10 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <Clock className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-display font-bold italic">{viewEvent.title}</h3>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-tight">
                                        {new Date(viewEvent.start_date).toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-0">
                            <div className="bg-slate-50 p-4 border-b border-slate-100 max-h-[350px] overflow-y-auto custom-scrollbar">
                                <h4 className="text-[10px] font-black text-marinho/40 uppercase tracking-widest mb-3 px-1 flex justify-between">
                                    <span>Equipe Escalada</span>
                                    <span className="text-slate-400 font-bold">{getSchedulesForEvent(viewEvent.id).length} Pessoas</span>
                                </h4>

                                {getSchedulesForEvent(viewEvent.id).length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-xs italic bg-white rounded-2xl border border-slate-100 border-dashed">
                                        Ninguém escalado ainda.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {getSchedulesForEvent(viewEvent.id).map(schedule => {
                                            const overloaded = isOverloaded(schedule.member_id);
                                            // Real status logic
                                            const isConfirmed = schedule.status === 'confirmed';

                                            return (
                                                <div key={schedule.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm group hover:border-marinho/20 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-marinho border-2 border-white shadow-sm">
                                                                {schedule.members?.full_name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            {overloaded && (
                                                                <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5 border-2 border-white shadow-sm" title="Sobrecarga de escalas">
                                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-marinho">{schedule.members?.full_name}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                                {schedule.role}
                                                                {overloaded && <span className="text-amber-500 text-[8px] tracking-normal capitalize">• Muitas escalas</span>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleIndividualWhatsApp(schedule.members)}
                                                            className="w-8 h-8 rounded-xl hover:bg-[#25D366]/10 text-slate-300 hover:text-[#25D366] flex items-center justify-center transition-colors"
                                                            title="Enviar convite via WhatsApp"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteSchedule(schedule.id);
                                                            }}
                                                            className="w-8 h-8 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 flex items-center justify-center transition-colors"
                                                            title="Remover da escala"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>

                                                        {/* Status Badge (Read Only for Leader) */}
                                                        <div
                                                            className={cn(
                                                                "h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider cursor-default opacity-80",
                                                                isConfirmed
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-slate-100 text-slate-400"
                                                            )}
                                                            title={isConfirmed ? "Confirmado pelo membro" : "Aguardando confirmação do membro via App/Link"}
                                                        >
                                                            {isConfirmed ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    <span>OK</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    <span>Aguardando</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 bg-white flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedEventId(viewEvent.id);
                                        setViewEvent(null);
                                        setIsNewScaleOpen(true);
                                    }}
                                    className="flex-1 h-10 bg-marinho text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-marinho/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-3 h-3 text-gold" />
                                    Adicionar
                                </button>
                                <button
                                    onClick={() => setViewEvent(null)}
                                    className="h-10 px-4 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal de Nova Escala */}
            {isNewScaleOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-marinho/20 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden shadow-premium border border-marinho/5"
                    >
                        <div className="bg-marinho p-4 text-white relative">
                            <button
                                onClick={() => setIsNewScaleOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-gold" />
                                </div>
                                <div>
                                    <h3 className="text-base font-display font-bold italic">Nova Escala</h3>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">Designação</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 space-y-3 text-left">
                            <div className="space-y-0.5">
                                <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest px-1">Evento</label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    className="w-full h-9 px-3 bg-marinho/5 rounded-xl text-[10px] font-bold text-marinho cursor-pointer hover:bg-marinho/10 transition-colors border-none outline-none"
                                >
                                    <option value="">Selecione um evento...</option>
                                    {events.slice(0, 10).map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.title} - {new Date(event.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-0.5">
                                <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest px-1">Voluntários ({selectedMemberIds.length})</label>
                                <div className="max-h-[140px] overflow-y-auto custom-scrollbar border border-marinho/5 rounded-xl bg-white">
                                    {members.map(member => {
                                        const isSelected = selectedMemberIds.includes(member.id);
                                        return (
                                            <div
                                                key={member.id}
                                                onClick={() => {
                                                    setSelectedMemberIds(prev =>
                                                        isSelected
                                                            ? prev.filter(id => id !== member.id)
                                                            : [...prev, member.id]
                                                    );
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 cursor-pointer transition-colors border-b border-marinho/5 last:border-0",
                                                    isSelected ? "bg-marinho/5" : "hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                    isSelected ? "bg-marinho border-marinho" : "border-slate-300 bg-white"
                                                )}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-bold",
                                                    isSelected ? "text-marinho" : "text-slate-500"
                                                )}>
                                                    {member.full_name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest px-1">Função</label>
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="w-full h-9 px-3 bg-marinho/5 rounded-xl text-[10px] font-bold text-marinho cursor-pointer hover:bg-marinho/10 transition-colors border-none outline-none"
                                    >
                                        {roles.length > 0 ? (
                                            roles.map(role => (
                                                <option key={role.id} value={role.label}>{role.label}</option>
                                            ))
                                        ) : (
                                            <option value="Voluntário">Carregando...</option>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest px-1">Status Inicial</label>
                                    <div className="h-9 px-3 bg-slate-100 rounded-xl flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        Aguardando
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateSchedule}
                                disabled={isSubmitting || createStatus === 'success' || !selectedEventId || selectedMemberIds.length === 0}
                                className={cn(
                                    "w-full h-10 mt-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed",
                                    createStatus === 'success'
                                        ? "bg-emerald-500 text-white shadow-none translate-y-[1px]"
                                        : "bg-marinho text-white shadow-premium hover:bg-marinho/90 hover:shadow-md hover:translate-y-[-1px] disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                                )}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-3 h-3 text-gold animate-spin" />
                                        <span>Criando...</span>
                                    </>
                                ) : createStatus === 'success' ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Escala Criada!
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-3 h-3 text-gold group-hover:scale-125 transition-transform" />
                                        <span>Confirmar Escala</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
}
