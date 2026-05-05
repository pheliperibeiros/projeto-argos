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
import { Topbar } from './Topbar'
import { ConfiguracoesModal } from '../ConfiguracoesModal'
import './Layout.css'

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()
    const [isConfigOpen, setIsConfigOpen] = React.useState(false)

    // O tema agora é sincronizado no App.tsx

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
