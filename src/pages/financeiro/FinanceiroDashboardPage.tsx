import { motion, Variants } from 'framer-motion';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Wallet,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    FileText,
    Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEffect, useState } from 'react';
import { getFinancialMetrics, getTransactions, Transaction } from '@/lib/supabase-queries';

// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001'; // REMOVED

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

export function FinanceiroDashboardPage() {
    const { profile, loading: authLoading } = useAuth();
    const churchId = profile?.church_id;

    const [stats, setStats] = useState({
        balance: 0,
        incomes: 0,
        expenses: 0,
        byCategory: [] as any[]
    });
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (authLoading) return;

        if (churchId) {
            loadData();
        } else {
            // Strict isolation: clear data if no church
            setStats({ balance: 0, incomes: 0, expenses: 0, byCategory: [] });
            setTransactions([]);
        }
    }, [churchId, authLoading]);

    const loadData = async () => {
        if (authLoading || !churchId) return;

        try {
            const metrics = await getFinancialMetrics(churchId, new Date().getMonth() + 1, new Date().getFullYear());
            const { data: transData } = await getTransactions({ churchId: churchId, limit: 5 });

            if (metrics) {
                setStats({
                    balance: metrics.balance,
                    incomes: metrics.income,
                    expenses: metrics.expense,
                    byCategory: [] // TODO: Implement if needed
                });
            }
            if (transData) {
                setTransactions(transData);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
    };

    return (
        <DashboardLayout>
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="p-6 space-y-6"
            >
                {/* Header */}
                <motion.div variants={item} className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-bold italic text-[#1e1b4b]">
                            Tesouraria
                        </h1>
                        <p className="text-slate-500 text-sm">Gestão Financeira da Igreja</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                        <Link
                            to="/tesouraria/transacoes"
                            className="px-4 py-2 bg-[#1e1b4b] text-white text-sm font-bold rounded-xl hover:bg-[#1e1b4b]/90 transition-colors flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Nova Transação
                        </Link>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div variants={item} className="bg-gradient-to-br from-[#1e1b4b] to-[#1e1b4b]/80 rounded-2xl p-5 text-white">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-[#d4af37]" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(stats.balance)}</p>
                        <p className="text-xs text-white/60 font-medium">Saldo Atual</p>
                    </motion.div>

                    <motion.div variants={item} className="bg-white border border-slate-100 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                            {/* <span className="text-emerald-500 text-xs font-bold flex items-center gap-0.5">
                                <ArrowUpRight className="w-3 h-3" /> +12%
                            </span> */}
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.incomes)}</p>
                        <p className="text-xs text-slate-400 font-medium">Entradas do Mês</p>
                    </motion.div>

                    <motion.div variants={item} className="bg-white border border-slate-100 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-red-500" />
                            </div>
                            {/* <span className="text-red-500 text-xs font-bold flex items-center gap-0.5">
                                <ArrowDownRight className="w-3 h-3" /> -5%
                            </span> */}
                        </div>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.expenses)}</p>
                        <p className="text-xs text-slate-400 font-medium">Saídas do Mês</p>
                    </motion.div>

                    <motion.div variants={item} className="bg-white border border-slate-100 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-[#d4af37]" />
                            </div>
                        </div>
                        {/* Assuming Dízimos is a specific category, or just placeholder for now. Let's use Balance or Net */}
                        <p className="text-2xl font-bold text-[#1e1b4b]">{formatCurrency(stats.balance)}</p>
                        <p className="text-xs text-slate-400 font-medium">Caixa Total</p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Últimas Transações */}
                    <motion.div variants={item} className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-lg font-bold italic text-[#1e1b4b]">
                                Últimas Transações
                            </h2>
                            <Link to="/tesouraria/transacoes" className="text-[#d4af37] text-sm font-bold hover:underline">
                                Ver todas
                            </Link>
                        </div>

                        <div className="space-y-2">
                            {transactions.length === 0 ? (
                                <p className="text-slate-400 text-sm py-4 text-center">Nenhuma transação registrada.</p>
                            ) : transactions.map((transacao) => (
                                <div
                                    key={transacao.id}
                                    className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${transacao.type === 'entrada' ? 'bg-emerald-50' : 'bg-red-50'
                                            }`}>
                                            {transacao.type === 'entrada' ? (
                                                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                                            ) : (
                                                <ArrowDownRight className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#1e1b4b] text-sm">{transacao.description}</p>
                                            <p className="text-xs text-slate-400">{formatDate(transacao.date)} • {transacao.category}</p>
                                        </div>
                                    </div>
                                    <p className={`font-bold ${transacao.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {transacao.type === 'entrada' ? '+' : '-'}{formatCurrency(Math.abs(Number(transacao.amount)))}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Categorias */}
                    <motion.div variants={item} className="bg-white border border-slate-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-lg font-bold italic text-[#1e1b4b]">
                                Entradas por Categoria
                            </h2>
                            <PieChart className="w-5 h-5 text-slate-400" />
                        </div>

                        <div className="space-y-4">
                            {stats.byCategory.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">Sem dados de categorias.</p>
                            ) : stats.byCategory.map((cat) => (
                                <div key={cat.nome}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-600">{cat.nome}</span>
                                        <span className="text-sm font-bold text-[#1e1b4b]">{formatCurrency(cat.valor)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${cat.percentual}%`, backgroundColor: cat.cor }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-400">Total Entradas</span>
                                <span className="text-lg font-bold text-[#1e1b4b]">{formatCurrency(stats.incomes)}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/tesouraria/transacoes" className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1e1b4b]/20 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-sm font-bold text-[#1e1b4b]">Registrar Entrada</span>
                    </Link>

                    <Link to="/tesouraria/transacoes" className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1e1b4b]/20 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                            <TrendingDown className="w-6 h-6 text-red-500" />
                        </div>
                        <span className="text-sm font-bold text-[#1e1b4b]">Registrar Saída</span>
                    </Link>

                    <button className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1e1b4b]/20 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                        <div className="w-12 h-12 rounded-xl bg-[#d4af37]/10 flex items-center justify-center group-hover:bg-[#d4af37]/20 transition-colors">
                            <FileText className="w-6 h-6 text-[#d4af37]" />
                        </div>
                        <span className="text-sm font-bold text-[#1e1b4b]">Relatório Mensal</span>
                    </button>

                    <button className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#1e1b4b]/20 hover:shadow-md transition-all flex flex-col items-center gap-2 group">
                        <div className="w-12 h-12 rounded-xl bg-[#1e1b4b]/5 flex items-center justify-center group-hover:bg-[#1e1b4b]/10 transition-colors">
                            <Calendar className="w-6 h-6 text-[#1e1b4b]" />
                        </div>
                        <span className="text-sm font-bold text-[#1e1b4b]">Histórico Completo</span>
                    </button>
                </motion.div>
            </motion.div>
        </DashboardLayout>
    );
}
