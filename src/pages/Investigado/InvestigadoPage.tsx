import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { buscarPorId, sincronizarReceitaWS } from '@/lib/db/investigados'
import { registrarAudit } from '@/lib/audit'
import { formatCPF, formatCNPJ, formatDate, formatDocumento } from '@/lib/formatters'
import { gerarPDF } from '@/lib/pdfGenerator'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermission'
import { lazy, Suspense, useEffect, useState } from 'react'
import { InvestigadoEditModal } from '@/components'
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useThemeStore } from '@/store/themeStore'
import { supabase } from '@/lib/supabase'

const VisNetworkGraph = lazy(() => import('@/components/VisNetworkGraph'))

const FACTION_COLORS: Record<string, string> = {
    PCC: '#F85149',
    CV: '#58A6FF',
    TCP: '#3FB950',
    ADE: '#F0883E',
    Outros: '#8B949E'
}

function Divider() {
    return <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '32px 0' }} />
}

function InvestigadoSkeleton() {
    return (
        <div style={{ padding: 24, maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="skeleton animate-pulse" style={{ height: 100, borderRadius: 8 }}></div>
            <div className="skeleton animate-pulse" style={{ height: 200, borderRadius: 8 }}></div>
            <div className="skeleton animate-pulse" style={{ height: 200, borderRadius: 8 }}></div>
            <div className="skeleton animate-pulse" style={{ height: 400, borderRadius: 8 }}></div>
        </div>
    )
}

function EmptyState({ title, description }: { title: string, description: string }) {
    return (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>{description}</div>
        </div>
    )
}

function InfoCard({ title, children, dark = false }: any) {
    return (
        <div style={{
            padding: '16px 20px',
            backgroundColor: dark ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
        }}>
            <h4 style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{title}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {children}
            </div>
        </div>
    )
}

function InfoRow({ label, value }: any) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value || '—'}</span>
        </div>
    )
}

