import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode,
    CalendarDays,
    Music,
    Wallet,
    ArrowUpRight,
    MapPin,
    Plus,
    Check,
    X,
    AlertCircle,
    Copy,
    Loader2,
    Share2,
    Megaphone,
    ImagePlus,
    BookOpen,
    Download,
    Trash2,
    Edit2,
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Sparkles
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { updateScheduleStatus, createNews, deleteNews, updateNews } from '@/lib/supabase-queries';
import { useDashboardData } from '@/lib/dashboard-data';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { getDailyWord } from '@/lib/daily-word';
import { useRef } from 'react';
import { toBlob } from 'html-to-image';
import { HolographicCard } from './ui/HolographicCard';
import { useTutorial } from '@/contexts/TutorialContext';
import { useProfileGate } from './ProfileGate';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 12 } }
};




function EventCarouselCard({ events, registrations, isLoading }: any) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();
    const { profile } = useAuth();

    // Filter unique events (avoid showing recurring instances of same event)
    // Skip first event (shown in PRÓXIMO) and show next 3 different events
    const carouselEvents = useMemo(() => {
        const uniqueEventMap = new Map();
        events.forEach((event: any) => {
            if (!uniqueEventMap.has(event.id)) {
                uniqueEventMap.set(event.id, event);
            }
        });
        // Skip index 0 (nextEvent), get events 1, 2, 3
        return Array.from(uniqueEventMap.values()).slice(1, 4);
    }, [events]);

    const nextEvent = events[0];

    useEffect(() => {
        const count = carouselEvents.length;
        if (count <= 1) {
            setCurrentIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % count);
        }, 3500); // 3.5 segundos para um giro mais dinâmico

        return () => clearInterval(interval);
    }, [carouselEvents.length]);

    const formatDate = (dateString: string) => {
        // Robust parsing: use the date part for the calendar day to avoid timezone shifts
        const parts = dateString.substring(0, 10).split('-');
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);

        // For time, use the ISO parser as it reflects the specific hour
        const timeDate = new Date(dateString);

        return {
            weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
            time: timeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            day: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
            month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        };
    };

    const handleNavigate = (event: any) => {
        if (!event) return;

        console.log('[JORNAL] Navigating to event:', event.title);

        // Robust Date Extraction (Strings only, no Date objects)
        // ISO string: "2024-02-15T19:30:00..." -> "2024-02-15"
        const datePart = event.start_date.substring(0, 10);

        const isAdmin = ['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro'].includes(profile?.role || '');
        const targetPath = isAdmin ? '/escalas' : '/membro/agenda';

        // Navigation matches the "URL-First" strategy
        navigate(`${targetPath}?date=${datePart}&event=${event.id}`);
    };

    if (isLoading) {
        return (
            <div className="h-full bg-white border border-slate-100 rounded-2xl p-4 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-slate-100 mb-4" />
                <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
                <div className="h-2 w-1/2 bg-slate-100 rounded" />
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl flex gap-3 shadow-sm group hover:shadow-premium transition-all duration-500 hover:-translate-y-1 bg-white p-2.5 h-full">
            {/* Left Section - Next Event (Dark Theme for Distinction) */}
            <HolographicCard
                containerClassName="flex-1 h-full cursor-pointer"
                className="h-full rounded-xl overflow-hidden bg-gradient-to-br from-[#1e1b4b] to-[#2e2a6b] border border-white/10 shadow-md"
                onClick={() => handleNavigate(nextEvent)}
            >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="p-2.5 pb-1.5 flex flex-col relative z-10 h-full justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Próximo</p>
                        {nextEvent && (
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm border transition-colors",
                                registrations?.some((r: any) => r.event_id === nextEvent.id)
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                                    : "bg-white/10 border-white/20 text-white"
                            )}>
                                <div className={cn("w-1 h-1 rounded-full animate-pulse", registrations?.some((r: any) => r.event_id === nextEvent.id) ? "bg-emerald-400" : "bg-[#d4af37]")} />
                                <span className="text-[7px] font-black uppercase tracking-widest text-inherit">
                                    {registrations?.some((r: any) => r.event_id === nextEvent.id) ? 'Inscrito' : 'Em breve'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="relative flex flex-col" style={{ transform: "translateZ(20px)" }}>
                        {/* Event Photo Box - Ultra Compact */}
                        <div className="relative h-14 rounded-lg overflow-hidden mb-1.5 border border-white/10 shadow-sm bg-white/5" style={{ transform: "translateZ(35px)" }}>
                            {nextEvent?.image_url ? (
                                <img
                                    src={nextEvent.image_url}
                                    alt={nextEvent.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                                    <CalendarDays className="w-6 h-6 text-white/20" />
                                </div>
                            )}
                        </div>

                        {/* Event Details below photo */}
                        <div className="pb-2">
                            <h4 className="text-[12px] font-bold text-white mb-0.5 leading-tight line-clamp-1">
                                {nextEvent ? nextEvent.title : 'Sem eventos'}
                            </h4>
                            <div className="space-y-1">
                                <p className="text-[9px] text-white/60 font-bold uppercase tracking-wide flex items-center gap-1.5">
                                    {nextEvent ? (
                                        <>
                                            <span className="text-[#d4af37]">{formatDate(nextEvent.start_date).weekday}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/20" />
                                            <span>{formatDate(nextEvent.start_date).time}</span>
                                        </>
                                    ) : '---'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </HolographicCard>

            <HolographicCard
                containerClassName="flex-1 h-full cursor-pointer"
                className="h-full rounded-xl overflow-hidden bg-white/40 backdrop-blur-[12px] border border-slate-100 shadow-sm"
                onClick={() => handleNavigate(carouselEvents[currentIndex])}
            >
                <div className="p-2.5 pb-1.5 flex flex-col h-full justify-between">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Na Semana</p>

                        {/* Animated Indicators */}
                        <div className="flex gap-1">
                            {(carouselEvents || []).map((_: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={false}
                                    animate={{
                                        width: i === currentIndex ? 16 : 4,
                                        backgroundColor: i === currentIndex ? '#d4af37' : '#e2e8f0'
                                    }}
                                    className="h-1 rounded-full"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="relative flex-1 flex flex-col justify-center min-h-[100px]">
                        {carouselEvents && carouselEvents.length > 0 ? (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="flex flex-col h-full justify-center"
                                    style={{ transform: "translateZ(20px)" }}
                                >
                                    {/* Event Photo Box - Ultra Compact */}
                                    <div className="relative h-14 rounded-lg overflow-hidden mb-1.5 border border-slate-100 shadow-sm bg-slate-100" style={{ transform: "translateZ(35px)" }}>
                                        {carouselEvents[currentIndex].image_url ? (
                                            <img
                                                src={carouselEvents[currentIndex].image_url}
                                                alt={carouselEvents[currentIndex].title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                                <CalendarDays className="w-6 h-6 text-slate-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Event Details */}
                                    <div className="pb-2">
                                        <h4 className="text-[12px] font-bold text-slate-700 mb-0.5 leading-tight line-clamp-1">
                                            {carouselEvents[currentIndex].title}
                                        </h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="text-[#d4af37]">
                                                {formatDate(carouselEvents[currentIndex].start_date).day} {formatDate(carouselEvents[currentIndex].start_date).month.toUpperCase()}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span>{formatDate(carouselEvents[currentIndex].start_date).time}</span>
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                    <CalendarDays className="w-4 h-4 text-slate-300" />
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Sem mais eventos</p>
                            </div>
                        )}
                    </div>
                </div>
            </HolographicCard>
        </div>
    );
}

export function JornalContent({ hideCheckin = false }: { hideCheckin?: boolean }) {
    const { profile } = useAuth();
    const { events, news, invites, myRegistrations, churchSettings, isLoading, refetch } = useDashboardData();
    const [showDonationModal, setShowDonationModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const { guardAction, GateModal } = useProfileGate();

    // Force refetch when opening donation modal to ensure updated PIX keys
    useEffect(() => {
        if (showDonationModal) {
            refetch();
        }
    }, [showDonationModal, refetch]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [postingNews, setPostingNews] = useState(false);
    const [newNews, setNewNews] = useState({
        title: '',
        content: '',
        category: 'Aviso' as any,
        image_url: '',
        gallery_urls: [] as string[],
        important: false
    });
    const navigate = useNavigate();
    const shareCardRef = useRef<HTMLDivElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<any>('Tudo');
    const [selectedPixType, setSelectedPixType] = useState<string>('main'); // Default to main key
    // Gallery Viewer State
    const [viewingGallery, setViewingGallery] = useState<{ urls: string[], index: number } | null>(null);
    const [editingNews, setEditingNews] = useState<any>(null);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1000;
                    const MAX_HEIGHT = 1000;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // Se for galeria, adiciona ao array existente (limitado a 10)
            if (newNews.category === 'Fotos') {
                const remainingSlots = 10 - (newNews.gallery_urls?.length || 0);
                if (remainingSlots <= 0) return alert('Máximo de 10 fotos por galeria.');

                const filesToProcess = Array.from(files).slice(0, remainingSlots);

                try {
                    // Processamento Paralelo (Muito mais rápido que sequencial)
                    const compressedImages = await Promise.all(
                        filesToProcess.map(file => compressImage(file))
                    );

                    setNewNews(prev => ({
                        ...prev,
                        gallery_urls: [...(prev.gallery_urls || []), ...compressedImages]
                    }));
                } catch (err) {
                    console.error("Erro ao processar imagens", err);
                }
            } else {
                // Comportamento padrão (single image)
                const file = files[0];
                try {
                    const compressedBase64 = await compressImage(file);
                    setNewNews(prev => ({ ...prev, image_url: compressedBase64 }));
                } catch (err) {
                    console.error("Erro ao processar imagem", err);
                }
            }
        }
    };

    const handleDeleteNews = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja apagar esta notícia?')) {
            await deleteNews(id);
            refetch();
        }
    };


    const handleEditNews = (item: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingNews(item);
        setNewNews({
            title: item.title,
            content: item.content,
            category: item.category,
            image_url: item.image_url || '',
            gallery_urls: item.gallery_urls || [],
            important: item.important
        });
        setShowPostModal(true);
    };

    // Automatic Night Mode logic (18h to 06h)
    const isNight = useMemo(() => {
        const hour = new Date().getHours();
        return hour >= 18 || hour < 6;
    }, []);

    const dailyWord = useMemo(() => getDailyWord(), []);

    // --- Tour Logic ---
    const { startShowcase } = useTutorial();
    useEffect(() => {
        const checkTour = () => {
            if (!isLoading) {
                const isTourPending = localStorage.getItem('tour_pending_jornal');
                if (isTourPending) {
                    localStorage.removeItem('tour_pending_jornal');

                    // Small delay to ensure DOM is painted
                    setTimeout(() => {
                        startShowcase([
                            // Events - Combined Intro
                            {
                                target: '#tour-event-cards',
                                title: 'Agenda da Igreja',
                                description: 'Aqui você acompanha cultos e eventos. Toque no card para ver detalhes ou se inscrever.',
                                duration: 5000,
                                showCursor: false,
                                highlight: true,
                                placement: 'bottom'
                            },
                            // Contribution
                            {
                                target: '#tour-contribution-btn',
                                title: 'Contribuição Simplificada',
                                description: 'Devolva seu dízimo ou faça ofertas de forma segura e rápida, direto pelo app.',
                                duration: 5000,
                                showCursor: false,
                                highlight: true,
                                placement: 'left'
                            },
                            // Groups
                            {
                                target: '#tour-group-btn',
                                title: 'Pequenos Grupos',
                                description: 'Fortaleça sua fé em comunidade. Encontre um grupo próximo a você.',
                                duration: 5000,
                                showCursor: false,
                                highlight: true,
                                placement: 'left'
                            },
                            // News
                            {
                                target: '#tour-news-tabs',
                                title: 'Mural de Avisos',
                                description: 'Filtre por Avisos, Devocionais e Fotos para ficar por dentro de tudo o que acontece.',
                                duration: 5000,
                                showCursor: false,
                                highlight: true,
                                placement: 'top'
                            }
                        ], true); // Force start
                    }, 500);
                }
            }
        };

        checkTour(); // Check on mount/update

        window.addEventListener('tour-check-pending', checkTour);
        return () => window.removeEventListener('tour-check-pending', checkTour);

    }, [isLoading]);

    if (isLoading) {
        return (
            <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-500">
                <style>{`
                    @keyframes shimmer {
                        100% { transform: translateX(100%); }
                    }
                `}</style>
                {/* Hero Skeleton */}
                <div className="shrink-0 h-40 rounded-2xl bg-slate-100 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className="h-4 w-24 bg-slate-200 rounded-full" />
                        <div className="h-6 w-64 bg-slate-200 rounded-lg" />
                        <div className="h-3 w-16 bg-slate-200 rounded-full" />
                    </div>
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                    <div className="col-span-2 h-32 rounded-2xl bg-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    </div>
                    <div className="h-32 rounded-2xl bg-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    </div>
                    <div className="h-32 rounded-2xl bg-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    </div>
                </div>

                {/* Feed Skeleton */}
                <div className="flex-1 space-y-3">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 rounded-xl bg-slate-50 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Church ID já definido no topo ou via context

    const handleRespondInvite = async (scheduleId: string, status: 'confirmado' | 'recusado') => {
        try {
            await updateScheduleStatus(scheduleId, status);
            await refetch();
            alert(status === 'confirmado' ? 'Escala aceita com sucesso!' : 'Escala recusada.');
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar status.');
        }
    };





    const handlePostNews = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNews.title) {
            alert('Por favor, preencha o título.');
            return;
        }

        setPostingNews(true);
        try {
            if (editingNews) {
                // Update existing
                const { error } = await updateNews(editingNews.id, {
                    ...newNews
                });
                if (error) throw error;
            } else {
                // Create new
                const { error } = await createNews({
                    ...newNews,
                    church_id: profile?.church_id || ''
                });
                if (error) throw error;
            }

            setShowPostModal(false);
            setEditingNews(null);
            setNewNews({
                title: '',
                content: '',
                category: 'Aviso',
                image_url: '',
                gallery_urls: [],
                important: false
            });
            refetch();
        } catch (error: any) {
            console.error('Erro ao salvar notícia:', error);
            // Mostra o erro completo para facilitar o debug (ex: coluna faltando)
            alert(`Erro ao salvar: ${JSON.stringify(error, null, 2)}`);
        } finally {
            setPostingNews(false);
        }
    };

    const handleShareImage = async () => {
        if (!shareCardRef.current) return;

        setIsGenerating(true);
        try {
            // Wait a bit for font/assets to be solid
            await new Promise(resolve => setTimeout(resolve, 200));

            const blob = await toBlob(shareCardRef.current, {
                cacheBust: true,
                pixelRatio: 2,
            });

            if (!blob) throw new Error('Blob could not be generated');

            const fileName = `Palavra-do-Dia-${new Date().toISOString().split('T')[0]}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            // Check if native sharing is available for files
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Palavra do Dia',
                    text: `Confira a Palavra do Dia: "${dailyWord.text}" — ${dailyWord.reference}`,
                });
            } else {
                // Fallback to simple download if sharing is not supported
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Erro ao compartilhar imagem:', error);
            alert('Erro ao processar imagem para compartilhar.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShareNews = async (e: React.MouseEvent, item: any) => {
        e.preventDefault();
        e.stopPropagation();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `${item.title}\n\n${item.content}\n\nConfira no Jornal do Reino!`,
                    url: window.location.href
                });
            } catch (error) {
                console.error('Erro ao compartilhar notícia:', error);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(`${item.title}\n\n${item.content}`);
            alert('Link da notícia copiado!');
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4 h-full flex flex-col transition-colors duration-1000"
        >
            {/* Hero Section - Word of the Day */}
            <motion.section variants={item} className="shrink-0">
                <div className={cn(
                    "relative rounded-2xl p-2.5 md:p-3 overflow-hidden shadow-lg transition-all duration-1000",
                    isNight
                        ? "bg-gradient-to-br from-[#020617] via-[#111827] to-[#1e1b4b] ring-1 ring-white/5"
                        : "bg-[#1e1b4b]"
                )}>
                    {/* Night Mode Subtle Glows (Luxurious & Clean) */}
                    {isNight && (
                        <>
                            <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                            <div className="absolute bottom-[-20%] right-0 w-48 h-48 bg-[#d4af37]/5 rounded-full blur-[80px]" />
                        </>
                    )}

                    <div className="absolute top-0 right-0 p-4 opacity-5 font-display font-black text-6xl text-[#d4af37] select-none pointer-events-none">"</div>
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#d4af37]/10 rounded-full blur-xl" />

                    <div className="relative z-10 flex flex-col items-center text-center gap-2">
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[8px] font-black uppercase tracking-[0.2em] text-[#d4af37]">
                                Palavra do Dia
                            </span>
                            <button
                                onClick={handleShareImage}
                                disabled={isGenerating}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all duration-300",
                                    isGenerating ? "bg-white/10 text-white/40 cursor-wait" : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                                )}
                            >
                                {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Share2 className="w-2.5 h-2.5" />}
                                <span className="text-[7px] font-black uppercase tracking-widest">{isGenerating ? 'Gerando...' : 'Compartilhar'}</span>
                            </button>
                        </div>

                        <motion.h2
                            key={dailyWord.text}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="font-display text-lg md:text-xl font-bold italic text-white leading-snug max-w-lg mt-1"
                        >
                            "{dailyWord.text}"
                        </motion.h2>

                        <motion.span
                            key={dailyWord.reference}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="font-serif text-[#d4af37]/80 text-[10px] tracking-widest uppercase font-bold"
                        >
                            {dailyWord.reference}
                        </motion.span>
                    </div>
                </div>
            </motion.section>

            {/* Invites Card */}
            <AnimatePresence>
                {invites.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="shrink-0"
                    >
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <h3 className="flex items-center gap-2 text-amber-800 font-bold text-sm uppercase tracking-wide mb-3">
                                <AlertCircle className="w-4 h-4" />
                                Convites Pendentes ({invites.length})
                            </h3>
                            <div className="space-y-3">
                                {invites.map(invite => (
                                    <div key={invite.id} className="bg-white p-3 rounded-lg shadow-sm border border-amber-100 flex items-center justify-between">
                                        <div>
                                            <p className="font-display font-bold text-[#1e1b4b] italic">
                                                {invite.events?.title}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {invite.events?.start_date && new Date(invite.events.start_date).toLocaleDateString('pt-BR')} • {invite.role}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => guardAction(() => handleRespondInvite(invite.id, 'confirmado'))}
                                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => guardAction(() => handleRespondInvite(invite.id, 'recusado'))}
                                                className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Function Grid - Premium Cards */}
            {/* Function Grid - Premium Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 items-stretch">
                <Link
                    to={['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro'].includes(profile?.role || '') ? '/escalas' : '/membro/agenda'}
                    className="contents"
                >
                    <motion.div variants={item} id="tour-event-cards" className="relative group cursor-pointer h-full">
                        <EventCarouselCard
                            events={events}
                            registrations={myRegistrations}
                            isLoading={isLoading}
                        />
                    </motion.div>
                </Link>

                <motion.div
                    variants={item}
                    className="relative bg-white border border-slate-100 rounded-2xl p-0 flex flex-col shadow-sm overflow-hidden"
                >
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#1e1b4b]/5 to-[#d4af37]/5 rounded-bl-[100px] -mr-6 -mt-6 pointer-events-none" />

                    {/* Item 1: Contribuição */}
                    <motion.div
                        id="tour-contribution-btn"
                        onClick={() => guardAction(() => setShowDonationModal(true))}
                        className="flex-1 flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-50 relative overflow-hidden"
                        initial="rest"
                        whileHover="hover"
                        animate="rest"
                        variants={{
                            rest: { scale: 1, y: 0, backgroundColor: "rgba(255, 255, 255, 0)", boxShadow: "0 0px 0px rgba(212, 175, 55, 0)", borderBottom: "1px solid rgba(241, 245, 249, 1)" },
                            hover: {
                                scale: 1.02,
                                y: -2,
                                backgroundColor: "rgba(212, 175, 55, 0.05)",
                                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.05), 0 0 15px rgba(212, 175, 55, 0.1)",
                                borderBottom: "1px solid rgba(212, 175, 55, 0.4)",
                                zIndex: 10
                            }
                        }}
                    >
                        {/* Icon Box - Dark Blue Theme with 3D Reveal */}
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1e1b4b] to-[#2e2a6b] flex items-center justify-center text-[#d4af37] shadow-lg shrink-0 relative z-10 overflow-visible">

                            {/* 3D Coins Reveal Animation - Framer Motion */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                {/* Coin Left */}
                                <motion.div
                                    variants={{
                                        rest: { y: 20, opacity: 0, scale: 0.5 },
                                        hover: { y: -12, x: -8, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 15, delay: 0.05 } }
                                    }}
                                    className="absolute"
                                >
                                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#b45309] to-[#fbbf24] shadow-sm border border-[#fff]/20" />
                                </motion.div>

                                {/* Coin Right */}
                                <motion.div
                                    variants={{
                                        rest: { y: 20, opacity: 0, scale: 0.5 },
                                        hover: { y: -14, x: 8, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 15, delay: 0.1 } }
                                    }}
                                    className="absolute"
                                >
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#b45309] to-[#d4af37] shadow-sm border border-[#fff]/20" />
                                </motion.div>

                                {/* Coin Center - Most visible */}
                                <motion.div
                                    variants={{
                                        rest: { y: 20, opacity: 0, scale: 0.5 },
                                        hover: { y: -20, opacity: 1, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 12 } }
                                    }}
                                    className="absolute"
                                >
                                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#fff] shadow-md border border-[#b45309]/30 flex items-center justify-center">
                                        <div className="text-[8px] font-black text-[#b45309]">$</div>
                                    </div>
                                </motion.div>
                            </div>

                            <motion.div
                                variants={{
                                    rest: { scale: 1, rotate: 0 },
                                    hover: { scale: 0.9, rotate: -5, transition: { type: "spring", bounce: 0.6 } }
                                }}
                                className="relative z-10"
                            >
                                <Wallet className="h-5 w-5 text-[#fcd34d]" strokeWidth={1.5} />
                            </motion.div>

                            {/* Shiny Effect on box */}
                            <motion.div
                                variants={{
                                    rest: { opacity: 0 },
                                    hover: { opacity: 1 }
                                }}
                                className="absolute inset-0 rounded-xl ring-2 ring-[#d4af37]/30 z-20"
                            />
                        </div>

                        <div className="flex-1 min-w-0 z-10">
                            <h3 className="text-[#1e1b4b] font-display text-sm font-bold italic mb-0.5">Adoração com Ofertas</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider truncate">Dízimos & Ofertas</p>
                        </div>

                        <motion.div
                            variants={{
                                rest: { x: 0, backgroundColor: "#f8fafc", color: "#cbd5e1" }, // slate-50, slate-300
                                hover: { x: 4, backgroundColor: "#1e1b4b", color: "#d4af37" }
                            }}
                            className="h-8 w-8 rounded-full flex items-center justify-center transition-colors z-10"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                        </motion.div>
                    </motion.div>

                    <Link to="/grupos" className="contents">
                        <motion.div
                            whileHover={{
                                scale: 1.02,
                                y: -2,
                                backgroundColor: "rgba(212, 175, 55, 0.05)",
                                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.05), 0 0 15px rgba(212, 175, 55, 0.1)",
                                borderColor: "rgba(212, 175, 55, 0.4)",
                                zIndex: 10
                            }}
                            id="tour-group-btn"
                            className="flex-1 flex items-center gap-3 p-3 cursor-pointer transition-all group/item border border-transparent"
                        >
                            {/* 3D Animated Icon Box */}
                            <div className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#1e1b4b] shadow-sm shrink-0 group-hover/item:scale-110 transition-transform relative overflow-hidden group-hover/item:border-[#d4af37]/30">
                                {/* Orbital Rings - Mini Version */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="absolute w-16 h-16 border border-slate-100/80 rounded-full animate-[spin_8s_linear_infinite]" />
                                    <div className="absolute w-10 h-10 border border-dashed border-slate-200/60 rounded-full animate-[spin_12s_linear_infinite_reverse]" />

                                    {/* Orbiting Dot 1 */}
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        className="absolute w-10 h-10"
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 h-1 w-1 bg-emerald-400 rounded-full shadow-sm" />
                                    </motion.div>

                                    {/* Orbiting Dot 2 - Counter Rotation */}
                                    <motion.div
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                        className="absolute w-14 h-14"
                                    >
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 h-1 w-1 bg-[#d4af37] rounded-full shadow-sm" />
                                    </motion.div>
                                </div>

                                <MapPin className="h-5 w-5 relative z-10 text-[#1e1b4b] group-hover/item:text-[#d4af37] transition-colors" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[#1e1b4b] font-display text-sm font-bold italic mb-0.5">Pequenos Grupos</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider truncate">Encontre seu Grupo</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover/item:bg-[#1e1b4b] group-hover/item:text-[#d4af37] transition-all">
                                <ArrowUpRight className="h-4 w-4" />
                            </div>
                        </motion.div>
                    </Link>
                </motion.div>
            </section>

            {!hideCheckin && (
                <motion.div variants={item} className="md:hidden shrink-0">
                    <button
                        onClick={() => guardAction(() => navigate('/membro/checkin'))}
                        className="w-full h-11 rounded-xl bg-[#1e1b4b] text-white font-bold text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-md"
                    >
                        <QrCode className="h-4 w-4" />
                        Check-in Culto
                    </button>
                </motion.div>
            )}

            {/* Editorial Feed */}
            <motion.section variants={item} className="flex-1 min-h-0 flex flex-col gap-3">
                <div className="flex flex-col gap-3 shrink-0 px-4 md:px-0">
                    <div className="flex items-center justify-between md:justify-start gap-3">
                        <div className="flex-1 md:flex-initial text-center md:text-left">
                            <h3 className="text-slate-800 font-display text-base md:text-sm italic font-bold">Últimas do Reino</h3>
                        </div>
                        <div className="hidden md:block h-px flex-1 bg-slate-100" />
                        {(profile?.role === 'admin' || profile?.role === 'pastor_chefe' || profile?.role === 'pastor_lider') && (
                            <button
                                onClick={() => {
                                    setEditingNews(null);
                                    setNewNews({
                                        title: '',
                                        content: '',
                                        category: 'Aviso',
                                        image_url: '',
                                        gallery_urls: [],
                                        important: false
                                    });
                                    setShowPostModal(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#b8962e] hover:from-[#e5c04a] hover:to-[#d4af37] text-white rounded-full transition-all shadow-lg shadow-[#d4af37]/30 hover:shadow-xl hover:shadow-[#d4af37]/40 hover:scale-105"
                            >
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Postar</span>
                            </button>
                        )}
                    </div>

                    {/* News Filters */}
                    <div id="tour-news-tabs" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none justify-center md:justify-start">
                        {['Tudo', 'Aviso', 'Devocional', 'Fotos'].map((cat) => (
                            <motion.button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "relative px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap border",
                                    selectedCategory === cat
                                        ? "bg-[#1e1b4b] text-white border-[#1e1b4b] shadow-lg shadow-[#1e1b4b]/30"
                                        : "bg-white text-slate-400 border-slate-100 hover:border-[#d4af37]/50 hover:text-[#1e1b4b]"
                                )}
                                whileTap={{ scale: 0.95 }}
                                animate={selectedCategory === cat ? { scale: 1.05 } : { scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                                {selectedCategory === cat && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-[#1e1b4b] rounded-full -z-10"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{cat}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-1">
                    {news.filter(n => selectedCategory === 'Tudo' || n.category === selectedCategory).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in zoom-in duration-700">
                            <div className={cn(
                                "w-16 h-16 rounded-3xl flex items-center justify-center mb-4 relative",
                                isNight ? "bg-white/5" : "bg-slate-50"
                            )}>
                                <AlertCircle className="w-8 h-8 text-slate-200" />
                                <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-slate-100/20 animate-[spin_10s_linear_infinite]" />
                            </div>
                            <h4 className={cn("font-display font-bold italic text-sm mb-1", isNight ? "text-slate-200" : "text-slate-800")}>Céu sem nuvens por aqui...</h4>
                            <p className="text-slate-400 text-[10px] leading-relaxed max-w-[200px]">
                                Ainda não há novidades nesta categoria. Fique ligado para as próximas bençãos!
                            </p>
                        </div>
                    ) : news
                        .map((item) => (
                            <article
                                key={item.id}
                                onClick={(e) => {
                                    const images: string[] = [];
                                    if (item.gallery_urls && item.gallery_urls.length > 0) {
                                        images.push(...(item.gallery_urls.filter((u): u is string => typeof u === 'string' && u.length > 0)));
                                    }
                                    if (item.image_url) {
                                        if (images.length === 0) images.push(item.image_url);
                                    }

                                    if (item.category === 'Fotos' && images.length > 0) {
                                        setViewingGallery({ urls: images, index: -1 }); // -1 indica modo Grid/Mural
                                    } else {
                                        handleShareNews(e, item);
                                    }
                                }}
                                className={cn(
                                    "group flex gap-3 items-start cursor-pointer p-3 border rounded-xl transition-all hover:border-[#d4af37]/30 hover:shadow-md bg-white border-slate-100 shadow-sm relative overflow-visible"
                                )}
                            >
                                {/* Admin Actions */}
                                {/* Admin Actions - Dedicated visible buttons */}
                                {(profile?.role === 'admin' || profile?.role === 'pastor_chefe' || profile?.role === 'pastor_lider') && (
                                    <div className="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleEditNews(item, e)}
                                            className="p-1.5 bg-blue-500 rounded-md shadow-lg hover:bg-blue-600 text-white transition-all transform hover:scale-105"
                                            title="Editar Notícia"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteNews(item.id, e)}
                                            className="p-1.5 bg-red-500 rounded-md shadow-lg hover:bg-red-600 text-white transition-all transform hover:scale-105"
                                            title="Apagar Notícia"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                <div className={cn(
                                    "w-14 h-16 rounded-lg overflow-hidden flex-none relative",
                                    !item.image_url && (
                                        item.category === 'Devocional' ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20" :
                                            item.category === 'Aviso' ? "bg-gradient-to-br from-red-500/20 to-orange-500/20" :
                                                item.category === 'Evento' ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20" :
                                                    item.category === 'Fotos' ? "bg-slate-800" :
                                                        "bg-gradient-to-br from-amber-500/20 to-[#d4af37]/20"
                                    )
                                )}>
                                    {(item.image_url || (item.gallery_urls && item.gallery_urls.length > 0)) ? (
                                        <>
                                            <img
                                                src={item.gallery_urls && item.gallery_urls.length > 0 ? item.gallery_urls[0] : item.image_url}
                                                alt={item.title}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            {item.category === 'Fotos' && (
                                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                                                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/40 mb-1">
                                                        <Plus className="w-3 h-3 text-white" />
                                                    </div>
                                                    {(item.gallery_urls?.length || 0) > 1 && (
                                                        <span className="text-[7px] font-black uppercase tracking-widest">
                                                            +{(item.gallery_urls?.length || 0) - 1}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {item.category === 'Devocional' ? <BookOpen className="w-5 h-5 text-blue-400 opacity-40" /> :
                                                item.category === 'Aviso' ? <AlertCircle className="w-5 h-5 text-red-400 opacity-40" /> :
                                                    item.category === 'Evento' ? <CalendarDays className="w-5 h-5 text-purple-400 opacity-40" /> :
                                                        item.category === 'Fotos' ? <ImagePlus className="w-5 h-5 text-slate-400 opacity-60" /> :
                                                            <Sparkles className="w-5 h-5 text-[#d4af37] opacity-40" />
                                            }
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className={cn(
                                            "text-[7px] font-black uppercase tracking-widest",
                                            item.category === 'Evento' ? "text-purple-400" :
                                                item.category === 'Aviso' ? "text-red-400" :
                                                    item.category === 'Fotos' ? "text-slate-500" :
                                                        "text-[#1e1b4b]"
                                        )}>{item.category}</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-300/30" />
                                        <span className="text-[7px] font-bold text-slate-400 uppercase">
                                            {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>
                                    <h4 className={cn(
                                        "font-display text-sm font-bold italic leading-tight mb-1 group-hover:text-[#d4af37] transition-colors line-clamp-2 text-[#1e1b4b]"
                                    )}>
                                        {item.title}
                                    </h4>
                                    <p className="text-slate-500 text-[10px] font-medium leading-relaxed line-clamp-2">
                                        {item.category === 'Fotos' ? (
                                            <span className="flex items-center gap-1 text-[#d4af37] font-bold">
                                                <ImagePlus className="w-3 h-3" />
                                                Clique para ver a galeria
                                            </span>
                                        ) : item.content}
                                    </p>
                                </div>
                            </article>
                        ))}
                </div>
            </motion.section>

            {/* Donation Modal */}
            <AnimatePresence>
                {showDonationModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[20px]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#1e1b4b] rounded-3xl w-full md:w-auto md:min-w-[380px] max-w-[420px] overflow-hidden shadow-2xl relative ring-1 ring-white/10 flex flex-col mx-4"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setShowDonationModal(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all z-50 backdrop-blur-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header Section - Compact */}
                            <div className="pt-6 pb-4 px-6 text-center relative z-10 shrink-0">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-[#d4af37] to-[#b45309] rounded-xl flex items-center justify-center shadow-lg shadow-black/30 ring-2 ring-white/20"
                                >
                                    <Wallet className="w-6 h-6 text-white" />
                                </motion.div>
                                <h3 className="font-display text-lg font-bold text-white italic tracking-wide mb-0.5">Oferta & Dízimo</h3>
                                <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Faça sua contribuição</p>
                            </div>

                            {/* Main Content Area - White Panel - Compact */}
                            <div className="bg-white px-5 py-5 rounded-t-[28px] relative flex-1 flex flex-col gap-4">
                                {/* Verse Box - Compact */}
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors shrink-0">
                                    <div className="absolute top-0 right-0 p-1 opacity-10">
                                        <Music className="w-8 h-8 rotate-12 text-[#1e1b4b]" />
                                    </div>
                                    <p className="text-slate-600 text-[10px] font-medium leading-relaxed italic relative z-10 text-center">
                                        "Deus ama ao que dá com alegria."
                                    </p>
                                    <p className="text-[#1e1b4b] text-[8px] font-black uppercase tracking-widest mt-1 text-center text-[#d4af37]">
                                        2 Coríntios 9:7
                                    </p>
                                </div>

                                {/* Dynamic Pix Selector */}
                                <div className="space-y-3 shrink-0">
                                    {/* Type Selector (Only if multiple keys exist) */}
                                    {(churchSettings?.pix_keys?.length > 0) ? (
                                        <div className="flex bg-slate-100 p-0.5 rounded-lg overflow-x-auto scrollbar-none">
                                            {/* Main Key Option */}
                                            <button
                                                onClick={() => {
                                                    setCopied(false);
                                                    setSelectedPixType('main');
                                                }}
                                                className={cn(
                                                    "flex-1 py-1.5 px-3 whitespace-nowrap text-[9px] font-black uppercase tracking-wide rounded-md transition-all",
                                                    selectedPixType === 'main'
                                                        ? "bg-white text-[#1e1b4b] shadow-sm"
                                                        : "text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                Principal
                                            </button>

                                            {/* Extra Keys Options */}
                                            {churchSettings.pix_keys.map((k: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setCopied(false);
                                                        setSelectedPixType(`extra-${idx}`);
                                                    }}
                                                    className={cn(
                                                        "flex-1 py-1.5 px-3 whitespace-nowrap text-[9px] font-black uppercase tracking-wide rounded-md transition-all",
                                                        selectedPixType === `extra-${idx}`
                                                            ? "bg-white text-[#1e1b4b] shadow-sm"
                                                            : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    {k.label || `Chave ${idx + 1}`}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                                            <p className="text-[10px] font-bold text-[#1e1b4b]">Chave Principal</p>
                                        </div>
                                    )}

                                    {/* Key Display - Compact */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-end px-1">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Chave PIX Selecionada</span>
                                            <span className="text-[8px] font-bold text-[#1e1b4b] uppercase tracking-widest">Igreja Local</span>
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-[#d4af37]/5 rounded-lg transform translate-y-0.5 scale-[0.99] transition-all group-hover:bg-[#d4af37]/10" />
                                            <div className="bg-white border-2 border-slate-100 group-hover:border-[#d4af37]/30 rounded-lg p-2.5 flex items-center gap-2.5 relative shadow-sm transition-all">
                                                <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center shrink-0">
                                                    <QrCode className="w-4 h-4 text-[#1e1b4b]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-mono text-[11px] text-slate-700 font-bold truncate">
                                                        {selectedPixType === 'main'
                                                            ? (churchSettings?.pix_key || "Chave não configurada")
                                                            : (churchSettings?.pix_keys?.[parseInt(selectedPixType.split('-')[1])]?.key || "Chave não encontrada")
                                                        }
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const keyToCopy = selectedPixType === 'main'
                                                            ? (churchSettings?.pix_key || "")
                                                            : (churchSettings?.pix_keys?.[parseInt(selectedPixType.split('-')[1])]?.key || "");

                                                        if (!keyToCopy) return;

                                                        navigator.clipboard.writeText(keyToCopy);
                                                        setCopied(true);

                                                        // Haptic feedback logic here if using navigator.vibrate
                                                        if (navigator.vibrate) navigator.vibrate(50);

                                                        setTimeout(() => setCopied(false), 2000);
                                                    }}
                                                    className={cn(
                                                        "w-8 h-8 rounded-md flex items-center justify-center transition-all duration-300",
                                                        copied
                                                            ? "bg-emerald-500 text-white shadow-emerald-200"
                                                            : "bg-[#1e1b4b] text-[#d4af37] hover:bg-[#2e2a6b] shadow-md"
                                                    )}
                                                >
                                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Info Badge - Always Visible */}
                                    {/* Bank Info Badge - Dynamic based on Selection */}
                                    {(() => {
                                        const selectedKeyIndex = selectedPixType.startsWith('extra-') ? parseInt(selectedPixType.split('-')[1]) : -1;
                                        const specificBankInfo = selectedKeyIndex >= 0 ? churchSettings?.pix_keys?.[selectedKeyIndex]?.bank_info : null;
                                        const displayBankInfo = specificBankInfo || churchSettings?.bank_info;

                                        return displayBankInfo && (
                                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                <p className="text-[9px] text-[#1e1b4b] font-medium leading-relaxed text-center">
                                                    <span className="font-black uppercase text-slate-400 text-[8px] tracking-widest block mb-1">
                                                        {specificBankInfo ? 'Titular / Banco' : 'Dados Bancários / Beneficiário'}
                                                    </span>
                                                    {displayBankInfo}
                                                </p>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex items-start gap-1.5 bg-blue-50/50 p-2 rounded-lg">
                                        <div className="mt-0.5 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                                        <p className="text-[9px] text-slate-500 leading-tight">
                                            Confira se o beneficiário é <strong>{churchSettings?.name || 'Igreja Local'}</strong> antes de confirmar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Post News Modal */}
            <AnimatePresence>
                {showPostModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[20px]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full md:w-[420px] overflow-hidden shadow-2xl relative flex flex-col mx-4"
                        >
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center">
                                            <Megaphone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-display font-bold text-slate-900 text-sm">{editingNews ? 'Editar Notícia' : 'Nova Notícia'}</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Feed do Reino</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPostModal(false)}
                                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handlePostNews} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#1e1b4b]/60 ml-1">Título da Notícia</label>
                                        <input
                                            type="text"
                                            value={newNews.title}
                                            onChange={e => setNewNews(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Ex: Noite de Louvor..."
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37] transition-all text-sm font-medium"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#1e1b4b]/60 ml-1">Categoria</label>
                                            <select
                                                value={newNews.category}
                                                onChange={e => setNewNews(prev => ({ ...prev, category: e.target.value as any }))}
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-100 text-[#1e1b4b] font-bold focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37] transition-all text-[11px] appearance-none cursor-pointer uppercase tracking-wider"
                                            >
                                                <option value="Aviso">Aviso</option>
                                                <option value="Devocional">Devocional</option>
                                                <option value="Fotos">Galeria de Fotos</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#1e1b4b]/60 ml-1">Foto da Notícia</label>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    id="news-image-upload"
                                                    multiple={newNews.category === 'Fotos'}
                                                    onChange={handleFileChange}
                                                />
                                                <label
                                                    htmlFor="news-image-upload"
                                                    className="w-full px-3 py-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer min-h-[42px] h-auto"
                                                >
                                                    {newNews.category === 'Fotos' && newNews.gallery_urls && newNews.gallery_urls.length > 0 ? (
                                                        <div className="grid grid-cols-5 gap-1 w-full p-1">
                                                            {newNews.gallery_urls.map((url, i) => (
                                                                <div key={i} className="aspect-square rounded-md overflow-hidden relative group/img">
                                                                    <img src={url} className="w-full h-full object-cover" />
                                                                    <div
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            setNewNews(prev => ({
                                                                                ...prev,
                                                                                gallery_urls: prev.gallery_urls?.filter((_, idx) => idx !== i)
                                                                            }))
                                                                        }}
                                                                        className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity"
                                                                    >
                                                                        <X className="w-3 h-3 text-white" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div className="aspect-square flex items-center justify-center bg-slate-100 rounded-md text-sky-500">
                                                                <Plus className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    ) : newNews.image_url ? (
                                                        <span className="text-[#d4af37] truncate">Foto Principal Definida ✓</span>
                                                    ) : (
                                                        <>
                                                            {newNews.category === 'Fotos' ? <ImageIcon className="w-3.5 h-3.5" /> : <ImagePlus className="w-3.5 h-3.5" />}
                                                            <span>{newNews.category === 'Fotos' ? 'Selecionar Fotos' : 'Upload Capa'}</span>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#1e1b4b]/60 ml-1">Conteúdo da Notícia <span className="text-slate-400 font-normal normal-case tracking-normal">(Opcional)</span></label>
                                        <textarea
                                            value={newNews.content}
                                            onChange={e => setNewNews(prev => ({ ...prev, content: e.target.value }))}
                                            rows={3}
                                            placeholder="Detalhes..."
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37] transition-all text-sm resize-none font-medium h-24"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={newNews.important}
                                                onChange={e => setNewNews(prev => ({ ...prev, important: e.target.checked }))}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#d4af37]"></div>
                                            <span className="ml-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marcar como Importante</span>
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={postingNews}
                                        className="w-full py-3.5 rounded-xl bg-[#1e1b4b] text-white font-black text-[9px] tracking-[0.2em] uppercase shadow-lg shadow-[#1e1b4b]/10 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                                    >
                                        {postingNews ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4" strokeWidth={3} />
                                                {editingNews ? 'Salvar Alterações' : 'Publicar no Jornal'}
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Gallery Modal System (Grid + Slideshow) */}
            <AnimatePresence>
                {viewingGallery && (
                    <div
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl"
                        onClick={() => setViewingGallery(null)}
                    >
                        {/* =========================================================
                            MODO MURAL (GRID) - index === -1
                           ========================================================= */}
                        {viewingGallery.index === -1 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative w-full h-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header do Mural */}
                                <div className="flex items-center justify-between mb-6 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
                                            <ImageIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-display font-bold text-white text-xl">Galeria de Fotos</h3>
                                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{viewingGallery.urls.length} fotos</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setViewingGallery(null)}
                                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:rotate-90"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Content Grid */}
                                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-[#d4af37]/50">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
                                        {viewingGallery.urls.map((url, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => setViewingGallery({ ...viewingGallery, index: i })}
                                                className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative border border-white/5 hover:border-[#d4af37]/50 transition-all shadow-lg hover:shadow-[#d4af37]/20"
                                            >
                                                <img
                                                    src={url}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/50 text-white scale-75 group-hover:scale-100 transition-all">
                                                        <Plus className="w-5 h-5" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* =========================================================
                               MODO SLIDESHOW (VIEWER) - index >= 0
                               ========================================================= */
                            <>
                                {/* Top Controls */}
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="absolute top-4 right-4 flex items-center gap-3 z-50 pointer-events-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Botão Voltar para Mural */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingGallery(prev => prev ? { ...prev, index: -1 } : null);
                                        }}
                                        className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all group mr-2"
                                    >
                                        <div className="grid grid-cols-2 gap-0.5">
                                            <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                                            <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                                            <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                                            <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">Todas as Fotos</span>
                                    </button>

                                    <a
                                        href={viewingGallery.urls[viewingGallery.index]}
                                        download={`foto-galeria-${viewingGallery.index + 1}.png`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all group"
                                        title="Baixar Imagem Atual"
                                    >
                                        <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </a>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingGallery(null);
                                        }}
                                        className="p-3 rounded-full bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 backdrop-blur-md transition-all group"
                                    >
                                        <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </motion.div>

                                {/* Navigation Arrows (Only if > 1 image) */}
                                {viewingGallery.urls.length > 1 && (
                                    <>
                                        <button
                                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 disabled:opacity-30 transition-all hover:scale-110 active:scale-95 border-none cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingGallery(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
                                            }}
                                        >
                                            <ChevronLeft className="w-8 h-8" />
                                        </button>
                                        <button
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 disabled:opacity-30 transition-all hover:scale-110 active:scale-95 border-none cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingGallery(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                                            }}
                                        >
                                            <ChevronRight className="w-8 h-8" />
                                        </button>
                                    </>
                                )}

                                {/* Main Image Display */}
                                <motion.div
                                    key={viewingGallery.index}
                                    initial={{ opacity: 0, scale: 0.9, x: 50 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, x: -50 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="relative w-full h-full flex flex-col items-center justify-center p-4 pb-28 md:p-12 md:pb-32 pointer-events-none"
                                >
                                    <img
                                        src={viewingGallery.urls[viewingGallery.index]}
                                        alt={`Foto ${viewingGallery.index + 1}`}
                                        className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </motion.div>

                                {/* Filmstrip Thumbnails */}
                                {viewingGallery.urls.length > 1 && (
                                    <div className="absolute bottom-6 left-0 right-0 h-24 px-4 flex items-center justify-center z-50 pointer-events-none">
                                        <div className="flex gap-2 p-2 bg-black/60 backdrop-blur-xl rounded-2xl overflow-x-auto max-w-full pointer-events-auto scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 border border-white/10">
                                            {viewingGallery.urls.map((url, i) => (
                                                <button
                                                    key={i}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingGallery(prev => prev ? { ...prev, index: i } : null);
                                                    }}
                                                    className={cn(
                                                        "relative w-16 h-16 shrink-0 rounded-lg overflow-hidden transition-all border-2",
                                                        i === viewingGallery.index
                                                            ? "border-[#d4af37] scale-105 shadow-lg shadow-[#d4af37]/20"
                                                            : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                                                    )}
                                                >
                                                    <img src={url} className="w-full h-full object-cover" loading="lazy" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </AnimatePresence>
            {/* Hidden Shareable Template */}
            <div className="fixed left-[-9999px] top-[-9999px]">
                <div
                    ref={shareCardRef}
                    className="w-[1080px] h-[1080px] bg-[#1e1b4b] relative overflow-hidden flex flex-col items-center justify-center p-20 text-center"
                    style={{ backgroundColor: '#1e1b4b', border: 'none', margin: 0, padding: '80px' }}
                >
                    {/* Background Art - Abstract Mesh */}
                    <div className="absolute inset-0 opacity-40">
                        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#d4af37]/20 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[100px]" />
                        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[80px]" />
                    </div>

                    {/* Corner Borders */}
                    <div className="absolute top-12 left-12 w-32 h-32 border-t-4 border-l-4 border-[#d4af37]/30 rounded-tl-3xl" />
                    <div className="absolute top-12 right-12 w-32 h-32 border-t-4 border-r-4 border-[#d4af37]/30 rounded-tr-3xl" />
                    <div className="absolute bottom-12 left-12 w-32 h-32 border-b-4 border-l-4 border-[#d4af37]/30 rounded-bl-3xl" />
                    <div className="absolute bottom-12 right-12 w-32 h-32 border-b-4 border-r-4 border-[#d4af37]/30 rounded-br-3xl" />

                    <div className="relative z-10 flex flex-col items-center max-w-[800px]">
                        <div className="mb-12">
                            <span className="px-6 py-2 rounded-full border-2 border-[#d4af37]/40 bg-[#d4af37]/10 text-xl font-black uppercase tracking-[0.4em] text-[#d4af37]">
                                Palavra do Dia
                            </span>
                        </div>

                        <div className="relative mb-12">
                            <div className="absolute -top-16 -left-12 opacity-20 font-display font-black text-[240px] text-[#d4af37] select-none pointer-events-none">"</div>
                            <h2 className="font-display text-6xl font-bold italic text-white leading-[1.1] relative z-10 drop-shadow-2xl">
                                {dailyWord.text}
                            </h2>
                        </div>

                        <div className="h-px w-40 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent mb-8" />

                        <span className="font-serif text-[#d4af37] text-3xl tracking-[0.2em] uppercase font-black">
                            {dailyWord.reference}
                        </span>
                    </div>

                    {/* Logo/Branding */}
                    <div className="absolute bottom-16 flex flex-col items-center opacity-80">
                        <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain mb-4" />
                        <h1 className="font-display text-4xl font-bold italic text-white leading-none">Church<span className="text-[#d4af37]">Flow</span></h1>
                        <p className="text-xs text-[#d4af37]/60 font-black uppercase tracking-[0.6em] mt-3">Jornal do Reino</p>
                    </div>
                </div>
            </div>
            <GateModal />
        </motion.div >
    );
}
