export interface DashboardStats {
    totalMembers: number;
    totalVisitors: number;
    activeGroups: number;
    monthlyGiving: number;
    membersTrend: number;
    visitorsTrend: number;
    groupsTrend: number;
    givingTrend: number;
}

export interface Member {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive';
    joinDate: string;
}

export interface Visitor {
    id: number;
    name: string;
    visitDate: string;
    contactInfo: string;
    followedUp: boolean;
}

export interface Group {
    id: number;
    name: string;
    category: string;
    memberCount: number;
    leader: string;
}
