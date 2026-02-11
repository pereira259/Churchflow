import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    User,
    Mail,
    Phone,
    ShieldCheck,
    Check,
    MapPin,
    Calendar,
    ChevronRight,
    ChevronLeft,
    Users,
    UserCircle2,
    Briefcase,
    Sparkles,
    Home,
    Search,
    Loader2,
    Building2
} from 'lucide-react';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { Member, getGroups, getMembers, Group } from '@/lib/supabase-queries';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MemberFormProps {
    onSuccess: (data?: any) => void;
    onCancel: () => void;
    initialData?: Member | null;
    churchId: string;
}

export function MemberForm({ onSuccess, onCancel, initialData, churchId }: MemberFormProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
    const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [cepLoading, setCepLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        status: 'visitante',
        ministry: '',
        church_role: 'Membro',
        birth_date: '',
        gender: '',
        cep: '',
        address: '',
        neighborhood: '',
        city: '',
        number: '',
        joining_date: new Date().toISOString().split('T')[0],
        tags: '',
        notes: '',
        photo_url: '',
        small_group_id: '',
        discipled_by_id: ''
    });

    useEffect(() => {
        const loadRelations = async () => {
            if (!churchId) return;
            const { data: groups } = await getGroups(churchId);
            const { data: members } = await getMembers(churchId);
            setAvailableGroups(groups || []);
            setAvailableMembers(members || []);
        };
        loadRelations();
    }, [churchId]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                full_name: initialData.full_name,
                email: initialData.email || '',
                phone: initialData.phone || '',
                status: (['visitante', 'interessado', 'membro', 'inativo'].includes(initialData.status) ? initialData.status : 'visitante') as any,
                ministry: initialData.ministry || '',
                church_role: initialData.church_role || 'Membro',
                birth_date: initialData.birth_date || '',
                gender: initialData.gender || '',
                cep: '',
                address: initialData.address || '',
                neighborhood: '',
                city: '',
                number: '',
                joining_date: initialData.joining_date || '',
                tags: initialData.tags ? initialData.tags.join(', ') : '',
                notes: initialData.notes || '',
                photo_url: initialData.photo_url || '',
                small_group_id: initialData.small_group_id || '',
                discipled_by_id: initialData.discipled_by_id || ''
            });
        }
    }, [initialData]);

    const maskPhone = (v: string) => {
        v = v.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d)(\d{4})$/, "$1-$2");
        return v;
    };

    const maskCEP = (v: string) => {
        v = v.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        v = v.replace(/^(\d{5})(\d)/, "$1-$2");
        return v;
    };

    const handleCEPChange = async (cepValue: string) => {
        const masked = maskCEP(cepValue);
        setFormData(prev => ({ ...prev, cep: masked }));

        const cleanCEP = masked.replace(/\D/g, "");
        if (cleanCEP.length === 8) {
            setCepLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade
                    }));
                    setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.cep;
                        return newErrors;
                    });
                } else {
                    setErrors(prev => ({ ...prev, cep: 'CEP não encontrado' }));
                }
            } catch (err) {
                console.error("CEP fetch error", err);
            } finally {
                setCepLoading(false);
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);

        const fullAddress = `${formData.address}${formData.number ? `, ${formData.number}` : ''}${formData.neighborhood ? ` - ${formData.neighborhood}` : ''}${formData.city ? ` (${formData.city})` : ''}`;

        const payload = {
            ...formData,
            address: fullAddress,
            cep: undefined,
            city: undefined,
            neighborhood: undefined,
            number: undefined,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            birth_date: formData.birth_date || null,
            joining_date: formData.joining_date || new Date().toISOString().split('T')[0],
            small_group_id: formData.small_group_id || null,
            discipled_by_id: formData.discipled_by_id || null,
            has_small_group: !!formData.small_group_id,
            is_discipled: !!formData.discipled_by_id,
            church_id: churchId
        };

        // Remove undefined keys
        const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

        try {
            if (initialData) {
                const { error } = await supabase.from('members').update(cleanPayload).eq('id', initialData.id);
                if (error) throw error;

                if (initialData.user_id) {
                    const roleMap: Record<string, string> = {
                        'Pastor Chefe': 'pastor_chefe', 'Pastor Líder': 'pastor_lider',
                        'Líder': 'lider', 'Diácono': 'lider', 'Presbítero': 'lider'
                    };
                    const userRole = roleMap[formData.church_role] || 'membro';
                    const userStatus = formData.status === 'inativo' ? 'inativo' : 'ativo';

                    await supabase.from('users').update({
                        role: userRole,
                        status: userStatus,
                        full_name: formData.full_name
                    }).eq('id', initialData.user_id);
                }
            } else {
                const { error } = await supabase.from('members').insert([cleanPayload]);
                if (error) throw error;
            }
            onSuccess(cleanPayload);
        } catch (error) {
            console.error('Error saving member:', error);
            alert(`Erro ao salvar: ${(error as any).message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    const validateStep = () => {
        const newErrors: Record<string, string> = {};
        if (step === 1) {
            if (!formData.full_name) newErrors.full_name = 'Nome é obrigatório';
            if (formData.birth_date && new Date(formData.birth_date) > new Date()) {
                newErrors.birth_date = 'Data no futuro';
            }
        }
        if (step === 2) {
            if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'E-mail inválido';
            if (formData.cep && formData.cep.replace(/\D/g, "").length < 8) newErrors.cep = 'CEP incompleto';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (!validateStep()) return;
        if (step < 3) setStep(s => s + 1);
        else handleSubmit();
    };

    const prevStep = () => setStep(s => Math.max(1, s - 1));

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Progress Header */}
            <div className="px-6 pt-1 pb-4 flex-none">
                <div className="flex items-center justify-between mb-1.5 relative">
                    {/* Background Progress Line */}
                    <div className="absolute top-[13px] left-4 right-4 h-0.5 bg-slate-100 rounded-full" />

                    {/* Animated Fill Line */}
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: step === 1 ? '0%' : step === 2 ? 'calc(50% - 14px)' : 'calc(100% - 28px)' }}
                        className="absolute top-[13px] left-[28px] h-0.5 bg-marinho rounded-full z-10"
                    />

                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center flex-1 last:flex-none z-20">
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 shadow-sm",
                                step >= i ? "bg-marinho text-white shadow-marinho/20" : "bg-white border-2 border-slate-100 text-slate-300"
                            )}>
                                {step > i ? <Check className="w-3.5 h-3.5" /> : i}
                            </div>
                            {i < 3 && <div className="flex-1" />}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between px-1">
                    <span className={cn("text-[8px] font-black uppercase tracking-widest transition-colors", step === 1 ? "text-marinho" : "text-slate-300")}>Identidade</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-widest transition-colors", step === 2 ? "text-marinho" : "text-slate-300")}>Conexão</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-widest transition-colors", step === 3 ? "text-marinho" : "text-slate-300")}>Reino</span>
                </div>
            </div>

            {/* Content Area - No scroll, space optimized */}
            <div className="flex-1 px-6 overflow-visible flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3.5"
                    >
                        {step === 1 && (
                            <div className="space-y-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Nome Completo</label>
                                    <motion.div animate={errors.full_name ? { x: [-2, 2, -2, 2, 0] } : {}} className="relative group">
                                        <input
                                            required
                                            type="text"
                                            value={formData.full_name}
                                            onChange={e => {
                                                setFormData({ ...formData, full_name: e.target.value });
                                                if (errors.full_name) setErrors(prev => ({ ...prev, full_name: '' }));
                                            }}
                                            className={cn(
                                                "w-full h-10 pl-11 pr-4 text-xs bg-slate-50 text-marinho font-bold border-2 rounded-xl transition-all placeholder:text-marinho/20 shadow-sm",
                                                errors.full_name ? "border-red-200 bg-red-50/30" : "border-transparent focus:bg-white focus:border-marinho/10"
                                            )}
                                            placeholder="Ex: Pr. Ricardo"
                                        />
                                        <User className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", errors.full_name ? "text-red-400" : "text-marinho/20 group-focus-within:text-marinho")} />
                                        {errors.full_name && <span className="absolute -bottom-3.5 left-1 text-[8px] font-bold text-red-500 uppercase tracking-wider">{errors.full_name}</span>}
                                    </motion.div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Gênero</label>
                                        <div className="relative group">
                                            <select
                                                value={formData.gender}
                                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                className="w-full h-10 pl-11 pr-1 text-xs bg-slate-50 text-slate-800 font-bold border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="masculino">Masculino</option>
                                                <option value="feminino">Feminino</option>
                                            </select>
                                            <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 group-focus-within:text-marinho pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Nascimento</label>
                                        <div className="relative group">
                                            <CustomDatePicker
                                                value={formData.birth_date}
                                                onChange={(date) => {
                                                    setFormData({ ...formData, birth_date: date });
                                                    if (errors.birth_date) setErrors(prev => ({ ...prev, birth_date: '' }));
                                                }}
                                                className="w-full h-10 pl-11 pr-4 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 transition-all font-bold text-xs"
                                            />
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 group-focus-within:text-marinho pointer-events-none" />
                                            {errors.birth_date && <span className="absolute -bottom-3.5 left-1 text-[8px] font-bold text-red-500 uppercase tracking-wider">{errors.birth_date}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">WhatsApp</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                                                className="w-full h-10 pl-11 text-xs bg-slate-50 text-marinho font-bold border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 transition-all"
                                                placeholder="(00) 00000-0000"
                                            />
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 group-focus-within:text-marinho" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">E-mail</label>
                                        <motion.div animate={errors.email ? { x: [-2, 2, -2, 2, 0] } : {}} className="relative group">
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => {
                                                    setFormData({ ...formData, email: e.target.value });
                                                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                                }}
                                                className={cn(
                                                    "w-full h-10 pl-11 text-xs bg-slate-50 text-marinho font-bold border-2 rounded-xl transition-all",
                                                    errors.email ? "border-red-200 bg-red-50/30" : "border-transparent focus:bg-white focus:border-marinho/10"
                                                )}
                                                placeholder="email@exemplo.com"
                                            />
                                            <Mail className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", errors.email ? "text-red-400" : "text-marinho/20 group-focus-within:text-marinho")} />
                                            {errors.email && <span className="absolute -bottom-3.5 left-1 text-[8px] font-bold text-red-500 uppercase tracking-wider">{errors.email}</span>}
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-4 space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">CEP</label>
                                        <motion.div animate={errors.cep ? { x: [-2, 2, -2, 2, 0] } : {}} className="relative group">
                                            <input
                                                type="text"
                                                value={formData.cep}
                                                onChange={e => handleCEPChange(e.target.value)}
                                                className={cn(
                                                    "w-full h-10 pl-10 text-xs bg-slate-50 text-marinho font-bold border-2 rounded-xl transition-all",
                                                    errors.cep ? "border-red-200" : "border-transparent focus:bg-white focus:border-marinho/10"
                                                )}
                                                placeholder="00000-000"
                                            />
                                            {cepLoading ? (
                                                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho animate-spin" />
                                            ) : (
                                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 group-focus-within:text-marinho" />
                                            )}
                                            {errors.cep && <span className="absolute -bottom-3.5 left-1 text-[8px] font-bold text-red-500 uppercase tracking-wider">{errors.cep}</span>}
                                        </motion.div>
                                    </div>
                                    <div className="col-span-8 space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Cidade</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full h-10 pl-10 text-xs bg-slate-50 text-marinho font-bold border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 transition-all"
                                                placeholder="Cidade..."
                                            />
                                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 group-focus-within:text-marinho" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-6 space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Rua / Logradouro</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full h-10 pl-10 text-xs bg-slate-50 text-marinho font-bold border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 transition-all"
                                                placeholder="Rua..."
                                            />
                                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 group-focus-within:text-marinho" />
                                        </div>
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Nº</label>
                                        <input
                                            type="text"
                                            value={formData.number}
                                            onChange={e => setFormData({ ...formData, number: e.target.value })}
                                            className="w-full h-10 px-3 text-xs bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 font-bold"
                                            placeholder="S/N"
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Bairro</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.neighborhood}
                                                onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                                className="w-full h-10 pl-9 text-xs bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 font-bold"
                                                placeholder="Bairro..."
                                            />
                                            <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 group-focus-within:text-marinho" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Status</label>
                                        <div className="relative group">
                                            <select
                                                value={formData.status}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full h-10 pl-10 text-[10px] bg-slate-50 text-slate-800 font-bold border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 appearance-none cursor-pointer"
                                            >
                                                <option value="membro">Membro</option>
                                                <option value="visitante">Visitante</option>
                                                <option value="interessado">Interessado</option>
                                                <option value="inativo">Inativo</option>
                                            </select>
                                            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.2em] px-1">Função</label>
                                        <div className="relative group">
                                            <select
                                                value={formData.church_role}
                                                onChange={e => setFormData({ ...formData, church_role: e.target.value })}
                                                className="w-full h-10 pl-10 text-[10px] bg-slate-50 text-slate-800 font-bold border-2 border-transparent rounded-xl focus:bg-white focus:border-marinho/10 appearance-none cursor-pointer"
                                            >
                                                <option value="Membro">Membro</option>
                                                <option value="Líder">Líder</option>
                                                <option value="Diácono">Diácono</option>
                                                <option value="Presbítero">Presbítero</option>
                                                <option value="Pastor Chefe">Pastor Chefe</option>
                                                <option value="Pastor Líder">Pastor Líder</option>
                                                <option value="Músico">Músico</option>
                                                <option value="Voluntário">Voluntário</option>
                                            </select>
                                            <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/20 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-2 space-y-2">
                                    <div className="flex items-center justify-between group cursor-pointer"
                                        onClick={() => setFormData(p => ({ ...p, small_group_id: p.small_group_id ? '' : (availableGroups[0]?.id || 'none') }))}>
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", formData.small_group_id ? "bg-marinho text-white shadow-lg shadow-marinho/20" : "bg-white text-slate-300 shadow-sm")}>
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-marinho uppercase tracking-widest leading-none">Grupo?</h4>
                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{formData.small_group_id ? 'Sim, vinculado' : 'Não vinculado'}</p>
                                            </div>
                                        </div>
                                        <div className={cn("w-8 h-4 rounded-full relative transition-all duration-500", formData.small_group_id ? "bg-marinho" : "bg-slate-200")}>
                                            <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-all duration-500", formData.small_group_id ? "translate-x-4" : "translate-x-0")} />
                                        </div>
                                    </div>

                                    {formData.small_group_id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-0.5">
                                            <select
                                                value={formData.small_group_id}
                                                onChange={e => setFormData({ ...formData, small_group_id: e.target.value })}
                                                className="w-full h-9 pl-3 text-xs bg-white text-marinho font-bold border-2 border-marinho/5 rounded-lg outline-none"
                                            >
                                                <option value="none">Selecione o Grupo...</option>
                                                {availableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                            </select>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-2 space-y-2">
                                    <div className="flex items-center justify-between group cursor-pointer"
                                        onClick={() => setFormData(p => ({ ...p, discipled_by_id: p.discipled_by_id ? '' : (availableMembers[0]?.id || 'none') }))}>
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", formData.discipled_by_id ? "bg-gold text-white shadow-lg shadow-gold/20" : "bg-white text-slate-300 shadow-sm")}>
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-marinho uppercase tracking-widest leading-none">Discipulado?</h4>
                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{formData.discipled_by_id ? 'Sim, possui' : 'Sem acompanhamento'}</p>
                                            </div>
                                        </div>
                                        <div className={cn("w-8 h-4 rounded-full relative transition-all duration-500", formData.discipled_by_id ? "bg-gold" : "bg-slate-200")}>
                                            <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-all duration-500", formData.discipled_by_id ? "translate-x-4" : "translate-x-0")} />
                                        </div>
                                    </div>

                                    {formData.discipled_by_id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-0.5">
                                            <select
                                                value={formData.discipled_by_id}
                                                onChange={e => setFormData({ ...formData, discipled_by_id: e.target.value })}
                                                className="w-full h-9 pl-3 text-xs bg-white text-marinho font-bold border-2 border-marinho/5 rounded-lg outline-none"
                                            >
                                                <option value="none">Selecione o Líder...</option>
                                                {availableMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                            </select>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Sticky Actions - Compact */}
            <div className="px-6 py-3 mt-auto flex-none">
                <div className="flex gap-4">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="h-10 px-5 rounded-xl border-2 border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 hover:text-marinho transition-all flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Voltar
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="h-10 px-5 rounded-xl border-2 border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                    )}

                    <button
                        onClick={nextStep}
                        disabled={loading}
                        className="flex-1 bg-marinho text-white h-10 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] hover:shadow-premium shadow-lg shadow-marinho/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>{step === 3 ? 'Finalizar Cadastro' : 'Continuar'}</span>
                                {step < 3 && <ChevronRight className="h-4 w-4" />}
                                {step === 3 && <Check className="h-4 w-4 text-gold" />}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
