import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Navigate } from 'react-router-dom';
import { setCached, getCached, clearAllCaches } from './cache-manager';
import { logSecurityEvent } from './logger';

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
    mfa: {
        enroll: () => Promise<{ data: any; error: Error | null }>;
        verify: (factorId: string, code: string, challengeId?: string) => Promise<{ data: any; error: Error | null }>;
        check: () => Promise<boolean>;
        list: () => Promise<{ data: any[]; error: Error | null }>;
        unenroll: (factorId: string) => Promise<{ error: Error | null }>;
    };
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
            // 1. Tentar Cache Imediato (Stale-while-revalidate)
            const cached = getCached<UserProfile>(`auth_profile_${userId}`);
            if (cached) {
                console.log('[AUTH] ⚡ Cache hit for profile');
                // Se já temos cache, setamos o perfil imediatamente para desbloquear a UI
                setProfile(cached);
                setLoading(false); // Libera o loading imediatamente
            }

            console.log('[AUTH] Fetching fresh profile for:', userId);

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
            if (data.role === 'member') {
                console.warn('[AUTH] 🔧 Auto-fixing role typo: member -> membro');
                data.role = 'membro';
                await supabase.from('users').update({ role: 'membro' }).eq('id', userId);
            }

            // Atualiza Cache e Estado
            setCached(`auth_profile_${userId}`, data, 3600000); // 1 hora
            return data as UserProfile;

        } catch (err) {
            console.error('[AUTH] Profile fetch failed:', err);
            // Se falhar e tiver cache, retornamos o cache como fallback seguro
            // Precisamos chamar getCached novamente aqui se quisermos fallback, 
            // ou podemos ter salvo o cached em uma variavel fora.
            // Simplificando: tenta ler do cache de novo se der erro
            const fallback = getCached<UserProfile>(`auth_profile_${userId}`);
            return fallback || null;
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
            // 2. Determina cargo (todos começam como 'membro' ou 'visitante' por padrão)
            // A promoção deve ser feita via Banco de Dados ou Interface Administrativa
            let intendedRole: UserRole = 'membro';

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
    const refreshProfile = useCallback(async () => {
        let currentUserId = user?.id;

        if (!currentUserId) {
            const { data: { session } } = await supabase.auth.getSession();
            currentUserId = session?.user?.id;
        }

        if (currentUserId) {
            const userProfile = await fetchProfile(currentUserId);
            if (userProfile) setProfile(userProfile);
        }
    }, [user?.id]);

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
                // 1. Processa hash OAuth do Google manualmente se presente (Fix para loop infinito/tela branca)
                const hashParams = new URLSearchParams(
                    window.location.hash.replace('#', '?')
                );
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    console.log('[AUTH] Manually processing OAuth hash tokens...');
                    try {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        if (error) throw error;
                        // Limpa o hash da URL imediatamente
                        window.history.replaceState(null, '', window.location.pathname);
                        console.log('[AUTH] Session set successfully from hash');
                    } catch (err) {
                        console.error('[AUTH] Failed to set session from hash:', err);
                        window.history.replaceState(null, '', '/login');
                    }
                } else if (window.location.hash.includes('access_token=')) {
                    // Fallback: Tenta detectar sessão da URL automaticamente se o manual falhar ou for parcial
                    await supabase.auth.getSession();
                }

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
                // Timeout de segurança: libera a UI em no máximo 5s
                const safetyTimeout = setTimeout(() => {
                    if (isMounted) {
                        console.warn('[AUTH] Safety timeout triggered, forcing loading=false');
                        setLoading(false);
                    }
                }, 5000);

                // Se temos usuário, sincroniza o perfil
                createProfileIfNotExists(
                    session.user.id,
                    session.user.email || '',
                    session.user.user_metadata?.full_name
                ).then(async userProfile => {
                    clearTimeout(safetyTimeout);
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
                }).catch(err => {
                    clearTimeout(safetyTimeout);
                    console.error('[AUTH] createProfileIfNotExists failed:', err);
                    if (isMounted) setLoading(false); // libera mesmo com erro
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

        if (!error && data.user) {
            logSecurityEvent('LOGIN', 'USER', data.user.id, { method: 'password' });
        } else if (error) {
            console.warn('[AUTH] Login failed for:', email);
        }

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

        if (data.user) {
            logSecurityEvent('SIGNUP', 'USER', data.user.id, { email });
        }

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

    // MFA: Enrollment (TOTP)
    const enrollMFA = async () => {
        if (!supabase) return { error: new Error('Supabase não configurado') };
        return await supabase.auth.mfa.enroll({ factorType: 'totp' });
    };

    // MFA: Challenge & Verify
    const verifyMFA = async (factorId: string, code: string, challengeId?: string) => {
        if (!supabase) return { error: new Error('Supabase não configurado') };

        // Se não tiver challengeId, cria um novo
        if (!challengeId) {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) return { error: challengeError };
            challengeId = challengeData.id;
        }

        const { data, error } = await supabase.auth.mfa.verify({
            factorId,
            challengeId,
            code,
        });

        if (data && !error) {
            await refreshProfile(); // Atualiza perfil/sessão se necessário
        }

        return { data, error };
    };

    // MFA: Check Level
    const checkMFA = async () => {
        if (!supabase) return false;
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || !data) return false;
        return data.currentLevel === 'aal2';
    };

    // MFA: List Factors
    const listMFAFactors = async () => {
        if (!supabase) return { data: [], error: new Error('Supabase não configurado') };
        const { data, error } = await supabase.auth.mfa.listFactors();
        return { data: data?.all || [], error };
    };

    // MFA: Unenroll
    const unenrollMFA = async (factorId: string) => {
        if (!supabase) return { error: new Error('Supabase não configurado') };
        return await supabase.auth.mfa.unenroll({ factorId });
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
        if (profile.role === 'super_admin') return true;
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
        mfa: {
            enroll: enrollMFA,
            verify: verifyMFA,
            check: checkMFA,
            list: listMFAFactors,
            unenroll: unenrollMFA
        }
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

// Roles que exigem MFA obrigatoriamente
export const MFA_REQUIRED_ROLES: UserRole[] = ['pastor_chefe', 'admin', 'financeiro'];

// Helper para verificar se o dispositivo está "lembrado"
export function isDeviceRemembered(userId: string): boolean {
    const stored = localStorage.getItem(`mfa_remember_${userId}`);
    if (!stored) return false;
    try {
        const { expires } = JSON.parse(stored);
        return new Date().getTime() < expires;
    } catch {
        return false;
    }
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
        return <Navigate to="/login" replace />;
    }

    // Lógica de MFA OBRIGATÓRIA para roles sensíveis
    if (!loading && user && profile && MFA_REQUIRED_ROLES.includes(profile.role)) {
        const isRemembered = isDeviceRemembered(user.id);

        // Se NÃO está lembrado, precisamos checar MFA
        if (!isRemembered) {
            // Verificamos se estamos nas páginas de MFA para evitar loop
            const isMFAPage = window.location.pathname === '/mfa-setup' || window.location.pathname === '/mfa-verify';

            if (!isMFAPage) {
                // Checa se tem fatores enrollados (isso é assíncrono, mas o session.user.factors pode ajudar)
                // O Supabase injeta fatores no user object se disponíveis
                const factors = (user as any).factors || [];
                const hasTOTP = factors.some((f: any) => f.factor_type === 'totp' && f.status === 'verified');

                if (hasTOTP) {
                    return <Navigate to="/mfa-verify" replace />;
                } else {
                    return <Navigate to="/mfa-setup" replace />;
                }
            }
        }
    }

    if (requiredRoles && requiredRoles.length > 0 && profile && !hasPermission(requiredRoles)) {
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
        case 'super_admin':
        case 'admin':
        case 'pastor_chefe':
        case 'pastor_lider':
            return '/jornal'; // Painel principal de notícias/avisos
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