function HeaderDossie({ data, onGerarDII, podeEditar, podeRelatorio, onRegistrarCautelar, onEdit, isPepLoading, pepData }: any) {
    const getAvatarColor = (doc: string) => {
        const angle = parseInt((doc || '000').replace(/\D/g, '').slice(0, 6) || '0', 10) % 360
        return `hsl(${angle}, 60%, 35%)`
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const isPJ = data.tipo === 'PESSOA_JURIDICA'

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        backgroundColor: getAvatarColor(data.cpf || data.cnpj || '000'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 600, color: 'white'
                    }}>
                        {data.nome.charAt(0)}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <h2 style={{ fontSize: 24, color: 'var(--text-primary)', margin: 0 }}>{data.nome}</h2>
                            <span className="badge" style={{
                                backgroundColor: !isPJ ? 'rgba(88, 166, 255, 0.1)' : 'rgba(63, 185, 80, 0.1)',
                                color: !isPJ ? '#58A6FF' : '#3FB950',
                                border: `1px solid ${!isPJ ? 'rgba(88, 166, 255, 0.2)' : 'rgba(63, 185, 80, 0.2)'}`,
                            }}>
                                {!isPJ ? 'PF' : 'PJ'}
                            </span>
                            {isPepLoading && (
                                <div className="skeleton animate-pulse" style={{ width: 32, height: 20, borderRadius: 12, display: 'inline-block' }}></div>
                            )}
                            {pepData && (
                                <span className="badge" style={{
                                    backgroundColor: 'rgba(248, 81, 73, 0.1)',
                                    color: '#F85149',
                                    border: '1px solid rgba(248, 81, 73, 0.2)',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em'
                                }}>
                                    PEP
                                </span>
                            )}
                        </div>
                        {pepData && (
                            <div style={{
                                marginTop: 12,
                                padding: '12px 16px',
                                backgroundColor: 'rgba(248, 81, 73, 0.05)',
                                borderRadius: 8,
                                border: '1px solid rgba(248, 81, 73, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                maxWidth: 'fit-content'
                            }}>
                                <div style={{ fontSize: 10, color: '#F85149', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pessoa Politicamente Exposta Detectada</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{pepData.descricaoFuncao}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pepData.nomeOrgao}</div>
                                    {pepData.dataInicioExercicio && (
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Início: {formatDate(pepData.dataInicioExercicio)}</div>
                                    )}
                                </div>
                            </div>
                        )}
                        {data.vulgo && (
                            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: 'var(--accent-color)', marginTop: 4 }}>
                                Vulgo: {data.vulgo}
                            </div>
                        )}
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {formatDocumento(data.cpf || data.cnpj || '')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    {podeRelatorio && (
                        <button onClick={onGerarDII} className="chip" style={{ color: '#58A6FF', borderColor: '#58A6FF' }}>
                            Gerar DII (PDF)
                        </button>
                    )}
                    {podeEditar && (
                        <button onClick={onEdit} className="chip">
                            Editar
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {isPJ ? (
                    <InfoCard title="Dados da Empresa" dark>
                        <InfoRow label="Razão Social" value={data.razao_social} />
                        <InfoRow label="Abertura" value={data.abertura ? formatDate(data.abertura) : null} />
                        <InfoRow label="Situação" value={data.situacao} />
                        <InfoRow label="Capital Social" value={data.capital_social ? formatCurrency(data.capital_social) : null} />
                    </InfoCard>
                ) : (
                    <InfoCard title="Dados Biográficos" dark>
                        <InfoRow label="Nascimento" value={data.dataNascimento ? formatDate(data.dataNascimento) : null} />
                        <InfoRow label="Pai" value={data.nomePai} />
                        <InfoRow label="Mãe" value={data.nomeMae} />
                    </InfoCard>
                )}

                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Facção e Função</h4>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span className="badge" style={{ backgroundColor: `${FACTION_COLORS[data.faccionado] || 'var(--border-color)'}20`, color: FACTION_COLORS[data.faccionado] || 'var(--text-secondary)', border: `1px solid ${FACTION_COLORS[data.faccionado] || 'var(--border-color)'}40` }}>
                            {data.faccionado || 'Nenhuma'}
                        </span>
                        <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-color)' }} />
                        <span className="badge" style={{ backgroundColor: 'rgba(240, 136, 62, 0.1)', color: '#F0883E', border: '1px solid rgba(240, 136, 62, 0.2)' }}>
                            {data.papelOrganizacao || 'Indefinido'}
                        </span>
                        <button onClick={onRegistrarCautelar} className="chip" style={{ border: 'none', background: 'transparent', color: '#58A6FF', padding: 0, marginLeft: 'auto', fontSize: 12 }}>
                            + Nova Cautelar
                        </button>
                    </div>
                </div>
            </div>

            {data.observacoes && (
                <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Observações</h4>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.observacoes}</p>
                </div>
            )}
        </section>
    )
}

