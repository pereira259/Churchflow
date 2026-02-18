import { supabase } from './supabase';

const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// TIPOS
// ============================================

export interface Member {
    id: string;
    church_id: string;
    user_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    status: 'visitante' | 'interessado' | 'membro' | 'inativo';
    ministry?: string; // Legacy support
    ministries_ids?: string[]; // New Support
    church_role?: string;
    birth_date?: string;
    gender?: string;
    address?: string;
    photo_url?: string;
    joining_date?: string;
    tags?: string[];
    notes?: string;
    has_small_group?: boolean;
    is_discipled?: boolean;
    small_group_id?: string;
    discipled_by_id?: string;
    groups?: { name: string }; // Join
    discipled_by?: { full_name: string }; // Join
    created_at: string;
}

export interface Ministry {
    id: string;
    church_id: string;
    name: string;
    description?: string;
    members_count?: number;
    color?: string;
    leader?: string;
    next_event?: string;
}

export interface Event {
    id: string;
    church_id: string;
    title: string;
    description?: string;
    event_type: string;
    start_date: string;
    location?: string;
    capacity?: number;
    price?: number;
    image_url?: string;
    preacher?: string;
}

export interface EventRegistration {
    id: string;
    event_id: string;
    member_id: string;
    status: 'pendente' | 'confirmado' | 'cancelado';
    payment_status: 'pendente' | 'pago' | 'isento';
    created_at: string;
    members?: Member;
}

// ============================================
// MEMBERS CRUD
// ============================================

export async function getMembers(churchId?: string) {
    if (!supabase) return { data: [], error: null };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!churchId) {
        return { data: [], error: null };
    }

    let query = supabase
        .from('members')
        .select(`
            *,
            groups (name),
            discipled_by:discipled_by_id (full_name)
        `)
        .order('full_name', { ascending: true });

    query = query.eq('church_id', churchId);

    const { data, error } = await query;
    return { data: data as Member[] || [], error };
}

// ... (getMemberById, createMember, etc. unchanged)

// ============================================
// MINISTRIES
// ============================================

// ... (addMemberToMinistry etc unchanged)

export async function getMinistries(churchId?: string) {
    if (!supabase) return { data: [], error: null };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!churchId) {
        return { data: [], error: null };
    }

    let query = supabase
        .from('ministries')
        .select('*')
        .order('name', { ascending: true });

    query = query.eq('church_id', churchId);

    const { data, error } = await query;
    return { data: data as Ministry[] || [], error };
}

// ... (getMinistryMembers etc unchanged)

// ============================================
// GROUPS
// ============================================

// ... (interfaces etc unchanged)

export async function getGroups(churchId?: string) {
    if (!supabase) return { data: [], error: null };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!churchId) {
        return { data: [], error: null };
    }

    let query = supabase
        .from('groups')
        .select(`
            *,
            members (
                id,
                photo_url,
                full_name
            )
        `)
        .order('name', { ascending: true });

    query = query.eq('church_id', churchId);

    const { data, error } = await query;
    return { data: data as Group[] || [], error };
}

// ... (createGroup etc unchanged)

/**
 * Retorna eventos futuros filtraveis por tipo
 */
export async function getUpcomingEventsFiltered(days: number = 7, type?: string, churchId?: string) {
    if (!supabase) return { data: [], error: null };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!churchId) {
        return { data: [], error: null };
    }

    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);

    let query = supabase
        .from('events')
        .select('*')
        .gte('start_date', today.toISOString())
        .lte('start_date', future.toISOString())
        .order('start_date', { ascending: true });

    query = query.eq('church_id', churchId);

    if (type) {
        query = query.eq('event_type', type);
    }

    const { data, error } = await query;
    return { data: data as Event[] || [], error };
}

// ============================================
// COST CENTERS (CENTROS DE CUSTO)
// ============================================

// ... (interfaces)

export async function getCostCenters(churchId?: string) {
    if (!supabase) return { data: [], error: null };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!churchId) {
        return { data: [], error: null };
    }

    let query = supabase
        .from('cost_centers')
        .select('*')
        .order('name', { ascending: true });

    query = query.eq('church_id', churchId);

    const { data, error } = await query;
    return { data: data as CostCenter[] || [], error };
}

