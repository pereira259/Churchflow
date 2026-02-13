import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Navigate } from 'react-router-dom';
import { setCached, clearAllCaches } from './cache-manager';

// Tipos de cargo/role conforme PRD 1.2
export type UserRole = 'super_admin' | 'pastor_chefe' | 'pastor_lider' | 'admin' | 'financeiro' | 'voluntario' | 'lider' | 'membro' | 'visitante';

// Interface do perfil do usuário
export interface UserProfile {
    id: string;
    church_id: string | null;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    role: UserRole;
    status: 'ativo' | 'inativo' | 'pendente';
    can_create_church?: boolean;
    created_at?: string;
    updated_at?: string;
}

// Interface do contexto
interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: Error | null }>;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    isAdmin: boolean;
    isPastor: boolean;
    isLider: boolean;
    isFinanceiro: boolean;
    isMembro: boolean;
    hasPermission: (requiredRoles: UserRole[]) => boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        // NÃO usar cache na inicialização porque não sabemos o userId ainda
        return null;
    });
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Busca o perfil do usuário
    const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
        if (!supabase) return null;

        try {
            console.log('[AUTH] Fetching profile for:', userId);
            // const startTime = Date.now(); // Removed unused

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('[AUTH] Profile not found or fetch error:', error.message);
                return null;
            }

            // AUTO-FIX: Corrige role 'member' (inglês) para 'membro' (português)
            // Bug anterior definia role errado ao excluir igrejas
            if (data.role === 'member') {
                console.warn('[AUTH] 🔧 Auto-fixing role typo: member -> membro');
                data.role = 'membro';
                await supabase.from('users').update({ role: 'membro' }).eq('id', userId);
            }

            // Cache com chave específica do usuário para evitar cache cross-user
            setCached(`auth_profile_${userId}`, data, 3600000); // 1 hora
            return data as UserProfile;
        } catch (err) {
            console.error('[AUTH] Profile fetch failed:', err);
            return null;
        }
    };

    // Cria perfil se não existir (apenas no primeiro login)
    const createProfileIfNotExists = async (userId: string, email: string, fullName?: string): Promise<UserProfile | null> => {
        if (!supabase) return null;

        console.log('[AUTH] 🔍 Checking profile for userId:', userId);
        console.log('[AUTH] 📧 Email:', email);
        console.log('[AUTH] 👤 Full name:', fullName);

        // 1. Tenta buscar perfil existente POR USER_ID (único por conta Google)
        const existing = await fetchProfile(userId);
        if (existing) {
            console.log('[AUTH] ✅ PERFIL EXISTENTE encontrado:', existing.email, 'Role:', existing.role);
            return existing;
        }

        console.log('[AUTH] 🆕 PERFIL NÃO EXISTE - Criando novo...');

        try {
            console.log('[AUTH] Creating new profile for:', email);
            // 2. Determina cargo baseado no email (apenas para auto-geração)
            let intendedRole: UserRole = 'membro';
            const emailLower = email.toLowerCase();

            // Bypass especial para admins conhecidos
            if (emailLower === 'dp6274720@gmail.com' || emailLower === 'admin.oficial@churchflow.com') {
                intendedRole = 'admin';
            } else if (emailLower.includes('admin')) {
                intendedRole = 'admin';
            } else if (emailLower.includes('pastor')) {
                intendedRole = 'pastor_chefe';
            } else if (emailLower.includes('lider')) {
                intendedRole = 'lider';
            }

            const newProfile: Omit<UserProfile, 'created_at'> = {
                id: userId,
                church_id: null,
                email: email,
                full_name: fullName || email.split('@')[0],
                role: intendedRole,
                status: 'ativo',
            };

            const { data, error } = await supabase
                .from('users')
                .insert(newProfile)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    console.log('[AUTH] ⚠️ Perfil duplicado detectado (23505) - Buscando existente');
                    return await fetchProfile(userId);
                }
                console.error('[AUTH] ❌ ERRO ao criar perfil:', error);
                return null;
            }

            console.log('[AUTH] ✨ NOVO PERFIL CRIADO com sucesso!');
            console.log('[AUTH] 📊 Dados:', data);
            setCached(`auth_profile_${userId}`, data, 3600000);
            return data as UserProfile;

        } catch (err) {
            console.error('[AUTH] Critical error in createProfileIfNotExists:', err);
            return null;
        }
    };

    // Refresh do perfil
    const refreshProfile = async () => {
        let currentUserId = user?.id;

        if (!currentUserId) {
            const { data: { session } } = await supabase.auth.getSession();
            currentUserId = session?.user?.id;
        }

        if (currentUserId) {
            const userProfile = await fetchProfile(currentUserId);
            if (userProfile) setProfile(userProfile);
        }
    };

    // Inicializa a sessão
    useEffect(() => {
        let isMounted = true;

        // Timeout de segurança - restaurado para 8s para conexões lentas
        const timeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('[AUTH] Session check timeout - force revealing UI');
                setLoading(false);
            }
        }, 8000);

        if (!supabase) {
            console.error('[AUTH] Supabase client is missing!');
            setLoading(false);
            clearTimeout(timeout);
            return;
        }

        // Verifica sessão existente na inicialização
        const initSession = async () => {
            try {
                console.log('[AUTH] Initializing session check...');
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[AUTH] getSession error:', error);
                }

                if (!isMounted) return;

                console.log('[AUTH] Session found:', !!session);
                if (session) {
                    console.log('[AUTH] User email:', session.user.email);
                }

                // INICIALIZAÇÃO OTIMISTA: Libera a UI
                setSession(session);
                setUser(session?.user ?? null);

                // Se não temos sessão mas temos um hash de token na URL, 
                // não liberamos o loading ainda para dar tempo ao onAuthStateChange
                const hasHashToken = window.location.hash.includes('access_token=');
                if (!session && hasHashToken) {
                    console.log('[AUTH] Hash detected but no session yet, waiting for listener...');
                    // O loading será setado como false no onAuthStateChange
                } else {
                    setLoading(false);
                }

                if (session?.user) {
                    createProfileIfNotExists(
                        session.user.id,
                        session.user.email!,
                        session.user.user_metadata?.full_name
                    ).then(userProfile => {
                        if (isMounted) {
                            console.log('[AUTH] Profile sync complete:', !!userProfile);
                            if (userProfile) setProfile(userProfile);
                        }
                    });
                }
            } catch (error) {
                console.error('[AUTH] Critical error in initSession:', error);
                if (isMounted) setLoading(false);
            }
        };

        initSession();

        // Listener para mudanças de auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            if (!isMounted) return;

            // ⚡ OTIMIZAÇÃO: Atualiza estado IMEDIATAMENTE (não bloqueia)
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // Se temos usuário, sincroniza o perfil
                createProfileIfNotExists(
                    session.user.id,
                    session.user.email || '',
                    session.user.user_metadata?.full_name
                ).then(async userProfile => {
                    if (isMounted) {
                        // SELF-HEALING: Sync Metadata if missing/generic in profile
                        if (userProfile && session.user.user_metadata) {
                            const metadata = session.user.user_metadata;
                            const updates: any = {};
                            let needsUpdate = false;

                            // NOTA: Avatar do Google é desabilitado pois gera imagens feias com texto
                            // Usuário deve fazer upload manual de foto se quiser

                            // Sync Name (Fix for 'U' issue)
                            const currentName = userProfile.full_name || '';
                            const metaName = metadata.full_name || metadata.name || '';

                            // Se nome atual for vazio, 'U', ou email, tenta pegar do Google
                            if ((!currentName || currentName === 'U' || currentName.includes('@')) && metaName) {
                                console.log(`[AUTH] 🔧 Atualizando nome de '${currentName}' para '${metaName}'`);
                                updates.full_name = metaName;
                                userProfile.full_name = metaName;
                                needsUpdate = true;
                            }

                            if (needsUpdate && supabase) {
                                console.log('[AUTH] Syncing missing profile data from metadata...', updates);
                                await supabase.from('users').update(updates).eq('id', userProfile.id);
                                setCached(`auth_profile_${userProfile.id}`, userProfile, 3600000);
                            }
                        }

                        if (userProfile) {
                            setProfile(userProfile);
                        }
                        setLoading(false);
                    }
                });
            } else {
                setLoading(false);
                if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    // Limpar TODO o cache de perfis ao fazer logout
                    clearAllCaches();
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    // Realtime Profile Updates (Fix for instant role promotion)
    useEffect(() => {
        if (!user || !supabase) return;

        // Subscribe to changes on my user row
        const channel = supabase
            .channel(`user_profile_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${user.id}`
                },
                async (payload: any) => {
                    console.log('[AUTH] ⚡ Realtime update detected:', payload);
                    await refreshProfile();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Login
    const signIn = async (email: string, password: string) => {
        if (!supabase) return { error: new Error('Supabase não configurado'), data: { session: null, user: null } };

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        return { data, error };
    };

    // Cadastro
    const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
        if (!supabase) return { error: new Error('Supabase não configurado'), data: { session: null, user: null } };

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone,
                },
                emailRedirectTo: window.location.origin,
            }
        });

        if (error) return { data, error };

        // Se o usuário foi criado e já está confirmado (ex: desablitar confirm email)
        // Opcional: criar perfil já aqui se quisesse
        return { data, error: null };
    };

    // Logout
    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        clearAllCaches(); // Limpa TODO o cache ao fazer logout
        setUser(null);
        setProfile(null);
        setSession(null);
    };

    // Password Reset
    const resetPassword = async (email: string) => {
        if (!supabase) return { error: new Error('Supabase não configurado') };

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        return { error };
    };

    // Google Sign-In
    const signInWithGoogle = async () => {
        if (!supabase) return { error: new Error('Supabase não configurado') };

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account', // Força seleção de conta toda vez
                }
            }
        });

        return { error };
    };

    // Helpers de permissão (baseados no profile real)
    const role = profile?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isPastor = role === 'pastor_chefe' || role === 'pastor_lider' || isAdmin;
    const isLider = role === 'lider' || isPastor;
    const isFinanceiro = role === 'financeiro' || isAdmin || isPastor;
    const isMembro = role === 'membro' || role === 'visitante' || isLider || isFinanceiro;

    const hasPermission = (requiredRoles: UserRole[]) => {
        if (!profile) return false;
        return requiredRoles.includes(profile.role);
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGoogle,
        isAdmin,
        isPastor,
        isLider,
        isFinanceiro,
        isMembro,
        hasPermission,
        refreshProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook para usar o contexto
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}

