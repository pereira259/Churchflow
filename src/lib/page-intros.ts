import {
    TrendingUp,
    Users,
    Calendar,
    DollarSign,
    Search,
    Bell,
    Music,
    Newspaper,
    QrCode
} from 'lucide-react';

export interface PageIntroConfig {
    id: string;
    title: string;
    description: string;
    features: { icon: any; label: string; description: string }[];
}

export const PAGE_INTROS: Record<string, PageIntroConfig> = {
    '/': {
        id: 'dashboard',
        title: 'Visão Geral',
        description: 'O pulsar da sua igreja em um único painel. Métricas reais para decisões espirituais.',
        features: [
            { icon: TrendingUp, label: 'Métricas Vivas', description: 'Acompanhe crescimento, frequência e saúde da igreja.' },
            { icon: Bell, label: 'Alertas IA', description: 'Insights inteligentes sobre membros ausentes ou novos visitantes.' },
            { icon: Newspaper, label: 'Central do Reino', description: 'Avisos e notícias importantes em destaque.' }
        ]
    },
    '/financeiro': {
        id: 'financeiro',
        title: 'Tesouraria',
        description: 'Gestão santa e transparente. Organize dízimos, ofertas e investimentos com facilidade.',
        features: [
            { icon: DollarSign, label: 'Fluxo de Caixa', description: 'Visibilidade total de entradas e saídas em tempo real.' },
            { icon: TrendingUp, label: 'Análise de Saúde', description: 'Gráficos de evolução financeira e comparativos mensais.' },
            { icon: Calendar, label: 'Planejamento', description: 'Controle de pagamentos recorrentes e centros de custo.' }
        ]
    },
    '/membro/agenda': {
        id: 'agenda',
        title: 'Agenda do Reino',
        description: 'Nunca perca um culto ou escala. Sua vida ministerial organizada e conectada.',
        features: [
            { icon: Calendar, label: 'Escalas Vivas', description: 'Veja onde você serve hoje e confirme sua presença.' },
            { icon: QrCode, label: 'Check-in Rápido', description: 'Agilize sua entrada com o Smart Check-in via QR.' },
            { icon: Music, label: 'Programação', description: 'Detalhes de cultos, eventos sociais e ensaios.' }
        ]
    },
    '/membros': {
        id: 'membros',
        title: 'Gestão de Ovelhas',
        description: 'Cuide melhor de cada pessoa. Informações completas para um pastoreio eficaz.',
        features: [
            { icon: Users, label: 'Cuidado Individual', description: 'Histórico, família e evolução ministerial de cada membro.' },
            { icon: Search, label: 'Filtros Inteligentes', description: 'Encontre grupos específicos por dons, idade ou região.' },
            { icon: QrCode, label: 'Digital IDs', description: 'Cartão de membro digital para acesso e identificação.' }
        ]
    }
};
