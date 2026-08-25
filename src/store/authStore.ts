import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/auth'
import { isSheetsMode } from '@/lib/env'

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
        if (isSheetsMode) {
            try {
                const saved = localStorage.getItem('argos_session')
                if (saved) {
                    const user = JSON.parse(saved)
                    set({ user, isAuthenticated: true, isLoading: false })
                    return
                }
            } catch {
                localStorage.removeItem('argos_session')
            }
            set({ user: null, isAuthenticated: false, isLoading: false })
            return
        }

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
        if (isSheetsMode) {
            const user: UserProfile = {
                id: 'mock-user-' + Math.random().toString(36).substring(2, 9),
                username: username.toLowerCase().trim(),
                email,
                role: 'admin' as any
            }
            localStorage.setItem('argos_session', JSON.stringify(user))
            set({ user, isAuthenticated: true, isLoading: false })
            return
        }

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

        if (isSheetsMode) {
            const user: UserProfile = {
                id: 'mock-user-id',
                username: normalizedUsername,
                email: `${normalizedUsername}@gaeco.mp.br`,
                role: 'admin' as any
            }
            localStorage.setItem('argos_session', JSON.stringify(user))
            set({ user, isAuthenticated: true, isLoading: false })
            return
        }

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
        if (isSheetsMode) {
            localStorage.removeItem('argos_session')
            set({ user: null, isAuthenticated: false, isLoading: false })
            return
        }

        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false, isLoading: false })
    },
}))

