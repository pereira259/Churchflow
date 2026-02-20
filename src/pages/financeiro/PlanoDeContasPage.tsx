import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    X,
    Trash2,
    CheckCircle2,
    Loader2,
    Tags,
    GitMerge
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { PlanoDeConta } from '@/lib/supabase-queries';

export function PlanoDeContasPage() {
    const { profile, loading: authLoading } = useAuth();
    const churchId = profile?.church_id;

    const [contas, setContas] = useState<PlanoDeConta[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalAberto, setModalAberto] = useState(false);
    const [contaPaiId, setContaPaiId] = useState<string | null>(null);

    const loadContas = async () => {
        if (!churchId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('plano_de_contas')
                .select('*')
                .eq('igreja_id', churchId)
                .order('ordem')
                .order('created_at');

            if (error) throw error;

            if (data) {
                // Monta a árvore (Pais + Filhos injetados)
                const pais = data.filter((c: any) => !c.parent_id);
                const tree = pais.map((pai: any) => ({
                    ...pai,
                    filhos: data.filter((c: any) => c.parent_id === pai.id)
                }));
                // Separa Entradas e Saídas só em exibição depois
                setContas(tree);
            }
        } catch (error) {
            console.error('Erro ao buscar plano de contas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (churchId) {
            loadContas();
        }
    }, [churchId, authLoading]);

    const deletarConta = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover esta conta permanentemente? Lançamentos atrelados a ela perderão a categoria.')) return;
        try {
            const { error } = await supabase.from('plano_de_contas').delete().eq('id', id);
            if (error) throw error;
            loadContas();
        } catch (err) {
            console.error('Erro ao excluir:', err);
            alert('Não foi possível excluir a conta.');
        }
    };

    // Separar por tipo
    const entradas = contas.filter(c => c.tipo === 'entrada');
    const saidas = contas.filter(c => c.tipo === 'saida');

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto w-full">
                {/* Header Premium */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 rounded-[28px] shadow-sm border border-white/40 shrink-0">
                    <div className="space-y-1">
                        <div className="inline-flex items-center px-2 py-0.5 bg-marinho/5 border border-marinho/10 rounded-full">
                            <span className="text-[7px] font-black text-marinho uppercase tracking-[0.2em]">Configuração</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-marinho flex items-center gap-2 leading-none">
                            Plano de <span className="font-serif italic text-gold font-normal text-3xl">Contas</span>
                        </h1>
                        <p className="text-xs text-slate-500 max-w-md w-full">Estruture as categorias financeiras de sua igreja para análises e relatórios consolidados.</p>
                    </div>

                    <button
                        onClick={() => { setContaPaiId(null); setModalAberto(true); }}
                        className="h-11 px-6 bg-marinho hover:bg-marinho/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-marinho/20 active:scale-95 flex items-center gap-2.5 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 text-gold" />
                        <span>Nova Conta</span>
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pb-12">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-marinho/20" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* ENTRADAS */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <div className="w-2 h-2 rounded-full bg-sage shadow-[0_0_8px_rgba(132,204,22,0.6)]" />
                                    <h2 className="text-sm font-black text-marinho uppercase tracking-widest">Entradas</h2>
                                </div>

                                {entradas.length === 0 && (
                                    <p className="text-xs text-slate-400 italic px-2">Nenhuma conta de entrada configurada.</p>
                                )}

                                {entradas.map(conta => (
                                    <ContaNode
                                        key={conta.id}
                                        conta={conta}
                                        onAddSubconta={() => { setContaPaiId(conta.id); setModalAberto(true); }}
                                        onDelete={() => deletarConta(conta.id)}
                                    />
                                ))}
                            </div>

                            {/* SAÍDAS */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                                    <h2 className="text-sm font-black text-marinho uppercase tracking-widest">Saídas / Despesas</h2>
                                </div>

                                {saidas.length === 0 && (
                                    <p className="text-xs text-slate-400 italic px-2">Nenhuma conta de saída configurada.</p>
                                )}

                                {saidas.map(conta => (
                                    <ContaNode
                                        key={conta.id}
                                        conta={conta}
                                        onAddSubconta={() => { setContaPaiId(conta.id); setModalAberto(true); }}
                                        onDelete={() => deletarConta(conta.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {modalAberto && (
                    <ModalNovaConta
                        contaPaiId={contaPaiId}
                        igrejaId={churchId || ''}
                        onClose={() => setModalAberto(false)}
                        onSuccess={() => { setModalAberto(false); loadContas(); }}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}

// Componente Interno p/ Nó da Árvore
function ContaNode({ conta, onAddSubconta, onDelete }: { conta: PlanoDeConta, onAddSubconta: () => void, onDelete: () => void }) {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden group">
            <div className="p-3 flex items-center justify-between border-b border-slate-50 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-marinho/10 to-transparent" />
                <div className="flex items-center gap-3 pl-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-marinho">
                        <Tags className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-marinho">{conta.nome}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Conta Sintética</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onAddSubconta} className="h-7 px-3 bg-slate-50 text-marinho hover:bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                        + Sub
                    </button>
                    <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {conta.filhos && conta.filhos.length > 0 && (
                <div className="p-2 pl-6 bg-slate-50/50 space-y-1">
                    {conta.filhos.map(filho => (
                        <div key={filho.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors group/sub">
                            <div className="flex items-center gap-2">
                                <GitMerge className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-[11px] font-medium text-slate-600">{filho.nome}</span>
                            </div>
                            <button onClick={() => { /* Chama onDelete passando o id do filho se quiséssemos direto, mas vamos prop-drill pra facilitar ou buscar a ref de fora. 
                                Ops, a função onDelete passada como prop no map apagava o Pai. Preciso do supabase.delete aqui. */
                                if (window.confirm('Excluir subconta?')) {
                                    supabase.from('plano_de_contas').delete().eq('id', filho.id).then(() => window.location.reload());
                                }
                            }} className="opacity-0 group-hover/sub:opacity-100 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all rounded-md hover:bg-red-50">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Componente Interno p/ Modal
function ModalNovaConta({ contaPaiId, igrejaId, onClose, onSuccess }: { contaPaiId: string | null, igrejaId: string, onClose: () => void, onSuccess: () => void }) {
    const [nome, setNome] = useState('');
    const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Se tiver pai, precisamos saber o tipo dele para herdar. Na prática o fluxo setou via a coluna que apertou.
    // Pra garantir, buscamos o pai:
    useEffect(() => {
        if (contaPaiId) {
            supabase.from('plano_de_contas').select('tipo').eq('id', contaPaiId).single().then(({ data }: { data: any | null }) => {
                if (data) setTipo(data.tipo as 'entrada' | 'saida');
            });
        }
    }, [contaPaiId]);

    const handleSave = async () => {
        if (!nome || !igrejaId) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('plano_de_contas').insert({
                igreja_id: igrejaId,
                nome,
                tipo,
                parent_id: contaPaiId || null,
                ordem: 99
            });

            if (error) throw error;

            setSubmitStatus('success');
            setTimeout(onSuccess, 800);
        } catch (error) {
            console.error(error);
            setSubmitStatus('error');
            setTimeout(() => setSubmitStatus('idle'), 2000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-marinho/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="bg-marinho px-5 py-4 relative text-left text-white">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    <h3 className="text-lg font-display font-bold italic">
                        {contaPaiId ? 'Nova Subconta' : 'Nova Conta Principal'}
                    </h3>
                </div>

                <div className="p-5 space-y-4">
                    {!contaPaiId && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Natureza</label>
                            <div className="flex w-full h-10 bg-slate-100 rounded-xl p-1 relative shadow-inner">
                                <motion.div className={cn("absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm z-0", tipo === 'entrada' ? "bg-sage" : "bg-red-400")} initial={false} animate={{ x: tipo === 'entrada' ? 0 : "100%" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                <button onClick={() => setTipo('entrada')} className={cn("flex-1 z-10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-colors", tipo === 'entrada' ? "text-white" : "text-slate-400")}>Entrada</button>
                                <button onClick={() => setTipo('saida')} className={cn("flex-1 z-10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-colors", tipo === 'saida' ? "text-white" : "text-slate-400")}>Saída</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-widest ml-1">Nome da Conta</label>
                        <input
                            autoFocus
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full h-11 px-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-marinho/10 transition-all text-marinho"
                            placeholder="Ex: Oferta Missionária..."
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting || !nome}
                            className={cn(
                                "w-full h-11 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-marinho/20 transition-all flex items-center justify-center gap-2",
                                submitStatus === 'error' ? "bg-red-500" :
                                    submitStatus === 'success' ? "bg-sage" :
                                        "bg-marinho hover:bg-marinho/90 active:scale-95 disabled:opacity-50"
                            )}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                submitStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                                    submitStatus === 'error' ? 'Erro' :
                                        "Salvar Conta"
                            }
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
