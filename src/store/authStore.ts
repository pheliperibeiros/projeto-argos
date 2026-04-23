import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/auth'

interface AuthState {
    user: UserProfile | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (username: string, password: string) => Promise<void>
    register: (email: string, username: string, password: string) => Promise<void>
    logout: () => Promise<void>
    init: () => Promise<void>
}

async function fetchProfile(userId: string, email: string): Promise<UserProfile | null> {
    const { data } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', userId)
        .single()
    if (!data) return null
    return { ...data, email } as UserProfile
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    init: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                const profile = await fetchProfile(session.user.id, session.user.email!)
                if (profile) {
                    set({ user: profile, isAuthenticated: true, isLoading: false })
                } else {
                    // Usuário autenticado mas sem perfil — logout para evitar estado inválido
                    await supabase.auth.signOut()
                    set({ user: null, isAuthenticated: false, isLoading: false })
                }
            } else {
                set({ isLoading: false })
            }
        } catch {
            // Qualquer erro na init (ex: rede) não deve travar o app em loading infinito
            set({ isLoading: false })
        }

        // Escuta mudanças de sessão (expiração, logout em outra aba)
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                set({ user: null, isAuthenticated: false, isLoading: false })
            } else if (event === 'SIGNED_IN' && session.user) {
                const profile = await fetchProfile(session.user.id, session.user.email!)
                if (profile) {
                    set({ user: profile, isAuthenticated: true, isLoading: false })
                }
            } else if (event === 'TOKEN_REFRESHED' && session.user) {
                // Sessão renovada — mantém estado atual, não precisa rebuscar perfil
                set({ isLoading: false })
            }
        })
    },

    register: async (email, username, password) => {
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: username.toLowerCase() } }
        })
        if (signUpError) throw new Error(signUpError.message || 'Erro ao criar conta')

        // Se email auto-confirm estiver ativo, a sessão já existe após signUp
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            const profile = await fetchProfile(session.user.id, session.user.email!)
            if (profile) {
                set({ user: profile, isAuthenticated: true, isLoading: false })
            }
        }
    },

    login: async (username, password) => {
        const normalizedUsername = username.toLowerCase().trim()

        // RPC SECURITY DEFINER — não é bloqueada por RLS
        const { data, error: rpcError } = await supabase
            .rpc('get_email_by_username', { p_username: normalizedUsername })

        const email = data as unknown as string

        if (rpcError || !email)
            throw new Error('Usuário não encontrado')

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

        if (signInError) {
            if (signInError.message.includes('Invalid login credentials'))
                throw new Error('Credenciais inválidas')
            throw new Error(signInError.message)
        }

        // Agora que estamos autenticados, o RLS permite buscar o perfil completo
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, role')
            .eq('username', normalizedUsername)
            .single()

        set({
            user: { ...profile, email } as UserProfile,
            isAuthenticated: true,
            isLoading: false,
        })
    },

    logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false, isLoading: false })
    },
}))
