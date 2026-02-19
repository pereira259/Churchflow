import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle2, AlertCircle, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseOFX, parseCSV, ParsedTransaction } from '../../utils/finance-parser';
import { AnimatedValue } from '@/components/ui/AnimatedValue';
import { supabase } from '../../lib/supabase';
import { useDropzone } from 'react-dropzone';

interface ImportarExtratoProps {
    churchId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function ImportarExtrato({ churchId, onSuccess, onCancel }: ImportarExtratoProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');

    const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
    const [existingExternalIds, setExistingExternalIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        try {
            const content = await file.text();
            const isOfx = file.name.toLowerCase().endsWith('.ofx');

            let parsed: ParsedTransaction[] = [];
            if (isOfx) {
                parsed = await parseOFX(content);
            } else {
                parsed = parseCSV(content);
            }

            if (parsed.length === 0) {
                setError('Nenhuma transação encontrada no arquivo.');
                setLoading(false);
                return;
            }

            // Check for duplicates
            const { data: existing } = await supabase
                .from('financial_transactions')
                .select('external_id')
                .eq('church_id', churchId)
                .not('external_id', 'is', null);

            const ids = new Set<string>(existing?.map((t: any) => t.external_id) || []);
            setExistingExternalIds(ids);

            // Filter duplicates for the main list, but keep them for stats if needed
            // Actually, let's keep all and mark duplicates visually

            setTransactions(parsed);

            setStep('preview');
        } catch (err) {
            console.error(err);
            setError('Erro ao processar arquivo. Verifique o formato.');
        } finally {
            setLoading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/plain': ['.ofx', '.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        multiple: false
    });

    const handleConfirmImport = async () => {
        setIsSubmitting(true);
        try {
            const newTransactions = transactions.filter(t => !existingExternalIds.has(t.externalId || ''));

            if (newTransactions.length === 0) {
                setError('Todas as transações já foram importadas.');
                setIsSubmitting(false);
                return;
            }

            const { error: insertError } = await supabase
                .from('financial_transactions')
                .insert(newTransactions.map(t => ({
                    church_id: churchId,
                    type: t.amount >= 0 ? 'in' : 'out',
                    amount: Math.abs(t.amount),
                    description: t.description,
                    date: t.date.toISOString().split('T')[0],
                    payment_method: 'Transferência',
                    category: t.categoria || 'Outros',
                    status: 'completed',
                    external_id: t.externalId
                })));

            if (insertError) throw insertError;

            setStep('success');
            setTimeout(onSuccess, 1500);
        } catch (err: any) {
            console.error('Error importing:', err);
            setError('Erro ao salvar transações. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'upload') {
        return (
            <div className="flex flex-col h-full p-4">
                <div
                    {...getRootProps()}
                    className={cn(
                        "flex-1 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center text-center p-4 cursor-pointer relative overflow-hidden group",
                        isDragActive ? "border-marinho bg-marinho/5 scale-[0.98]" : "border-slate-200 hover:border-marinho/30 hover:bg-slate-50"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 rounded-full bg-marinho/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-marinho" /> : <Upload className="w-6 h-6 text-marinho" />}
                    </div>
                    <p className="text-sm font-bold text-slate-600 mb-0.5">
                        {loading ? 'Processando...' : 'Arraste seu extrato aqui'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium max-w-[180px]">
                        Suporta OFX e CSV (Nubank, Inter, Itaú...)
                    </p>
                </div>

                {error && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 p-2 bg-red-50 text-red-500 rounded-lg flex items-center gap-2 text-[10px]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                    </motion.div>
                )}

                <button onClick={onCancel} className="w-full mt-3 h-9 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                    Cancelar
                </button>
            </div>
        );
    }

    if (step === 'preview') {
        const newCount = transactions.filter(t => !existingExternalIds.has(t.externalId || '')).length;
        const dupCount = transactions.length - newCount;

        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xs font-bold text-marinho uppercase tracking-wider">
                            {transactions.length} Lançamentos
                        </h3>
                        <p className="text-[9px] text-slate-400 font-medium">
                            <span className="text-sage">{newCount} novos</span> • <span className="text-amber-500">{dupCount} duplicados</span>
                        </p>
                    </div>
                    <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-sage" title="Entrada"></span>
                        <span className="w-2 h-2 rounded-full bg-red-400" title="Saída"></span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="space-y-1">
                        {transactions.map((t, index) => {
                            const isDuplicate = existingExternalIds.has(t.externalId || '');
                            return (
                                <div key={index} className={cn(
                                    "flex items-center justify-between p-2 rounded-lg text-left text-[10px] border transition-all",
                                    isDuplicate ? "bg-amber-50/50 border-amber-100 opacity-60 grayscale-[0.5]" : "bg-white border-slate-100 hover:border-marinho/20 hover:shadow-sm"
                                )}>
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                                            t.amount >= 0 ? "bg-sage/10 text-sage" : "bg-red-50 text-red-500"
                                        )}>
                                            {t.amount >= 0 ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-700 truncate">{t.description}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[9px] text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                                                {/* Category Selector Small */}
                                                <select
                                                    value={t.categoria || 'Outros'}
                                                    onChange={e => {
                                                        const up = [...transactions];
                                                        up[index].categoria = e.target.value;
                                                        setTransactions(up);
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    className="text-[9px] bg-transparent border-none p-0 text-slate-500 font-bold focus:ring-0 cursor-pointer"
                                                >
                                                    {['Dízimo', 'Oferta', 'Salário', 'Aluguel', 'Água', 'Energia', 'Internet', 'Manutenção', 'Outros'].map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className={cn("font-bold font-mono", t.amount >= 0 ? "text-sage" : "text-red-500")}>
                                            <AnimatedValue value={Math.abs(t.amount)} prefix={t.amount < 0 ? '-R$ ' : 'R$ '} />
                                        </p>
                                        {isDuplicate && <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider block">Duplicado</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                    <button onClick={() => { setStep('upload'); setTransactions([]); }} className="flex-1 h-9 rounded-xl border border-slate-200 text-marinho text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                        Voltar
                    </button>
                    <button
                        onClick={handleConfirmImport}
                        disabled={isSubmitting || newCount === 0}
                        className={cn(
                            "flex-[2] h-9 rounded-xl text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-marinho/20 transition-all flex items-center justify-center gap-2",
                            isSubmitting || newCount === 0 ? "bg-slate-400 shadow-none" : "bg-marinho hover:bg-marinho/90 active:scale-95"
                        )}
                    >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Importar {newCount}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="flex flex-col items-center justify-center h-[350px] p-5 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </motion.div>
                <h3 className="text-lg font-display font-bold text-marinho italic">Sucesso!</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px] mx-auto">
                    <span className="font-bold text-marinho">{transactions.length}</span> lançamentos foram importados.
                </p>
                <button
                    onClick={onSuccess}
                    className="mt-6 px-6 h-10 bg-marinho text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-marinho/20 hover:bg-marinho/90 transition-all"
                >
                    Concluir
                </button>
            </div>
        );
    }

    return null;
}
