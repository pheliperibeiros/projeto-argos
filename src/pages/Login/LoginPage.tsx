import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import './Login.css'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login } = useAuthStore()
    const navigate = useNavigate()

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
        if (e.key === 'Enter') {
            handleSubmit()
        }
    }

    return (
        <div className="login-container">
            <div className="login-grid"></div>

            <div className="login-card">
                <header className="login-header">
                    <div className="login-logo-container">
                        {/* Símbolo de mira SVG inline em #F78166 */}
                        <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#F78166"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="22" y1="12" x2="18" y2="12" />
                            <line x1="6" y1="12" x2="2" y2="12" />
                            <line x1="12" y1="6" x2="12" y2="2" />
                            <line x1="12" y1="22" x2="12" y2="18" />
                        </svg>
                        <h1 className="login-title">ARGOS</h1>
                    </div>
                    <p className="login-subtitle">Hub Gerencial Estratégico · GAECO</p>
                </header>

                <div className="login-divider"></div>

                {error && <div className="error-message">{error}</div>}

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
                            type={showPassword ? "text" : "password"}
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

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <button
                            type="button"
                            className="text-muted"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                            onClick={() => navigate('/register')}
                        >
                            Sem conta? Criar conta
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
