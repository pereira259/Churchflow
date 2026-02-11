import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    MapPin,
    Clock,
    Plus,
    X,
    Loader2,
    Save,
    Trash2,
    Users,
    AlertTriangle,
    CheckCircle2,
    ImagePlus,
    Calendar as CalendarIcon,
    Repeat,
    Edit
} from 'lucide-react';
import { PremiumCalendar } from '@/components/ui/PremiumCalendar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
    getEvents,
    createEvent,
    deleteEvent,
    updateEvent,
    Event,
    getMembers,
    Member,
    createSchedule,
    getSchedules,
    checkScheduleConflict,
    deleteSchedule,
    getRegistrationsByEvent,
    getRegistrations
} from '@/lib/supabase-queries';
import { useDashboardData } from '@/lib/dashboard-data';

export function EventosPage() {
    const { profile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const churchId = profile?.church_id;

    // PRIMARY DATA SOURCE: useDashboardData — instant, already cached by DashboardDataProvider
    const { events: dashboardEvents, refetch: refetchDashboard } = useDashboardData();

    // Local state for events (combines dashboard + background fetch for past events)
    const [events, setEvents] = useState<Event[]>([]);
    const [allRegistrations, setAllRegistrations] = useState<any[]>([]);

    // NO loading spinner! Events render instantly from dashboard data
    const [loading, setLoading] = useState(false);

    // Hydrate from dashboard data instantly
    useEffect(() => {
        if (dashboardEvents.length > 0) {
            setEvents(prev => prev.length > 0 ? prev : dashboardEvents);
        }
    }, [dashboardEvents]);

    const [showNewEventModal, setShowNewEventModal] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    // Event Management State (Scale + Registrations)
    const [showManageModal, setShowManageModal] = useState(false);
    const [activeManagementTab, setActiveManagementTab] = useState<'escala' | 'inscritos'>('escala');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [eventSchedules, setEventSchedules] = useState<any[]>([]);
    const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
    const [manageLoading, setManageLoading] = useState(false);

    // New Schedule Form
    const [newScheduleData, setNewScheduleData] = useState({
        memberId: '',
        role: 'Vocais'
    });
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    const [newEventData, setNewEventData] = useState({
        title: '',
        description: '',
        event_type: 'culto',
        date: '',
        time: '',
        location: '',
        capacity: 0,
        price: 0,
        preacher: '',
        image_url: '',
        recurrence: 'none',
        occurrences: 4
    });

    const [showCalendar, setShowCalendar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // File upload handler for event images
    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!churchId) {
            alert('Erro: Igreja não identificada. Recarregue a página.');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Arquivo muito grande! Máximo 5MB.');
            return;
        }

        try {
            setIsSaving(true);
            const { supabase } = await import('@/lib/supabase');
            if (!supabase) {
                alert('Erro: Supabase não configurado.');
                return;
            }

            const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `event-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `events/${churchId}/${fileName}`;

            console.log('[UPLOAD] Starting upload:', { filePath, fileSize: file.size, fileType: file.type });

            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('church-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error('[UPLOAD] Upload failed:', uploadError);

                // If bucket doesn't exist, try to inform user
                if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
                    alert('Erro: O bucket "church-assets" não existe no Supabase Storage. Crie-o no painel do Supabase com acesso público.');
                } else if (uploadError.message?.includes('security') || uploadError.message?.includes('policy') || uploadError.message?.includes('row-level')) {
                    alert('Erro de permissão: Configure as políticas de storage no Supabase para permitir uploads.');
                } else {
                    alert(`Erro no upload: ${uploadError.message}`);
                }
                return;
            }

            console.log('[UPLOAD] Upload success:', uploadData);

            const { data: { publicUrl } } = supabase.storage
                .from('church-assets')
                .getPublicUrl(filePath);

            console.log('[UPLOAD] Public URL:', publicUrl);
            setNewEventData(prev => ({ ...prev, image_url: publicUrl }));
        } catch (error: any) {
            console.error('[UPLOAD] Critical error:', error);
            alert(`Erro inesperado no upload: ${error?.message || 'Erro desconhecido'}`);
        } finally {
            setIsSaving(false);
            // Reset the file input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // BACKGROUND FULL FETCH — supplements dashboard data with past events + registrations
    useEffect(() => {
        if (!churchId) return;
        loadFullEvents();
    }, [churchId]);

    const loadFullEvents = async () => {
        if (!churchId) return;

        try {
            // Fetch events from last 30 days + future (broader than dashboard's today-only)
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 30);
            const startDateStr = pastDate.toISOString();

            const eventsRes = await getEvents(churchId, startDateStr);

            if (!eventsRes.error && eventsRes.data) {
                const fetchedEvents = eventsRes.data;
                setEvents(fetchedEvents);

                // Fetch registrations for capacity indicators
                const eventIds = fetchedEvents.map(e => e.id);
                if (eventIds.length > 0) {
                    const regsRes = await getRegistrations(eventIds);
                    setAllRegistrations(regsRes.data || []);
                }
            }
        } catch (error: any) {
            console.error('Erro ao carregar eventos completos:', error);
        }
    };

    // Refetch wrapper — updates both dashboard and local data
    const loadEvents = async (silent = false) => {
        if (!churchId) return;
        if (!silent) setLoading(true);
        try {
            await Promise.all([refetchDashboard(), loadFullEvents()]);
        } finally {
            setLoading(false);
        }
    };

    // Deep link detection
    useEffect(() => {
        const eventId = searchParams.get('manage');
        if (eventId && events.length > 0) {
            const event = events.find(e => e.id === eventId);
            if (event) {
                // Ensure we open the modal
                handleManageEvent(event);

                // Wait for render/layout then scroll and highlight
                setTimeout(() => {
                    const el = document.getElementById(`event-card-${eventId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-4', 'ring-gold', 'ring-offset-4', 'bg-gold/5');
                        setTimeout(() => {
                            el.classList.remove('ring-4', 'ring-gold', 'ring-offset-4', 'bg-gold/5');
                        }, 3000);
                    }
                }, 100);

                // Clear the param
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('manage');
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [searchParams, events]);

    const loadMembers = async () => {
        if (!churchId) return;
        const { data } = await getMembers(churchId);
        setMembers(data || []);
    };

    const handleManageEvent = async (event: Event) => {
        setSelectedEvent(event);
        setShowManageModal(true);
        setActiveManagementTab('escala');

        // Lazy load members only when needed
        if (members.length === 0) {
            loadMembers();
        }

        loadEventDetails(event.id);
        setConflictWarning(null);
        setNewScheduleData({ memberId: '', role: 'Vocais' });
    };

    const loadEventDetails = async (eventId: string) => {
        setManageLoading(true);
        try {
            const [schedulesRes, registrationsRes] = await Promise.all([
                getSchedules(churchId || ''), // Safety fallback, though guarded by loadEventDetails call logic usually
                // Em um app real, o getSchedules filtraria por eventId no server
                getRegistrationsByEvent(eventId)
            ]);

            const filteredSchedules = (schedulesRes.data as any[]).filter((s: any) => s.event_id === eventId);
            setEventSchedules(filteredSchedules);
            setEventRegistrations(registrationsRes.data || []);
        } finally {
            setManageLoading(false);
        }
    };

    const handleCheckConflict = async (memberId: string) => {
        if (!memberId || !selectedEvent) return;
        setConflictWarning(null);

        // Don't check if already added to THIS event
        const alreadyInEvent = eventSchedules.some(s => s.member_id === memberId);
        if (alreadyInEvent) {
            setConflictWarning('Este membro já está escalado neste evento.');
            return;
        }

        const { hasConflict, conflictingEvent } = await checkScheduleConflict(memberId, selectedEvent.start_date);

        if (hasConflict) {
            setConflictWarning(`ATENÇÃO: Este membro já está escalado para "${conflictingEvent}" em horário próximo!`);
        }
    };

    const handleAddSchedule = async () => {
        if (!selectedEvent || !newScheduleData.memberId) return;

        setIsSaving(true);
        try {
            const { error } = await createSchedule({
                church_id: churchId || '',
                event_id: selectedEvent.id,
                member_id: newScheduleData.memberId,
                role: newScheduleData.role,
                status: 'pendente'
            });

            if (error) throw error;

            await loadEventDetails(selectedEvent.id);
            setNewScheduleData(prev => ({ ...prev, memberId: '' }));
            setConflictWarning(null);
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao adicionar: ${error.message || 'Erro de permissão ou conexão'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm('Remover voluntário da escala?')) return;
        await deleteSchedule(id);
        if (selectedEvent) loadEventDetails(selectedEvent.id);
    };

    const handleEditClick = (event: Event) => {
        setEditingEventId(event.id);
        const date = new Date(event.start_date);
        setNewEventData({
            title: event.title,
            description: event.description || '',
            event_type: event.event_type,
            date: date.toISOString().split('T')[0],
            time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            location: event.location || '',
            capacity: event.capacity || 0,
            price: event.price || 0,
            preacher: event.preacher || '',
            image_url: event.image_url || '',
            recurrence: 'none', // Editing single instance usually
            occurrences: 4
        });
        setShowNewEventModal(true);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const dateTime = new Date(`${newEventData.date}T${newEventData.time}`);

            // Timeout Promise
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão.')), 10000));

            if (editingEventId) {
                // Update existing event
                const updateOp = updateEvent(editingEventId, {
                    title: newEventData.title,
                    description: newEventData.description,
                    event_type: newEventData.event_type,
                    start_date: dateTime.toISOString(),
                    location: newEventData.location,
                    capacity: Number(newEventData.capacity),
                    price: Number(newEventData.price),
                    preacher: newEventData.preacher,
                    image_url: newEventData.image_url
                });

                const result: any = await Promise.race([updateOp, timeoutPromise]);
                if (result.error) throw result.error;

            } else {
                // Create New Event(s) logic
                const eventsToCreate = [];
                // Definir duração automática de 6 meses
                const count = newEventData.recurrence === 'none' ? 1 :
                    newEventData.recurrence === 'weekly' ? 26 :
                        newEventData.recurrence === 'biweekly' ? 13 : 6;

                for (let i = 0; i < count; i++) {
                    const currentDate = new Date(dateTime);

                    if (newEventData.recurrence === 'weekly') {
                        currentDate.setDate(dateTime.getDate() + (i * 7));
                    } else if (newEventData.recurrence === 'biweekly') {
                        currentDate.setDate(dateTime.getDate() + (i * 14));
                    } else if (newEventData.recurrence === 'monthly') {
                        currentDate.setMonth(dateTime.getMonth() + i);
                    }

                    eventsToCreate.push(createEvent({
                        church_id: churchId || '',
                        title: newEventData.title,
                        description: newEventData.description,
                        event_type: newEventData.event_type,
                        start_date: currentDate.toISOString(),
                        location: newEventData.location,
                        capacity: Number(newEventData.capacity),
                        price: Number(newEventData.price),
                        preacher: newEventData.preacher,
                        image_url: newEventData.image_url
                    }));
                }

                const results: any = await Promise.race([Promise.all(eventsToCreate), timeoutPromise]);
                const error = results.find((r: any) => r.error)?.error;
                if (error) throw error;
            }

            // Otimização: Não aguardamos o loadEvents para dar feedback
            // Silent refresh para não bloquear a UI com loading spinner
            loadEvents(true);
            setShowNewEventModal(false);
            setShowSuccessModal(true);

            // Resetar formulário
            setEditingEventId(null);
            setNewEventData({
                title: '',
                description: '',
                event_type: 'culto',
                date: '',
                time: '',
                location: '',
                capacity: 0,
                price: 0,
                preacher: '',
                image_url: '',
                recurrence: 'none',
                occurrences: 4
            });

            // Auto-fechar sucesso após 3 segundos
            setTimeout(() => setShowSuccessModal(false), 3000);

        } catch (error: any) {
            console.error('Erro ao salvar evento:', error);
            alert(`Erro ao salvar no banco: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setEventToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (eventToDelete) {
            await deleteEvent(eventToDelete);
            await deleteEvent(eventToDelete);
            await loadEvents(true); // Silent refresh
            setShowDeleteModal(false);
            setEventToDelete(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
            month: date.toLocaleDateString('pt-BR', { month: 'short' }),
            time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            full: date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        };
    };

    // Helper to group events by title+type and find the next upcoming instance
    const groupEvents = (eventsList: Event[]) => {
        const grouped: { [key: string]: Event & { recurrenceCount?: number, frequencyLabel?: string, dates?: Date[] } } = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Sort events by date first to easily calculate intervals
        const sortedEvents = [...eventsList].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

        sortedEvents.forEach(event => {
            const key = `${event.title.trim().toLowerCase()}-${event.event_type.trim().toLowerCase()}`;

            if (!grouped[key]) {
                grouped[key] = { ...event, recurrenceCount: 1, dates: [new Date(event.start_date)] };
            } else {
                grouped[key].recurrenceCount = (grouped[key].recurrenceCount || 1) + 1;
                grouped[key].dates?.push(new Date(event.start_date));

                // Update to show the closest UPCOMING date logic...
                const currentStoredDate = new Date(grouped[key].start_date);
                const newEventDate = new Date(event.start_date);

                // If stored date is in the past, and new date is >= today, replace it
                if (currentStoredDate < now && newEventDate >= now) {
                    grouped[key] = { ...event, recurrenceCount: grouped[key].recurrenceCount, dates: grouped[key].dates };
                }
                // If both are future, keep the closest one to now
                else if (currentStoredDate >= now && newEventDate >= now && newEventDate < currentStoredDate) {
                    grouped[key] = { ...event, recurrenceCount: grouped[key].recurrenceCount, dates: grouped[key].dates };
                }
                // If both are past, keep the most recent one
                else if (currentStoredDate < now && newEventDate < now && newEventDate > currentStoredDate) {
                    grouped[key] = { ...event, recurrenceCount: grouped[key].recurrenceCount, dates: grouped[key].dates };
                }
            }
        });

        // Calculate Frequency Label
        Object.values(grouped).forEach(group => {
            if ((group.recurrenceCount || 0) > 1 && group.dates && group.dates.length > 1) {
                // Check avg interval
                // Sort dates again just in case
                const dates = group.dates.sort((a, b) => a.getTime() - b.getTime());

                // Calculate average difference between first few events to guess frequency
                // We use the first 2 intervals if available
                let diffDays = 0;
                if (dates.length >= 2) {
                    const diffTime = Math.abs(dates[1].getTime() - dates[0].getTime());
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                if (diffDays >= 6 && diffDays <= 8) group.frequencyLabel = 'Semanal';
                else if (diffDays >= 13 && diffDays <= 15) group.frequencyLabel = 'Quinzenal';
                else if (diffDays >= 27 && diffDays <= 32) group.frequencyLabel = 'Mensal';
                else group.frequencyLabel = 'Múltiplas Datas';
            }
        });

        return Object.values(grouped);
    };

    // Memoize the grouping to prevent blocking render
    const groupedEvents = useMemo(() => groupEvents(events), [events]);

    const weeklyProgramming = useMemo(() => groupedEvents.filter(event =>
        (event.event_type.toLowerCase() === 'culto' || event.event_type.toLowerCase() === 'ensaio' || event.event_type.toLowerCase() === 'reuniao') &&
        (event.title.toLowerCase().includes(searchTerm.toLowerCase()) || event.event_type.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [groupedEvents, searchTerm]);

    const specialEvents = useMemo(() => groupedEvents.filter(event =>
        !(event.event_type.toLowerCase() === 'culto' || event.event_type.toLowerCase() === 'ensaio' || event.event_type.toLowerCase() === 'reuniao') &&
        (event.title.toLowerCase().includes(searchTerm.toLowerCase()) || event.event_type.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [groupedEvents, searchTerm]);

    const renderEventCard = (event: Event) => {
        const dateObj = formatDate(event.start_date);
        return (
            <motion.div
                key={event.id}
                id={`event-card-${event.id}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group h-full transition-all duration-500 rounded-[24px]"
            >
                {/* Visual Stack Effect for Recurrent Events */}
                {(event as any).recurrenceCount > 1 && (
                    <>
                        <div className="absolute top-2 left-2 right-2 -bottom-2 bg-white/40 border border-slate-200/50 rounded-[26px] z-0 transform translate-y-1 scale-[0.98]"></div>
                        <div className="absolute top-4 left-4 right-4 -bottom-4 bg-white/20 border border-slate-200/30 rounded-[28px] z-[-1] transform translate-y-2 scale-[0.96]"></div>
                    </>
                )}

                <div className="relative z-10 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-marinho/5 hover:border-gold/30 transition-all overflow-hidden flex flex-col h-full">
                    {/* Event Image or Gradient Header */}
                    <div className="h-32 w-full relative overflow-hidden shrink-0">
                        {event.image_url ? (
                            <>
                                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-marinho/80 via-transparent to-transparent" />
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-marinho via-[#2a2a5a] to-[#1e1b4b] relative">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                            </div>
                        )}

                        {/* Floating Date Badge */}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md rounded-xl p-2 shadow-lg flex flex-col items-center min-w-[50px] border border-white/20">
                            <span className="text-[10px] font-black text-marinho uppercase tracking-wider leading-none mb-0.5">{dateObj.month}</span>
                            <span className="text-xl font-black text-gold leading-none">{dateObj.day}</span>
                        </div>

                        {/* Badges Overlay */}
                        <div className="absolute top-3 left-3 flex gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
                                {event.event_type}
                            </span>
                            {(event as any).recurrenceCount > 1 && (event as any).frequencyLabel && (
                                <div className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-gold text-[#1e1b4b] border border-gold/50 shadow-sm flex items-center gap-1">
                                    <Repeat className="w-2.5 h-2.5" /> {(event as any).frequencyLabel}
                                </div>
                            )}
                            {(event.price || 0) > 0 && (
                                <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-gold/90 text-marinho shadow-sm">
                                    R$ {Number(event.price).toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1 relative">
                        {/* Delete Action (Hidden by default) */}
                        {/* Edit Action (Hidden by default) */}
                        <button
                            onClick={() => handleEditClick(event)}
                            className="absolute top-4 right-12 p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Editar Evento"
                        >
                            <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete Action (Hidden by default) */}
                        <button
                            onClick={() => handleDeleteClick(event.id)}
                            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Excluir Evento"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex-1 space-y-3">
                            <div>
                                <h3 className="font-serif font-bold text-lg text-marinho leading-tight group-hover:text-gold transition-colors line-clamp-2" title={event.title}>
                                    {event.title}
                                </h3>
                                {event.preacher && (
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                        <Users className="w-3 h-3 text-gold" />
                                        {event.preacher}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 py-3 border-t border-dashed border-slate-100">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
                                    <span className="text-xs font-medium truncate">{dateObj.time}</span>
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                                        <span className="text-xs font-medium truncate" title={event.location}>{event.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 mt-auto">
                            <button
                                onClick={() => handleManageEvent(event)}
                                className="w-full py-2.5 rounded-xl bg-slate-50 text-marinho border border-slate-100 font-bold text-[10px] uppercase tracking-widest hover:bg-marinho hover:text-white hover:border-marinho hover:shadow-lg hover:shadow-marinho/20 transition-all flex items-center justify-center gap-2 group/btn"
                            >
                                <Users className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                <span>Gerenciar Escala</span>
                            </button>
                        </div>

                        {/* Capacity Indicator if applied */}
                        {(event.capacity || 0) > 0 && (
                            <div className="mt-3 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gold rounded-full"
                                        style={{ width: `${Math.min(100, (allRegistrations.filter(r => r.event_id === event.id).length / (event.capacity || 1)) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 min-w-[40px] text-right">
                                    {allRegistrations.filter(r => r.event_id === event.id).length}/{event.capacity}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-2">
                {/* Balanced Glass Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[28px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="space-y-0.5 relative z-10">
                        <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                            <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">Programação Ministerial</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            Gestão de <span className="font-serif italic text-gold font-normal text-3xl">Eventos</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-lg">
                            Gerencie os cultos e monte as escalas
                        </p>
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                        <div className="relative group/search flex-1 md:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/search:text-gold transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar evento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-marinho placeholder:text-slate-400 focus:ring-2 focus:ring-gold/10 focus:border-gold/30 transition-all outline-none shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setEditingEventId(null);
                                setNewEventData({
                                    title: '',
                                    description: '',
                                    event_type: 'culto',
                                    date: '',
                                    time: '',
                                    location: '',
                                    capacity: 0,
                                    price: 0,
                                    preacher: '',
                                    image_url: '',
                                    recurrence: 'none',
                                    occurrences: 4
                                });
                                setShowNewEventModal(true);
                            }}
                            className="h-11 px-6 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4 text-gold" />
                            <span className="hidden sm:inline">Novo</span>
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20 space-y-12">
                        {/* Programação Semanal */}
                        {weeklyProgramming.length > 0 && (
                            <section>
                                <div className="flex items-center gap-4 mb-6">
                                    <h2 className="text-xs font-black text-marinho/40 uppercase tracking-[0.3em]">Programação Semanal</h2>
                                    <div className="h-px flex-1 bg-marinho/5"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {weeklyProgramming.map(event => renderEventCard(event))}
                                </div>
                            </section>
                        )}

                        {/* Eventos & Investimentos */}
                        {specialEvents.length > 0 && (
                            <section>
                                <div className="flex items-center gap-4 mb-6">
                                    <h2 className="text-xs font-black text-gold/40 uppercase tracking-[0.3em]">Agenda de Eventos & Investimentos</h2>
                                    <div className="h-px flex-1 bg-gold/5"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {specialEvents.map(event => renderEventCard(event))}
                                </div>
                            </section>
                        )}

                        {weeklyProgramming.length === 0 && specialEvents.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <div className="w-16 h-16 bg-gold/10 rounded-3xl flex items-center justify-center mb-4 border border-gold/20 shadow-sm">
                                    <CalendarIcon className="h-8 w-8 text-gold" />
                                </div>
                                <p className="text-sm font-bold text-marinho mb-1">Crie seu primeiro evento</p>
                                <p className="text-[11px] text-slate-400">
                                    Organize cultos, conferências e encontros da igreja.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {/* Modal Novo Evento */}
                {showNewEventModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-marinho/40 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full max-w-2xl shadow-premium border border-white/20"
                        >
                            {/* Header Minimalista */}
                            <div className="flex items-center justify-between p-3 px-6 border-b border-gray-100 bg-gray-50/20 rounded-t-3xl">
                                <div className="space-y-0">
                                    <span className="text-[7px] font-black text-gold uppercase tracking-[0.3em] leading-none">Gestão</span>
                                    <h3 className="font-display font-bold text-base text-marinho italic leading-none">{editingEventId ? 'Editar Evento' : 'Novo Evento'}</h3>
                                </div>
                                <button
                                    onClick={() => setShowNewEventModal(false)}
                                    className="p-1 rounded-lg hover:bg-gray-100 text-marinho/40 hover:text-marinho transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEvent} className="p-4 pt-1.5 flex flex-col gap-1.5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1">
                                    {/* Linha 1: Título */}
                                    <div className="space-y-0.5 md:col-span-2">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Título do Evento</label>
                                        <input
                                            type="text"
                                            required
                                            value={newEventData.title}
                                            onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                                            className="input-premium py-1 text-sm h-8"
                                            placeholder="Ex: Conferência de Avivamento"
                                        />
                                    </div>

                                    {/* Linha 2: Tipo e Preletor */}
                                    <div className="space-y-0.5">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Tipo</label>
                                        <select
                                            value={newEventData.event_type}
                                            onChange={(e) => setNewEventData({ ...newEventData, event_type: e.target.value })}
                                            className="input-premium py-1 text-sm h-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.8em_0.8em] bg-[right_0.5rem_center] bg-no-repeat cursor-pointer"
                                        >
                                            <option value="culto">Culto Semanal</option>
                                            <option value="retiro">Retiro</option>
                                            <option value="conferencia">Conferência</option>
                                            <option value="ensaio">Ensaio</option>
                                            <option value="reuniao">Reunião</option>
                                            <option value="evento">Evento Especial</option>
                                        </select>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Preletor</label>
                                        <input
                                            type="text"
                                            value={newEventData.preacher}
                                            onChange={(e) => setNewEventData({ ...newEventData, preacher: e.target.value })}
                                            className="input-premium py-1 text-sm h-8"
                                            placeholder="Ex: Pr. Ricardo"
                                        />
                                    </div>

                                    {/* Linha 3: Foto e Local */}
                                    <div className="space-y-0.5">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Capa (Upload)</label>
                                        <div className="relative group">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={onFileChange}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="input-premium py-1 text-[10px] h-8 flex items-center gap-2 cursor-pointer border-dashed border-marinho/20 hover:border-gold hover:bg-gold/5 transition-all text-marinho/40 hover:text-gold w-full"
                                            >
                                                {isSaving ? (
                                                    <><Loader2 className="h-3 w-3 animate-spin" /><span>Enviando...</span></>
                                                ) : newEventData.image_url ? (
                                                    <span className="text-gold font-bold truncate">✓ Foto selecionada</span>
                                                ) : (
                                                    <><ImagePlus className="h-3 w-3" /><span>Upload Foto</span></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Localização</label>
                                        <input
                                            required
                                            type="text"
                                            value={newEventData.location}
                                            onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                                            className="input-premium py-1 text-sm h-8"
                                            placeholder="Ex: Templo"
                                        />
                                    </div>

                                    {/* Linha 4: Data e Hora */}
                                    <div className="space-y-0.5 relative">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Data</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowCalendar(!showCalendar)}
                                            className="input-premium py-1 text-sm h-8 w-full flex items-center justify-between px-3 text-marinho/80"
                                        >
                                            <span>{newEventData.date ? new Date(newEventData.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'dd/mm/aaaa'}</span>
                                            <CalendarIcon className="w-3.5 h-3.5 text-marinho/40" />
                                        </button>
                                        <AnimatePresence>
                                            {showCalendar && (
                                                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-marinho/10 backdrop-blur-[2px]" onClick={() => setShowCalendar(false)}>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <PremiumCalendar
                                                            selectedDate={newEventData.date ? new Date(newEventData.date + 'T00:00:00') : null}
                                                            onChange={(date) => {
                                                                const year = date.getFullYear();
                                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                const day = String(date.getDate()).padStart(2, '0');
                                                                setNewEventData({ ...newEventData, date: `${year}-${month}-${day}` });
                                                            }}
                                                            onClose={() => setShowCalendar(false)}
                                                            className="static shadow-2xl"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="space-y-0.5">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Horário</label>
                                        <input
                                            type="time"
                                            required
                                            value={newEventData.time}
                                            onChange={(e) => setNewEventData({ ...newEventData, time: e.target.value })}
                                            className="input-premium py-1 text-sm h-8"
                                        />
                                    </div>

                                    {/* Linha Recorrência - Minimalista (Full Width) */}
                                    <AnimatePresence>
                                        {newEventData.date && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="md:col-span-2 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-3 pt-1 pl-1">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewEventData({
                                                                ...newEventData,
                                                                recurrence: newEventData.recurrence === 'none' ? 'weekly' : 'none'
                                                            })}
                                                            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${newEventData.recurrence !== 'none'
                                                                ? 'bg-marinho text-white shadow-sm'
                                                                : 'bg-marinho/5 text-marinho/40 hover:bg-marinho/10'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <Repeat className="w-3 h-3" />
                                                                {newEventData.recurrence !== 'none' ? 'Repetindo' : 'Repetir Evento'}
                                                            </div>
                                                        </button>
                                                    </div>

                                                    {newEventData.recurrence !== 'none' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="flex items-center gap-3"
                                                        >
                                                            <div className="h-4 w-px bg-marinho/10" />

                                                            <select
                                                                value={newEventData.recurrence}
                                                                onChange={(e) => setNewEventData({ ...newEventData, recurrence: e.target.value })}
                                                                className="bg-transparent text-[10px] font-bold text-marinho outline-none cursor-pointer hover:text-marinho/80"
                                                            >
                                                                <option value="weekly">Semanalmente</option>
                                                                <option value="biweekly">Quinzenalmente</option>
                                                                <option value="monthly">Mensalmente</option>
                                                            </select>

                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Capacidade e Preço (Full Width Wrapper) */}
                                    <AnimatePresence>
                                        {['retiro', 'conferencia', 'evento'].includes(newEventData.event_type) && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="md:col-span-2 grid grid-cols-2 gap-5"
                                            >
                                                <div className="space-y-0.5">
                                                    <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Capacidade</label>
                                                    <input
                                                        type="number"
                                                        value={newEventData.capacity}
                                                        onChange={(e) => setNewEventData({ ...newEventData, capacity: parseInt(e.target.value) || 0 })}
                                                        className="input-premium py-1 text-sm h-8"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Investimento (R$)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={newEventData.price}
                                                        onChange={(e) => setNewEventData({ ...newEventData, price: parseFloat(e.target.value) || 0 })}
                                                        className="input-premium py-1 text-sm h-8 border-gold/30"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Descrição - Full Width */}
                                    <div className="space-y-0.5 md:col-span-2">
                                        <label className="text-[7px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Descrição</label>
                                        <textarea
                                            value={newEventData.description}
                                            onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                                            className="input-premium h-8 resize-none py-1 text-[11px] leading-tight"
                                            placeholder="Breve descrição..."
                                        />
                                    </div>

                                </div>

                                <div className="grid grid-cols-3 gap-3 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewEventModal(false)}
                                        className="col-span-1 h-8 rounded-lg font-bold uppercase tracking-widest text-[7px] border border-marinho/10 text-marinho/40 hover:bg-marinho/5 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="col-span-2 h-8 bg-marinho text-white rounded-lg font-bold uppercase tracking-widest text-[7px] hover:shadow-premium active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <div className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="h-3 w-3" />
                                                <span>Publicar Evento</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {/* Modal Gerenciamento (Manage) */}
                {
                    showManageModal && selectedEvent && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#1e1b4b] text-white">
                                    <div>
                                        <h3 className="font-display font-bold text-xl italic leading-none">
                                            Gerenciar Evento
                                        </h3>
                                        <p className="text-white/60 text-xs mt-1">
                                            {selectedEvent.title} - {new Date(selectedEvent.start_date).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex bg-white/10 rounded-lg p-1">
                                            <button
                                                onClick={() => setActiveManagementTab('escala')}
                                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeManagementTab === 'escala' ? 'bg-white text-[#1e1b4b]' : 'text-white/60 hover:text-white'}`}
                                            >
                                                Escala
                                            </button>
                                            <button
                                                onClick={() => setActiveManagementTab('inscritos')}
                                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeManagementTab === 'inscritos' ? 'bg-white text-[#1e1b4b]' : 'text-white/60 hover:text-white'}`}
                                            >
                                                Inscritos
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowManageModal(false)}
                                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    {manageLoading ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                                        </div>
                                    ) : activeManagementTab === 'escala' ? (
                                        <>
                                            {/* Add Form */}
                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
                                                <h4 className="text-sm font-bold text-[#1e1b4b] uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Plus className="w-4 h-4" /> Adicionar Voluntário
                                                </h4>

                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                                    <div className="md:col-span-2">
                                                        <select
                                                            value={newScheduleData.memberId}
                                                            onChange={(e) => {
                                                                setNewScheduleData(p => ({ ...p, memberId: e.target.value }));
                                                                handleCheckConflict(e.target.value);
                                                            }}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e1b4b]/20 outline-none"
                                                        >
                                                            <option value="">Selecione o Membro...</option>
                                                            {members.map(m => (
                                                                <option key={m.id} value={m.id}>{m.full_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <select
                                                            value={newScheduleData.role}
                                                            onChange={(e) => setNewScheduleData(p => ({ ...p, role: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e1b4b]/20 outline-none"
                                                        >
                                                            <option value="Vocais">Vocais</option>
                                                            <option value="Baixo">Baixo</option>
                                                            <option value="Guitarra">Guitarra</option>
                                                            <option value="Teclado">Teclado</option>
                                                            <option value="Bateria">Bateria</option>
                                                            <option value="Recepção">Recepção</option>
                                                            <option value="Mídia">Mídia/Projeção</option>
                                                            <option value="Sonoplastia">Sonoplastia</option>
                                                            <option value="Kids">Kids</option>
                                                        </select>
                                                    </div>
                                                    <button
                                                        onClick={handleAddSchedule}
                                                        disabled={isSaving || !newScheduleData.memberId}
                                                        className="bg-[#1e1b4b] text-white rounded-lg font-bold text-sm hover:bg-[#1e1b4b]/90 disabled:opacity-50 transition-colors"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>

                                                {/* Conflict Warning */}
                                                {conflictWarning && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-xs"
                                                    >
                                                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                                                        <p className="font-medium">{conflictWarning}</p>
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* List */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                                    Voluntários Escalados ({eventSchedules.length})
                                                </h4>

                                                {eventSchedules.length === 0 ? (
                                                    <p className="text-center text-slate-400 text-sm py-4 italic">
                                                        Nenhum voluntário escalado ainda.
                                                    </p>
                                                ) : (
                                                    eventSchedules.map((schedule) => (
                                                        <div key={schedule.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#1e1b4b] font-bold text-xs border-2 border-white shadow-sm">
                                                                    {schedule.members?.full_name?.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-[#1e1b4b] text-sm">
                                                                        {schedule.members?.full_name}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 font-medium">
                                                                        {schedule.role}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${schedule.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                                                                    schedule.status === 'recusado' ? 'bg-red-100 text-red-700' :
                                                                        'bg-amber-100 text-amber-700'
                                                                    }`}>
                                                                    {schedule.status}
                                                                </span>

                                                                <button
                                                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    Membros Inscritos ({eventRegistrations.length})
                                                </h4>
                                                {selectedEvent.capacity ? (
                                                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-600">
                                                        Ocupação: {eventRegistrations.length} / {selectedEvent.capacity}
                                                    </div>
                                                ) : null}
                                            </div>

                                            {eventRegistrations.length === 0 ? (
                                                <div className="text-center py-12 text-slate-400 italic text-sm">
                                                    Ninguém se inscreveu neste evento ainda.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {eventRegistrations.map((reg) => (
                                                        <div key={reg.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center text-sage font-bold text-xs uppercase">
                                                                    {reg.members?.full_name?.substring(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-[#1e1b4b] text-sm leading-none mb-1">{reg.members?.full_name}</p>
                                                                    <p className="text-[10px] font-medium text-slate-400">{reg.members?.email || reg.members?.phone || 'Sem contato'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${reg.payment_status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {reg.payment_status}
                                                                </div>
                                                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${reg.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {reg.status === 'confirmado' && <CheckCircle2 className="h-2 w-2" />}
                                                                    {reg.status}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* Modal de Sucesso Premium */}
            <AnimatePresence>
                {
                    showSuccessModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-marinho/20 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-premium border border-white/20 relative overflow-hidden"
                            >
                                {/* Decorative background elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-marinho/5 rounded-full -ml-16 -mb-16 blur-2xl" />

                                <div className="relative">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                                        className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-sm"
                                    >
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </motion.div>

                                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.4em] mb-2 block leading-none">Operação Concluída</span>
                                    <h3 className="font-display font-bold text-2xl text-marinho italic mb-3">Evento Publicado!</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-8">
                                        O evento foi processado com sucesso e já está visível na agenda dos membros.
                                    </p>

                                    <button
                                        onClick={() => setShowSuccessModal(false)}
                                        className="w-full h-12 bg-marinho text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:shadow-premium active:scale-95 transition-all"
                                    >
                                        Entendido
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* Modal de Exclusão Premium */}
            <AnimatePresence>
                {
                    showDeleteModal && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-marinho/40 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-premium border border-white/20 relative overflow-hidden"
                            >
                                {/* Decorative background elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-marinho/5 rounded-full -ml-16 -mb-16 blur-2xl" />

                                <div className="relative">
                                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-sm">
                                        <Trash2 className="w-9 h-9 text-red-500" />
                                    </div>

                                    <h3 className="font-display font-bold text-xl text-marinho italic mb-2">Excluir Evento?</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-8">
                                        Essa ação não poderá ser desfeita. O evento será removido permanentemente.
                                    </p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setShowDeleteModal(false)}
                                            className="h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-marinho/10 text-marinho/40 hover:bg-marinho/5 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            className="h-11 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:shadow-lg hover:bg-red-600 active:scale-95 transition-all"
                                        >
                                            Sim, Excluir
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >
            {/* Modal de Crop Removido */}
        </DashboardLayout >
    );
}
