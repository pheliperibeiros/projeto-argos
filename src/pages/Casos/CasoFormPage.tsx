import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Search, Plus, Save, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

import { dbCasos } from '@/lib/db/casos'
import { dbInvestigados } from '@/lib/db/investigados'
import { registrarAudit } from '@/lib/audit'
import { PageHeader, InvestigadoModal } from '@/components'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDocumento } from '@/utils/format'
const VisNetworkGraph = lazy(() => import('@/components/VisNetworkGraph'))

const schema = z.object({
    codinome: z.string().min(1, 'Codinome é obrigatório'),
    eProc: z.string().min(1, 'E-Proc é obrigatório'),
    eProcInvestigacao: z.string().optional().nullable(),
    integrarE: z.string().optional(),
    natureza: z.enum(['NOTICIA_DE_FATO', 'PROCEDIMENTO_INVESTIGATORIO', 'ACAO_PENAL']),
    status: z.enum(['ATIVO', 'SUSPENSO', 'ARQUIVADO']).optional(),
    tags: z.array(z.string()).optional(),
})

type CasoFormData = z.infer<typeof schema>

export default function CasoFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)
    const queryClient = useQueryClient()

    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState('')
    const [investigadosVinculados, setInvestigadosVinculados] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)

    const debouncedSearch = useDebounce(searchTerm, 300)

    const { register, handleSubmit, setValue, watch, formState: { errors }, setError, clearErrors } = useForm<CasoFormData>({
        resolver: zodResolver(schema),
        defaultValues: { tags: [], integrarE: '', natureza: 'NOTICIA_DE_FATO', status: 'ATIVO', eProcInvestigacao: '' }
    })

    const currentNatureza = watch('natureza')

    // Lógica para preservar o eProc da investigação ao mudar para Ação Penal
    useEffect(() => {
        if (currentNatureza === 'ACAO_PENAL') {
            const eProcAtual = watch('eProc')
            const eProcInv = watch('eProcInvestigacao')

            // Se mudou para Ação Penal e o campo de investigação está vazio,
            // movemos o valor atual para lá e limpamos o principal para o novo ser inserido.
            if (eProcAtual && !eProcInv && isEdit) {
                setValue('eProcInvestigacao', eProcAtual)
                setValue('eProc', '')
                toast('Evolução para Ação Penal: O E-Proc original foi movido para "Investigação". Por favor, insira o novo número da Ação Penal.', { icon: 'ℹ️' })
            }
        }
    }, [currentNatureza, setValue, watch, isEdit])

    // ITEM 2 — CARREGAMENTO DOS DADOS (modo edição)
    const { data: casoExistente, isLoading: loadingCaso } = useQuery({
        queryKey: ['caso', id],
        queryFn: () => dbCasos.buscarPorId(id!),
        enabled: isEdit,
    })

    useEffect(() => {
        if (casoExistente) {
            setValue('codinome', casoExistente.codinome)
            setValue('eProc', casoExistente.eProc || casoExistente.e_proc)
            setValue('integrarE', casoExistente.integrarE || casoExistente.integrar_e)
            setValue('natureza', casoExistente.natureza || 'NOTICIA_DE_FATO')
            setValue('eProcInvestigacao', casoExistente.eProcInvestigacao || '')
            setValue('status', casoExistente.status || 'ATIVO')
            setValue('tags', casoExistente.tags ?? [])
            setTags(casoExistente.tags ?? [])
            setInvestigadosVinculados(casoExistente.investigados || [])
        }
    }, [casoExistente, setValue])

    // ITEM 5 — BUSCA E VINCULAÇÃO DE INVESTIGADOS
    const { data: autocompleteResults } = useQuery({
        queryKey: ['investigados-autocomplete', debouncedSearch],
        queryFn: () => dbInvestigados.buscarParaAutocomplete(debouncedSearch),
        enabled: debouncedSearch.length >= 3
    })

    // ITEM 6 — BOTÃO SALVAR: LÓGICA COMPLETA
    const saveMutation = useMutation({
        mutationFn: async (data: CasoFormData) => {
            if (isEdit) {
                await dbCasos.atualizar(id!, {
                    codinome: data.codinome,
                    eProc: data.eProc,
                    eProcInvestigacao: data.eProcInvestigacao,
                    integrarE: data.integrarE,
                    natureza: data.natureza,
                    status: data.status,
                    tags: tags // Passa nativamente como array
                })

                // Recalcular vínculos
                const idsAntigos = (casoExistente?.investigados || []).map((inv: any) => inv.id)
                const idsNovos = investigadosVinculados.map(inv => inv.id)

                const remover = idsAntigos.filter((i: string) => !idsNovos.includes(i))
                const adicionar = idsNovos.filter((i: string) => !idsAntigos.includes(i))

                await Promise.all([
                    ...remover.map((invId: string) => dbCasos.desvincularInvestigado(id!, invId)),
                    ...adicionar.map((invId: string) => dbCasos.vincularInvestigado(id!, invId)),
                ])

                await registrarAudit('EDITAR_CASO', 'casos', id!)
            } else {
                const novoCaso = await dbCasos.criar({
                    codinome: data.codinome,
                    eProc: data.eProc,
                    eProcInvestigacao: data.eProcInvestigacao,
                    integrarE: data.integrarE,
                    natureza: data.natureza,
                    status: data.status,
                    tags: tags // Passa nativamente como array
                })

                await Promise.all(
                    investigadosVinculados.map(inv =>
                        dbCasos.vincularInvestigado(novoCaso.id, inv.id)
                    )
                )

                await registrarAudit('CRIAR_CASO', 'casos', novoCaso.id)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['casos'] })
            if (isEdit) {
                queryClient.invalidateQueries({ queryKey: ['caso', id] })
            }
            toast.success(isEdit ? 'Caso atualizado com sucesso' : 'Caso criado com sucesso')
            navigate('/casos')
        },
        onError: (err: any) => {
            toast.error('Erro ao salvar caso: ' + err.message)
        }
    })

    // ITEM 3 — VALIDAÇÃO DE UNICIDADE DO E-PROC
    const checkEProcUnico = async (valor: string) => {
        if (!valor || valor.length < 5) return

        try {
            const eUnico = await dbCasos.checarEProcUnico(valor, isEdit ? id : undefined)
            if (!eUnico) {
                setError('eProc', { type: 'manual', message: 'E-Proc já cadastrado no sistema' })
            } else {
                clearErrors('eProc')
            }
        } catch (err) {
            console.warn('Erro ao verificar eProc', err)
        }
    }

    // ITEM 4 — CAMPO TAGS
    const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ';') {
            e.preventDefault()
            const novaTag = tagInput.trim().replace(';', '')
            if (novaTag && !tags.includes(novaTag)) {
                const newTags = [...tags, novaTag]
                setTags(newTags)
                setValue('tags', newTags)
            }
            setTagInput('')
        }
    }

    const removeTag = (t: string) => {
        const newTags = tags.filter(tag => tag !== t)
        setTags(newTags)
        setValue('tags', newTags)
    }

    if (loadingCaso) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title="Carregando Caso..." subtitle="Aguarde enquanto os dados são obtidos" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div className="skeleton" style={{ height: '300px', width: '100%', borderRadius: '8px' }}></div>
                        <div className="skeleton" style={{ height: '200px', width: '100%', borderRadius: '8px' }}></div>
                    </div>
                </div>
            </div>
        )
    }

    // ITEM 1 — DETECÇÃO DE MODO (CRIAR vs EDITAR)
    const title = isEdit ? 'Editar Caso' : 'Novo Caso'
    const subtitle = isEdit
        ? `Atualize os dados do caso ${casoExistente?.codinome || ''}`
        : 'Preencha os dados para registrar uma nova investigação'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '100px' }}>
            <PageHeader title={title} subtitle={subtitle} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
                {/* Coluna Principal: Formulário */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <section className="search-header" style={{ padding: '24px' }}>
                        <h4 style={{ margin: '0 0 20px 0', color: 'var(--accent-color)' }}>⚙️ Dados da Operação</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Codinome do Caso*</label>
                                <input
                                    {...register('codinome')}
                                    className="form-input"
                                    placeholder="Ex: Operação Janus"
                                />
                                {errors.codinome && <span style={{ fontSize: '11px', color: '#F85149', marginTop: '4px', display: 'block' }}>{errors.codinome.message}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    {currentNatureza === 'ACAO_PENAL' ? 'Número E-Proc (Ação Penal)*' : 'Número E-Proc*'}
                                </label>
                                <input
                                    {...register('eProc')}
                                    onBlur={(e) => {
                                        register('eProc').onBlur(e)
                                        checkEProcUnico(e.target.value)
                                    }}
                                    className="form-input"
                                    placeholder="0000000-00.2024.8.16.0000"
                                />
                                {errors.eProc && <span style={{ fontSize: '11px', color: '#F85149', marginTop: '4px', display: 'block' }}>{errors.eProc.message}</span>}
                            </div>
                        </div>

                        {currentNatureza === 'ACAO_PENAL' && (
                            <div style={{ marginTop: '24px' }}>
                                <div className="form-group">
                                    <label className="form-label">E-Proc da Investigação (Leitura)</label>
                                    <input
                                        {...register('eProcInvestigacao')}
                                        readOnly
                                        disabled
                                        className="form-input"
                                    />
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                        Este campo é preenchido automaticamente com o número original ao evoluir para Ação Penal.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Natureza do Caso</label>
                                <select
                                    {...register('natureza')}
                                    className="form-select"
                                >
                                    <option value="NOTICIA_DE_FATO">Notícia de Fato</option>
                                    <option value="PROCEDIMENTO_INVESTIGATORIO">Procedimento Investigatório</option>
                                    <option value="ACAO_PENAL">Ação Penal</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    {...register('status')}
                                    className="form-select"
                                >
                                    <option value="ATIVO">Tramitação (Ativo)</option>
                                    <option value="SUSPENSO">Suspenso</option>
                                    <option value="ARQUIVADO">Arquivado</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Identificador Integrar-E</label>
                                <input
                                    {...register('integrarE')}
                                    className="form-input"
                                    placeholder="M-2024-XXXX"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tags / Marcadores</label>
                                <input
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKey}
                                    className="form-input"
                                    placeholder="Digite e pressione Enter..."
                                />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                    {tags.map(t => (
                                        <span key={t} className="chip active" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {t} <X size={12} onClick={() => removeTag(t)} style={{ cursor: 'pointer' }} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="search-header" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, color: 'var(--accent-color)' }}>👥 Alvos e Investigados</h4>
                            <button
                                type="button"
                                className="chip" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => setIsModalOpen(true)}
                            >
                                <Plus size={14} /> Cadastrar Novo
                            </button>
                        </div>

                        <div className="search-terminal" style={{ marginBottom: '24px', position: 'relative' }}>
                            <Search className="search-icon-placeholder" size={18} />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="search-input"
                                placeholder="Vincular investigado existente por nome ou CPF..."
                            />
                            {debouncedSearch.length >= 3 && autocompleteResults && autocompleteResults.length > 0 && (
                                <div className="autocomplete-dropdown">
                                    {autocompleteResults.map(res => (
                                        <div
                                            key={res.id}
                                            className="autocomplete-item"
                                            onClick={async () => {
                                                if (!investigadosVinculados.find(v => v.id === res.id)) {
                                                    setInvestigadosVinculados([...investigadosVinculados, res])
                                                    if (isEdit && id) {
                                                        try {
                                                            await dbCasos.vincularInvestigado(id, res.id);
                                                            toast.success('Investigado vinculado automaticamente.')
                                                        } catch (e: any) {
                                                            toast.error('Erro ao vincular: ' + e.message)
                                                        }
                                                    }
                                                }
                                                setSearchTerm('')
                                            }}
                                        >
                                            <div className="autocomplete-item-text">
                                                {res.nome} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>— {formatDocumento(res.cpf || res.cnpj || '')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {investigadosVinculados.map(v => (
                                <div
                                    key={v.id}
                                    style={{
                                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px',
                                        padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px',
                                        minWidth: '200px'
                                    }}
                                >
                                    <div
                                        style={{ flex: 1, cursor: 'pointer' }}
                                        onClick={() => navigate(`/investigado/${v.id}`)}
                                    >
                                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{v.nome}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDocumento(v.cpf || v.cnpj || '')}</div>
                                    </div>
                                    <X
                                        size={14} color="var(--text-secondary)" style={{ cursor: 'pointer' }}
                                        onClick={async () => {
                                            if (window.confirm(`Remover ${v.nome} do caso?`)) {
                                                setInvestigadosVinculados(investigadosVinculados.filter(item => item.id !== v.id))
                                                if (isEdit && id) {
                                                    try {
                                                        await dbCasos.desvincularInvestigado(id, v.id);
                                                        toast.success('Investigado desvinculado.')
                                                    } catch (e: any) {
                                                        toast.error('Erro ao desvincular: ' + e.message)
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                            {investigadosVinculados.length === 0 && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    Nenhum investigado vinculado a este caso ainda.
                                </div>
                            )}
                        </div>
                    </section>

                    {isEdit && casoExistente?.cautelares && casoExistente.cautelares.length > 0 && (
                        <section className="search-header" style={{ padding: '24px' }}>
                            <h4 style={{ margin: '0 0 20px 0', color: 'var(--accent-color)' }}>⚖️ Cautelares e Medidas</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {casoExistente.cautelares.map((c: any) => (
                                    <div key={c.id} style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'minmax(120px, 150px) 1fr 100px', gap: '20px', alignItems: 'center' }}>
                                        <div>
                                            <span className={`badge ${c.tipo === 'PRISAO_CAUTELAR' ? 'badge-red' :
                                                c.tipo === 'BUSCA_APREENSAO' ? 'badge-blue' :
                                                    c.tipo === 'SIGILO_BANCARIO' ? 'badge-green' :
                                                        'badge-orange'
                                                }`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                                                {c.tipo === 'PRISAO_CAUTELAR' ? 'Prisão' :
                                                    c.tipo === 'BUSCA_APREENSAO' ? 'Busca' :
                                                        c.tipo === 'SIGILO_BANCARIO' ? 'Bancário' :
                                                            'Telemático'}
                                            </span>
                                        </div>
                                        <div
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate(`/investigado/${c.investigado_id}`)}
                                        >
                                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{c.investigados?.nome || 'Investigado Desconhecido'}</div>
                                            {c.observacao && (
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                                    "{c.observacao}"
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span className={`badge ${c.status === 'Peticionado' ? 'badge-blue' :
                                                c.status === 'Em Execução' ? 'badge-orange' :
                                                    c.status === 'Cumprido' ? 'badge-green' :
                                                        'badge-gray'
                                                }`} style={{ fontSize: '10px' }}>
                                                {c.status?.toUpperCase() || (c.ativo ? 'ATIVA' : 'INATIVA')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {isEdit && investigadosVinculados.length > 0 && (
                        <section className="search-header" style={{ padding: '24px' }}>
                            <h4 style={{ margin: '0 0 20px 0', color: 'var(--accent-color)' }}>🕸️ Diagrama de Vínculos da Operação</h4>
                            <Suspense fallback={<div style={{ height: 400, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Carregando diagrama...</div>}>
                                <VisNetworkGraph
                                    highlightNodeId={id}
                                    nodes={[
                                        { id: id!, label: watch('codinome'), sublabel: watch('eProc'), group: 'caso' },
                                        ...investigadosVinculados.map(v => ({
                                            id: v.id,
                                            label: v.nome,
                                            sublabel: formatDocumento(v.cpf || v.cnpj || ''),
                                            tipo: v.tipo
                                        }))
                                    ]}
                                    edges={investigadosVinculados.map(v => ({
                                        from: id!,
                                        to: v.id,
                                        tipo: 'associado'
                                    }))}
                                />
                            </Suspense>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                                * Clique nos ícones para navegar entre os dossiês dos alvos e o registro principal.
                            </p>
                        </section>
                    )}
                </div>

                {/* Barra Lateral / Resumo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="search-header" style={{ padding: '20px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Resumo</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Investigados:</span>
                                <span style={{ color: '#58A6FF' }}>{investigadosVinculados.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rodapé Fixo - ITEM 6 */}
            <div style={{
                position: 'fixed', bottom: 0, right: 0, left: 240,
                backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid #30363D',
                padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', zIndex: 50
            }}>
                <button
                    onClick={() => navigate('/casos')}
                    className="chip" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    <ChevronLeft size={16} /> Voltar para Listagem
                </button>
                <button
                    onClick={handleSubmit((data) => saveMutation.mutate(data))}
                    disabled={saveMutation.isPending}
                    style={{
                        backgroundColor: 'var(--accent-color)', color: 'white', border: 'none',
                        padding: '10px 32px', borderRadius: '6px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                        opacity: saveMutation.isPending ? 0.7 : 1
                    }}
                >
                    <Save size={18} />
                    {saveMutation.isPending ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            Salvando...
                        </div>
                    ) : 'Salvar Caso'}
                </button>
            </div>

            <InvestigadoModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSalvo={async (novo, sociosAdicionados) => {
                    const alvosParaVincular = [novo, ...(sociosAdicionados || [])]
                    const alvosSemDuplicata = alvosParaVincular.filter(alvo => !investigadosVinculados.find(v => v.id === alvo.id))

                    if (alvosSemDuplicata.length > 0) {
                        setInvestigadosVinculados([...investigadosVinculados, ...alvosSemDuplicata])
                        if (isEdit && id) {
                            try {
                                await Promise.all(alvosSemDuplicata.map(alvo => dbCasos.vincularInvestigado(id, alvo.id)))
                                toast.success(`${alvosSemDuplicata.length} investigado(s) vinculado(s) automaticamente.`)
                            } catch (e: any) {
                                toast.error('Erro ao vincular automaticamente: ' + e.message)
                            }
                        }
                    }
                }}
            />
            {/* simple spinner animation style */}
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div >
    )
}
