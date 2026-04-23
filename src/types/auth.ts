export type RoleUsuario = 'PROMOTOR' | 'AGENTE' | 'COORDENADOR' | 'ANALISTA'

export interface UserProfile {
    id: string
    username: string
    role: RoleUsuario
    email: string
}
