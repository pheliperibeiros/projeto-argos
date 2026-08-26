import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/auth'
import { isSheetsMode, env } from '@/lib/env'
import { sheetsClient } from '@/lib/googleSheetsClient'
import { signInWithGooglePopup } from '@/lib/googleAuth'

interface AuthState {
    user: UserProfile | null
    isAuthenticated: boolean
    isLoading: boolean
    loginWithGoogle: () => Promise<void>      // Sheets mode: OAuth Google
    login: (username: string, password: string) => Promise<void>  // Supabase mode (legado)
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
                    await supabase.auth.signOut()
                    set({ user: null, isAuthenticated: false, isLoading: false })
                }
            } else {
                set({ isLoading: false })
            }
        } catch {
            set({ isLoading: false })
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                set({ user: null, isAuthenticated: false, isLoading: false })
            } else if (event === 'SIGNED_IN' && session.user) {
                const profile = await fetchProfile(session.user.id, session.user.email!)
                if (profile) {
                    set({ user: profile, isAuthenticated: true, isLoading: false })
                }
            } else if (event === 'TOKEN_REFRESHED' && session.user) {
                set({ isLoading: false })
            }
        })
    },

    // ─── Sheets Mode: Login com Google OAuth2 ───────────────────────────────
    loginWithGoogle: async () => {
        const clientId = env.VITE_GOOGLE_CLIENT_ID
        if (!clientId) {
            throw new Error('VITE_GOOGLE_CLIENT_ID não está configurada. Configure no .env.local ou nas variáveis de ambiente do Netlify.')
        }

        // 1. Abre popup e obtém info do usuário Google
        const googleUser = await signInWithGooglePopup(clientId)

        // 2. Verifica se o e-mail está na lista de usuários autorizados (planilha aba: profiles)
        const profile = await sheetsClient.auth.verificarUsuarioPorEmail(googleUser.email)

        if (!profile) {
            throw new Error(
                `Acesso negado. A conta "${googleUser.email}" não está autorizada a acessar o sistema.\n` +
                'Solicite ao administrador que adicione seu e-mail na planilha de usuários.'
            )
        }

        // 3. Mapeia role da planilha para o tipo esperado pelo sistema
        const roleMap: Record<string, string> = {
            'Administrador': 'COORDENADOR',
            'COORDENADOR': 'COORDENADOR',
            'Promotor': 'PROMOTOR',
            'PROMOTOR': 'PROMOTOR',
            'Analista': 'ANALISTA',
            'ANALISTA': 'ANALISTA',
            'Agente': 'AGENTE',
            'AGENTE': 'AGENTE',
        }

        const user: UserProfile = {
            id: googleUser.sub,
            username: profile.username || googleUser.name,
            email: googleUser.email,
            role: (roleMap[profile.role] || 'ANALISTA') as UserProfile['role'],
        }

        localStorage.setItem('argos_session', JSON.stringify(user))
        set({ user, isAuthenticated: true, isLoading: false })
    },

    // ─── Supabase Mode: Login legado (usuário + senha) ───────────────────────
    register: async (email, username, password) => {
        if (isSheetsMode) {
            // No modo Sheets, novos usuários são adicionados diretamente na planilha pelo admin
            throw new Error('No modo Google Sheets, o cadastro de usuários é feito diretamente na planilha (aba: profiles) pelo administrador.')
        }

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: username.toLowerCase() } }
        })
        if (signUpError) throw new Error(signUpError.message || 'Erro ao criar conta')

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
            throw new Error('Use o botão "Entrar com Google" para autenticar no sistema.')
        }

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
