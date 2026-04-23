import { useAuthStore } from '@/store/authStore'

type Permission = 'editar-caso' | 'visualizar-relatorios' | 'admin'

export function usePermission() {
    const { user } = useAuthStore()

    const can = (permission: Permission): boolean => {
        if (!user) return false

        const role = user.role as string

        // Admin / Coordenador pode tudo
        if (role === 'COORDENADOR') return true

        switch (permission) {
            case 'editar-caso':
                return role === 'PROMOTOR' || role === 'ANALISTA' || role === 'COORDENADOR'
            case 'visualizar-relatorios':
                return role === 'PROMOTOR' || role === 'ANALISTA' || role === 'COORDENADOR'
            default:
                return false
        }
    }

    return { can }
}
