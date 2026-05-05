import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2, Plus, Trash2, FolderOpen } from 'lucide-react'
import { dbCasos } from '@/lib/db/casos'
import { registrarAudit } from '@/lib/audit'
import { usePermission } from '@/hooks/usePermission'
import { DataTable, PageHeader } from '@/components'
import toast from 'react-hot-toast'

export default function CasosListPage() {
    const navigate = useNavigate()
    const { can } = usePermission()
    const queryClient = useQueryClient()

    const [casoToDelete, setCasoToDelete] = useState<any>(null)

    const { data: casos = [], isLoading } = useQuery({
        queryKey: ['casos'],
        queryFn: dbCasos.listar
    })

    const excluirMutation = useMutation({
        mutationFn: (id: string) => dbCasos.excluir(id),
        onSuccess: (_, id) => {
            registrarAudit('EXCLUIR_CASO', 'casos', id)
            toast.success('Caso excluído')
            queryClient.invalidateQueries({ queryKey: ['casos'] })
            setCasoToDelete(null)
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao excluir caso')
        }
    })

    // Colunas refatoradas
    const columns = [
        { header: 'Codinome', accessor: 'codinome' },
        {
            header: 'E-Proc',
            accessor: (row: any) => (
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px' }}>
                    {row.eProc || '-'}
                </span>
            )
        },
        {
            header: 'Integrar-E',
            accessor: (row: any) => (
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px' }}>
                    {row.integrarE || '-'}
                </span>
            )
        },
        {
            header: 'Investigados',
            accessor: (row: any) => (
                <span style={{
                    backgroundColor: 'rgba(88, 166, 255, 0.15)',
                    color: '#58A6FF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600
                }}>
                    {row.totalInvestigados || 0}
                </span>
            )
        },
        {
            header: 'Tags',
            accessor: (row: any) => {
                const tagsArray = Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags ?? '[]')
                return (
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {tagsArray.slice(0, 3).map((tag: string) => (
                            <span key={tag} style={{
                                backgroundColor: 'var(--border-color)',
                                color: 'var(--text-secondary)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px'
                            }}>{tag}</span>
                        ))}
                        {tagsArray.length > 3 && (
                            <span style={{
                                backgroundColor: 'var(--border-color)',
                                color: 'var(--text-secondary)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px'
                            }}>+{tagsArray.length - 3}</span>
                        )}
                    </div>
                )
            }
        },
        {
            header: 'Cautelares',
            accessor: (row: any) => {
                const isActive = row.cautelaresAtivas > 0
                return (
                    <span style={{
                        backgroundColor: isActive ? 'rgba(210, 153, 34, 0.15)' : 'var(--border-color)',
                        color: isActive ? '#D29922' : 'var(--text-secondary)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600
                    }}>
                        {row.cautelaresAtivas || 0}
                    </span>
                )
            }
        },
        {
            header: 'Ações',
            accessor: (row: any) => (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate('/casos/' + row.id)
                        }}
                        style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}
                        title="Editar"
                    >
                        <Edit2 size={16} />
                    </button>
                    {can('admin') && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setCasoToDelete(row)
                            }}
                            style={{ background: 'none', border: 'none', color: '#F85149', cursor: 'pointer' }}
                            title="Excluir"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )
        },
    ]

    return (
        <div className="flex flex-col gap-6" style={{ position: 'relative' }}>
            <PageHeader
                title="Casos"
                subtitle="Gerenciamento de investigações e processos estratégicos"
                actions={
                    can('editar-caso') && (
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/casos/novo')}
                            style={{
                                backgroundColor: 'var(--accent-color)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            <Plus size={18} />
                            Novo Caso
                        </button>
                    )
                }
            />

            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '50px', width: '100%' }}></div>
                    ))}
                </div>
            ) : casos.length === 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '64px 20px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <FolderOpen size={64} color="var(--border-color)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', margin: '0 0 8px 0' }}>Nenhum caso cadastrado</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px 0', maxWidth: '400px' }}>
                        Crie o primeiro caso para começar a registrar investigações.
                    </p>
                    {can('editar-caso') && (
                        <button
                            onClick={() => navigate('/casos/novo')}
                            style={{
                                backgroundColor: 'transparent',
                                color: '#58A6FF',
                                border: '1px solid var(--border-color)',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Criar primeiro caso
                        </button>
                    )}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={casos}
                // onRowClick removido como requisitado
                />
            )}

            {/* Modal de Exclusão */}
            {casoToDelete && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '24px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        width: '100%',
                        maxWidth: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>Excluir caso?</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                            Esta ação removerá permanentemente o caso <strong>'{casoToDelete.codinome}'</strong> e todos os vínculos com investigados. As cautelares vinculadas também serão removidas. Esta ação não pode ser desfeita.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button
                                onClick={() => setCasoToDelete(null)}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => excluirMutation.mutate(casoToDelete.id)}
                                disabled={excluirMutation.isPending}
                                style={{
                                    backgroundColor: '#DA3633',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    opacity: excluirMutation.isPending ? 0.7 : 1
                                }}
                            >
                                {excluirMutation.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
