import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { JornalContent } from '@/components/JornalContent';
import { useEffect } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';

export function MemberHomePage() {
    const { startShowcase } = useTutorial();

    useEffect(() => {
        const isTourPending = localStorage.getItem('tour_pending_jornal');
        if (isTourPending) {
            localStorage.removeItem('tour_pending_jornal');

            // Give a moment for the page to render fully
            setTimeout(() => {
                startShowcase([
                    // Intro
                    {
                        target: '#tour-event-cards', // Focus on the main visual first
                        title: 'Central do Membro',
                        description: 'Bem-vindo à sua Central. Aqui é o coração da nossa comunidade digital.',
                        duration: 4000
                    },
                    // Events
                    {
                        target: '#tour-event-cards',
                        title: 'Eventos & Agenda',
                        description: 'Acompanhe todos os cultos e eventos. Inscreva-se e participe ativamente.',
                        duration: 5000
                    },
                    // Contribution
                    {
                        target: '#tour-contribution-btn',
                        title: 'Dízimos & Ofertas',
                        description: 'Fidelidade simplificada. Contribua com segurança e transparência.',
                        duration: 5000
                    },
                    // Groups
                    {
                        target: '#tour-group-btn',
                        title: 'Pequenos Grupos',
                        description: 'Não caminhe sozinho. Encontre uma célula e fortaleça sua comunhão.',
                        duration: 5000
                    },
                    // News
                    {
                        target: '#tour-news-tabs',
                        title: 'Mural do Reino',
                        description: 'Fique por dentro de tudo: Avisos, Devocionais e Galerias de Fotos.',
                        duration: 5000
                    }
                ]);
            }, 800);
        }
    }, []);

    return (
        <DashboardLayout>
            <JornalContent hideCheckin={true} />
        </DashboardLayout>
    );
}
