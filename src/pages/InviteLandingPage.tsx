import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Loader2, MapPin, CheckCircle2, UserPlus } from 'lucide-react';

export function InviteLandingPage() {
    const { inviteId } = useParams();
    const [searchParams] = useSearchParams();
    const churchId = searchParams.get('c');
    const navigate = useNavigate();
    const { user, profile } = useAuth();

    const [loading, setLoading] = useState(true);
    const [inviter, setInviter] = useState<any>(null);
    const [church, setChurch] = useState<any>(null);
    const [error, setError] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        async function loadInviteInfo() {
            try {
                if (!inviteId || !churchId) {
                    setError('Link de convite inválido');
                    setLoading(false);
                    return;
                }

                // 1. Get Inviter Info (from profiles/users)
                // Assuming 'users' table has public read or we use a function.
                // For MVP, we might simple query users table if RLS allows, or just ignore name for now if restricted.
                // Let's try to get church info first which is definitely public.

                const { data: churchData, error: churchError } = await supabase
                    .from('churches')
                    .select('id, name, city, state, logo_url')
                    .eq('id', churchId)
                    .single();

                if (churchError) throw churchError;
                setChurch(churchData);

                // 2. Get Inviter Name (Optional / Best Effort)
                const { data: inviteData } = await supabase
                    .from('users')
                    .select('full_name, avatar_url')
                    .eq('id', inviteId)
                    .single();

                if (inviteData) setInviter(inviteData);

            } catch (err) {
                console.error(err);
                setError('Não foi possível carregar as informações do convite.');
            } finally {
                setLoading(false);
            }
        }

        loadInviteInfo();
    }, [inviteId, churchId]);

    const handleJoin = async () => {
        if (!user) {
            // Retrieve current URL to redirect back after login?
            // For MVP, just send to login. 
            // Better: Store invite in localStorage to handle after login?
            localStorage.setItem('pending_invite_church', churchId!);
            navigate('/login');
            return;
        }

        setJoining(true);
        try {
            // Join logic (similar to SelectChurchPage)
            const { error: updateError } = await supabase
                .from('users')
                .update({ church_id: churchId })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Check if member exists
            const { data: existingMember } = await supabase
                .from('members')
                .select('id')
                .eq('user_id', user.id)
                .eq('church_id', churchId)
                .single();

            if (!existingMember) {
                await supabase.from('members').insert({
                    church_id: churchId,
                    user_id: user.id,
                    full_name: profile?.full_name || user.email?.split('@')[0],
                    email: user.email,
                    status: 'visitante', // Start as visitor via invite? Or member? Let's say Visitante for safety.
                    notes: `Convidado por usuário ${inviteId}`
                });
            }

            navigate('/membro'); // Go to member area
        } catch (err) {
            console.error(err);
            alert('Erro ao entrar na igreja. Tente novamente.');
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-[#1e1b4b] animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-800 mb-2">Ops! Algo deu errado</h1>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-[#1e1b4b] text-white rounded-lg">
                    Voltar ao Início
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#1e1b4b] to-[#0f0d2e] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/10 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] opacity-30" />
            </div>

            <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center border border-white/10">
                {inviter && (
                    <div className="flex justify-center -mt-16 mb-6">
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-200 overflow-hidden">
                            {inviter.avatar_url ? (
                                <img src={inviter.avatar_url} alt={inviter.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#1e1b4b] text-white text-2xl font-bold">
                                    {inviter.full_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <h1 className="text-2xl font-bold text-[#1e1b4b] mb-2 font-display">
                    {inviter ? `${inviter.full_name} convidou você!` : 'Você foi convidado!'}
                </h1>

                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                    Venha fazer parte da família <strong>{church.name}</strong> e se conectar conosco.
                </p>

                <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm mx-auto mb-3 flex items-center justify-center p-1">
                        {church.logo_url ? (
                            <img src={church.logo_url} className="w-full h-full object-contain rounded-lg" />
                        ) : (
                            <MapPin className="w-8 h-8 text-slate-300" />
                        )}
                    </div>
                    <h2 className="font-bold text-lg text-[#1e1b4b] mb-1">{church.name}</h2>
                    <p className="text-xs text-slate-400">
                        {church.city ? `${church.city}, ${church.state}` : 'Localização não informada'}
                    </p>
                </div>

                <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full py-4 rounded-xl bg-[#d4af37] hover:bg-[#c49f2f] text-[#1e1b4b] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg shadow-[#d4af37]/20"
                >
                    {joining ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <UserPlus className="w-5 h-5" />
                            {user ? 'Aceitar e Entrar' : 'Criar Conta / Entrar'}
                        </>
                    )}
                </button>
            </div>

            <p className="mt-8 text-white/20 text-xs">ChurchFlow © 2024</p>
        </div>
    );
}
