import React from 'react'

export interface Column<TData> {
    header: string
    accessor: keyof TData | ((row: TData) => React.ReactNode)
    width?: string
}

interface DataTableProps<TData> {
    columns: Column<TData>[]
    data: TData[]
    onRowClick?: (row: TData) => void
}

export function DataTable<TData>({ columns, data, onRowClick }: DataTableProps<TData>) {
    return (
        <div className="data-table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th key={index} style={{ width: column.width }}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={onRowClick ? 'clickable' : ''}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((column, colIndex) => (
                                    <td key={colIndex}>
                                        {typeof column.accessor === 'function'
                                            ? column.accessor(row)
                                            : (row[column.accessor] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                Nenhum registro encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
