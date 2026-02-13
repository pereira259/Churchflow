import { supabase } from './supabase';

// Types
export interface PastoralNote {
    id: string;
    member_id: string;
    author_id: string;
    church_id: string;
    type: 'visita' | 'aconselhamento' | 'oracao' | 'alerta' | 'observacao' | 'follow_up';
    content: string;
    tags: string[];
    is_private: boolean;
    follow_up_date: string | null;
    completed: boolean;
    created_at: string;
    // Joined
    members?: { full_name: string; photo_url: string | null };
    author?: { full_name: string };
}

export interface PastoralAlert {
    id: string;
    member_id: string;
    church_id: string;
    type: 'inatividade' | 'sobrecarga' | 'aniversario' | 'retorno' | 'novo_convertido' | 'follow_up_pendente';
    title: string;
    description: string | null;
    suggested_action: string | null;
    suggested_message: string | null;
    severity: 'low' | 'medium' | 'high' | 'critical';
    is_read: boolean;
    is_actioned: boolean;
    created_at: string;
    // Joined
    members?: { full_name: string; phone: string | null; photo_url: string | null };
}

// Note type config
export const NOTE_TYPES = {
    visita: { label: 'Visita', icon: '🏠', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    aconselhamento: { label: 'Aconselhamento', icon: '💬', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    oracao: { label: 'Pedido de Oração', icon: '🙏', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    alerta: { label: 'Alerta', icon: '⚠️', color: 'bg-red-50 text-red-600 border-red-100' },
    observacao: { label: 'Observação', icon: '📝', color: 'bg-slate-50 text-slate-600 border-slate-100' },
    follow_up: { label: 'Follow-up', icon: '🔄', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
} as const;

export const ALERT_SEVERITY = {
    low: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
    medium: { label: 'Média', color: 'bg-amber-100 text-amber-700' },
    high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
    critical: { label: 'Crítica', color: 'bg-red-100 text-red-700' }
} as const;

// CRUD Operations
export async function getPastoralNotes(memberId: string) {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    return supabase
        .from('pastoral_notes')
        .select('*, members:member_id(full_name, photo_url)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });
}

export async function createPastoralNote(note: {
    member_id: string;
    author_id: string;
    church_id: string;
    type: string;
    content: string;
    tags?: string[];
    is_private?: boolean;
    follow_up_date?: string | null;
}) {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    return supabase.from('pastoral_notes').insert(note).select().single();
}

export async function updatePastoralNote(id: string, updates: Partial<PastoralNote>) {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    return supabase.from('pastoral_notes').update(updates).eq('id', id).select().single();
}

export async function deletePastoralNote(id: string) {
    if (!supabase) return { error: 'Supabase not initialized' };
    return supabase.from('pastoral_notes').delete().eq('id', id);
}

// Alerts
export async function getPastoralAlerts(churchId: string, onlyUnread = false) {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    let query = supabase
        .from('pastoral_alerts')
        .select('*, members:member_id(full_name, phone, photo_url)')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (onlyUnread) query = query.eq('is_read', false);
    return query;
}

export async function markAlertRead(id: string) {
    if (!supabase) return { error: 'Supabase not initialized' };
    return supabase.from('pastoral_alerts').update({ is_read: true }).eq('id', id);
}

export async function markAlertActioned(id: string) {
    if (!supabase) return { error: 'Supabase not initialized' };
    return supabase.from('pastoral_alerts').update({ is_actioned: true, is_read: true }).eq('id', id);
}

export async function dismissAlert(id: string) {
    if (!supabase) return { error: 'Supabase not initialized' };
    return supabase.from('pastoral_alerts').delete().eq('id', id);
}

// ================================
// PASTORAL ENGINE: Pattern Detection
// ================================

interface MemberData {
    id: string;
    full_name: string;
    phone: string | null;
    photo_url: string | null;
    birth_date: string | null;
    status: string;
    joining_date: string | null;
    created_at: string;
    ministry: string | null;
}

interface CheckinData {
    member_id: string;
    checked_in_at: string;
}

export async function runPastoralEngine(churchId: string) {
    if (!supabase) return;

    // Fetch all needed data
    const [membersRes, checkinsRes, existingAlertsRes, notesRes] = await Promise.all([
        supabase.from('members').select('id, full_name, phone, photo_url, birth_date, status, joining_date, created_at, ministry').eq('church_id', churchId).eq('status', 'membro'),
        supabase.from('event_checkins').select('member_id, checked_in_at').eq('church_id', churchId).gte('checked_in_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('pastoral_alerts').select('member_id, type').eq('church_id', churchId).eq('is_read', false),
        supabase.from('pastoral_notes').select('member_id, follow_up_date, completed').eq('church_id', churchId).eq('completed', false).not('follow_up_date', 'is', null)
    ]);

    const members: MemberData[] = membersRes.data || [];
    const checkins: CheckinData[] = checkinsRes.data || [];
    const existingAlerts = existingAlertsRes.data || [];
    const pendingFollowUps = notesRes.data || [];

    // Build lookup maps
    const existingAlertKeys = new Set(existingAlerts.map(a => `${a.member_id}:${a.type}`));
    const alertsToCreate: Omit<PastoralAlert, 'id' | 'created_at' | 'members'>[] = [];

    const now = new Date();

    // Group checkins by member
    const lastCheckinMap = new Map<string, Date>();
    for (const ci of checkins) {
        const date = new Date(ci.checked_in_at);
        const existing = lastCheckinMap.get(ci.member_id);
        if (!existing || date > existing) {
            lastCheckinMap.set(ci.member_id, date);
        }
    }

    for (const member of members) {
        // 1. INACTIVITY DETECTION
        const lastCheckin = lastCheckinMap.get(member.id);
        const daysSinceCheckin = lastCheckin
            ? Math.floor((now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        if (daysSinceCheckin !== null && daysSinceCheckin >= 21 && !existingAlertKeys.has(`${member.id}:inatividade`)) {
            const severity = daysSinceCheckin >= 45 ? 'critical' : daysSinceCheckin >= 30 ? 'high' : 'medium';
            const firstName = member.full_name.split(' ')[0];
            alertsToCreate.push({
                member_id: member.id,
                church_id: churchId,
                type: 'inatividade',
                title: `${firstName} está ausente há ${daysSinceCheckin} dias`,
                description: `Último check-in: ${lastCheckin!.toLocaleDateString('pt-BR')}. Antes disso, participava regularmente.`,
                suggested_action: 'Enviar mensagem de carinho e saber como está',
                suggested_message: `Olá ${firstName}! Sentimos sua falta nos nossos encontros. Está tudo bem? Queremos saber como você está. Um abraço! 🙏`,
                severity,
                is_read: false,
                is_actioned: false
            });
        }

        // 2. BIRTHDAY DETECTION (next 7 days)
        if (member.birth_date && !existingAlertKeys.has(`${member.id}:aniversario`)) {
            const birth = new Date(member.birth_date + 'T12:00:00');
            const thisYearBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
            const daysUntil = Math.floor((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntil >= 0 && daysUntil <= 7) {
                const firstName = member.full_name.split(' ')[0];
                const dateStr = thisYearBday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                alertsToCreate.push({
                    member_id: member.id,
                    church_id: churchId,
                    type: 'aniversario',
                    title: daysUntil === 0 ? `Hoje é aniversário de ${firstName}! 🎂` : `${firstName} faz aniversário em ${daysUntil} dia${daysUntil > 1 ? 's' : ''} (${dateStr})`,
                    description: null,
                    suggested_action: 'Enviar parabéns e reconhecer no culto',
                    suggested_message: `Feliz aniversário, ${firstName}! 🎉🎂 Que Deus continue abençoando sua vida abundantemente! Você é muito especial para nossa igreja! 🙏✨`,
                    severity: 'low',
                    is_read: false,
                    is_actioned: false
                });
            }
        }

        // 3. NEW CONVERT DETECTION (joined in last 30 days)
        if (member.joining_date && !existingAlertKeys.has(`${member.id}:novo_convertido`)) {
            const joiningDate = new Date(member.joining_date);
            const daysSinceJoin = Math.floor((now.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceJoin >= 0 && daysSinceJoin <= 30) {
                const firstName = member.full_name.split(' ')[0];
                alertsToCreate.push({
                    member_id: member.id,
                    church_id: churchId,
                    type: 'novo_convertido',
                    title: `${firstName} é novo(a) na igreja (${daysSinceJoin} dias)`,
                    description: `Entrou em ${joiningDate.toLocaleDateString('pt-BR')}. É importante acompanhar a integração.`,
                    suggested_action: 'Conectar com um grupo e designar acompanhamento',
                    suggested_message: `Olá ${firstName}! Como você está se sentindo na nossa igreja? Queremos te ajudar a se sentir em casa! Posso te indicar um grupo legal? 😊`,
                    severity: 'medium',
                    is_read: false,
                    is_actioned: false
                });
            }
        }
    }

    // 4. FOLLOW-UP DETECTION (overdue)
    const today = now.toISOString().split('T')[0];
    for (const note of pendingFollowUps) {
        if (note.follow_up_date && note.follow_up_date <= today && !existingAlertKeys.has(`${note.member_id}:follow_up_pendente`)) {
            const member = members.find(m => m.id === note.member_id);
            if (member) {
                const firstName = member.full_name.split(' ')[0];
                alertsToCreate.push({
                    member_id: note.member_id,
                    church_id: churchId,
                    type: 'follow_up_pendente',
                    title: `Follow-up pendente com ${firstName}`,
                    description: `Acompanhamento agendado para ${new Date(note.follow_up_date + 'T12:00:00').toLocaleDateString('pt-BR')} ainda não foi concluído.`,
                    suggested_action: 'Completar o acompanhamento agendado',
                    suggested_message: null,
                    severity: 'high',
                    is_read: false,
                    is_actioned: false
                });
            }
        }
    }

    // Insert alerts in batch
    if (alertsToCreate.length > 0) {
        await supabase.from('pastoral_alerts').insert(alertsToCreate);
    }

    return alertsToCreate.length;
}

// Generate weekly pastoral summary
export function generatePastoralSummary(alerts: PastoralAlert[]) {
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const high = alerts.filter(a => a.severity === 'high').length;
    const inactive = alerts.filter(a => a.type === 'inatividade').length;
    const birthdays = alerts.filter(a => a.type === 'aniversario').length;
    const newMembers = alerts.filter(a => a.type === 'novo_convertido').length;
    const followUps = alerts.filter(a => a.type === 'follow_up_pendente').length;

    const parts: string[] = [];
    if (critical > 0) parts.push(`⚠️ ${critical} alerta${critical > 1 ? 's' : ''} crítico${critical > 1 ? 's' : ''}`);
    if (inactive > 0) parts.push(`📉 ${inactive} membro${inactive > 1 ? 's' : ''} ausente${inactive > 1 ? 's' : ''}`);
    if (birthdays > 0) parts.push(`🎂 ${birthdays} aniversário${birthdays > 1 ? 's' : ''} próximo${birthdays > 1 ? 's' : ''}`);
    if (newMembers > 0) parts.push(`🌱 ${newMembers} novo${newMembers > 1 ? 's' : ''} membro${newMembers > 1 ? 's' : ''}`);
    if (followUps > 0) parts.push(`🔄 ${followUps} follow-up${followUps > 1 ? 's' : ''} pendente${followUps > 1 ? 's' : ''}`);

    return {
        total: alerts.length,
        critical,
        high,
        summary: parts.length > 0 ? parts.join(' · ') : '✅ Tudo tranquilo esta semana!'
    };
}
