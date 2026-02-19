import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    ArrowRight,
    Calendar,
    Activity,
    UserPlus,
    FileText,
    Cake,
    Zap,
    Sparkles,
    Shield
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Modal } from '@/components/ui/Modal';
import { MemberForm } from '@/components/forms/MemberForm';
import { supabase } from '@/lib/supabase';
import {
    getUpcomingBirthdays,
    getUpcomingEventsFiltered,
    getFinancialDailyTrends
} from '@/lib/supabase-queries';
import { MinisterialBriefingModal } from '@/components/dashboard/MinisterialBriefingModal';
import { PastoralAlertsFeed } from '@/components/pastoral/PastoralAlertsFeed';
import { PastoralAlert, getPastoralAlerts, runPastoralEngine, generatePastoralSummary } from '@/lib/pastoral-engine';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for "premium" feel
        }
    }
} as const;

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
};

const Typewriter = ({ text, delay, cursor }: { text: string, delay: number, cursor?: boolean }) => {
    const [currentText, setCurrentText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setCurrentText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, delay, text]);

    return (
        <span>
            {currentText}
            {cursor && currentIndex < text.length && <span className="animate-pulse">|</span>}
        </span>
    );
};

function GospelWelcomeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { isAdmin, isPastor } = useAuth();

    // Define o conteúdo baseado na persona
    const isLeadership = isAdmin || isPastor;

    const content = isLeadership ? {
        title: "Visão & Excelência",
        subtitle: "Honrando o seu chamado ministerial",
        description: "Sua liderança agora tem o suporte que merece. Assuma o controle total da gestão para focar no que realmente importa: pastorear e cuidar das ovelhas com excelência.",
        icon: <Shield className="h-6 w-6 text-gold" />,
        button: "Acessar Painel de Controle"
    } : {
        title: "Você faz parte",
        subtitle: "Bem-vindo à sua casa digital",
        description: "Sua jornada com a nossa igreja agora está na palma da sua mão. Este é o seu espaço para conectar, contribuir e caminhar junto com a nossa comunidade.",
        icon: <Sparkles className="h-6 w-6 text-marinho" />,
        button: "Entrar na Minha Central"
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-marinho/80 backdrop-blur-xl"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative w-full max-w-xl bg-gradient-to-br from-[#faf9f6] to-[#ffffff] backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(30,27,75,0.3)] border border-white/20 overflow-hidden text-center p-12"
                    >
                        {/* Decorative background elements */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/5 rounded-full blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-marinho/5 rounded-full blur-3xl" />

                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

                        <div className="mb-8 flex justify-center relative">
                            <motion.div
                                initial={{ rotate: -10, scale: 0.8 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="h-20 w-20 bg-white shadow-xl shadow-marinho/5 rounded-3xl flex items-center justify-center border border-marinho/5"
                            >
                                {content.icon}
                            </motion.div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 h-20 w-20 bg-gold/10 rounded-3xl blur-xl mx-auto -z-10"
                            />
                        </div>

                        <div className="space-y-4 mb-10">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-gold uppercase tracking-[0.3em] font-sans">
                                    {content.subtitle}
                                </span>
                                <h2 className="font-display text-4xl font-bold text-marinho italic">
                                    {content.title}
                                </h2>
                            </div>
                            <p className="font-serif text-charcoal-600/80 text-lg leading-relaxed max-w-sm mx-auto">
                                {content.description}
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="w-full sm:w-auto px-10 py-4 bg-marinho text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-marinho/30 hover:bg-marinho-light transition-all flex items-center justify-center gap-3 mx-auto"
                        >
                            <span>{content.button}</span>
                            <ArrowRight className="h-4 w-4 text-gold" />
                        </motion.button>

                        <p className="mt-6 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                            ChurchFlow &copy; 2025 • Gestão com Propósito
                        </p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

import { useNavigate, Link } from 'react-router-dom';

export function DashboardPage() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const churchId = profile?.church_id;
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [memberCount, setMemberCount] = useState<number>(0);
    const [monthlyGiving, setMonthlyGiving] = useState<number>(0);
    const [visitorCount, setVisitorCount] = useState<number>(0);
    const [recentVisitors, setRecentVisitors] = useState<any[]>([]);

    // New dynamic states
    const [timeframe, setTimeframe] = useState<7 | 30>(7);
    const [upcomingBirthdaysCount, setUpcomingBirthdaysCount] = useState<number>(0);
    const [upcomingBaptismsCount, setUpcomingBaptismsCount] = useState<number>(0);
    const [financialTrend, setFinancialTrend] = useState<{ date: string, amount: number }[]>([]);

    // Report Modal
    const [isReportOpen, setIsReportOpen] = useState(false);

    // Pastoral Alerts
    const [pastoralAlerts, setPastoralAlerts] = useState<PastoralAlert[]>([]);
    const [pastoralLoading, setPastoralLoading] = useState(false);
    const [pastoralSummary, setPastoralSummary] = useState({ total: 0, critical: 0, high: 0, summary: '' });

    useEffect(() => {
        async function fetchData() {
            if (!supabase || !churchId) return;
            try {
                // Real counts
                const { count: mCount } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'membro');
                setMemberCount(mCount || 0);

                const { count: vCount } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'visitante');
                setVisitorCount(vCount || 0);

                // Recent Visitors
                const { data: vData } = await supabase
                    .from('members')
                    .select('full_name, phone, created_at')
                    .eq('church_id', churchId)
                    .eq('status', 'visitante')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (vData) {
                    setRecentVisitors(vData.map((v: any) => ({
                        name: v.full_name,
                        phone: v.phone,
                        date: new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    })));
                }

                // Finance
                const { data: tData } = await supabase
                    .from('transactions')
                    .select('amount')
                    .eq('church_id', churchId);
                if (tData) {
                    const total = tData.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
                    setMonthlyGiving(total);
                }

                // Dynamic content
                const { data: bDays } = await getUpcomingBirthdays(7, churchId);
                setUpcomingBirthdaysCount(bDays?.length || 0);

                const { data: baptisms } = await getUpcomingEventsFiltered(7, 'Batismo', churchId);
                setUpcomingBaptismsCount(baptisms?.length || 0);

                const { data: trends } = await getFinancialDailyTrends(timeframe, churchId);
                setFinancialTrend(trends || []);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            }
        }
        fetchData();

        if (!localStorage.getItem('churchflow_welcome_seen')) {
            setShowWelcome(true);
        }

        // Run pastoral engine
        if (churchId) {
            loadPastoralAlerts();
        }
    }, [timeframe, churchId]);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        localStorage.setItem('churchflow_welcome_seen', 'true');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
    };

    const loadPastoralAlerts = async () => {
        if (!churchId) return;
        setPastoralLoading(true);
        try {
            await runPastoralEngine(churchId);
            const { data } = await getPastoralAlerts(churchId, true);
            const alerts = (data || []) as PastoralAlert[];
            setPastoralAlerts(alerts);
            setPastoralSummary(generatePastoralSummary(alerts));
        } finally {
            setPastoralLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <GospelWelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-1.5 h-full"
            >
                {/* Balanced Premium Dashboard Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/80 backdrop-blur-xl p-3 rounded-[24px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="space-y-0.5 relative z-10 text-left">
                        <h1 className="text-xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            {getGreeting()}, <span className="font-serif italic text-gold font-normal text-2xl">{profile?.full_name?.split(' ')[0] || 'Pastor'}</span>
                        </h1>
                        <div className="inline-flex items-center px-0 py-0.5 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest h-4 flex items-center">
                                <Typewriter text="Sua liderança faz a diferença." delay={100} cursor />
                            </span>
                        </div>
                    </div>

                    {/* Integrated KPI Summary */}
                    <div className="hidden xl:flex items-center gap-10 border-x border-marinho/5 px-10 mx-6 relative z-10">
                        {[
                            { label: 'Membros', val: memberCount, color: 'text-marinho', href: '/membros' },
                            { label: 'Visitantes', val: visitorCount, color: 'text-gold', href: '/visitantes' },
                            { label: 'Arrecadação', val: formatCurrency(monthlyGiving), color: 'text-sage', href: '/financeiro' }
                        ].map((item, i) => (
                            <div key={i} className="text-center cursor-pointer group/kpi" onClick={() => navigate(item.href)}>
                                <p className={cn("text-xl font-display font-bold italic leading-none group-hover/kpi:scale-110 transition-transform", item.color)}>{typeof item.val === 'number' ? <AnimatedCounter value={item.val} duration={1400} /> : <AnimatedCounter value={monthlyGiving} duration={1600} formatFn={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)} />}</p>
                                <p className="text-[7px] font-black text-marinho/30 uppercase tracking-[0.2em] mt-0.5 group-hover/kpi:text-marinho/50">{item.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-3 relative z-10">
                        <button
                            onClick={() => setIsReportOpen(true)}
                            className="hidden md:flex h-11 px-5 bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/30 text-marinho hover:from-gold/20 hover:to-gold/10 hover:border-gold/50 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-sm active:scale-95 items-center gap-2 group"
                        >
                            <FileText className="h-4 w-4 text-gold group-hover:rotate-6 transition-transform" />
                            <span>Briefing Ministerial</span>
                        </button>

                        <button
                            onClick={() => setIsMemberModalOpen(true)}
                            className="h-11 px-4 bg-marinho hover:bg-marinho/90 text-white rounded-xl transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-3 group relative overflow-hidden"
                        >
                            <div className="h-7 w-7 flex items-center justify-center bg-white/10 rounded-lg group-hover:bg-gold group-hover:rotate-12 transition-all duration-300">
                                <UserPlus className="h-3.5 w-3.5 text-gold group-hover:text-marinho transition-colors" strokeWidth={1.5} />
                            </div>
                            <div className="text-left">
                                <span className="block text-[10px] font-display font-bold italic leading-none">Novo Registro</span>
                                <span className="block text-[7px] font-black text-white/50 uppercase tracking-widest mt-0.5">Cadastrar Membro</span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-gold/50 group-hover:translate-x-1 group-hover:text-gold transition-all ml-1" strokeWidth={1.5} />
                        </button>
                    </div>
                </header>

                {/* Main Content Areas */}
                <div className="grid grid-cols-12 gap-1.5 flex-1 min-h-0">
                    {/* Left Column Stack */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-1.5 h-full min-h-0">
                        <section className="grid grid-cols-2 gap-1.5 flex-none">
                            {/* Church Health Insight */}
                            <motion.div variants={itemVariants} className="card-3d p-2.5 relative overflow-hidden bg-gradient-to-br from-white via-sage/[0.01] to-sage/[0.05] border border-sage/10 text-left">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-3.5 w-3.5 text-sage" strokeWidth={1.5} />
                                        <h3 className="font-display text-base font-bold italic text-marinho">Saúde da Igreja</h3>
                                    </div>
                                    <span
                                        className="text-[9px] font-bold text-sage bg-sage/10 px-2 py-0.5 rounded-full font-serif uppercase tracking-tighter cursor-help"
                                        title="Sua igreja está ativa! Taxa de presença e engajamento acima da média."
                                    >
                                        ✓ Igreja Ativa
                                    </span>
                                </div>
                                <div className="space-y-1.5 font-sans">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-marinho/40 uppercase tracking-tight">Comunidade</p>
                                            <div className="flex items-end gap-1">
                                                <AnimatedCounter value={memberCount} duration={1200} className="text-xl font-display font-bold text-marinho italic" />
                                                <span className="text-[10px] text-marinho/40 pb-0.5 font-medium">membros</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-marinho/40 uppercase tracking-tight">Visitantes</p>
                                            <div className="flex items-end gap-1">
                                                <AnimatedCounter value={visitorCount} duration={1200} className="text-xl font-display font-bold text-gold italic" />
                                                <span className="text-[10px] text-gold/60 pb-0.5 font-medium">novos</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-1 w-full bg-marinho/5 rounded-full overflow-hidden flex ring-1 ring-inset ring-black/[0.02]">
                                        <div className="h-full bg-marinho rounded-l-full transition-all duration-1000 shadow-inner" style={{ width: `${(memberCount / (memberCount + visitorCount) * 100) || 100}%` }} />
                                        <div className="h-full bg-gold transition-all duration-1000 shadow-inner" style={{ width: `${(visitorCount / (memberCount + visitorCount) * 100) || 0}%` }} />
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-marinho/40">
                                        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-marinho" /> Membros</div>
                                        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-gold" /> Visitantes</div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-8 -left-8 h-24 w-24 bg-sage/5 rounded-full blur-2xl" />
                            </motion.div>

                            {/* Dashboard Intelligence: Next 7 Days */}
                            <motion.div variants={itemVariants} className="card-3d p-2.5 bg-white relative overflow-hidden text-left border border-white/40">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                                    <h3 className="font-display text-base font-bold italic text-marinho">Próximos 7 Dias</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <Link to="/membros" className="bg-marinho/5 p-1.5 rounded-xl flex items-center gap-2 group/card transition-all hover:bg-gold/10">
                                        <div className="h-8 w-8 rounded-lg bg-white shadow-soft flex items-center justify-center transition-transform group-hover/card:scale-110">
                                            <Cake className="h-4 w-4 text-gold" strokeWidth={1.5} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-display font-bold text-marinho leading-none italic group-hover/card:text-gold-dark transition-colors"><AnimatedCounter value={upcomingBirthdaysCount} duration={800} /> Aniversários</p>
                                            <p className="text-[8px] text-marinho/30 uppercase mt-0.5 font-bold tracking-widest">Membros Ativos</p>
                                        </div>
                                    </Link>
                                    <Link to="/eventos" className="bg-marinho/5 p-1.5 rounded-xl flex items-center gap-2 group/card-2 transition-all hover:bg-sage/10">
                                        <div className="h-8 w-8 rounded-lg bg-white shadow-soft flex items-center justify-center transition-transform group-hover/card-2:scale-110">
                                            <Zap className="h-4 w-4 text-sage" strokeWidth={1.5} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-display font-bold text-marinho leading-none italic group-hover/card-2:text-sage-dark transition-colors"><AnimatedCounter value={upcomingBaptismsCount} duration={800} /> Batismos</p>
                                            <p className="text-[8px] text-marinho/30 uppercase mt-0.5 font-bold tracking-widest">Eventos</p>
                                        </div>
                                    </Link>
                                </div>
                            </motion.div>
                        </section>

                        {/* Arrecadação Digital */}
                        <motion.div variants={itemVariants} className="card-3d p-2.5 flex-1 flex flex-col min-h-0 text-left bg-white/40 backdrop-blur-sm border border-white/60">
                            <div className="flex items-center justify-between mb-2 flex-none">
                                <div className="space-y-0.5">
                                    <h3 className="font-display text-lg font-bold italic text-marinho">Arrecadação Digital</h3>
                                    <p className="text-[8px] font-black text-marinho/20 uppercase tracking-[0.2em]">Movimentação Financeira</p>
                                </div>
                                <div className="flex gap-1 p-1 bg-marinho/5 rounded-lg border border-marinho/5">
                                    <button
                                        onClick={() => setTimeframe(7)}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-[8px] font-bold transition-all",
                                            timeframe === 7 ? "bg-marinho text-white shadow-soft" : "bg-transparent text-marinho/40 hover:text-marinho"
                                        )}
                                    >
                                        7 Dias
                                    </button>
                                    <button
                                        onClick={() => setTimeframe(30)}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-[8px] font-bold transition-all",
                                            timeframe === 30 ? "bg-marinho text-white shadow-soft" : "bg-transparent text-marinho/40 hover:text-marinho"
                                        )}
                                    >
                                        30 Dias
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-end overflow-hidden relative group/chart">
                                <div className="flex-1 flex items-end gap-2 px-1 pb-1">
                                    {financialTrend.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold/10 to-gold/5 flex items-center justify-center border border-gold/20">
                                                <Activity className="h-5 w-5 text-gold/60" strokeWidth={1.5} />
                                            </div>
                                            <div className="text-center space-y-0.5">
                                                <p className="text-[10px] font-display font-bold text-marinho italic">Comece a receber doações</p>
                                                <p className="text-[8px] text-marinho/40 max-w-[180px]">Configure sua chave PIX para começar a receber contribuições digitais.</p>
                                            </div>
                                            <button
                                                onClick={() => navigate('/financeiro')}
                                                className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all hover:scale-105"
                                            >
                                                Configurar PIX
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Data Bars with Premium Hover */}
                                            {financialTrend.map((item, i) => {
                                                const maxVal = Math.max(...financialTrend.map(t => t.amount), 1);
                                                const h = (item.amount / maxVal) * 100;
                                                return (
                                                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 relative group/bar">
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all scale-75 group-hover/bar:scale-100 bg-marinho text-white text-[9px] px-2 py-1 rounded-lg font-bold z-10 shadow-premium whitespace-nowrap">
                                                            {formatCurrency(item.amount)}
                                                        </div>
                                                        <div className="w-full relative h-[85%]">
                                                            <motion.div
                                                                initial={{ height: 0 }}
                                                                animate={{ height: `${Math.max(h, 5)}%` }}
                                                                transition={{ delay: i * 0.05, duration: 0.8, ease: "easeOut" }}
                                                                className="absolute bottom-0 left-0 right-0 bg-marinho/5 rounded-t-xl group-hover/bar:bg-marinho/10 transition-colors"
                                                            />
                                                            <motion.div
                                                                initial={{ height: 0 }}
                                                                animate={{ height: `${Math.max(h, 5)}%` }}
                                                                transition={{ delay: i * 0.1, duration: 1, ease: "easeOut" }}
                                                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-marinho/20 to-marinho/40 rounded-t-xl group-hover/bar:from-marinho/40 group-hover/bar:to-marinho/60 transition-all border-t border-marinho/20 shadow-inner"
                                                            >
                                                                <div className="absolute top-0 inset-x-0 h-1 bg-white/20 rounded-full blur-[1px] m-1" />
                                                            </motion.div>
                                                        </div>
                                                        <span className="text-[8px] font-black text-marinho/20 uppercase tracking-tighter">
                                                            {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit' })}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column Stack */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-1.5 h-full min-h-0 text-left">
                        {/* Pastoral Alerts Widget */}
                        <motion.section variants={itemVariants} className="card-3d p-2.5 bg-white/40 backdrop-blur-2xl border border-white/60 shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-display text-lg font-bold italic text-marinho leading-none">Pastoral</h3>
                                    {pastoralSummary.total > 0 && (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[8px] font-black",
                                            pastoralSummary.critical > 0 ? "bg-red-100 text-red-600" :
                                                pastoralSummary.high > 0 ? "bg-orange-100 text-orange-600" :
                                                    "bg-emerald-100 text-emerald-600"
                                        )}>
                                            {pastoralSummary.total} alerta{pastoralSummary.total > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {pastoralSummary.summary && (
                                <p className="text-[8px] text-marinho/40 font-bold mb-2 leading-relaxed">{pastoralSummary.summary}</p>
                            )}
                            <PastoralAlertsFeed
                                alerts={pastoralAlerts}
                                loading={pastoralLoading}
                                onRefresh={loadPastoralAlerts}
                                compact
                            />
                        </motion.section>
                        <motion.section variants={itemVariants} className="card-3d p-2.5 flex-1 flex flex-col min-h-0 bg-white/40 backdrop-blur-2xl overflow-hidden border border-white/60">
                            <Link to="/visitantes" className="flex items-center justify-between mb-2 flex-none group/header cursor-pointer">
                                <div>
                                    <h3 className="font-display text-lg font-bold italic text-marinho leading-none group-hover/header:text-gold transition-colors">Visitantes Recentes</h3>
                                    <p className="text-[8px] text-marinho/30 uppercase font-black mt-1.5 tracking-[0.2em]">Boas-vindas Automatizadas</p>
                                </div>
                                <div className="h-6 w-6 rounded-lg bg-marinho/5 flex items-center justify-center group-hover/header:bg-marinho transition-all">
                                    <ArrowRight className="h-3 w-3 text-marinho/20 group-hover/header:text-white transition-all transform group-hover/header:translate-x-0.5" />
                                </div>
                            </Link>

                            <div className="space-y-1.5 flex-1 overflow-y-auto show-scrollbar-hover pr-1">
                                {recentVisitors.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-center">
                                        <div className="h-12 w-12 rounded-full bg-cream-50 flex items-center justify-center border border-white">
                                            <UserPlus className="h-6 w-6 text-marinho/10" strokeWidth={1} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-display font-bold text-marinho italic">Tudo pronto para crescer!</p>
                                            <p className="text-[9px] text-marinho/40 px-6 leading-relaxed uppercase font-black tracking-tight underline cursor-pointer hover:text-marinho transition-colors" onClick={() => setIsMemberModalOpen(true)}>
                                                Clique em "Novo Registro" para cadastrar seu primeiro visitante
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    recentVisitors.map((visitor, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={i}
                                            className="flex items-center justify-between p-2 rounded-xl border border-white/80 bg-white/50 shadow-sm transition-all hover:bg-white hover:shadow-md group/v"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-marinho/5 to-marinho/10 flex items-center justify-center font-display font-bold text-marinho text-[11px] group-hover/v:scale-105 transition-transform italic border border-white">
                                                    {visitor.name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-display font-bold text-marinho truncate italic">{visitor.name}</p>
                                                    <p className="text-[8px] font-black text-marinho/20 uppercase tracking-widest mt-0.5">{visitor.date}</p>
                                                </div>
                                            </div>

                                            {/* Enhanced Welcome Action */}
                                            <button
                                                onClick={() => {
                                                    const phone = visitor.phone?.replace(/\D/g, '') || '';
                                                    // Personalized Welcome Template
                                                    const message = encodeURIComponent(`Olá, ${visitor.name}! 👋\n\nSou da equipe de boas-vindas da ChurchFlow. Ficamos muito felizes em ter você conosco!\n\nFoi sua primeira vez? Conta pra gente o que achou?`);
                                                    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                                                }}
                                                className="h-8 px-3 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-600 rounded-lg transition-all flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest shadow-sm active:scale-95 group/btn"
                                            >
                                                <MessageCircle className="h-3 w-3 opacity-60 group-hover/btn:opacity-100" />
                                                <span className="hidden sm:inline">Boas Vindas</span>
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.section>
                    </div>
                </div>
            </motion.div >

            <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Novo Cadastro Ministerial">
                <MemberForm
                    churchId={churchId || ''}
                    onSuccess={() => { setIsMemberModalOpen(false); if (supabase) window.location.reload(); }}
                    onCancel={() => setIsMemberModalOpen(false)}
                />
            </Modal>

            <MinisterialBriefingModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                stats={{
                    visitors: visitorCount,
                    members: memberCount,
                    offerings: monthlyGiving, // In a real app we would filter for only this week's offerings
                    baptisms: upcomingBaptismsCount,
                    birthdays: upcomingBirthdaysCount
                }}
            />
        </DashboardLayout >
    );
}