// Componente de proteção de rota
interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles?: UserRole[];
    fallback?: ReactNode;
}

export function ProtectedRoute({ children, requiredRoles, fallback }: ProtectedRouteProps) {
    const { user, profile, loading, hasPermission } = useAuth();

    // Apenas redireciona para login se terminamos de carregar, não há usuário 
    // E não estamos em um processo de recuperação de token na URL
    const hasHashToken = window.location.hash.includes('access_token=');

    if (!loading && !user && !hasHashToken) {
        if (fallback) return <>{fallback}</>;
        // Usar replace para não sujar o histórico
        return <Navigate to="/login" replace />;
    }

    // Durante loading, renderiza children (que terão seus próprios skeletons)
    // Isso elimina o "waterfall" de loading.
    // Também renderiza se temos user (mesmo durante loading)

    // Verificação de igreja removida deste ponto para permitir que o usuário "pule" a seleção.
    // O redirecionamento é feito agora apenas no fluxo inicial de login na LoginPage.


    if (requiredRoles && requiredRoles.length > 0 && profile && !hasPermission(requiredRoles)) {
        // Se o usuário está logado mas não tem permissão (ex: membro tentando acessar admin),
        // redireciona para a área dele em vez de mostrar erro.
        const userRole = profile?.role || 'membro';
        if (userRole === 'membro' || userRole === 'visitante') {
            return <Navigate to="/membro" replace />;
        }
        if (userRole === 'lider') {
            return <Navigate to="/lider" replace />;
        }

        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[#fdfbf7]">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-[#1e1b4b] mb-2">Acesso Restrito</h1>
                    <p className="text-slate-500 mb-4">Seu perfil não tem acesso a esta área.</p>
                    <button
                        onClick={() => window.history.back()}
                        className="text-sm font-bold text-[#d4af37] hover:underline"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

// Helper para determinar rotas de redirecionamento baseadas em cargo
export function getRedirectPath(role?: UserRole): string {
    if (!role) return '/membro';

    switch (role) {
        case 'admin':
        case 'pastor_chefe':
        case 'pastor_lider':
            return '/membros'; // Redireciona para área de membros, pois não tem mais acesso ao dashboard
        case 'lider':
            return '/lider/comunicacao'; // Rota mais comum para líderes
        case 'financeiro':
            return '/financeiro';
        case 'membro':
        case 'visitante':
        default:
            return '/membro';
    }
}
