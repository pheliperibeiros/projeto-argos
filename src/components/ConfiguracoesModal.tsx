import { X, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

interface Props {
    open: boolean
    onClose: () => void
}

export function ConfiguracoesModal({ open, onClose }: Props) {
    const { theme, setTheme } = useThemeStore()

    if (!open) return null

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div className="modal-card" style={{
                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '12px', width: '400px', padding: '24px', position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, right: 16, background: 'none',
                    border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                }}>
                    <X size={20} />
                </button>

                <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Configurações do Sistema</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tema da Interface</label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            backgroundColor: 'var(--bg-primary)',
                            padding: '4px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <button
                                onClick={() => setTheme('dark')}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    backgroundColor: theme === 'dark' ? 'var(--bg-secondary)' : 'transparent',
                                    border: 'none',
                                    color: theme === 'dark' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                    fontWeight: theme === 'dark' ? 600 : 400
                                }}
                            >
                                <Moon size={16} /> Escuro
                            </button>
                            <button
                                onClick={() => setTheme('light')}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    backgroundColor: theme === 'light' ? 'var(--bg-secondary)' : 'transparent',
                                    border: 'none',
                                    color: theme === 'light' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                    fontWeight: theme === 'light' ? 600 : 400
                                }}
                            >
                                <Sun size={16} /> Claro
                            </button>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
                            ARGOS v2.4.0 • Modern Intelligence System
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
