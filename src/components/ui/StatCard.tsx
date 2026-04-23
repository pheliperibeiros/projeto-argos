import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
    label: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <span className="stat-card-label">{label}</span>
                <div className="stat-card-icon">
                    <Icon size={18} />
                </div>
            </div>
            <div className="stat-card-value">{value}</div>
            {trend && (
                <div className={`stat-card-trend ${trend.isPositive ? 'trend-up' : 'trend-down'}`}>
                    {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{trend.isPositive ? '+' : '-'}{trend.value}% vs mês anterior</span>
                </div>
            )}
        </div>
    )
}