function SecaoProcessos({ casos, cautelares, navigate }: { casos: any[], cautelares: any[], navigate: any }) {
    const [expandedCaso, setExpandedCaso] = useState<string | null>(null)

    if (casos.length === 0) {
        return (
            <section>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Processos e Cautelares</h3>
                <EmptyState title="Nenhum processo vinculado" description="Este alvo ainda não é alvo de nenhuma operação no Argos." />
            </section>
        )
    }

    return (
        <section>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Processos e Cautelares</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {casos.map(caso => {
                    const isExpanded = expandedCaso === caso.id
                    const cautelaresDoCaso = cautelares.filter(c => c.casoId === caso.id)
                    const ativasCount = cautelaresDoCaso.filter(c => c.ativo).length

                    return (
                        <div key={caso.id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                            <div onClick={() => setExpandedCaso(isExpanded ? null : caso.id)} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/casos/${caso.id}`);
                                        }}
                                        style={{ fontSize: 13, color: '#58A6FF', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        {caso.eProc || caso.e_proc}
                                    </span>
                                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{caso.codinome}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    {ativasCount > 0 && <span className="badge badge-red">{ativasCount} {ativasCount > 1 ? 'Cautelares Ativas' : 'Cautelar Ativa'}</span>}
                                    {isExpanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #30363D' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                                        {cautelaresDoCaso.map(c => (
                                            <div key={c.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 12, backgroundColor: '#0D1117', borderRadius: 6, border: '1px solid #30363D' }}>
                                                <span className={`badge ${c.tipo === 'PRISAO_CAUTELAR' ? 'badge-red' :
                                                    c.tipo === 'BUSCA_APREENSAO' ? 'badge-blue' :
                                                        c.tipo === 'SIGILO_BANCARIO' ? 'badge-green' :
                                                            'badge-orange'
                                                    }`} style={{
                                                        minWidth: 100, textAlign: 'center'
                                                    }}>
                                                    {c.tipo === 'PRISAO_CAUTELAR' ? 'Prisão' :
                                                        c.tipo === 'BUSCA_APREENSAO' ? 'Busca' :
                                                            c.tipo === 'SIGILO_BANCARIO' ? 'Bancário' :
                                                                'Telemático'}
                                                </span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 12, color: '#8B949E', fontFamily: 'IBM Plex Mono' }}>{formatDate(c.createdAt)}</div>
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
                                                </div>
                                                <span className={`badge ${c.status === 'Peticionado' ? 'badge-blue' :
                                                    c.status === 'Em Execução' ? 'badge-orange' :
                                                        c.status === 'Cumprido' ? 'badge-green' :
                                                            'badge-gray'
                                                    }`}>
                                                    {c.status || (c.ativo ? 'Ativa' : 'Inativa')}
                                                </span>
                                            </div>
                                        ))}
                                        {cautelaresDoCaso.length === 0 && (
                                            <div style={{ fontSize: 13, color: '#8B949E', fontStyle: 'italic', padding: 12 }}>Nenhuma cautelar registrada para este alvo neste expediente processual.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

function SecaoEnderecos({ enderecos }: { enderecos: any[] }) {
    const { theme } = useThemeStore()
    function ChangeMapView({ center }: { center: [number, number] }) {
        const map = useMap()
        map.setView(center, 14)
        return null
    }

    if (!enderecos || enderecos.length === 0) {
        return (
            <section>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Endereços Identificados</h3>
                <EmptyState title="Nenhum endereço" description="Não constam endereços salvos para este investigado." />
            </section>
        )
    }

    return (
        <section>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Endereços Identificados</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {enderecos.map(end => (
                        <div key={end.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                            <MapPin size={18} color="var(--text-secondary)" style={{ marginTop: 2 }} />
                            <div>
                                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>{end.logradouro}</div>
                                {end.origem && <span className="badge" style={{ fontSize: 10, marginTop: 8 }}>Fonte: {end.origem}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ height: 300, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <MapContainer center={[-10.1843, -48.3336]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url={theme === 'dark'
                            ? "https://s.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://s.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
                        } />
                        {enderecos.find(e => e.lat && e.lng) && (
                            <ChangeMapView center={[Number(enderecos.find(e => e.lat && e.lng).lat), Number(enderecos.find(e => e.lat && e.lng).lng)]} />
                        )}
                        {enderecos.filter(e => e.lat && e.lng).map(e => (
                            <Marker key={e.id} position={[Number(e.lat), Number(e.lng)]}>
                                <Popup>
                                    <div style={{ color: '#0D1117' }}>{e.logradouro}</div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </section>
    )
}

function SecaoSocios({ socios, navigate }: { socios: any[], navigate: any }) {
    if (!socios || socios.length === 0) return null

    return (
        <section>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Sócios e Vínculos Societários</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {socios.map((s: any) => (
                    <div
                        key={s.id}
                        onClick={() => navigate(`/investigado/${s.id}`)}
                        style={{
                            padding: 16,
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            backgroundColor: 'var(--bg-tertiary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, color: 'var(--text-primary)', fontWeight: 600
                        }}>
                            {s.nome.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{s.nome}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDocumento(s.cpf || s.cnpj || '')}</div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default function InvestigadoPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const user = useAuthStore(s => s.user)
    const { can } = usePermission()

    const [isPepLoading, setIsPepLoading] = useState(false)
    const [pepData, setPepData] = useState<any>(null)

    const { data, isLoading, error } = useQuery({
        queryKey: ['investigado', id],
        queryFn: () => buscarPorId(id!),
        enabled: !!id,
    })

    useEffect(() => {
        if (id) registrarAudit('VISUALIZAR_DOSSIE', 'investigados', id)

        // Auto-fetch ReceitaWS para PJ na primeira visualização
        if (data?.tipo === 'PESSOA_JURIDICA' && data.cnpj && !data.ultima_consulta_ws) {
            console.log('[ReceitaWS] Iniciando sincronização automática para:', data.nome)
            sincronizarReceitaWS(data.id, data.cnpj)
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ['investigado', id] })
                })
                .catch(err => console.error('[ReceitaWS] Falha no auto-fetch:', err))
        }
    }, [id, data?.tipo, data?.ultima_consulta_ws])

    useEffect(() => {
        if (data?.tipo === 'PESSOA_FISICA' && data.cpf) {
            const checkPEP = async () => {
                setIsPepLoading(true)
                try {
                    const { data: pepResult, error } = await supabase.functions.invoke('check-pep', {
                        body: { cpf: data.cpf }
                    })
                    if (!error && pepResult) {
                        setPepData(pepResult)
                    }
                } catch (err) {
                    console.error('[PEP] Erro:', err)
                } finally {
                    setIsPepLoading(false)
                }
            }
            checkPEP()
        }
    }, [data?.id, data?.cpf, data?.tipo])

    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    if (isLoading) return <InvestigadoSkeleton />
    if (error || !data) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--accent-color)' }}>
            Investigado não encontrado. <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#58A6FF', cursor: 'pointer', textDecoration: 'underline' }}>Voltar</button>
        </div>
    )

    // Função para gerar DII direto da página
    function gerarDIIRapido() {
        gerarPDF({
            title: `DII — ${data.nome}`,
            columns: ['Campo', 'Valor'],
            rows: [
                ['Nome', data.nome],
                ['CPF', data.cpf ? formatCPF(data.cpf) : '—'],
                ['CNPJ', data.cnpj ? formatCNPJ(data.cnpj) : '—'],
                ['Vulgo', data.vulgo ?? '—'],
                ['Facção', data.faccionado ?? '—'],
                ['Papel', data.papelOrganizacao ?? '—'],
                ...data.cautelares.map((c: any) => [
                    c.tipo === 'BUSCA_APREENSAO' ? 'Busca e Apreensão' : 'Prisão Cautelar',
                    `${c.casoCodinome} — ${formatDate(c.createdAt)}`
                ]),
            ],
            user: user!,
            tipo: 'DII',
        })
        registrarAudit('RELATORIO_PDF', 'relatorios', 'DII_RAPIDO')
    }

    return (
        <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>

            {/* SEÇÃO 1: HEADER */}
            <HeaderDossie
                data={data}
                onGerarDII={gerarDIIRapido}
                podeEditar={can('editar-caso')}
                podeRelatorio={can('visualizar-relatorios')}
                onRegistrarCautelar={() => navigate(`/cautelares?investigadoId=${id}`)}
                onEdit={() => setIsEditModalOpen(true)}
                isPepLoading={isPepLoading}
                pepData={pepData}
            />

            <InvestigadoEditModal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                data={data}
                onSalvo={() => queryClient.invalidateQueries({ queryKey: ['investigado', id] })}
            />

            <Divider />

            {/* SEÇÃO 2: PROCESSOS VINCULADOS */}
            <SecaoProcessos casos={data.casos} cautelares={data.cautelares} navigate={navigate} />

            {data.tipo === 'PESSOA_JURIDICA' && (
                <>
                    <Divider />
                    <SecaoSocios socios={data.socios} navigate={navigate} />
                </>
            )}

            <Divider />

            {/* SEÇÃO 3: ENDEREÇOS */}
            <SecaoEnderecos enderecos={data.enderecos} />

            <Divider />

            {/* SEÇÃO 4: DIAGRAMA */}
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Diagrama de Vínculos</h3>
            <Suspense fallback={<div style={{ height: 400, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Carregando diagrama...</div>}>
                {data.vinculos?.nodes?.length > 0
                    ? <VisNetworkGraph nodes={data.vinculos.nodes} edges={data.vinculos.edges} highlightNodeId={id} />
                    : <EmptyState title="Nenhum vínculo mapeado" description="Vincule este investigado a um caso para ver o diagrama." />
                }
            </Suspense>

        </div>
    )
}
