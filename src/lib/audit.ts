import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export async function registrarAudit(
    acao: string,
    entidade: string,
    entidade_id?: string
) {
    const user = useAuthStore.getState().user
    if (!user) return

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
