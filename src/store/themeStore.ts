import { create } from 'zustand'

interface ThemeState {
    theme: 'dark' | 'light'
    setTheme: (theme: 'dark' | 'light') => void
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: (localStorage.getItem('argos-theme') as 'dark' | 'light') || 'dark',
    setTheme: (theme) => {
        localStorage.setItem('argos-theme', theme)
        set({ theme })
    }
}))
