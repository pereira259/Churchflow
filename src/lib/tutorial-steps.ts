// import { DriveStep } from "driver.js";
type DriveStep = any; // Temporary for MVP

// Definição personalizada para garantir tipagem se necessário,
// mas driver.js jsdoc geralmente é suficiente.

export const TUTORIAL_THEME = {
    animate: true,
    opacity: 0.85,
    padding: 12,
    allowClose: true,
    overlayClickNext: false,
    doneBtnText: 'Concluir ✨',
    closeBtnText: 'Pular',
    stageBackground: '#ffffff',
    nextBtnText: 'Próximo →',
    prevBtnText: '← Anterior',
    popoverClass: 'churchflow-premium-tour'
};

export const GLOBAL_ONBOARDING_STEPS: DriveStep[] = [
    {
        element: '#sidebar-logo',
        popover: {
            title: '✨ Bem-vindo ao ChurchFlow',
            description: 'Sua jornada no Reino agora é digital. Preparamos este tour rápido para você dominar sua nova plataforma.',
            side: "right",
            align: 'start'
        }
    },
    {
        element: '#nav-group-hub',
        popover: {
            title: '📰 Central do Membro',
            description: 'Acesse o Jornal, Bíblia e seus principais painéis. Dica: Clique no ícone para alternar entre as funções ou passe o mouse para ver o menu!',
            side: "right",
            align: 'start'
        }
    },
    {
        element: '#nav-group-people',
        popover: {
            title: '👥 Relacionamento',
            description: 'Aqui você se conecta com seus grupos, células e equipe. A igreja é feita de pessoas!',
            side: "right",
            align: 'start'
        }
    },
    {
        element: '#nav-group-ops',
        popover: {
            title: '⚡ Operações e Escalas',
            description: 'Gerencie seu serviço, confira a agenda da igreja e faça seu Check-in rápido via QR Code.',
            side: "right",
            align: 'start'
        }
    },
    {
        element: '#user-profile-btn',
        popover: {
            title: '👤 Seu Espaço',
            description: 'Mantenha seus dados atualizados e gerencie suas preferências pessoais no seu perfil.',
            side: "right",
            align: 'start'
        }
    }
];

export const LIDER_ONBOARDING_STEPS: DriveStep[] = [
    {
        element: '#nav-group-hub',
        popover: {
            title: '🌟 Nova Autonomia: Liderança',
            description: 'Como Líder, você agora tem acesso ao "Painel do Líder" e ferramentas de comunicação com sua equipe.',
            side: "right",
            align: 'start'
        }
    },
    {
        element: '#nav-group-people',
        popover: {
            title: '📋 Gestão de Equipe',
            description: 'Você pode visualizar e cuidar de cada membro da sua equipe diretamente por aqui.',
            side: "right",
            align: 'start'
        }
    }
];

export const FINANCEIRO_ONBOARDING_STEPS: DriveStep[] = [
    {
        element: '#nav-group-finance',
        popover: {
            title: 'Gestão Financeira',
            description: 'Acesso rápido à tesouraria, fluxo de caixa e relatórios de dízimos e ofertas.',
            side: "right",
            align: 'start'
        }
    }
];
