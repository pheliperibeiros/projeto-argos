import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { isSheetsMode } from '@/lib/env'

export async function registrarAudit(
    acao: string,
    entidade: string,
    entidade_id?: string
) {
    const user = useAuthStore.getState().user
    if (!user) return

    if (isSheetsMode) {
        console.log(`[AUDIT] Ação: ${acao} | Entidade: ${entidade} | ID: ${entidade_id} | Usuário: ${user.username}`)
        try {
            const logs = JSON.parse(localStorage.getItem('argos_audit_logs') || '[]')
            logs.push({
                timestamp: new Date().toISOString(),
                user_id: user.id,
                username: user.username,
                acao,
                entidade,
                entidade_id
            })
            localStorage.setItem('argos_audit_logs', JSON.stringify(logs.slice(-100)))
        } catch (e) {
            console.error('[AUDIT] Falha ao gravar auditoria local:', e)
        }
        return
    }

    // Fire-and-forget — não bloqueia a UX
    setTimeout(() => {
        supabase.functions.invoke('audit-log', {
            body: {
                user_id: user.id,
                username: user.username,
                acao,
                entidade,
                entidade_id
            }
        }).catch(err => {
            console.warn('Erro ao registrar audit (background):', err)
        })
    }, 0)
}

