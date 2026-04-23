import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

function FullPageSpinner() {
    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0D1117'
        }}>
            <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
    )
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore()

    if (isLoading) return <FullPageSpinner />
    if (!isAuthenticated) return <Navigate to="/login" replace />

    return <>{children}</>
}
