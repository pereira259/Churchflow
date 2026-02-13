import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, useAuth, getRedirectPath } from './lib/auth';
import { DashboardDataProvider } from './lib/dashboard-data';
import { TutorialProvider } from './contexts/TutorialContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { JornalContent } from './components/JornalContent';
import { ProfileGate } from './components/ProfileGate';

// Pages - Auth
import { LoginPage } from './pages/LoginPage';
import { SelectChurchPage } from './pages/SelectChurchPage';
import { CreateChurchPage } from './pages/CreateChurchPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { InviteLandingPage } from './pages/InviteLandingPage';

// Pages - Admin (Pastor/Admin)
import { DashboardPage } from './pages/DashboardPage';
import { MembrosPage } from './pages/MembrosPage';
import { FinanceiroPage } from './pages/FinanceiroPage';
import { VisitantesPage } from './pages/VisitantesPage';
import { GruposPage } from './pages/GruposPage';
import { MinisteriosPage } from './pages/MinisteriosPage';

// Pages - Admin Specific
import { EventosPage } from './pages/admin/EventosPage';

// Pages - Líder

import { ComunicacaoPage } from './pages/lider/ComunicacaoPage';

// Pages - Financeiro (Tesouraria)


// Pages - Membro
import { MemberHomePage } from './pages/member/MemberHomePage';
import { MemberAgendaPage } from './pages/member/MemberAgendaPage';
import { MemberProfilePage } from './pages/member/MemberProfilePage';
import { BiblePage } from './pages/BiblePage';
import { MemberCheckinPage } from './pages/member/MemberCheckinPage';
import { AwaitingApprovalPage } from './pages/AwaitingApprovalPage';
import { MemberStudiesPage } from './pages/member/MemberStudiesPage';

// Componente para cuidar do redirecionamento na raiz (/)
// sem perder o hash de autenticação do Supabase/Google
function RootRedirect() {
    const { user, profile, loading } = useAuth();
    const hasHash = window.location.hash.includes('access_token=');

    // Se temos um token na URL, NÃO redirecionamos.
    // Deixamos o App parado (null) até que o Supabase converta o hash em sessão.
    if (hasHash) {
        console.log('[ROOT] Auth hash detected, holding redirect...');
        return null;
    }

    // Enquanto está carregando o estado inicial, não faz nada
    if (loading) return null;

    // Se não está logado, vai para o login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Se já temos o perfil, vamos para a rota correta
    if (profile) {
        const path = getRedirectPath(profile.role);
        return <Navigate to={path} replace />;
    }

    // Se temos usuário mas ainda sem perfil (carregando), esperamos
    return null;
}

export default function App() {
    return (
        <AuthProvider>
            <DashboardDataProvider>
                <Router>
                    <TutorialProvider>
                        <Routes>
                            {/* Auth - Público */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/entrar-na-igreja" element={<SelectChurchPage />} />
                            <Route path="/criar-igreja" element={<CreateChurchPage />} />
                            <Route path="/super-admin" element={<SuperAdminPage />} />
                            <Route path="/aguardando-aprovacao" element={<AwaitingApprovalPage />} />
                            <Route path="/convite/:inviteId" element={<InviteLandingPage />} />

                            {/* Admin/Pastor - Dashboard Completo */}
                            <Route path="/" element={<RootRedirect />} />

                            <Route path="/dashboard" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe']}>
                                    <DashboardPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/membros" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'pastor_lider']}>
                                    <MembrosPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/visitantes" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'pastor_lider']}>
                                    <VisitantesPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/grupos" element={
                                <ProtectedRoute>
                                    <ProfileGate>
                                        <GruposPage />
                                    </ProfileGate>
                                </ProtectedRoute>
                            } />

                            <Route path="/eventos" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'pastor_lider']}>
                                    <EventosPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/escalas" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'pastor_lider', 'lider']}>
                                    <MemberAgendaPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/financeiro" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'financeiro']}>
                                    <FinanceiroPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/ministerios" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'pastor_lider', 'lider']}>
                                    <MinisteriosPage />
                                </ProtectedRoute>
                            } />

                            <Route path="/lider/comunicacao" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'pastor_lider', 'lider']}>
                                    <ComunicacaoPage />
                                </ProtectedRoute>
                            } />



                            <Route path="/biblia" element={
                                <ProtectedRoute>
                                    <DashboardLayout>
                                        <BiblePage />
                                    </DashboardLayout>
                                </ProtectedRoute>
                            } />

                            <Route path="/jornal" element={
                                <ProtectedRoute requiredRoles={['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro']}>
                                    <DashboardLayout>
                                        <JornalContent hideCheckin={true} />
                                    </DashboardLayout>
                                </ProtectedRoute>
                            } />

                            <Route path="/perfil" element={
                                <ProtectedRoute>
                                    <MemberProfilePage />
                                </ProtectedRoute>
                            } />




                            {/* ÁREA DO MEMBRO (Portal Mobile-First) */}
                            <Route path="/membro" element={
                                <ProtectedRoute>
                                    <MemberHomePage />
                                </ProtectedRoute>
                            } />
                            <Route path="/membro/agenda" element={
                                <ProtectedRoute>
                                    <ProfileGate>
                                        <MemberAgendaPage />
                                    </ProfileGate>
                                </ProtectedRoute>
                            } />
                            <Route path="/membro/perfil" element={
                                <ProtectedRoute>
                                    <MemberProfilePage />
                                </ProtectedRoute>
                            } />
                            <Route path="/membro/checkin" element={
                                <ProtectedRoute>
                                    <ProfileGate>
                                        <MemberCheckinPage />
                                    </ProfileGate>
                                </ProtectedRoute>
                            } />
                            <Route path="/membro/estudos" element={
                                <ProtectedRoute>
                                    <ProfileGate>
                                        <MemberStudiesPage />
                                    </ProfileGate>
                                </ProtectedRoute>
                            } />

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </TutorialProvider>
                </Router>
            </DashboardDataProvider>
        </AuthProvider>
    );
}
