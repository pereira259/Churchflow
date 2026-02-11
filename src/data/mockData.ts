import { DashboardStats, Member, Visitor, Group } from '@/types';

export const mockDashboardStats: DashboardStats = {
    totalMembers: 342,
    totalVisitors: 28,
    activeGroups: 12,
    monthlyGiving: 45230.50,
    membersTrend: 5.2,
    visitorsTrend: 12.5,
    groupsTrend: 0,
    givingTrend: 8.3,
};

export const mockMembers: Member[] = [
    {
        id: 1,
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '(11) 98765-4321',
        status: 'active',
        joinDate: '2023-01-15',
    },
    {
        id: 2,
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '(11) 98765-4322',
        status: 'active',
        joinDate: '2023-02-20',
    },
    {
        id: 3,
        name: 'Pedro Oliveira',
        email: 'pedro.oliveira@email.com',
        phone: '(11) 98765-4323',
        status: 'active',
        joinDate: '2023-03-10',
    },
];

export const mockVisitors: Visitor[] = [
    {
        id: 1,
        name: 'Ana Costa',
        visitDate: '2024-01-07',
        contactInfo: '(11) 91234-5678',
        followedUp: false,
    },
    {
        id: 2,
        name: 'Carlos Mendes',
        visitDate: '2024-01-07',
        contactInfo: '(11) 91234-5679',
        followedUp: true,
    },
    {
        id: 3,
        name: 'Beatriz Lima',
        visitDate: '2024-01-06',
        contactInfo: '(11) 91234-5680',
        followedUp: false,
    },
];

export const mockGroups: Group[] = [
    {
        id: 1,
        name: 'Grupo de Jovens',
        category: 'Jovens',
        memberCount: 45,
        leader: 'Lucas Ferreira',
    },
    {
        id: 2,
        name: 'Ministério de Louvor',
        category: 'Música',
        memberCount: 18,
        leader: 'Juliana Alves',
    },
    {
        id: 3,
        name: 'Escola Bíblica',
        category: 'Ensino',
        memberCount: 67,
        leader: 'Roberto Souza',
    },
];
