import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ChevronRight } from 'lucide-react'

export function Topbar() {
    const { user } = useAuthStore()
    const location = useLocation()

    const pathnames = location.pathname.split('/').filter((x) => x)

    const getRoleClass = (role?: string) => {
        switch (role) {
            case 'COORDENADOR': return 'coordenador'
            case 'ANALISTA':
            case 'PROMOTOR': return 'promotor'
            case 'AGENTE': return 'agente'
            default: return ''
        }
    }

    return (
        <header className="topbar">
            <div className="breadcrumb">
                <span className="breadcrumb-item font-argos">Argos</span>
                {pathnames.map((name, index) => {
                    const isLast = index === pathnames.length - 1
                    return (
                        <React.Fragment key={name}>
                            <ChevronRight size={14} className="breadcrumb-separator" />
                            <span className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
                                {name.replace(/-/g, ' ')}
                            </span>
                        </React.Fragment>
                    )
                })}
            </div>

            <div className="topbar-right">
                <div className={`role-badge ${getRoleClass(user?.role)}`}>
                    {user?.role}
                </div>
                <div className="topbar-username">{user?.username}</div>
            </div>
        </header>
    )
}
