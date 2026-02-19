import { supabase } from './supabase';

type AuditAction = 'LOGIN' | 'LOGOUT' | 'SIGNUP' | 'MFA_VERIFY' | 'CREATE_MEMBER' | 'DELETE_MEMBER' | 'UPDATE_MEMBER' | 'FINANCIAL_Create' | 'FINANCIAL_DELETE';
type AuditEntity = 'USER' | 'MEMBER' | 'TRANSACTION' | 'MINISTRY' | 'GROUP';

/**
 * Logs a security or business critical event to the audit_logs table.
 * This function fails silently to not disrupt the user experience, but logs errors to console.
 */
export async function logSecurityEvent(
    action: AuditAction,
    entity: AuditEntity,
    entityId?: string,
    details?: Record<string, any>
) {
    if (!supabase) return;

    try {
        const { error } = await supabase.rpc('log_activity', {
            p_action: action,
            p_entity: entity,
            p_entity_id: entityId || 'N/A',
            p_details: details || {}
        });

        if (error) {
            console.error('[SECURITY_LOG] Failed to log event:', error);
        }
    } catch (err) {
        console.error('[SECURITY_LOG] Unexpected error:', err);
    }
}
