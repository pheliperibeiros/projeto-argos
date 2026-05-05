import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, Mail } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import '../Login/Login.css'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const { register } = useAuthStore()
    const navigate = useNavigate()

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!email || !username || !password) return

        setLoading(true)
        setError('')

        try {
            await register(email, username, password)
            setSuccess(true)
            setTimeout(() => {
                navigate('/dashboard')
            }, 1000)
        } catch (e: any) {
            setError(e.message || 'Falha ao criar conta')
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
                        <h1 className="login-title">CRIAR CONTA</h1>
                    </div>
                </header>

                <div className="login-divider"></div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="error-message" style={{ backgroundColor: 'rgba(46, 160, 67, 0.1)', color: '#3fb950', border: '1px solid rgba(46, 160, 67, 0.4)' }}>Conta criada com sucesso!</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <Mail className="input-icon" />
                        <input
                            type="email"
                            placeholder="E-mail"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <User className="input-icon" />
                        <input
                            type="text"
                            placeholder="Nome de Usuário"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
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
                        disabled={loading || success}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Criando...
                            </>
                        ) : (
                            'Criar Conta'
                        )}
                    </button>

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <button
                            type="button"
                            className="text-muted"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                            onClick={() => navigate('/login')}
                        >
                            Já possui conta? Fazer login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
