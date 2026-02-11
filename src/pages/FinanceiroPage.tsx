import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    ChevronLeft,
    ChevronRight,
    Building,
    Clock,
    Zap,
    Banknote,
    CreditCard,
    FileText,
    History,
    X,
    ChevronDown,
    Loader2,
    CalendarDays,
    Trash2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { PremiumCalendar } from '@/components/ui/PremiumCalendar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    getFinancialMetrics,
    getTransactions,
    Transaction,
    getDailyFinancialMovement,
    createTransaction,
    deleteTransaction,
    getCostCenters,
    createCostCenter,
    getMembers,
    Member
} from '@/lib/supabase-queries';
import { cn } from '@/lib/utils';

// ...
// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001'; // REMOVED

// ...

// Animation Variants
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export function FinanceiroPage() {
    const { profile, loading: authLoading } = useAuth();
    const churchId = profile?.church_id; // No fallback

    // State Definitions
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        balance: 0, incomes: 0, expenses: 0, giving: 0,
        variationIncome: 0, variationExpense: 0,
        incomeProgress: 0, givingProgress: 0, expenseProgress: 0,
        byCategory: [] as any[]
    });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [dailyMovement, setDailyMovement] = useState<any[]>([]);
    const [costCenters, setCostCenters] = useState<{ id: string, name: string }[]>([]);
    const [members, setMembers] = useState<Member[]>([]);

    // UI States
    const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [isCostCentersOpen, setIsCostCentersOpen] = useState(false);
    const [isCreatingCostCenter, setIsCreatingCostCenter] = useState(false);

    // Form States
    const [newEntryType, setNewEntryType] = useState<'in' | 'out'>('in');
    const [newEntryAmount, setNewEntryAmount] = useState('');
    const [newEntryDesc, setNewEntryDesc] = useState('');

    const getLocalDateString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const [newEntryDate, setNewEntryDate] = useState(getLocalDateString(new Date()));
    const [newEntryMethod, setNewEntryMethod] = useState('Pix');
    const [newEntryCostCenter, setNewEntryCostCenter] = useState('');
    const [newEntryBeneficiary, setNewEntryBeneficiary] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
    const [newCostCenterName, setNewCostCenterName] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCostCenter, setSelectedCostCenter] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'validation_error'>('idle');

    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

    const handleSaveTransaction = async () => {
        if (!churchId) {
            alert('Erro: Igreja não identificada. Recarregue a página.');
            return;
        }
        if (!newEntryAmount || !newEntryDesc || !newEntryDate) {
            setSubmitStatus('validation_error');
            setTimeout(() => setSubmitStatus('idle'), 2500);
            return;
        }

        // Validate Member Selection for Incomes if needed (optional, effectively handled by member_id logic)

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const amountValue = parseFloat(newEntryAmount.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
            const finalAmount = newEntryType === 'out' ? -Math.abs(amountValue) : Math.abs(amountValue);

            const { error } = await createTransaction({
                church_id: churchId,
                amount: finalAmount,
                description: newEntryDesc,
                date: newEntryDate,
                payment_method: newEntryMethod,
                category: newEntryType === 'in' ? 'Oferta' : 'Despesa',
                cost_center_id: newEntryCostCenter || undefined,
                type: newEntryType === 'in' ? 'Dízimo' : 'Custeio',
                beneficiary: newEntryType === 'in' ? (selectedMemberId ? undefined : newEntryBeneficiary) : newEntryBeneficiary,
                member_id: selectedMemberId || undefined,
                status: 'completed'
            });

            if (error) throw error;

            setSubmitStatus('success');

            setTimeout(async () => {
                setIsNewEntryOpen(false);
                setNewEntryAmount('');
                setNewEntryDesc('');
                setNewEntryBeneficiary('');
                setMemberSearchTerm('');
                setSelectedMemberId(null);
                setNewEntryCostCenter('');
                setNewEntryDate(getLocalDateString(new Date()));
                setSubmitStatus('idle');
                setIsSubmitting(false);
                await loadData(false);
            }, 1000);

        } catch (error) {
            console.error('Error saving transaction:', error);
            setSubmitStatus('error');
            setTimeout(() => {
                setSubmitStatus('idle');
                setIsSubmitting(false);
            }, 3000);
        }
    };

    const handleDeleteTransaction = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTransactionToDelete(id);
    };

    const confirmDelete = async () => {
        if (!transactionToDelete) return;
        setIsDeleting(true);
        try {
            await deleteTransaction(transactionToDelete);
            setTransactions(prev => prev.filter(t => t.id !== transactionToDelete));
            setTransactionToDelete(null);
            await loadData(false);
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Erro ao excluir lançamento');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateCostCenter = async () => {
        if (!newCostCenterName || !churchId) return;
        try {
            const { error } = await createCostCenter({ name: newCostCenterName, church_id: churchId });
            if (error) throw error;

            const { data: cc } = await getCostCenters(churchId);
            if (cc) setCostCenters(cc);

            setNewCostCenterName('');
            setIsCreatingCostCenter(false);
        } catch (error) {
            console.error('Error creating cost center', error);
        }
    };

    useEffect(() => {
        if (authLoading) return;

        if (churchId) {
            loadData();
        } else {
            // Strict isolation
            setLoading(false);
            setStats({
                balance: 0, incomes: 0, expenses: 0, giving: 0,
                variationIncome: 0, variationExpense: 0,
                incomeProgress: 0, givingProgress: 0, expenseProgress: 0,
                byCategory: []
            });
            setTransactions([]);
            setDailyMovement([]);
        }
    }, [currentDate, selectedCostCenter, churchId, authLoading]);

    const loadData = async (showLoading = true) => {
        if (authLoading || !churchId) return;
        if (showLoading) setLoading(true);
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            const [metricsRes, transactionsRes, movementRes, ccRes, membersRes] = await Promise.all([
                getFinancialMetrics(churchId, month, year, selectedCostCenter || undefined),
                getTransactions({ churchId, cost_center_id: selectedCostCenter || undefined, limit: 12 }),
                getDailyFinancialMovement(churchId, selectedCostCenter || undefined),
                getCostCenters(churchId),
                getMembers(churchId)
            ]);

            if (ccRes?.data) setCostCenters(ccRes.data);
            if (membersRes?.data) setMembers(membersRes.data);

            const metrics = metricsRes;
            if (metrics) {
                const givingVal = metrics.giving || 0;
                const incProgress = Math.min((metrics.income / 10000) * 100, 100);
                const givProgress = metrics.income > 0 ? (givingVal / metrics.income) * 100 : 0;
                const expProgress = metrics.income > 0 ? (metrics.expense / metrics.income) * 100 : 0;

                setStats(prev => ({
                    ...prev,
                    balance: metrics.balance,
                    incomes: metrics.income,
                    expenses: metrics.expense,
                    giving: givingVal,
                    variationIncome: metrics.variationIncome,
                    variationExpense: metrics.variationExpense,
                    incomeProgress: incProgress,
                    givingProgress: givProgress,
                    expenseProgress: expProgress,
                    byCategory: [
                        { name: 'Dízimos', amount: givingVal, color: 'bg-sage' },
                        { name: 'Ofertas', amount: metrics.income - givingVal > 0 ? metrics.income - givingVal : 0, color: 'bg-gold' },
                        { name: 'Missões', amount: metrics.income * 0.05, color: 'bg-marinho' },
                        { name: 'Outros', amount: metrics.income * 0.05, color: 'bg-slate-400' }
                    ]
                }));
            }
            if (transactionsRes?.data) setTransactions(transactionsRes.data);
            if (movementRes?.data) setDailyMovement(movementRes.data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.payment_method?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8);

    return (
        <>
            <DashboardLayout>
                <div className="flex flex-col h-full gap-2">
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="flex flex-col h-full gap-2"
                    >
                        {/* Balanced Glass Header - Exact MembrosPage Style */}
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[28px] shadow-sm border border-white/40 relative overflow-hidden group shrink-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/5 via-marinho/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                            <div className="space-y-0.5 relative z-10">
                                <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                                    <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">Fluxo Financeiro</span>
                                </div>
                                <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                                    Gestão <span className="font-serif italic text-gold font-normal text-3xl">Financeira</span>
                                </h1>
                            </div>

                            <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                                <div className="flex items-center bg-white/60 backdrop-blur-md shadow-inner border border-marinho/5 rounded-xl p-0.5 h-11">
                                    <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className="p-2 text-marinho/40 hover:text-marinho hover:bg-white rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                    <span className="px-4 text-[10px] font-black text-marinho uppercase tracking-[0.15em] min-w-[140px] text-center">{monthName}</span>
                                    <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className="p-2 text-marinho/40 hover:text-marinho hover:bg-white rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
                                </div>

                                <button
                                    onClick={() => { setNewEntryType('in'); setNewEntryCostCenter(selectedCostCenter || ''); setIsNewEntryOpen(true); }}
                                    className="h-11 px-7 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2.5"
                                >
                                    <Plus className="w-4 h-4 text-gold" />
                                    <span>Lançamento</span>
                                </button>
                            </div>
                        </header>

                        {/* 3D Flip Cards - Interactive Design */}
                        <motion.div variants={item} className="grid grid-cols-2 gap-2.5 shrink-0 px-2" style={{ perspective: '1000px' }}>
                            {/* Card 1: Saldo Atual - 3D Flip */}
                            <motion.div
                                className="relative h-32 cursor-pointer group"
                                style={{ transformStyle: 'preserve-3d' }}
                                whileHover={{ scale: 1.02, rotateY: 180 }}
                                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                            >
                                {/* Front Face */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 rounded-2xl p-4 border border-slate-300 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.08)] backdrop-blur-sm"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <motion.div
                                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-marinho/10 to-marinho/5 flex items-center justify-center text-marinho shadow-inner"
                                                    whileHover={{ rotate: 360 }}
                                                    transition={{ duration: 0.6 }}
                                                >
                                                    <Wallet className="w-5 h-5" />
                                                </motion.div>
                                                <p className="text-[9px] font-black text-marinho/40 uppercase tracking-wider">Saldo Atual</p>
                                            </div>
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-full text-[8px] font-black uppercase shadow-sm",
                                                stats.balance > 0 ? "bg-sage/10 text-sage" : stats.balance < 0 ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                                            )}>
                                                {stats.balance > 0 ? '● Saudável' : stats.balance < 0 ? '● Crítico' : '● Atenção'}
                                            </div>
                                        </div>
                                        <p className="text-3xl font-display font-black italic text-marinho leading-none mb-2">{formatCurrency(stats.balance)}</p>
                                        <div className="flex items-center gap-1.5 text-slate-400 mt-auto">
                                            <span className="text-[9px] uppercase tracking-wider">Hover para detalhes</span>
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
                                </div>

                                {/* Back Face */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-marinho via-marinho/90 to-marinho/80 rounded-2xl p-4 border border-marinho/50 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.08)]"
                                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                >
                                    <div className="h-full flex flex-col justify-between text-white">
                                        <div>
                                            <p className="text-[8px] font-bold text-white/60 uppercase tracking-wider mb-1">Breakdown</p>
                                            <div className="flex items-center justify-between text-[10px] mb-1">
                                                <span className="text-sage">Entradas:</span>
                                                <span className="font-bold">{formatCurrency(stats.incomes)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-red-400">Saídas:</span>
                                                <span className="font-bold">{formatCurrency(stats.expenses)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-sage"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: stats.incomes > 0 ? `${(stats.incomes / (stats.incomes + stats.expenses || 1)) * 100}%` : '0%' }}
                                                    transition={{ duration: 0.8, delay: 0.3 }}
                                                />
                                            </div>
                                            <span className="text-[8px] font-bold">{stats.incomes > 0 ? Math.round((stats.incomes / (stats.incomes + stats.expenses || 1)) * 100) : 0}% Entradas</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3D Depth Effect */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent to-black/5 pointer-events-none" style={{ transform: 'translateZ(-2px)' }} />
                            </motion.div>

                            {/* Card 2: Movimento do Mês - 3D Flip */}
                            <motion.div
                                className="relative h-32 cursor-pointer group"
                                style={{ transformStyle: 'preserve-3d' }}
                                whileHover={{ scale: 1.02, rotateY: 180 }}
                                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                            >
                                {/* Front Face */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 rounded-2xl p-4 border border-slate-300 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.08)] backdrop-blur-sm"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <p className="text-[9px] font-black text-marinho/40 uppercase tracking-wider mb-3">Movimento do Mês</p>
                                    <div className="flex items-center gap-3">
                                        {/* Entradas */}
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage/10 to-sage/5 flex items-center justify-center text-sage shadow-inner">
                                                <ArrowUpRight className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Entradas</p>
                                                <p className="text-lg font-display font-black italic text-sage leading-none">{formatCurrency(stats.incomes)}</p>
                                            </div>
                                        </div>

                                        <div className="w-px h-12 bg-slate-300" />

                                        {/* Saídas */}
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-50 to-red-50/50 flex items-center justify-center text-red-500 shadow-inner">
                                                <ArrowDownRight className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">Saídas</p>
                                                <p className="text-lg font-display font-black italic text-red-500 leading-none">{formatCurrency(stats.expenses)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Back Face */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-marinho via-marinho/90 to-marinho/80 rounded-2xl p-4 border border-marinho/50 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.08)]"
                                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                >
                                    <div className="h-full flex flex-col justify-between text-white">
                                        <div>
                                            <p className="text-[8px] font-bold text-white/60 uppercase tracking-wider mb-2">Performance</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className={cn(
                                                    "text-3xl font-black",
                                                    Math.round(stats.expenseProgress) === 0 ? "text-sage" : "text-white"
                                                )}>
                                                    {Math.round(stats.expenseProgress) === 0 && <span className="text-lg mr-1">✓</span>}
                                                    {stats.expenseProgress.toFixed(0)}%
                                                </span>
                                                <span className="text-[9px] opacity-70">
                                                    {Math.round(stats.expenseProgress) === 0 ? "economia total" : "das entradas gastas"}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[9px] mb-1">
                                                <span className="opacity-70">Saldo líquido</span>
                                                <span className={cn("font-bold", stats.balance > 0 ? "text-sage" : "text-red-400")}>
                                                    {formatCurrency(stats.balance)}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={cn("h-full", stats.expenseProgress < 70 ? "bg-sage" : stats.expenseProgress < 90 ? "bg-amber-400" : "bg-red-400")}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(stats.expenseProgress, 100)}%` }}
                                                    transition={{ duration: 0.8, delay: 0.3 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3D Depth Effect */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent to-black/5 pointer-events-none" style={{ transform: 'translateZ(-2px)' }} />
                            </motion.div>
                        </motion.div>



                        {/* Main Content Grid */}
                        <div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
                            <motion.div variants={item} className="col-span-8 flex flex-col gap-2 min-h-0">
                                <div className="flex flex-col gap-1 flex-1 min-h-0">
                                    <div className="flex items-center justify-between flex-shrink-0">
                                        <h3 className="text-base font-display font-bold text-marinho italic leading-none">Fluxo de Caixa</h3>
                                        <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest bg-white shadow-soft border border-slate-50 rounded-lg px-3 h-6">
                                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-sage shadow-sm shadow-sage/50" /> ENTRADAS</div>
                                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm shadow-red-400/50" /> SAÍDAS</div>
                                        </div>
                                    </div>
                                    <div className="card-3d bg-white border border-slate-50 shadow-premium flex flex-col flex-1 relative min-h-[200px] z-0 overflow-visible">
                                        <div className="absolute inset-x-8 top-10 bottom-12 z-0">
                                            {(() => {
                                                const data = dailyMovement.length > 0 ? dailyMovement : Array(7).fill({ in: 0, out: 0, date: new Date() });
                                                const rawMax = Math.max(...data.flatMap((d: any) => [d.in, d.out]), 100);
                                                const maxVal = rawMax * 1.35;

                                                return (
                                                    <div className="relative w-full h-full flex items-center">
                                                        {/* Simple Grid Lines */}
                                                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.08] py-2">
                                                            {[0, 1, 2].map((i) => (
                                                                <div key={i} className="w-full h-px bg-slate-300" />
                                                            ))}
                                                        </div>

                                                        {/* Clean Center Axis */}
                                                        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200" />

                                                        {/* Container das Barras */}
                                                        <div className="absolute inset-0 flex justify-between items-center px-6 z-10">
                                                            {data.map((d: any, i: number) => {
                                                                const inHeight = (d.in / maxVal) * 100;
                                                                const outHeight = (d.out / maxVal) * 100;
                                                                const isActive = hoveredPoint?.data.date === d.date;

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className="relative h-full flex flex-col items-center justify-center w-full group"
                                                                        onMouseEnter={() => {
                                                                            setHoveredPoint({ x: (i / 6) * 100, y: 50, data: d, index: i });
                                                                        }}
                                                                        onMouseLeave={() => setHoveredPoint(null)}
                                                                    >
                                                                        {/* Área de Hover Expandida */}
                                                                        <div className="absolute inset-y-0 -inset-x-2 bg-transparent z-20 cursor-pointer" />

                                                                        {/* Wrapper das Barras */}
                                                                        <div className="relative w-[32px] h-full pointer-events-none flex flex-col justify-center">

                                                                            {/* Container Topo (Entradas) */}
                                                                            <div className="h-[50%] flex flex-col-reverse w-full relative">
                                                                                <motion.div
                                                                                    initial={{ height: 0 }}
                                                                                    animate={{ height: `${Math.max(inHeight, 2)}%` }} // Mínimo de 2% visual
                                                                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                                                                    className={cn(
                                                                                        "w-full rounded-t-sm transition-all duration-300 relative",
                                                                                        isActive
                                                                                            ? "bg-gradient-to-t from-sage/80 to-sage shadow-[0_0_20px_rgba(132,204,22,0.4)] z-30 brightness-110"
                                                                                            : "bg-sage/40"
                                                                                    )}
                                                                                >
                                                                                    {/* Linha de "chão" para dar peso */}
                                                                                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-sage/50" />
                                                                                </motion.div>
                                                                            </div>

                                                                            {/* Container Base (Saídas) */}
                                                                            <div className="h-[50%] flex flex-col w-full relative">
                                                                                <motion.div
                                                                                    initial={{ height: 0 }}
                                                                                    animate={{ height: `${Math.max(outHeight, 2)}%` }} // Mínimo de 2% visual
                                                                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                                                                    className={cn(
                                                                                        "w-full rounded-b-sm transition-all duration-300 relative",
                                                                                        isActive
                                                                                            ? "bg-gradient-to-b from-red-500/80 to-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] z-30 brightness-110"
                                                                                            : "bg-red-500/20"
                                                                                    )}
                                                                                >
                                                                                    {/* Linha de "teto" para dar peso */}
                                                                                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-500/40" />
                                                                                </motion.div>
                                                                            </div>

                                                                        </div>

                                                                        {/* Indicador de Seleção Vertical */}
                                                                        {isActive && (
                                                                            <div className="absolute inset-y-4 w-[40px] bg-marinho/5 rounded-lg -z-10 border border-marinho/5" />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Tooltip Inteligente (Fixed Corners) */}
                                                        <AnimatePresence>
                                                            {hoveredPoint && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: '-25%', // Higher above chart
                                                                        // Position left or right based on day index
                                                                        left: hoveredPoint.index < 3 ? 'auto' : '0',
                                                                        right: hoveredPoint.index < 3 ? '0' : 'auto',
                                                                        zIndex: 100
                                                                    }}
                                                                    className="pointer-events-none"
                                                                >
                                                                    <div className="bg-marinho/95 text-white backdrop-blur-xl border border-white/20 rounded-xl p-3 min-w-[180px] shadow-2xl ring-1 ring-white/10 flex items-center gap-4">
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[10px] font-bold text-white/60 uppercase">
                                                                                {hoveredPoint.data.date ? new Date(hoveredPoint.data.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) : '--'}
                                                                            </p>
                                                                            <p className={cn("text-lg font-display font-black italic tracking-tighter",
                                                                                (hoveredPoint.data.in - hoveredPoint.data.out) >= 0 ? "text-sage" : "text-red-400"
                                                                            )}>
                                                                                {formatCurrency(hoveredPoint.data.in - hoveredPoint.data.out)}
                                                                            </p>
                                                                        </div>
                                                                        <div className="w-px h-8 bg-white/10" />
                                                                        <div className="space-y-1 text-right flex-1">
                                                                            <div className="flex items-center justify-end gap-1.5 text-[9px] text-sage font-bold">
                                                                                <span className="opacity-70">ENT</span>
                                                                                <span>{formatCurrency(hoveredPoint.data.in)}</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-end gap-1.5 text-[9px] text-red-400 font-bold">
                                                                                <span className="opacity-70">SAI</span>
                                                                                <span>{formatCurrency(hoveredPoint.data.out)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Labels Alinhados */}
                                        <div className="absolute bottom-3 left-8 right-8 flex justify-between items-center px-6 pointer-events-none z-0">
                                            {dailyMovement.length > 0 ? dailyMovement.map((day, i) => (
                                                <div key={i} className="flex flex-col items-center gap-2 w-full">
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase tracking-widest transition-colors duration-300",
                                                        hoveredPoint?.data.date === day?.date ? "text-marinho scale-110" : "text-slate-400 opacity-60"
                                                    )}>
                                                        {day?.date ? new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : '--'}
                                                    </span>
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                        hoveredPoint?.data.date === day?.date ? "bg-marinho shadow-lg scale-125 ring-2 ring-marinho/10" : "bg-slate-200"
                                                    )} />
                                                </div>
                                            )) : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => (
                                                <div key={i} className="flex flex-col items-center gap-2 w-full">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">{d}</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </motion.div>

                            <motion.div variants={item} className="col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
                                <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between flex-shrink-0">
                                        <div className="text-left">
                                            <h3 className="text-sm font-display font-bold text-marinho italic leading-none">Últimas Atividades</h3>
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Registros recentes</p>
                                        </div>
                                        <div className="relative group">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-6 pl-7 pr-2 bg-white/40 border border-slate-100 rounded-lg text-[8px] font-bold shadow-sm focus:bg-white w-28 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5 pr-0.5 pb-1 [&::-webkit-scrollbar]:hidden">
                                        {loading ? [1, 2, 3, 4, 5].map(i => <div key={i} className="bg-white/50 border border-slate-50 rounded-xl p-2 flex items-center justify-between animate-pulse"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-slate-100" /><div className="space-y-1.5"><div className="h-2 w-24 bg-slate-100 rounded" /><div className="h-1.5 w-16 bg-slate-50 rounded" /></div></div><div className="h-3 w-12 bg-slate-100 rounded" /></div>) : filteredTransactions.length > 0 ? (
                                            filteredTransactions.map((t: any) => {
                                                const isIncome = t.amount > 0;
                                                const getIcon = () => {
                                                    if (t.payment_method === 'PIX') return <Zap className="w-2.5 h-2.5" />;
                                                    if (t.payment_method === 'Dinheiro') return <Banknote className="w-2.5 h-2.5" />;
                                                    if (t.payment_method === 'Cartão') return <CreditCard className="w-2.5 h-2.5" />;
                                                    if (t.payment_method === 'Boleto') return <FileText className="w-2.5 h-2.5" />;
                                                    return <History className="w-2.5 h-2.5" />;
                                                };
                                                return (
                                                    <div key={t.id} className="bg-white border border-slate-50/50 rounded-xl p-2 flex items-center justify-between group shadow-sm transition-all hover:translate-x-1 hover:border-marinho/10">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all group-hover:scale-110", isIncome ? "bg-sage/5 text-sage" : "bg-red-50 text-red-500")}>{isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}</div>
                                                            <div className="text-left">
                                                                <p className="text-[9px] font-bold text-marinho leading-tight uppercase tracking-tight line-clamp-1">
                                                                    {t.members?.full_name || t.beneficiary || 'Sem identificação'}
                                                                    <span className="text-[8px] font-normal text-slate-400 capitalize opacity-80 normal-case ml-2 border-l border-slate-200 pl-2">
                                                                        {t.description}
                                                                    </span>
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded text-[7px] font-black text-slate-400 uppercase tracking-widest">{getIcon()}{t.payment_method}</div>
                                                                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">
                                                                        {(() => {
                                                                            try {
                                                                                const dateStr = String(t.date).includes('T') ? t.date.split('T')[0] : t.date;
                                                                                return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                                                                            } catch (e) {
                                                                                return '---';
                                                                            }
                                                                        })()}
                                                                    </span></div></div>
                                                        </div>
                                                        <div className="flex items-center gap-3"><p className={cn("text-[10px] font-display font-bold italic leading-none", isIncome ? "text-sage" : "text-red-500")}>{formatCurrency(t.amount)}</p><button onClick={(e) => handleDeleteTransaction(t.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all" title="Excluir Lançamento"><Trash2 className="w-3.5 h-3.5" /></button></div>
                                                    </div>
                                                );
                                            })
                                        ) : <div className="flex flex-col items-center justify-center py-8 opacity-20"><History className="w-8 h-8 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Sem atividades</p></div>}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </DashboardLayout>

            {/* Modals Section */}
            <AnimatePresence>
                {isAnalysisOpen && (
                    <div onClick={() => setIsAnalysisOpen(false)} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-marinho/40 backdrop-blur-md cursor-pointer">
                        <motion.div onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative cursor-default">
                            <div className="bg-marinho px-5 py-4 text-white relative text-left">
                                <button onClick={() => setIsAnalysisOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                                <h3 className="text-xl font-display font-bold italic">Análise Financeira</h3>
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em] mt-1 line-clamp-1">Diagnóstico detalhado da movimentação</p>
                            </div>
                            <div className="p-5 space-y-3 text-left">
                                <div className="space-y-2 py-1">
                                    {stats.byCategory.map((cat) => (
                                        <div key={cat.name} className="space-y-1.5">
                                            <div className="flex justify-between items-end"><span className="text-[10px] font-black text-marinho/30 uppercase tracking-[0.2em] leading-none">{cat.name}</span><div className="text-right"><span className="text-[12px] font-bold text-marinho tracking-tight leading-none block">{formatCurrency(cat.amount)}</span><span className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-0.5 block">{(cat.amount / Math.max(stats.incomes, 1) * 100).toFixed(1)}% do total</span></div></div>
                                            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${(cat.amount / Math.max(stats.incomes, 1)) * 100}%` }} className={cn("h-full rounded-full transition-all duration-1000", cat.color)} /></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-3 border-t border-slate-100"><div className="bg-slate-50/50 p-3 rounded-2xl flex items-center justify-between border border-slate-100/50"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center text-gold"><Clock className="w-5 h-5" /></div><div className="text-left"><p className="text-[9px] font-black text-marinho/30 uppercase tracking-widest leading-none">Consolidado Mensal</p><p className="text-[13px] font-bold text-marinho mt-1 leading-none italic">Superávit OK (82%)</p></div></div><div className="w-2.5 h-2.5 rounded-full bg-sage animate-pulse shadow-[0_0_8px_rgba(102,153,102,0.4)]" /></div></div>
                                <button onClick={() => setIsAnalysisOpen(false)} className="btn-premium w-full h-10 mt-1 uppercase tracking-[0.25em] font-black text-[10px]">Fechar Detalhamento</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCostCentersOpen && (
                    <div onClick={() => setIsCostCentersOpen(false)} className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-marinho/40 backdrop-blur-md cursor-pointer">
                        <motion.div onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative cursor-default">
                            <div className="bg-marinho px-5 py-4 text-white relative text-left flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-display font-bold italic">Centros de Custo</h3>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Divisão estatutária do caixa</p>
                                </div>
                                <button onClick={() => setIsCreatingCostCenter(!isCreatingCostCenter)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-gold">
                                    <Plus className={cn("w-4 h-4 transition-transform", isCreatingCostCenter && "rotate-45")} />
                                </button>
                                <button onClick={() => setIsCostCentersOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            <AnimatePresence>
                                {isCreatingCostCenter && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-50 border-b border-slate-100">
                                        <div className="p-4 flex items-center gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={newCostCenterName}
                                                onChange={(e) => setNewCostCenterName(e.target.value)}
                                                placeholder="Nome do Novo Centro..."
                                                className="flex-1 h-10 px-3 bg-white rounded-xl text-[11px] font-bold outline-none border border-slate-200 focus:border-marinho/20 shadow-sm"
                                            />
                                            <button onClick={handleCreateCostCenter} disabled={!newCostCenterName} className="h-10 px-4 bg-marinho text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-marinho/90 disabled:opacity-50 shadow-md shadow-marinho/10 transition-all">Salvar</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div
                                    onClick={() => { setSelectedCostCenter(null); setIsCostCentersOpen(false); }}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group border",
                                        !selectedCostCenter
                                            ? "bg-marinho text-white border-marinho shadow-lg shadow-marinho/20"
                                            : "bg-slate-50 hover:bg-slate-100/80 border-transparent hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-9 h-9 rounded-xl shadow-sm flex items-center justify-center transition-all", !selectedCostCenter ? "bg-white/10 text-gold" : "bg-white text-marinho")}>
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className={cn("text-[10px] font-bold leading-none", !selectedCostCenter ? "text-white" : "text-marinho")}>Visão Geral</p>
                                            <p className={cn("text-[7px] font-black uppercase tracking-widest mt-1", !selectedCostCenter ? "text-white/40" : "text-slate-400")}>Todos os Centros</p>
                                        </div>
                                    </div>
                                    {!selectedCostCenter && <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(250,204,21,0.6)]" />}
                                </div>

                                {costCenters.map((center) => (
                                    <div
                                        key={center.id}
                                        onClick={() => { setSelectedCostCenter(center.id); setIsCostCentersOpen(false); }}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group border",
                                            selectedCostCenter === center.id
                                                ? "bg-marinho text-white border-marinho shadow-lg shadow-marinho/20"
                                                : "bg-slate-50 hover:bg-slate-100/80 border-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-9 h-9 rounded-xl shadow-sm flex items-center justify-center transition-all", selectedCostCenter === center.id ? "bg-white/10 text-gold" : "bg-white text-marinho")}>
                                                <Building className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className={cn("text-[10px] font-bold leading-none", selectedCostCenter === center.id ? "text-white" : "text-marinho")}>{center.name}</p>
                                                <p className={cn("text-[7px] font-black uppercase tracking-widest mt-1", selectedCostCenter === center.id ? "text-white/40" : "text-slate-400")}>Centro de Custo</p>
                                            </div>
                                        </div>
                                        {selectedCostCenter === center.id && <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(250,204,21,0.6)]" />}
                                    </div>
                                ))}

                                <button onClick={() => setIsCostCentersOpen(false)} className="btn-premium w-full h-10 mt-2 uppercase tracking-[0.25em] font-black text-[10px]">Fechar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isNewEntryOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-marinho/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
                            <div className="bg-marinho p-5 text-white relative text-left">
                                <button onClick={() => setIsNewEntryOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                                <h3 className="text-lg font-display font-bold italic">Novo Lançamento</h3>
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mt-0.5">Registrar movimentação</p>
                            </div>
                            <div className="p-5 space-y-4 text-left">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Tipo</label>
                                        <div className="relative flex w-full h-9 bg-slate-100 rounded-lg p-0.5 cursor-pointer shadow-inner">
                                            <motion.div className={cn("absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md shadow-sm z-0", newEntryType === 'in' ? "bg-sage" : "bg-red-400")} initial={false} animate={{ x: newEntryType === 'in' ? 0 : "100%" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                            <button onClick={() => setNewEntryType('in')} className={cn("flex-1 z-10 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors", newEntryType === 'in' ? "text-white" : "text-slate-400")}>Entrada</button>
                                            <button onClick={() => setNewEntryType('out')} className={cn("flex-1 z-10 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors", newEntryType === 'out' ? "text-white" : "text-slate-400")}>Saída</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Valor</label>
                                        <input
                                            type="text"
                                            value={newEntryAmount}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                // Remove everything that is not digit
                                                value = value.replace(/\D/g, "");
                                                // Convert to number and format currency
                                                const numericValue = Number(value) / 100;
                                                const formatted = numericValue.toLocaleString("pt-BR", {
                                                    style: "currency",
                                                    currency: "BRL"
                                                });
                                                setNewEntryAmount(formatted);
                                            }}
                                            className="w-full h-9 px-3 bg-slate-50 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-marinho/10 transition-all font-display italic"
                                            placeholder="R$ 0,00"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">{newEntryType === 'in' ? 'Nome do Ofertante' : 'Beneficiário'}</label>
                                        {newEntryType === 'in' ? (
                                            <div className="relative">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={selectedMemberId ? members.find(m => m.id === selectedMemberId)?.full_name : memberSearchTerm}
                                                        onChange={(e) => {
                                                            setMemberSearchTerm(e.target.value);
                                                            setSelectedMemberId(null);
                                                            setNewEntryBeneficiary(e.target.value);
                                                            setIsMemberDropdownOpen(true);
                                                        }}
                                                        onFocus={() => setIsMemberDropdownOpen(true)}
                                                        className={cn(
                                                            "w-full h-9 px-3 bg-slate-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-marinho/10 transition-all",
                                                            selectedMemberId && "text-marinho bg-marinho/5 pl-8"
                                                        )}
                                                        placeholder="Buscar membro ou digitar nome..."
                                                    />
                                                    {selectedMemberId && (
                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-marinho text-white flex items-center justify-center text-[8px] font-black">
                                                            {members.find(m => m.id === selectedMemberId)?.full_name.charAt(0)}
                                                        </div>
                                                    )}
                                                    {selectedMemberId && (
                                                        <button
                                                            onClick={() => { setSelectedMemberId(null); setMemberSearchTerm(''); setNewEntryBeneficiary(''); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <AnimatePresence>
                                                    {isMemberDropdownOpen && memberSearchTerm && !selectedMemberId && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 5 }}
                                                            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto"
                                                        >
                                                            {members.filter(m => m.full_name?.toLowerCase().includes(memberSearchTerm.toLowerCase())).length > 0 ? (
                                                                members
                                                                    .filter(m => m.full_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                                                                    .slice(0, 5)
                                                                    .map(member => (
                                                                        <div
                                                                            key={member.id}
                                                                            onClick={() => {
                                                                                setSelectedMemberId(member.id);
                                                                                setMemberSearchTerm(member.full_name);
                                                                                setIsMemberDropdownOpen(false);
                                                                            }}
                                                                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                                                                        >
                                                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden">
                                                                                {member.photo_url ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" /> : member.full_name.charAt(0)}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-bold text-marinho">{member.full_name}</p>
                                                                                <p className="text-[8px] text-slate-400">{member.church_role || 'Membro'}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                            ) : (
                                                                <div className="p-3 text-center">
                                                                    <p className="text-[9px] text-slate-400">Nenhum membro encontrado.</p>
                                                                    <p className="text-[8px] text-marinho/50 mt-0.5">O nome digitado será salvo como visitante/externo.</p>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ) : (
                                            <input type="text" value={newEntryBeneficiary} onChange={(e) => setNewEntryBeneficiary(e.target.value)} className="w-full h-9 px-3 bg-slate-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-marinho/10 transition-all" placeholder="Ex: Fornecedor..." />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Centro de Custo</label>
                                        <div className="relative">
                                            <select value={newEntryCostCenter} onChange={(e) => setNewEntryCostCenter(e.target.value)} className="w-full h-9 pl-3 pr-8 bg-slate-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-marinho/10 transition-all appearance-none cursor-pointer">
                                                <option value="">Geral (Padrão)</option>
                                                {costCenters.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Método</label>
                                        <div className="relative">
                                            <select value={newEntryMethod} onChange={(e) => setNewEntryMethod(e.target.value)} className="w-full h-9 pl-3 pr-8 bg-slate-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-marinho/10 transition-all appearance-none cursor-pointer">
                                                <option value="PIX">PIX</option>
                                                <option value="Dinheiro">Dinheiro</option>
                                                <option value="Cartão">Cartão</option>
                                                <option value="Boleto">Boleto</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Data</label>
                                        <button onClick={() => setIsCalendarOpen(true)} className="w-full h-9 px-3 bg-slate-50 rounded-xl text-[10px] font-bold text-left flex items-center justify-between group border border-transparent focus:border-marinho/10 transition-all">
                                            <span className="text-marinho">{new Date(newEntryDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover:text-marinho transition-colors" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1"><label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Descrição</label><input type="text" value={newEntryDesc} onChange={(e) => setNewEntryDesc(e.target.value)} className="w-full h-9 px-3 bg-slate-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-marinho/10 transition-all" placeholder="Ex: Dízimo Mensal, Conta de Luz..." /></div>

                                <AnimatePresence>
                                    {isCalendarOpen && (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl border border-slate-100 shadow-2xl p-2 z-[110]">
                                            <PremiumCalendar selectedDate={new Date(newEntryDate + 'T12:00:00')} onChange={(date) => { setNewEntryDate(getLocalDateString(date)); setIsCalendarOpen(false); }} onClose={() => setIsCalendarOpen(false)} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="pt-2 flex gap-3">
                                    <button onClick={() => setIsNewEntryOpen(false)} className="flex-1 h-10 rounded-xl border border-slate-200 text-marinho text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                                    <button
                                        onClick={handleSaveTransaction}
                                        disabled={isSubmitting}
                                        className={cn(
                                            "flex-[2] h-10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-marinho/20 transition-all flex items-center justify-center gap-2",
                                            submitStatus === 'error' ? "bg-red-500" :
                                                submitStatus === 'success' ? "bg-sage" :
                                                    "bg-marinho hover:bg-marinho/90 active:scale-95"
                                        )}
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                            submitStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                                                submitStatus === 'error' ? <XCircle className="w-4 h-4" /> :
                                                    "Confirmar Lançamento"
                                        }
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {transactionToDelete && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-sm p-8 text-center shadow-2xl">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500"><Trash2 className="w-8 h-8" /></div>
                            <h3 className="text-lg font-display font-bold text-marinho italic">Confirmar Exclusão?</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">Essa ação não poderá ser desfeita e o lançamento será removido permanentemente.</p>
                            <div className="mt-8 flex gap-3">
                                <button onClick={() => setTransactionToDelete(null)} className="flex-1 h-11 rounded-xl bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all">Cancelar</button>
                                <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 h-11 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
