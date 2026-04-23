import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert, UserX, Search, Check, ChevronRight, ChevronLeft, Filter, Banknote, Smartphone, Edit3, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { dbCautelares } from '@/lib/db/cautelares'
import { dbCasos } from '@/lib/db/casos'
import { registrarAudit } from '@/lib/audit'
import { PageHeader, DataTable } from '@/components'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDocumento, formatDate } from '@/utils/format'

type Passo = 1 | 2 | 3 | 4

export default function CautelaresPage() {
    const [aba, setAba] = useState<'registrar' | 'historico'>('historico')
    const queryClient = useQueryClient()

    // --- Estado Aba Registrar ---
    const [passo, setPasso] = useState<Passo>(1)
    const [termoBusca, setTermoBusca] = useState('')
    const debouncedBusca = useDebounce(termoBusca, 400)

    const [casoSelecionado, setCasoSelecionado] = useState<any>(null)
    const [tipoSelecionado, setTipoSelecionado] = useState<'BUSCA_APREENSAO' | 'PRISAO_CAUTELAR' | 'SIGILO_BANCARIO' | 'SIGILO_TELEMATICO' | null>(null)
    const [alvosSelecionados, setAlvosSelecionados] = useState<string[]>([])
    const [observacao, setObservacao] = useState('')

    const { data: resultadosBusca } = useQuery({
        queryKey: ['busca-casos-cautelar', debouncedBusca],
        queryFn: () => dbCasos.buscarComInvestigados(debouncedBusca),
        enabled: debouncedBusca.length >= 2
    })

    const resetForm = () => {
        setPasso(1)
        setCasoSelecionado(null)
        setTipoSelecionado(null)
        setAlvosSelecionados([])
        setObservacao('')
        setTermoBusca('')
    }

    const registrarLoteMutation = useMutation({
        mutationFn: () => dbCautelares.criarLote(tipoSelecionado!, casoSelecionado.id, alvosSelecionados, observacao),
        onSuccess: () => {
            toast.success(`${alvosSelecionados.length} cautelares registradas`)
            registrarAudit('REGISTRAR_CAUTELAR_LOTE', 'cautelares')
            queryClient.invalidateQueries({ queryKey: ['cautelares'] })
            resetForm()
        },
        onError: (err: any) => toast.error(err.message)
    })

    // --- Estado Aba Histórico ---
    const [filtros, setFiltros] = useState({ tipo: 'Todos', status: 'Todos' as string, ativo: undefined as boolean | undefined, casoQuery: '' })
    const [editandoObservacao, setEditandoObservacao] = useState<{ id: string, text: string } | null>(null)

    const { data: cautelares, isLoading: carregandoHistorico } = useQuery({
        queryKey: ['cautelares', filtros],
        queryFn: () => dbCautelares.listar({
            tipo: filtros.tipo,
            ativo: filtros.ativo,
            status: filtros.status
        })
    })

    const atualizarStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => dbCautelares.atualizarStatus(id, status),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cautelares'] })
            registrarAudit('UPDATE_CAUTELAR_STATUS', 'cautelares', variables.id)
            toast.success('Status da medida atualizado')
        },
        onError: (err: any) => toast.error(err.message)
    })

    const atualizarObservacaoMutation = useMutation({
        mutationFn: ({ id, observacao }: { id: string, observacao: string }) => dbCautelares.atualizarObservacao(id, observacao),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cautelares'] })
            registrarAudit('UPDATE_CAUTELAR_OBS', 'cautelares', variables.id)
            setEditandoObservacao(null)
            toast.success('Observação atualizada')
        },
        onError: (err: any) => toast.error(err.message)
    })

    const historicoFiltrado = cautelares?.filter(c =>
        c.casoCodinome?.toLowerCase().includes(filtros.casoQuery.toLowerCase())
    ) || []

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Cautelares" subtitle="Gestão de medidas restritivas e mandados" />

            {/* Abas */}
            <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border-color)' }}>
                <button
                    onClick={() => setAba('registrar')}
                    style={{
                        padding: '12px 16px', background: 'none', border: 'none',
                        color: aba === 'registrar' ? '#F78166' : 'var(--text-secondary)',
                        borderBottom: aba === 'registrar' ? '2px solid #F78166' : 'none',
                        cursor: 'pointer', fontWeight: 600
                    }}
                >
                    Cadastrar
                </button>
                <button
                    onClick={() => setAba('historico')}
                    style={{
                        padding: '12px 16px', background: 'none', border: 'none',
                        color: aba === 'historico' ? '#F78166' : 'var(--text-secondary)',
                        borderBottom: aba === 'historico' ? '2px solid #F78166' : 'none',
                        cursor: 'pointer', fontWeight: 600
                    }}
                >
                    Cautelares
                </button>
            </div>

            {aba === 'registrar' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '800px' }}>
                    {/* Indicador de Progresso */}
                    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', padding: '20px 0' }}>
                        <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', zIndex: 1, padding: '0 10%' }}>
                            {[1, 2, 3, 4].map(n => (
                                <div
                                    key={n}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        backgroundColor: passo >= n ? '#F78166' : 'var(--bg-secondary)',
                                        border: '2px solid', borderColor: passo >= n ? '#F78166' : 'var(--border-color)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: passo >= n ? 'var(--bg-secondary)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '14px'
                                    }}
                                >
                                    {n}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Passo 1: Processo */}
                    {passo === 1 && (
                        <div className="search-header" style={{ padding: '24px' }}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#F78166' }}>Passo 1: Selecionar Processo</h4>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    className="search-input" style={{ paddingLeft: '40px' }}
                                    placeholder="Buscar por E-Proc ou Codinome..."
                                    value={termoBusca}
                                    onChange={e => setTermoBusca(e.target.value)}
                                />
                                {termoBusca.length >= 2 && resultadosBusca && (
                                    <div className="autocomplete-dropdown">
                                        {resultadosBusca.length === 0 ? (
                                            <div className="autocomplete-item" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhum caso encontrado</div>
                                        ) : resultadosBusca.map(r => (
                                            <div
                                                key={r.id} className="autocomplete-item"
                                                onClick={() => { setCasoSelecionado(r); setTermoBusca(''); }}
                                            >
                                                <strong>{r.codinome}</strong> — <span style={{ color: 'var(--text-secondary)' }}>{r.eProc}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: 8 }}>{r.investigados.length} alvo(s)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {casoSelecionado && (
                                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>CASO SELECIONADO</div>
                                    <div style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '4px' }}>{casoSelecionado.codinome}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{casoSelecionado.eProc} • {casoSelecionado.integrarE}</div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                                <button
                                    className="btn btn-primary" disabled={!casoSelecionado}
                                    onClick={() => setPasso(2)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    Próximo <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Passo 2: Tipo */}
                    {passo === 2 && (
                        <div className="search-header" style={{ padding: '24px' }}>
                            <h4 style={{ margin: '0 0 24px 0', color: '#F78166' }}>Passo 2: Tipo de Medida</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%' }}>
                                <button
                                    onClick={() => setTipoSelecionado('BUSCA_APREENSAO')}
                                    style={{
                                        height: '90px', borderRadius: '8px', border: '2px solid',
                                        backgroundColor: tipoSelecionado === 'BUSCA_APREENSAO' ? 'rgba(247, 129, 102, 0.1)' : 'transparent',
                                        borderColor: tipoSelecionado === 'BUSCA_APREENSAO' ? '#F78166' : 'var(--border-color)',
                                        color: tipoSelecionado === 'BUSCA_APREENSAO' ? '#F78166' : 'var(--text-secondary)',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <ShieldAlert size={24} /> <strong>Busca e Apreensão</strong>
                                </button>
                                <button
                                    onClick={() => setTipoSelecionado('PRISAO_CAUTELAR')}
                                    style={{
                                        height: '90px', borderRadius: '8px', border: '2px solid',
                                        backgroundColor: tipoSelecionado === 'PRISAO_CAUTELAR' ? 'rgba(247, 129, 102, 0.1)' : 'transparent',
                                        borderColor: tipoSelecionado === 'PRISAO_CAUTELAR' ? '#F78166' : 'var(--border-color)',
                                        color: tipoSelecionado === 'PRISAO_CAUTELAR' ? '#F78166' : 'var(--text-secondary)',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <UserX size={24} /> <strong>Prisão Cautelar</strong>
                                </button>
                                <button
                                    onClick={() => setTipoSelecionado('SIGILO_BANCARIO')}
                                    style={{
                                        height: '90px', borderRadius: '8px', border: '2px solid',
                                        backgroundColor: tipoSelecionado === 'SIGILO_BANCARIO' ? 'rgba(247, 129, 102, 0.1)' : 'transparent',
                                        borderColor: tipoSelecionado === 'SIGILO_BANCARIO' ? '#F78166' : 'var(--border-color)',
                                        color: tipoSelecionado === 'SIGILO_BANCARIO' ? '#F78166' : 'var(--text-secondary)',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center'
                                    }}
                                >
                                    <Banknote size={24} /> <strong style={{ fontSize: '13px' }}>Sigilo Bancário/Fin.</strong>
                                </button>
                                <button
                                    onClick={() => setTipoSelecionado('SIGILO_TELEMATICO')}
                                    style={{
                                        height: '90px', borderRadius: '8px', border: '2px solid',
                                        backgroundColor: tipoSelecionado === 'SIGILO_TELEMATICO' ? 'rgba(247, 129, 102, 0.1)' : 'transparent',
                                        borderColor: tipoSelecionado === 'SIGILO_TELEMATICO' ? '#F78166' : 'var(--border-color)',
                                        color: tipoSelecionado === 'SIGILO_TELEMATICO' ? '#F78166' : 'var(--text-secondary)',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center'
                                    }}
                                >
                                    <Smartphone size={24} /> <strong style={{ fontSize: '13px' }}>Sigilo Telemático</strong>
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px' }}>
                                <button className="chip" onClick={() => setPasso(1)} style={{ border: 'none' }}><ChevronLeft size={18} /> Voltar</button>
                                <button className="btn btn-primary" disabled={!tipoSelecionado} onClick={() => setPasso(3)}>Próximo <ChevronRight size={18} /></button>
                            </div>
                        </div>
                    )}

                    {/* Passo 3: Alvos */}
                    {passo === 3 && (
                        <div className="search-header" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, color: '#F78166' }}>Passo 3: Selecionar Alvos</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="chip" onClick={() => setAlvosSelecionados(casoSelecionado.investigados.map((i: any) => i.id))}>Todos</button>
                                    <button className="chip" onClick={() => setAlvosSelecionados([])}>Nenhum</button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                {casoSelecionado.investigados.filter((i: any) => i && i.id).map((i: any) => (
                                    <div
                                        key={i.id}
                                        onClick={() => {
                                            const list = alvosSelecionados.includes(i.id)
                                                ? alvosSelecionados.filter(id => id !== i.id)
                                                : [...alvosSelecionados, i.id]
                                            setAlvosSelecionados(list)
                                        }}
                                        style={{
                                            padding: '12px 16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                                            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
                                            borderColor: alvosSelecionados.includes(i.id) ? '#F78166' : 'var(--border-color)'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '4px', border: '2px solid var(--border-color)',
                                            backgroundColor: alvosSelecionados.includes(i.id) ? '#F78166' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {alvosSelecionados.includes(i.id) && <Check size={14} color="var(--bg-secondary)" />}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{i.nome}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDocumento(i.cpf || i.cnpj || '')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {alvosSelecionados.length} de {casoSelecionado.investigados.length} selecionados
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                                <button className="chip" onClick={() => setPasso(2)} style={{ border: 'none' }}><ChevronLeft size={18} /> Voltar</button>
                                <button className="btn btn-primary" disabled={alvosSelecionados.length === 0} onClick={() => setPasso(4)}>Próximo <ChevronRight size={18} /></button>
                            </div>
                        </div>
                    )}

                    {/* Passo 4: Finalização */}
                    {passo === 4 && (
                        <div className="search-header" style={{ padding: '24px' }}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#F78166' }}>Passo 4: Observações e Confirmação</h4>

                            <div className="form-group">
                                <label className="form-label">Observações (Opcional)</label>
                                <textarea
                                    className="form-input"
                                    style={{ minHeight: '100px', resize: 'none' }}
                                    maxLength={1000}
                                    value={observacao}
                                    onChange={e => setObservacao(e.target.value)}
                                />
                                <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {1000 - observacao.length} caracteres restantes
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Resumo da Medida</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                    <div>Tipo: <strong style={{ color: '#F78166' }}>
                                        {tipoSelecionado === 'BUSCA_APREENSAO' ? 'Busca e Apreensão' :
                                            tipoSelecionado === 'PRISAO_CAUTELAR' ? 'Prisão Cautelar' :
                                                tipoSelecionado === 'SIGILO_BANCARIO' ? 'Sigilo Bancário/Fin.' :
                                                    'Sigilo Telemático'}
                                    </strong></div>
                                    <div>Caso: <strong color="var(--text-primary)">{casoSelecionado.codinome}</strong></div>
                                    <div>Alvos: <strong color="var(--text-primary)">{alvosSelecionados.length} investigados</strong></div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px' }}>
                                <button className="chip" onClick={() => setPasso(3)} style={{ border: 'none' }}><ChevronLeft size={18} /> Voltar</button>
                                <button
                                    className="btn btn-primary"
                                    disabled={registrarLoteMutation.isPending}
                                    onClick={() => registrarLoteMutation.mutate()}
                                    style={{ backgroundColor: '#3FB950' }}
                                >
                                    {registrarLoteMutation.isPending ? 'Registrando...' : 'Registrar Cautelares'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Filtros Histórico */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}><Filter size={10} /> Tipo</label>
                            <select
                                className="select-role" style={{ width: '100%' }}
                                value={filtros.tipo} onChange={e => setFiltros({ ...filtros, tipo: e.target.value })}
                            >
                                <option value="Todos">Todos</option>
                                <option value="BUSCA_APREENSAO">Busca e Apreensão</option>
                                <option value="PRISAO_CAUTELAR">Prisão Cautelar</option>
                                <option value="SIGILO_BANCARIO">Sigilo Bancário/Fin.</option>
                                <option value="SIGILO_TELEMATICO">Sigilo Telemático</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status Detalhado</label>
                            <select
                                className="select-role" style={{ width: '100%' }}
                                value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })}
                            >
                                <option value="Todos">Todos</option>
                                <option value="Peticionado">Peticionado</option>
                                <option value="Em Execução">Em Execução</option>
                                <option value="Cumprido">Cumprido</option>
                                <option value="Arquivado">Arquivado</option>
                                <option value="Baixado">Baixado</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Contabilização</label>
                            <select
                                className="select-role" style={{ width: '100%' }}
                                value={filtros.ativo === undefined ? 'Todos' : String(filtros.ativo)}
                                onChange={e => setFiltros({ ...filtros, ativo: e.target.value === 'Todos' ? undefined : e.target.value === 'true' })}
                            >
                                <option value="Todos">Todos</option>
                                <option value="true">Ativas</option>
                                <option value="false">Inativas</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 2 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Filtrar por Caso</label>
                            <input
                                className="form-input" style={{ height: '32px', fontSize: '12px', padding: '0 12px' }}
                                placeholder="Nome do caso..."
                                value={filtros.casoQuery} onChange={e => setFiltros({ ...filtros, casoQuery: e.target.value })}
                            />
                        </div>
                        <button className="chip" onClick={() => setFiltros({ tipo: 'Todos', status: 'Todos', ativo: undefined, casoQuery: '' })}>Limpar</button>
                    </div>

                    {carregandoHistorico ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Array(4).fill(0).map((_, i) => (
                                <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '8px' }} />
                            ))}
                        </div>
                    ) : historicoFiltrado.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)', fontSize: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                            Nenhuma cautelar encontrada para os filtros selecionados.
                        </div>
                    ) : (
                        <>
                            <DataTable
                                columns={[
                                    {
                                        header: 'Tipo',
                                        accessor: (row) => {
                                            const label = row.tipo === 'BUSCA_APREENSAO' ? 'Busca' :
                                                row.tipo === 'PRISAO_CAUTELAR' ? 'Prisão' :
                                                    row.tipo === 'SIGILO_BANCARIO' ? 'Bancário' :
                                                        'Telemático';
                                            const colorClass = row.tipo === 'BUSCA_APREENSAO' ? 'badge-blue' :
                                                row.tipo === 'PRISAO_CAUTELAR' ? 'badge-red' :
                                                    row.tipo === 'SIGILO_BANCARIO' ? 'badge-green' :
                                                        'badge-orange';
                                            return <span className={`badge ${colorClass}`}>{label}</span>
                                        }
                                    },
                                    {
                                        header: 'Investigado',
                                        accessor: (row) => (
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{row.investigadoNome}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDocumento(row.investigadoDocumento || '')}</div>
                                            </div>
                                        )
                                    },
                                    { header: 'Caso', accessor: 'casoCodinome' },
                                    { header: 'Data', accessor: (row) => <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '12px' }}>{formatDate(row.created_at)}</span> },
                                    {
                                        header: 'Status',
                                        accessor: (row) => (
                                            <select
                                                className={`select-role ${row.ativo ? 'badge-green-text' : 'badge-gray-text'}`}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    height: '28px',
                                                    borderRadius: '14px',
                                                    fontWeight: 600,
                                                    backgroundColor: row.ativo ? 'rgba(63, 185, 80, 0.1)' : 'rgba(48, 54, 61, 0.3)',
                                                    border: `1px solid ${row.ativo ? '#3FB950' : 'var(--border-color)'}`,
                                                    color: row.ativo ? '#3FB950' : 'var(--text-secondary)'
                                                }}
                                                value={row.status}
                                                onChange={(e) => atualizarStatusMutation.mutate({ id: row.id, status: e.target.value })}
                                            >
                                                <option value="Peticionado">Peticionado</option>
                                                <option value="Em Execução">Em Execução</option>
                                                <option value="Cumprido">Cumprido</option>
                                                <option value="Arquivado">Arquivado</option>
                                                <option value="Baixado">Baixado</option>
                                            </select>
                                        )
                                    },
                                    {
                                        header: 'Observação',
                                        accessor: (row) => (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                                                <span
                                                    title={row.observacao || ''}
                                                    style={{
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '12px',
                                                        flex: 1,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {row.observacao || '—'}
                                                </span>
                                                <button
                                                    onClick={() => setEditandoObservacao({ id: row.id, text: row.observacao || '' })}
                                                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: '4px' }}
                                                    className="btn-ghost"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                            </div>
                                        )
                                    },
                                ]}
                                data={historicoFiltrado}
                            />

                            {/* Modal Simples de Edição de Observação */}
                            {editandoObservacao && (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', zIndex: 1000, padding: '20px'
                                }}>
                                    <div style={{
                                        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                        borderRadius: '8px', width: '100%', maxWidth: '500px', padding: '24px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Editar Observação</h4>
                                            <button onClick={() => setEditandoObservacao(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <textarea
                                            className="form-input"
                                            style={{ minHeight: '150px', width: '100%', marginBottom: '20px', resize: 'vertical', boxSizing: 'border-box' }}
                                            value={editandoObservacao.text}
                                            onChange={e => setEditandoObservacao({ ...editandoObservacao, text: e.target.value })}
                                            placeholder="Digite a observação..."
                                            autoFocus
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            <button className="chip" onClick={() => setEditandoObservacao(null)}>Cancelar</button>
                                            <button
                                                className="btn btn-primary"
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                onClick={() => atualizarObservacaoMutation.mutate({ id: editandoObservacao.id, observacao: editandoObservacao.text })}
                                                disabled={atualizarObservacaoMutation.isPending}
                                            >
                                                <Save size={16} /> Salvar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
