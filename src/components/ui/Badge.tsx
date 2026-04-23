interface BadgeProps {
    children: React.ReactNode
    variant?: 'red' | 'blue' | 'green' | 'orange' | 'gray'
    className?: string
}

import React from 'react'

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
    const variantClass = {
        red: 'badge badge-red',
        blue: 'badge badge-blue',
        green: 'badge badge-green',
        orange: 'badge badge-orange',
        gray: 'badge badge-gray',
    }[variant]

    return (
        <span className={`${variantClass} ${className}`}>
            {children}
        </span>
    )
}