export async function getMemberById(id: string) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

    return { data: data as Member | null, error };
}

export async function createMember(member: Omit<Member, 'id' | 'created_at'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('members')
        .insert(member)
        .select()
        .single();

    return { data: data as Member | null, error };
}

export async function updateMember(id: string, updates: Partial<Member>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data: data as Member | null, error };
}

export async function deleteMember(id: string) {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

    return { error };
}

// ============================================
// SYSTEM PERMISSIONS
// ============================================

export async function updateMemberSystemRole(memberId: string, newRole: string) {
    if (!supabase) return { error: { message: 'Supabase client not initialized' } };

    // 1. Get member to find linked user_id
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select('user_id, full_name')
        .eq('id', memberId)
        .single();

    if (memberError || !member) return { error: memberError || { message: 'Member not found' } };

    // 2. Map system roles to nice display names
    const roleDisplayMap: Record<string, string> = {
        'admin': 'Admin',
        'pastor_chefe': 'Pastor Chefe',
        'pastor_lider': 'Pastor Líder',
        'lider': 'Líder',
        'financeiro': 'Financeiro',
        'membro': 'Membro',
        'visitante': 'Visitante'
    };

    // 3. Update Visual Label in members table (ALWAYS do this)
    const { error: updateMemberError } = await supabase
        .from('members')
        .update({ church_role: roleDisplayMap[newRole] || newRole })
        .eq('id', memberId);

    if (updateMemberError) return { error: updateMemberError };

    // 4. Update Role in public.users (Auth Profile) IF linked
    let targetUserId = member.user_id;

    // AUTO-LINK: If member has no user_id, try to find a user with the same email
    if (!targetUserId) {
        // Fetch member email first (current select only gets user_id, full_name)
        const { data: fullMember } = await supabase
            .from('members')
            .select('email')
            .eq('id', memberId)
            .single();

        if (fullMember?.email) {
            const { data: matchingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', fullMember.email)
                .single();

            if (matchingUser) {
                targetUserId = matchingUser.id;
                // Save the link for future reference
                await supabase.from('members').update({ user_id: targetUserId }).eq('id', memberId);
            }
        }
    }

    if (targetUserId) {
        const { error: userError } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', targetUserId);

        if (userError) {
            console.error("Failed to update system user role:", userError);
            return { error: userError };
        }
        return { data: true, error: null };
    } else {
        // Warning: Role updated visually, but no system access grant possible (User account doesn't exist yet)
        return {
            data: true,
            error: null,
            warning: 'Cargo visual atualizado! Porém, este membro ainda não criou uma Conta de Acesso (Login) no sistema, ou o email do cadastro não corresponde ao email da conta.'
        };
    }
}

// ============================================
// MINISTRIES
// ============================================

export async function addMemberToMinistry(memberId: string, ministryId: string) {
    if (!supabase) return { error: null };

    // 1. Get current member to see existing ids
    const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('ministries_ids')
        .eq('id', memberId)
        .single();

    if (fetchError || !member) return { error: fetchError };

    // 2. Add if not exists
    const currentIds = member.ministries_ids || [];
    if (!currentIds.includes(ministryId)) {
        const newIds = [...currentIds, ministryId];
        return await updateMember(memberId, { ministries_ids: newIds });
    }

    return { data: null, error: null };
}

export async function removeMemberFromMinistry(memberId: string, ministryId: string) {
    if (!supabase) return { error: null };

    const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('ministries_ids')
        .eq('id', memberId)
        .single();

    if (fetchError || !member) return { error: fetchError };

    const currentIds = member.ministries_ids || [];
    const newIds = currentIds.filter((id: string) => id !== ministryId);

    return await updateMember(memberId, { ministries_ids: newIds });
}



export async function getMinistryMembers(ministryId: string) {
    if (!supabase) return { data: [], error: null };

    const { data, error } = await supabase
        .from('members')
        .select('id, full_name, photo_url')
        .contains('ministries_ids', [ministryId]); // Ensure database has this array column and correct type

    return { data: data || [], error };
}

export async function createMinistry(ministry: Omit<Ministry, 'id'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('ministries')
        .insert([ministry])
        .select()
        .single();

    return { data, error };
}

export async function updateMinistry(id: string, updates: Partial<Ministry>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('ministries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function deleteMinistry(id: string) {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('ministries')
        .delete()
        .eq('id', id);

    return { error };
}

// ============================================
// GROUPS
// ============================================

export interface Group {
    id: string;
    church_id: string;
    name: string;
    created_by?: string;
    leader?: string;
    leader_phone?: string;
    day?: string;
    time?: string;
    location?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    gallery_urls?: string[];
    created_at: string;
    members?: { id: string; photo_url?: string; full_name: string; }[];
}



export async function createGroup(group: Omit<Group, 'id' | 'created_at'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('groups')
        .insert(group)
        .select()
        .single();

    return { data: data as Group | null, error };
}

export async function updateGroup(id: string, updates: Partial<Group>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data: data as Group | null, error };
}

export async function deleteGroup(id: string) {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

    return { error };
}

// ============================================
// EVENTS
// ============================================

export async function getEvents(churchId?: string, startDate?: string) {
    if (!supabase) return { data: [], error: null };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!churchId) {
        return { data: [], error: null };
    }

    let query = supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

    query = query.eq('church_id', churchId);

    if (startDate) {
        query = query.gte('start_date', startDate);
    }

    const { data, error } = await query.limit(500);
    return { data: data as Event[] || [], error };
}

