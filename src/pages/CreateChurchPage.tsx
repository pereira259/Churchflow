import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Church as ChurchIcon, MapPin, Loader2, Star, ArrowRight, ArrowLeft, CheckCircle2, Wallet, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CreateChurchPage() {
    const { user, refreshProfile: _refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [step, setStep] = useState(1);

    // Force back button to go to profile
    useEffect(() => {
        // Create a history entry to trap the back button
        window.history.pushState(null, '', window.location.href);

        const handlePopState = () => {
            navigate('/membro/perfil', { replace: true });
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [navigate]);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cep: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        latitude: null as number | null,
        longitude: null as number | null,
        pix_key: '',
        bank_info: ''
    });

    const [addressLoading, setAddressLoading] = useState(false);

    // Buscar Endereço pelo CEP
    const handleCepBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;

        setAddressLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                alert('CEP não encontrado');
                return;
            }

            setFormData(prev => ({
                ...prev,
                address: data.logradouro,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf
            }));

        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        } finally {
            setAddressLoading(false);
        }
    };

    // Buscar coordenadas ao confirmar endereço
    const fetchCoordinates = async () => {
        if (!formData.city || !formData.state) return;
        const query = `${formData.address}, ${formData.number}, ${formData.city}, ${formData.state}, Brazil`;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (err) {
            console.error('Erro geocoding:', err);
        }
        return null;
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Tentar obter coordenadas finais
            const coords = await fetchCoordinates();

            // 2. Criar Igreja com status PENDENTE
            const { data: _church, error: churchError } = await supabase
                .from('churches')
                .insert({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    address: `${formData.address}, ${formData.number} ${formData.complement ? '- ' + formData.complement : ''} - ${formData.neighborhood}`,
                    city: formData.city,
                    state: formData.state,
                    cep: formData.cep,
                    latitude: coords?.lat || null,
                    longitude: coords?.lng || null,
                    pix_key: formData.pix_key,
                    bank_info: formData.bank_info,
                    slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000),
                    // APPROVAL SYSTEM FIELDS
                    status: 'pending_approval',
                    requested_by: user.id,
                    requested_at: new Date().toISOString()
                })
                .select()
                .single();

            if (churchError) throw churchError;

            // 3. NÃO atualizar user para admin ainda (aguardar aprovação)
            // User permanece como "membro" até aprovação do super admin

            // 4. Sucesso - redirecionar para página de aguardo
            setIsSuccess(true);

            setTimeout(() => {
                navigate('/aguardando-aprovacao', {
                    state: {
                        churchName: formData.name,
                        churchCity: formData.city,
                        requestedAt: new Date().toISOString()
                    }
                });
            }, 2000);

        } catch (err: any) {
            console.error('Erro ao criar igreja:', err);
            alert('Erro detalhado: ' + (err.message || JSON.stringify(err)));
            setLoading(false);
        }
    };


    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#d4af37]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '7s' }} />
            </div>

            <AnimatePresence mode="wait">
                {isSuccess ? (
                    <motion.div
                        key="success-overlay"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="w-full max-w-lg bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-12 text-center relative z-20 border border-white/20"
                    >
                        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                            >
                                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                            </motion.div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 rounded-full bg-emerald-500/10"
                            />
                        </div>
                        <h2 className="text-3xl font-display font-bold italic text-white mb-4">Solicitação Enviada!</h2>
                        <p className="text-slate-300 font-medium mb-8">Sua igreja será analisada em breve. Você receberá a confirmação quando tudo estiver pronto...</p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-bounce" />
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="creation-form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-2xl"
                    >
                        {/* Progress Header */}
                        <div className="mb-8 flex justify-between items-end px-4">
                            <div>
                                <h1 className="text-3xl font-display font-bold text-white italic tracking-tight">Setup Inicial</h1>
                                <p className="text-indigo-200 text-sm mt-1">Configure seu Hub em 3 passos simples</p>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-[#d4af37]' : 'w-2 bg-white/20'}`} />
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                            {/* Content Steps */}
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-300"><ChurchIcon className="w-6 h-6" /></div>
                                            <h3 className="text-xl text-white font-bold">Identidade do Hub</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="group">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome da Igreja</label>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full h-14 px-5 bg-black/20 border border-white/10 rounded-2xl focus:border-indigo-500 focus:bg-black/30 outline-none text-white font-bold placeholder:text-white/20 transition-all text-lg"
                                                    placeholder="Ex: Igreja Videira"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email Oficial</label>
                                                    <input
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                        className="w-full h-12 px-4 bg-black/20 border border-white/10 rounded-xl focus:border-indigo-500 outline-none text-white/90 font-medium placeholder:text-white/20 transition-all"
                                                        placeholder="contato@igreja.com"
                                                    />
                                                </div>
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Telefone</label>
                                                    <input
                                                        type="tel"
                                                        value={formData.phone}
                                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                        className="w-full h-12 px-4 bg-black/20 border border-white/10 rounded-xl focus:border-indigo-500 outline-none text-white/90 font-medium placeholder:text-white/20 transition-all"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-300"><MapPin className="w-6 h-6" /></div>
                                            <h3 className="text-xl text-white font-bold">Localização</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex gap-4">
                                                <div className="w-40">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">CEP</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            maxLength={9}
                                                            autoFocus
                                                            value={formData.cep}
                                                            onChange={e => setFormData({ ...formData, cep: e.target.value })}
                                                            onBlur={handleCepBlur}
                                                            className="w-full h-12 px-4 bg-black/20 border border-white/10 rounded-xl focus:border-emerald-500 outline-none text-white font-bold text-center tracking-wider placeholder:text-white/20 transition-all pr-10"
                                                            placeholder="00000-000"
                                                        />
                                                        {addressLoading && (
                                                            <div className="absolute right-3 top-3">
                                                                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Cidade / Estado</label>
                                                    <div className="h-12 px-4 bg-white/5 border border-white/5 rounded-xl flex items-center text-white/50 text-sm font-medium">
                                                        {formData.city ? `${formData.city} - ${formData.state}` : '...'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-8">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Endereço</label>
                                                    <input
                                                        type="text"
                                                        value={formData.address}
                                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                        className="w-full h-12 px-4 bg-black/20 border border-white/10 rounded-xl focus:border-emerald-500 outline-none text-white font-medium placeholder:text-white/20 transition-all"
                                                        placeholder="Rua, Avenida..."
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Número</label>
                                                    <input
                                                        type="text"
                                                        value={formData.number}
                                                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                                                        className="w-full h-12 px-4 bg-black/20 border border-white/10 rounded-xl focus:border-emerald-500 outline-none text-white font-medium placeholder:text-white/20 transition-all"
                                                        placeholder="Nº"
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-2 flex items-center gap-2 text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest">
                                                <Globe className="w-3 h-3" />
                                                <span>Geolocalização Automática</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-3 bg-[#d4af37]/20 rounded-2xl text-[#d4af37]"><Wallet className="w-6 h-6" /></div>
                                            <h3 className="text-xl text-white font-bold">Financeiro</h3>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-xl relative group overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Chave PIX Principal</label>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={formData.pix_key}
                                                    onChange={e => setFormData({ ...formData, pix_key: e.target.value })}
                                                    className="w-full h-12 bg-transparent border-b border-white/20 focus:border-[#d4af37] outline-none text-xl font-mono text-white placeholder:text-white/20 transition-all"
                                                    placeholder="CPF, CNPJ, Email ou Aleatória"
                                                />

                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dados Bancários (Opcional)</label>
                                                    <input
                                                        type="text"
                                                        value={formData.bank_info}
                                                        onChange={e => setFormData({ ...formData, bank_info: e.target.value })}
                                                        className="w-full h-8 bg-transparent border-none outline-none text-sm text-slate-300 placeholder:text-slate-600"
                                                        placeholder="Banco, Agência, Conta..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                                                <Star className="w-5 h-5 text-orange-400 shrink-0" />
                                                <p className="text-xs text-orange-200/80 leading-relaxed">
                                                    Ao concluir, você terá acesso imediato ao <strong>Painel Financeiro Premium</strong> e gestão de membros.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Footer Actions */}
                            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                                {step > 1 ? (
                                    <button onClick={prevStep} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                        <ArrowLeft className="w-4 h-4" /> Voltar
                                    </button>
                                ) : (
                                    <button onClick={() => navigate('/membro/perfil')} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                                        Cancelar
                                    </button>
                                )}

                                {step < 3 ? (
                                    <button
                                        onClick={nextStep}
                                        disabled={step === 1 && !formData.name || step === 2 && !formData.cep}
                                        className="h-12 px-8 bg-white text-[#1e1b4b] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        Próximo <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="h-12 px-8 bg-[#d4af37] text-[#1e1b4b] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#b5952f] transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finalizar Setup'}
                                        {!loading && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
