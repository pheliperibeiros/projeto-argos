import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Search,
    FolderOpen,
    ShieldAlert,
    FileBarChart,
    Upload,
    LogOut,
    Settings
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { Topbar } from './Topbar'
import { ConfiguracoesModal } from '../ConfiguracoesModal'
import './Layout.css'

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuthStore()
    const { theme } = useThemeStore()
    const navigate = useNavigate()
    const [isConfigOpen, setIsConfigOpen] = React.useState(false)

    // Sincroniza o atributo do DOM com o estado do tema
    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/busca', icon: Search, label: 'Busca' },
        { to: '/casos', icon: FolderOpen, label: 'Casos' },
        { to: '/cautelares', icon: ShieldAlert, label: 'Cautelares' },
        { to: '/importacao', icon: Upload, label: 'Importação' },
        { to: '/relatorios', icon: FileBarChart, label: 'Relatórios' },
    ]

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
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
                        <span className="sidebar-logo-text">ARGOS</span>
                    </div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-username">{user?.username}</span>
                        <span className="sidebar-userrole">{user?.role?.toLowerCase()}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-button" style={{ marginBottom: '8px' }} onClick={() => setIsConfigOpen(true)}>
                        <Settings size={18} />
                        <span>Configurações</span>
                    </button>
                    <button className="logout-button" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            <ConfiguracoesModal open={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

            {/* Main Content Area */}
            <main className="main-area">
                <Topbar />
                <div className="content-area">
                    {children}
                </div>
            </main>
        </div>
    )
}