// Optimized fetch: Only future events
export async function getEventsAfter(churchId: string, date: Date) {
    if (!supabase) return { data: [], error: null };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!churchId) {
        return { data: [], error: null };
    }

    let query = supabase
        .from('events')
        .select('*')
        .gte('start_date', date.toISOString())
        .order('start_date', { ascending: true });

    query = query.eq('church_id', churchId);

    const { data, error } = await query.limit(20);
    return { data: data as Event[] || [], error };
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();

    return { data: data as Event | null, error };
}

export async function updateEvent(id: string, updates: Partial<Event>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data: data as Event | null, error };
}

export async function deleteEvent(id: string) {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

    return { error };
}

// ============================================
// EVENT REGISTRATIONS
// ============================================

// export async function getRegistrations(churchId: string) {
export async function getRegistrations(eventIds?: string[]) {
    if (!supabase) return { data: [], error: null };

    let query = supabase
        .from('event_registrations')
        .select(`
            *,
            members (full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

    if (eventIds && eventIds.length > 0) {
        query = query.in('event_id', eventIds);
    }

    // Note: Church filtering would happen here if event_registrations had church_id
    // Since it refers to events which have church_id, we could join or filter by events.church_id
    // For simplicity with the current schema:
    const { data, error } = await query;
    return { data: data as any[] || [], error };
}

export async function getRegistrationsByEvent(eventId: string) {
    if (!supabase) return { data: [], error: null };

    const { data, error } = await supabase
        .from('event_registrations')
        .select(`
            *,
            members (full_name, email, phone)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

    return { data: data as any[] || [], error };
}

export async function getMemberRegistrations(userId: string, churchId: string) {
    if (!supabase) return { data: [], error: null };

    // Find member_id
    const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', userId)
        .eq('church_id', churchId)
        .single();

    if (!memberData) return { data: [], error: null };

    const { data, error } = await supabase
        .from('event_registrations')
        .select(`
            *,
            events (*)
        `)
        .eq('member_id', memberData.id)
        .order('created_at', { ascending: false });

    return { data: data as any[] || [], error };
}

export async function createRegistration(registration: Omit<EventRegistration, 'id' | 'created_at'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('event_registrations')
        .insert(registration)
        .select()
        .single();

    return { data: data as EventRegistration | null, error };
}

export async function updateRegistrationStatus(id: string, updates: Partial<EventRegistration>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('event_registrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data: data as EventRegistration | null, error };
}

// ============================================
// STATS
// ============================================

export async function getMemberStats(churchId?: string) {
    if (!supabase) return { total: 0, visitantes: 0, membros: 0, inativos: 0 };

    const { data } = await getMembers(churchId);

    const stats = {
        total: data.length,
        visitantes: data.filter(m => m.status === 'visitante').length,
        interessados: data.filter(m => m.status === 'interessado').length,
        membros: data.filter(m => m.status === 'membro').length,
        inativos: data.filter(m => m.status === 'inativo').length,
    };

    return stats;
}

/**
 * Retorna aniversariantes dos próximos X dias
 */
export async function getUpcomingBirthdays(days: number = 7, churchId?: string) {
    if (!supabase) return { data: [], error: null };

    // Como comparar datas de aniversário (ignorando o ano) é complexo em SQL puro via Supabase client sem RPC,
    // vamos buscar os membros que têm data de nascimento e filtrar no JS para maior precisão e simplicidade inicial.
    let query = supabase
        .from('members')
        .select('full_name, birth_date')
        .not('birth_date', 'is', null);

    if (churchId) {
        query = query.eq('church_id', churchId);
    }

    const { data: members, error } = await query;

    if (error || !members) return { data: [], error };

    const today = new Date();
    const upcoming = members.filter((m: any) => {
        if (!m.birth_date) return false;
        const bday = new Date(m.birth_date);

        // Criar data do niver NESTE ano
        const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

        // Se já passou este ano, vira o ano
        if (thisYearBday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            thisYearBday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = thisYearBday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= days;
    });

    return { data: upcoming, error: null };
}

/**
 * Retorna eventos futuros filtraveis por tipo
 */


// ============================================
// COST CENTERS (CENTROS DE CUSTO)
// ============================================

export interface CostCenter {
    id: string;
    church_id: string;
    name: string;
    responsible_id?: string;
    budget_yearly?: number;
    created_at: string;
}



export async function createCostCenter(costCenter: Omit<CostCenter, 'id' | 'created_at'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('cost_centers')
        .insert(costCenter)
        .select()
        .single();

    return { data: data as CostCenter | null, error };
}

// ============================================
// TRANSACTIONS & FINANCE
// ============================================

export interface Transaction {
    id: string;
    church_id: string;
    description: string;
    amount: number;
    type: string; // 'Dízimo', 'Oferta', etc.
    flow: 'in' | 'out'; // Derived helper, not always in DB if distinct
    category: string; // Used for payment method in legacy
    date: string;
    payment_method: string;
    cost_center_id?: string;
    beneficiary?: string; // Optional: Who paid or who received
    member_id?: string; // Link to member if applicable
    status?: string;
    created_at: string;
}

export interface TransactionFilter {
    churchId?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    cost_center_id?: string;
    limit?: number;
    page?: number;
    search?: string;
}

export async function getTransactions(filters: TransactionFilter) {
    if (!supabase) return { data: [], error: null, count: 0 };

    // STRICT: Returns empty if no churchId provided to prevent leakage
    if (!filters.churchId) {
        console.warn('getTransactions called without churchId - returning empty to prevent leak');
        return { data: [], error: null, count: 0 };
    }

    let query = supabase
        .from('transactions')
        .select('*, cost_centers(name), members(id, full_name, photo_url)', { count: 'exact' });

    query = query.eq('church_id', filters.churchId);

    if (filters.type) query = query.eq('type', filters.type);
    if (filters.cost_center_id) query = query.eq('cost_center_id', filters.cost_center_id);

    if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,beneficiary.ilike.%${filters.search}%`);
    }

    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);

    query = query.order('date', { ascending: false });

    if (filters.limit) {
        const from = (filters.page || 0) * filters.limit;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
    }

    const { data, error, count } = await query;
    return { data: data as any[] || [], error, count };
}

export async function createTransaction(transaction: Partial<Transaction>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

    return { data: data as Transaction | null, error };
}

export async function getFinancialMetrics(churchId: string, month: number, year: number, costCenterId?: string) {
    if (!churchId) return null;

    // Definir intervalo do mês
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // 1. Saldo Atual (Total acumulado desde sempre)
    // Nota: Idealmente seria uma tabela de 'balances' snapshot, mas faremos sum(all)
    let balanceQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('church_id', churchId);

    if (costCenterId) balanceQuery = balanceQuery.eq('cost_center_id', costCenterId);

    const { data: allData } = await balanceQuery;
    const balance = allData?.reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0;

    // 2. Métricas do Mês (Entradas e Saídas)
    let monthQuery = supabase
        .from('transactions')
        .select('amount, type')
        .eq('church_id', churchId)
        .gte('date', startDate)
        .lte('date', endDate);

    if (costCenterId) monthQuery = monthQuery.eq('cost_center_id', costCenterId);

    const { data: monthData } = await monthQuery;
    const income = monthData?.filter((t: any) => t.amount > 0).reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0;
    const expense = monthData?.filter((t: any) => t.amount < 0).reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount)), 0) || 0;
    const giving = monthData?.filter((t: any) => t.type === 'Dízimo' || t.description?.toLowerCase().includes('dízimo')).reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0;

    // 3. Comparativo com mês anterior (Simples)
    const prevMonthStart = new Date(year, month - 2, 1).toISOString().split('T')[0];
    const prevMonthEnd = new Date(year, month - 1, 0).toISOString().split('T')[0];

    let prevQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('church_id', churchId)
        .gte('date', prevMonthStart)
        .lte('date', prevMonthEnd);

    if (costCenterId) prevQuery = prevQuery.eq('cost_center_id', costCenterId);

    const { data: prevData } = await prevQuery;

    const prevIncome = prevData?.filter((t: any) => t.amount > 0).reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0;
    const prevExpense = prevData?.filter((t: any) => t.amount < 0).reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount)), 0) || 0;

    return {
        balance,
        income,
        expense,
        giving,
        variationIncome: prevIncome === 0 ? 0 : ((income - prevIncome) / prevIncome) * 100,
        variationExpense: prevExpense === 0 ? 0 : ((expense - prevExpense) / prevExpense) * 100
    };
}

export async function getFinancialDailyTrends(days: number = 7, churchId?: string) {
    if (!supabase) return { data: [], error: null };

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    let query = supabase
        .from('transactions')
        .select('amount, date')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])
        .gt('amount', 0); // Apenas entradas (arrecadação)

    if (churchId) {
        query = query.eq('church_id', churchId);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (!data) return { data: [], error };

    // Agrupar por data
    const grouped = data.reduce((acc: any, curr: any) => {
        const date = curr.date;
        if (!acc[date]) acc[date] = 0;
        acc[date] += Number(curr.amount);
        return acc;
    }, {});

    const result = Object.entries(grouped).map(([dateStr, amount]) => ({
        date: dateStr,
        amount: amount as number
    }));

    return { data: result, error };
}



export async function getDailyFinancialMovement(churchId: string = DEFAULT_CHURCH_ID, costCenterId?: string) {
    if (!supabase) return { data: [], error: null };

    // Calcular Segunda-feira da semana atual
    const now = new Date();
    const day = now.getDay(); // 0 (Dom) a 6 (Sáb)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    // Final da semana (Domingo)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Helper para formatar data local YYYY-MM-DD
    const formatDate = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    };

    let query = supabase
        .from('transactions')
        .select('amount, date, type')
        .eq('church_id', churchId)
        .gte('date', formatDate(monday))
        .lte('date', formatDate(sunday))
        .order('date', { ascending: true });

    if (costCenterId) {
        query = query.eq('cost_center_id', costCenterId);
    }

    const { data, error } = await query;

    if (!data) return { data: [], error };

    // Agrupar por data (IN e OUT)
    const grouped = data.reduce((acc: any, curr: any) => {
        const date = curr.date.substring(0, 10);
        if (!acc[date]) acc[date] = { in: 0, out: 0 };
        if (Number(curr.amount) > 0) acc[date].in += Number(curr.amount);
        else acc[date].out += Math.abs(Number(curr.amount));
        return acc;
    }, {});

    // Gerar os 7 dias da semana (Segunda a Domingo)
    const result = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = formatDate(d);

        result.push({
            date: dateStr,
            in: grouped[dateStr]?.in || 0,
            out: grouped[dateStr]?.out || 0
        });
    }

    return { data: result, error };
}

export async function getMonthlyFlow(churchId: string, year: number, costCenterId?: string) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
        .from('transactions')
        .select('date, amount')
        .eq('church_id', churchId)
        .gte('date', startDate)
        .lte('date', endDate);

    if (costCenterId) query = query.eq('cost_center_id', costCenterId);

    const { data } = await query;

    if (!data) return [];

    // Agrupar por mês (0-11)
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        income: 0,
        expense: 0
    }));

    data.forEach((t: any) => {
        // const date = new Date(t.date); // Unused
        // Ajuste de timezone simples: pega o mês da string ou usa UTC
        // Como 'date' é YYYY-MM-DD, new Date() pode dar offset. Melhor usar split.
        const monthIndex = parseInt(t.date.split('-')[1]) - 1;

        if (monthIndex >= 0 && monthIndex < 12) {
            if (t.amount > 0) monthlyData[monthIndex].income += Number(t.amount);
            else monthlyData[monthIndex].expense += Math.abs(Number(t.amount));
        }
    });

    return monthlyData;
}

export async function deleteTransaction(id: string) {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    return { error };
}

export async function getEventRoles() {
    // TODO: In the future, this should come from a 'roles' or 'ministry_settings' table
    return [
        { id: 'som', label: 'Som' },
        { id: 'louvor', label: 'Louvor' },
        { id: 'projecao', label: 'Projeção' },
        { id: 'recepcao', label: 'Recepção' },
        { id: 'seguranca', label: 'Segurança' },
        { id: 'infantil', label: 'Infantil' },
        { id: 'midia', label: 'Mídia' },
        { id: 'transmissao', label: 'Transmissão' },
        { id: 'teatro', label: 'Teatro' },
        { id: 'danca', label: 'Dança' }
    ];
}

// ============================================
// SCHEDULES (ESCALAS)
// ============================================

export interface Schedule {
    id: string;
    church_id: string;
    event_id: string;
    member_id: string;
    role: string;
    status: 'pendente' | 'confirmado' | 'recusado';
    created_at: string;
    events?: Event; // Join
    members?: Member; // Join
}

export async function getSchedules(churchId?: string, startDate?: string, endDate?: string) {
    if (!supabase) return { data: [], error: null };

    // Note: To filter by joined table column (events.start_date), we need !inner join if we want to RESTRICT rows
    // based on that filter.
    let query = supabase
        .from('schedules')
        .select(`
            *,
            events!inner (title, start_date, event_type),
            members (full_name, photo_url)
        `)
        .order('created_at', { ascending: false });

    if (churchId) {
        query = query.eq('church_id', churchId);
    }

    if (startDate) {
        query = query.gte('events.start_date', startDate);
    }

    if (endDate) {
        query = query.lte('events.start_date', endDate);
    }

    const { data, error } = await query;
    return { data: data as any[] || [], error };
}

// Optimized fetch: Schedules for a specific USER (via members.user_id)
export async function getMemberSchedulesByUserId(userId: string, churchId: string) {
    if (!supabase) return { data: [], error: null };

    // Step 1: Find member_id for this user
    const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', userId)
        .eq('church_id', churchId)
        .single();

    if (memberError || !memberData) {
        console.log('[SCHEDULES] No member found for user:', userId);
        return { data: [], error: memberError };
    }

    // Step 2: Fetch schedules for this member
    const { data, error } = await supabase
        .from('schedules')
        .select(`
            *,
            events (title, start_date, event_type),
            members (full_name, photo_url)
        `)
        .eq('member_id', memberData.id)
        .order('created_at', { ascending: false });

    return { data: data as any[] || [], error };
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface NotificationInput {
    church_id: string;
    user_id: string;
    type: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
}

export async function createNotification(input: NotificationInput) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('notifications')
        .insert(input)
        .select()
        .single();

    return { data, error };
}

export async function createSchedule(schedule: Omit<Schedule, 'id' | 'created_at'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('schedules')
        .insert(schedule)
        .select()
        .single();

    // Auto-create notification for the assigned member
    if (data && !error) {
        try {
            // Get member's user_id and event title
            const { data: member } = await supabase
                .from('members')
                .select('user_id, full_name')
                .eq('id', schedule.member_id)
                .single();

            const { data: event } = await supabase
                .from('events')
                .select('title')
                .eq('id', schedule.event_id)
                .single();

            if (member?.user_id) {
                await createNotification({
                    church_id: schedule.church_id,
                    user_id: member.user_id,
                    type: 'escala',
                    title: 'Nova Escala',
                    description: `Você foi escalado para "${event?.title || 'Evento'}" como ${schedule.role || 'Voluntário'}.`,
                    metadata: { schedule_id: data.id, event_title: event?.title },
                });
            }
        } catch { /* notification is best-effort */ }
    }

    return { data: data as Schedule | null, error };
}

export async function deleteSchedule(id: string) {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

    return { error };
}

export async function checkScheduleConflict(memberId: string, eventDate: string) {
    if (!supabase) return { hasConflict: false, conflictingEvent: null };

    // 1. Busca todos os agendamentos desse membro
    const { data: schedules } = await supabase
        .from('schedules')
        .select(`
            id,
            event_id,
            events (
                title,
                start_date
            )
        `)
        .eq('member_id', memberId);

    if (!schedules) return { hasConflict: false, conflictingEvent: null };

    // 2. Verifica se algum evento bate com a data/hora alvo (Margem de 2 horas)
    const targetTime = new Date(eventDate).getTime();
    const MARGIN_MS = 2 * 60 * 60 * 1000; // 2 horas

    const conflict = schedules.find((s: any) => {
        if (!s.events) return false;
        const eventTime = new Date(s.events.start_date).getTime();
        const diff = Math.abs(eventTime - targetTime);
        return diff < MARGIN_MS; // Conflito se for menos de 2h de diferença
    });

    if (conflict) {
        return {
            hasConflict: true,
            conflictingEvent: (conflict as any).events?.title
        };
    }

    return { hasConflict: false, conflictingEvent: null };
}

export async function updateScheduleStatus(id: string, status: 'confirmado' | 'recusado') {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('schedules')
        .update({ status })
        .eq('id', id);

    return { error };
}
// ============================================
// NEWS (ÚLTIMAS DO REINO)
// ============================================

export interface News {
    id: string;
    church_id: string;
    title: string;
    content: string;
    category: 'Geral' | 'Aviso' | 'Evento' | 'Devocional' | 'Fotos';
    image_url?: string;
    gallery_urls?: string[];
    important: boolean;
    created_at: string;
}

export async function getNews(churchId?: string) {
    if (!supabase) return { data: [], error: null };

    let query = supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

    if (churchId) {
        if (churchId === DEFAULT_CHURCH_ID) {
            query = query.eq('church_id', churchId);
        } else {
            query = query.or(`church_id.eq.${churchId},church_id.eq.${DEFAULT_CHURCH_ID}`);
        }
    }

    const { data, error } = await query;
    return { data: data as News[] || [], error };
}

export async function deleteNews(id: string) {
    if (!supabase) return { error: null };

    const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

    return { error };
}

export async function updateNews(id: string, updates: Partial<News>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('news')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function createNews(news: Omit<News, 'id' | 'created_at'>) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('news')
        .insert([news])
        .select()
        .single();

    return { data, error };
}

// ============================================
// TIMELINE / HISTÓRICO
// ============================================

export async function getMemberTimeline(memberId: string) {
    if (!supabase) return { data: [], error: null };

    // 1. Buscar Inscrições em Eventos
    const { data: regs } = await supabase
        .from('event_registrations')
        .select(`
            id,
            status,
            created_at,
            events (title, start_date)
        `)
        .eq('member_id', memberId);

    // 2. Buscar Escalas
    const { data: schedules } = await supabase
        .from('schedules')
        .select(`
            id,
            role,
            status,
            created_at,
            events (title, start_date)
        `)
        .eq('member_id', memberId);

    // 3. Consolidar e formatar para a Timeline
    const timeline = [
        ...(regs || []).map((r: any) => ({
            id: r.id,
            type: 'registration',
            title: 'Inscrição em Evento',
            description: `Inscrito em: ${r.events?.title}`,
            date: r.created_at,
            status: r.status,
            icon: 'calendar'
        })),
        ...(schedules || []).map((s: any) => ({
            id: s.id,
            type: 'schedule',
            title: 'Escala de Ministério',
            description: `${s.role} em: ${s.events?.title}`,
            date: s.created_at,
            status: s.status,
            icon: 'clock'
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { data: timeline, error: null };
}

export async function getChurchSettings(churchId: string) {
    if (!supabase) return { data: null, error: null };

    const { data, error } = await supabase
        .from('churches')
        .select('id, name, pix_key, bank_info, pix_keys')
        .eq('id', churchId)
        .single();

    return { data, error };
}
