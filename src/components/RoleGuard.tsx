import React from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'

export function RoleGuard({ feature, children }: { feature: string; children: React.ReactNode }) {
    const { can } = usePermission()

    if (!can(feature)) return <Navigate to="/dashboard" replace />

    return <>{children}</>
}
