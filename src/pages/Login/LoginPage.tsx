import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { isSheetsMode } from '@/lib/env'
import './Login.css'

// Ícone SVG do Google
function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    )
}

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login, loginWithGoogle } = useAuthStore()
    const navigate = useNavigate()

    // ── Login com Google (modo Sheets) ──────────────────────────────────────
    const handleGoogleLogin = async () => {
        setLoading(true)
        setError('')
        try {
            await loginWithGoogle()
            navigate('/dashboard')
        } catch (e: any) {
            setError(e.message || 'Falha na autenticação com Google')
        } finally {
            setLoading(false)
        }
    }

    // ── Login com usuário/senha (modo Supabase legado) ────────────────────
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!username || !password) return

        setLoading(true)
        setError('')

        try {
            await login(username, password)
            navigate('/dashboard')
        } catch (e: any) {
            setError(e.message || 'Falha na autenticação')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit()
    }

    return (
        <div className="login-container">
            <div className="login-grid"></div>

            <div className="login-card">
                <header className="login-header">
                    <div className="login-logo-container">
                        <img src="/logo_login.png" alt="Argos Logo" className="login-logo-img" />
                        <h1 className="login-title">ARGOS</h1>
                    </div>
                    <p className="login-subtitle">Hub Gerencial Estratégico · GAECO</p>
                </header>

                <div className="login-divider"></div>

                {error && (
                    <div className="error-message" style={{ whiteSpace: 'pre-line' }}>
                        {error}
                    </div>
                )}

                {/* ── Modo Sheets: somente botão Google ── */}
                {isSheetsMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            id="btn-google-login"
                            className="google-login-button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    Autenticando...
                                </>
                            ) : (
                                <>
                                    <GoogleIcon />
                                    Entrar com Google
                                </>
                            )}
                        </button>

                        <p style={{
                            textAlign: 'center',
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            marginTop: '8px',
                            letterSpacing: '0.5px'
                        }}>
                            Somente contas autorizadas pelo administrador podem acessar o sistema.
                        </p>
                    </div>
                ) : (
                    /* ── Modo Supabase: formulário usuário/senha ── */
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <User className="input-icon" />
                            <input
                                type="text"
                                placeholder="Usuário"
                                className="input-field"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <Lock className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Senha"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    Autenticando...
                                </>
                            ) : (
                                'Autenticar'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
