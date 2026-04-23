import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Clock, SearchX } from 'lucide-react'
import { dbInvestigados } from '@/lib/db/investigados'
import { registrarAudit } from '@/lib/audit'
import { DataTable, PageHeader } from '@/components'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDocumento } from '@/utils/format'
import './Busca.css'

type ChipField = 'Todos' | 'Nome' | 'CPF/CNPJ' | 'Vulgo' | 'E-Proc' | 'Integrar-E' | 'Tags'

export default function BuscaPage() {
    const navigate = useNavigate()
    const [term, setTerm] = useState('')
    const [selectedField, setSelectedField] = useState<ChipField>('Todos')
    const [selectedRole, setSelectedRole] = useState('Todos')
    const [submittedTerm, setSubmittedTerm] = useState('')
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [recentSearches, setRecentSearches] = useState<string[]>([])

    const debouncedTerm = useDebounce(term, 300)

    // 1. Recentes do localStorage
    useEffect(() => {
        const saved = localStorage.getItem('argos:buscas_recentes')
        if (saved) setRecentSearches(JSON.parse(saved))
    }, [])

    const saveRecent = (t: string) => {
        if (!t.trim()) return
        const updated = [t, ...recentSearches.filter(s => s !== t)].slice(0, 3)
        setRecentSearches(updated)
        localStorage.setItem('argos:buscas_recentes', JSON.stringify(updated))
    }

    // 2. Autocomplete Query
    const { data: autocompleteResults } = useQuery({
        queryKey: ['investigados-autocomplete', debouncedTerm],
        queryFn: () => dbInvestigados.buscarInvestigados(debouncedTerm),
        enabled: debouncedTerm.length >= 3 && submittedTerm !== debouncedTerm,
        staleTime: 5000
    })

    // 3. Search Query
    const { data: results, isLoading, refetch, isFetched } = useQuery({
        queryKey: ['investigados-search', submittedTerm, selectedField, selectedRole],
        queryFn: () => dbInvestigados.buscarInvestigados(submittedTerm, selectedField, selectedRole),
        enabled: false
    })

    const handleSearch = () => {
        if (!term.trim()) return
        setSubmittedTerm(term)
        setShowAutocomplete(false)
        saveRecent(term)
        registrarAudit('BUSCA', 'investigados', term)
        setTimeout(() => refetch(), 0)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch()
    }

    const FIELDS: ChipField[] = ['Todos', 'Nome', 'CPF/CNPJ', 'Vulgo', 'E-Proc', 'Integrar-E', 'Tags']
    const ROLES = ['Todos', 'Liderança', 'Financiamento', 'Gerência', 'Operacional', 'Facilitador', 'Laranja']

    return (
        <div className="busca-container">
            <PageHeader
                title="Busca Unificada"
                subtitle="Pesquisa em toda a base de investigados e operações"
            />

            {/* Header de Busca */}
            <div className="search-header">
                <div className="search-terminal">
                    <Search className="search-icon-placeholder" size={20} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar por nome, CPF, vulgo, E-Proc, Integrar-E ou tag..."
                        value={term}
                        onChange={(e) => {
                            setTerm(e.target.value)
                            setShowAutocomplete(true)
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowAutocomplete(true)}
                    />

                    {/* Autocomplete Dropdown */}
                    {showAutocomplete && (
                        <div className="autocomplete-dropdown">
                            {term.length >= 3 ? (
                                autocompleteResults?.slice(0, 5).map((item) => (
                                    <div
                                        key={item.id}
                                        className="autocomplete-item"
                                        onClick={() => {
                                            setTerm(item.nome)
                                            handleSearch()
                                        }}
                                    >
                                        <Search size={14} color="var(--text-secondary)" />
                                        <div>
                                            <div className="autocomplete-item-text">{item.nome}</div>
                                            <div className="autocomplete-item-subtext">{formatDocumento(item.cpf || item.cnpj)}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                recentSearches.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="autocomplete-item"
                                        onClick={() => {
                                            setTerm(s)
                                            handleSearch()
                                        }}
                                    >
                                        <Clock size={14} color="var(--text-secondary)" />
                                        <span className="autocomplete-item-text">{s}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="search-filters">
                    <div className="chips-container">
                        {FIELDS.map(f => (
                            <button
                                key={f}
                                className={`chip ${selectedField === f ? 'active' : ''}`}
                                onClick={() => setSelectedField(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Papel na Org.:</span>
                        <select
                            className="select-role"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Resultados ou Estados */}
            <div className="results-container">
                {!isFetched && !isLoading && (
                    <div className="initial-state">
                        <Search size={64} className="initial-icon" />
                        <p>Digite e pressione Enter para buscar</p>
                    </div>
                )}

                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: '50px', width: '100%' }}></div>
                        ))}
                    </div>
                ) : isFetched && results && results.length > 0 ? (
                    <DataTable<any>
                        columns={[
                            { header: 'Nome', accessor: 'nome' },
                            {
                                header: 'CPF/CNPJ',
                                accessor: (row: any) => (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            navigate('/investigado/' + row.id)
                                        }}
                                        style={{ color: 'var(--accent-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        {row.cpf ? formatDocumento(row.cpf) : formatDocumento(row.cnpj ?? '')}
                                    </span>
                                )
                            },
                            {
                                header: 'Codinome do Caso',
                                accessor: (row: any) => row.codinomeCaso
                                    ? <span>{row.codinomeCaso}</span>
                                    : <span style={{ color: 'var(--text-secondary)' }}>—</span>
                            },
                            {
                                header: 'E-Proc',
                                accessor: (row: any) => row.eProc && row.casoId ? (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            navigate('/casos/' + row.casoId)
                                        }}
                                        style={{ color: 'var(--accent-secondary)', cursor: 'pointer' }}
                                    >
                                        {row.eProc}
                                    </span>
                                ) : <span style={{ color: 'var(--text-secondary)' }}>{row.eProc ?? '—'}</span>
                            },
                            { header: 'Integrar-E', accessor: (row: any) => row.integrarE || '-' },
                            {
                                header: 'Cautelar',
                                accessor: (row: any) => (
                                    <span className={`badge ${row.temCautelar ? 'badge-red' : 'badge-gray'}`}>
                                        {row.temCautelar ? 'Sim' : 'Não'}
                                    </span>
                                )
                            },
                        ]}
                        data={results}
                        onRowClick={(row: any) => navigate('/investigado/' + row.id)}
                    />
                ) : isFetched && (
                    <div className="empty-state">
                        <SearchX size={64} className="empty-icon" />
                        <p>Nenhum resultado para "{submittedTerm}"</p>
                    </div>
                )}
            </div>
        </div>
    )
}
