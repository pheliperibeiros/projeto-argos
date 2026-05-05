import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { User, Network, Map, Landmark, BarChart2, Search, Download, AlertTriangle } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import toast from 'react-hot-toast'

import { dbRelatorios } from '@/lib/db/relatorios'
import { dbCasos } from '@/lib/db/casos'
import { dbInvestigados } from '@/lib/db/investigados'
import { registrarAudit } from '@/lib/audit'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components'
import { useDebounce } from '@/hooks/useDebounce'
import { gerarPDF, gerarCSV } from '@/lib/pdfGenerator'
import { formatDocumento, formatDate } from '@/utils/format'
import { useThemeStore } from '@/store/themeStore'

const COLORS = ['var(--accent-color)', '#58A6FF', '#3FB950', '#F0883E', 'var(--text-secondary)']

export default function RelatoriosPage() {
    const { user } = useAuthStore()
    const { theme } = useThemeStore()
    const [loadingExport, setLoadingExport] = useState<string | null>(null)

    // --- CARD 1 (DII) ---
    const [termoDII, setTermoDII] = useState('')
    const [selectedDII, setSelectedDII] = useState<any>(null)
    const debouncedDII = useDebounce(termoDII, 400)

    const { data: resultadosDII } = useQuery({
        queryKey: ['busca-dii', debouncedDII],
        queryFn: () => dbInvestigados.buscarParaAutocomplete(debouncedDII),
        enabled: debouncedDII.length >= 3
    })

    const exportarDII = async (tipo: 'PDF' | 'CSV') => {
        if (!selectedDII) return
        setLoadingExport('DII-' + tipo)
        try {
            const d = await dbRelatorios.buscarDII(selectedDII.id)
            if (tipo === 'PDF') {
                gerarPDF({
                    title: `DII — ${d.nome}`,
                    columns: ['Campo', 'Valor'],
                    rows: [
                        ['Nome', d.nome],
                        ['Documento', formatDocumento(d.cpf || d.cnpj || '')],
                        ['Vulgo', d.vulgo ?? '—'],
                        ['Faccionado', d.faccionado ?? '—'],
                        ['Papel', d.papel_organizacao ?? '—'],
                        ...d.cautelares.map((c: any) => [
                            `Cautelar (${c.tipo === 'PRISAO_CAUTELAR' ? 'Prisão' : 'Busca'})`,
                            c.casoCodinome ?? '—'
                        ])
                    ],
                    user: user!, tipo: 'DII'
                })
                await registrarAudit('RELATORIO_PDF', 'relatorios', 'DII')
            } else {
                gerarCSV(
                    ['Nome', 'Documento', 'Vulgo', 'Faccionado', 'Papel'],
                    [[d.nome, d.cpf || d.cnpj || '', d.vulgo || '', d.faccionado || '', d.papel_organizacao || '']],
                    `DII_${d.nome.replace(/ /g, '_')}.csv`
                )
                await registrarAudit('RELATORIO_CSV', 'relatorios', 'DII')
            }
            toast.success('Relatório gerado com sucesso')
        } catch (e: any) {
            toast.error('Erro na exportação: ' + e.message)
        } finally {
            setLoadingExport(null)
        }
    }

    // --- CARD 2 (Conectividade) ---
    const [casoConectividade, setCasoConectividade] = useState<string>('')
    const { data: casos } = useQuery({ queryKey: ['casos-simples'], queryFn: () => dbCasos.listar() })

    const { data: redeData } = useQuery({
        queryKey: ['conectividade', casoConectividade],
        queryFn: () => dbRelatorios.buscarConectividade(casoConectividade),
        enabled: !!casoConectividade
    })

    const exportarConectividade = async (tipo: 'PDF' | 'CSV') => {
        if (!redeData) return
        setLoadingExport('REDE-' + tipo)
        try {
            const rows = redeData.investigados.map((inv: any) => [
                inv.nome, formatDocumento(inv.cpf || inv.cnpj || ''), String(inv.grau), inv.papel ?? 'ISOLADO'
            ])
            if (tipo === 'CSV') {
                gerarCSV(['Nome', 'Documento', 'Grau de Conexão', 'Papel'], rows, 'Conectividade.csv')
            } else {
                gerarPDF({ title: 'Análise de Rede — Conectividade', columns: ['Nome', 'Documento', 'Grau', 'Papel'], rows, user: user!, tipo: 'CONECTIVIDADE' })
            }
            await registrarAudit('RELATORIO_' + tipo, 'relatorios', 'CONECTIVIDADE')
            toast.success('Relatório gerado')
        } catch (e: any) {
            toast.error('Erro: ' + e.message)
        } finally {
            setLoadingExport(null)
        }
    }

    // --- CARD 3 (Mancha Criminal) ---
    const { data: manchaData } = useQuery({
        queryKey: ['mancha-criminal'],
        queryFn: async () => {
            const { data } = await (await import('@/lib/supabase')).supabase
                .from('enderecos')
                .select('logradouro, lat, lng, investigado_id')
                .not('lat', 'is', null)
            return data || []
        }
    })

    const exportarMancha = () => {
        if (!manchaData || manchaData.length === 0) { toast.error('Sem dados de localização'); return }
        gerarCSV(
            ['Logradouro', 'Lat', 'Lng'],
            manchaData.map((e: any) => [e.logradouro ?? '', String(e.lat ?? ''), String(e.lng ?? '')]),
            'ManChaCriminal.csv'
        )
        registrarAudit('RELATORIO_CSV', 'relatorios', 'MANCHA_CRIMINAL')
        toast.success('CSV de geoprocessamento gerado')
    }

    // --- CARD 4 (Financeiro) ---
    const [casoFinanceiro, setCasoFinanceiro] = useState<string>('')
    const { data: financeiroData } = useQuery({
        queryKey: ['financeiro', casoFinanceiro],
        queryFn: () => dbRelatorios.buscarFinanceiro(casoFinanceiro),
        enabled: !!casoFinanceiro
    })

    const exportarFinanceiro = async (tipo: 'PDF' | 'CSV') => {
        if (!financeiroData) return
        setLoadingExport('FIN-' + tipo)
        try {
            const rows = [...financeiroData.pjs, ...financeiroData.alertas].map((e: any) => [
                e.nome, e.cnpj || e.cpf || '', e.papel_organizacao || '', e.faccionado || ''
            ])
            if (tipo === 'CSV') {
                gerarCSV(['Nome', 'Documento', 'Papel', 'Facção'], rows, 'FollowTheMoney.csv')
            } else {
                gerarPDF({ title: 'Follow the Money', columns: ['Nome', 'Documento', 'Papel', 'Facção'], rows, user: user!, tipo: 'FINANCEIRO' })
            }
            await registrarAudit('RELATORIO_' + tipo, 'relatorios', 'FINANCEIRO')
            toast.success('Relatório gerado')
        } catch (e: any) {
            toast.error('Erro: ' + e.message)
        } finally {
            setLoadingExport(null)
        }
    }

    // --- CARD 5 (Efetividade) ---
    const { data: efetividade } = useQuery({
        queryKey: ['efetividade'],
        queryFn: dbRelatorios.buscarEfetividade
    })

    const exportarEfetividade = async () => {
        if (!efetividade) return
        setLoadingExport('EFET')
        try {
            const totalCautelares = efetividade.cautelares.length
            const ativasBusca = efetividade.cautelares.filter((c: any) => c.tipo === 'BUSCA_APREENSAO' && c.ativo).length
            const ativasPrisao = efetividade.cautelares.filter((c: any) => c.tipo === 'PRISAO_CAUTELAR' && c.ativo).length
            const faccionados = efetividade.investigados.filter((i: any) => i.faccionado && i.faccionado !== 'Não Faccionado' && i.faccionado !== 'Nenhuma').length

            gerarPDF({
                title: 'Métricas de Efetividade Operacional',
                columns: ['Métrica', 'Valor'],
                rows: [
                    ['Total de Cautelares', String(totalCautelares)],
                    ['Buscas Ativas', String(ativasBusca)],
                    ['Prisões Ativas', String(ativasPrisao)],
                    ['Investigados Faccionados', String(faccionados)],
                    ['Total de Casos', String(efetividade.totalCasos)],
                ],
                user: user!, tipo: 'EFETIVIDADE'
            })
            await registrarAudit('RELATORIO_PDF', 'relatorios', 'EFETIVIDADE')
            toast.success('Relatório consolidado gerado')
        } catch (e: any) {
            toast.error('Erro: ' + e.message)
        } finally {
            setLoadingExport(null)
        }
    }

    const exportarFaccionados = async () => {
        setLoadingExport('FACC')
        try {
            const dados = await dbRelatorios.buscarFaccionados()
            if (!dados || dados.length === 0) {
                toast.error('Nenhum faccionado encontrado')
                return
            }

            const rows = dados.map((d: any) => [
                d.nome,
                d.vulgo || '—',
                formatDocumento(d.cpf || ''),
                d.data_nascimento ? formatDate(d.data_nascimento) : '—',
                d.faccionado || '—',
                d.papel_organizacao || '—'
            ])

            gerarPDF({
                title: 'Relatório Analítico de Faccionados',
                columns: ['Nome', 'Vulgo(s)', 'CPF', 'Nascimento', 'Facção', 'Função'],
                rows,
                user: user!,
                tipo: 'FACCIONADOS'
            })

            await registrarAudit('RELATORIO_PDF', 'relatorios', 'FACCIONADOS')
            toast.success('Relatório de Faccionados gerado')
        } catch (e: any) {
            toast.error('Erro na exportação: ' + e.message)
        } finally {
            setLoadingExport(null)
        }
    }

    const pieDataFaccoes = [
        { name: 'PCC', value: efetividade?.investigados.filter((i: any) => i.faccionado === 'PCC').length || 0 },
        { name: 'CV', value: efetividade?.investigados.filter((i: any) => i.faccionado === 'CV').length || 0 },
        { name: 'TCP', value: efetividade?.investigados.filter((i: any) => i.faccionado === 'TCP').length || 0 },
        { name: 'Outros', value: efetividade?.investigados.filter((i: any) => !i.faccionado || i.faccionado === 'Não Faccionado' || i.faccionado === 'Nenhuma').length || 0 },
    ].filter(d => d.value > 0)

    return (
        <div style={{ paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <PageHeader title="Relatórios" subtitle="Análise de dados, inteligência estratégica e exportação de dossiês" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* CARD 1: DII */}
                <section style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ padding: '12px', backgroundColor: 'var(--hover-bg)', borderRadius: '12px' }}>
                            <User size={32} color="var(--accent-color)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Dossiê Individual (DII)</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Perfil completo do alvo para interrogatórios e medidas cautelares.</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <input
                                className="form-input" style={{ paddingLeft: '36px' }}
                                placeholder="Buscar por nome ou CPF..."
                                value={termoDII} onChange={e => setTermoDII(e.target.value)}
                            />
                            {termoDII.length >= 3 && resultadosDII && resultadosDII.length > 0 && (
                                <div className="autocomplete-dropdown">
                                    {resultadosDII.map((r: any) => (
                                        <div key={r.id} className="autocomplete-item" onClick={() => { setSelectedDII(r); setTermoDII('') }}>
                                            <strong>{r.nome}</strong> — {formatDocumento(r.cpf || r.cnpj || '')}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedDII && (
                            <div style={{ marginTop: '16px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                                <div style={{ fontSize: '14px', color: 'var(--accent-secondary)', fontWeight: 600 }}>{selectedDII.nome}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDocumento(selectedDII.cpf || selectedDII.cnpj || '')}</div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button disabled={!!loadingExport} className="chip active" style={{ fontSize: '12px' }} onClick={() => exportarDII('PDF')}>
                                        {loadingExport === 'DII-PDF' ? 'Gerando...' : '📄 Exportar PDF'}
                                    </button>
                                    <button disabled={!!loadingExport} className="chip" style={{ fontSize: '12px' }} onClick={() => exportarDII('CSV')}>
                                        {loadingExport === 'DII-CSV' ? '...' : '📊 CSV'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* CARD 2: Conectividade */}
                <section style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ padding: '12px', backgroundColor: 'var(--hover-bg)', borderRadius: '12px' }}>
                            <Network size={32} color="var(--accent-secondary)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Análise de Rede</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Identificação de Hubs e Brokers organizacionais em um caso.</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <select className="select-role" style={{ width: '100%', marginBottom: '16px' }} value={casoConectividade} onChange={e => setCasoConectividade(e.target.value)}>
                            <option value="">Selecionar Caso...</option>
                            {casos?.map((c: any) => <option key={c.id} value={c.id}>{c.codinome}</option>)}
                        </select>

                        {redeData ? (
                            <>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '12px' }}>
                                    <table style={{ width: '100%', fontSize: '12px', color: 'var(--text-primary)', borderCollapse: 'collapse' }}>
                                        <thead><tr style={{ color: 'var(--text-secondary)' }}><th align="left">Alvo</th><th align="center">Grau</th><th align="right">Papel</th></tr></thead>
                                        <tbody>
                                            {redeData.investigados.map((inv: any) => (
                                                <tr key={inv.id} style={{ borderBottom: '1px solid #1f242c' }}>
                                                    <td style={{ padding: '4px 0' }}>{inv.nome}</td>
                                                    <td align="center">{inv.grau}</td>
                                                    <td align="right">
                                                        {inv.papel && <span className={`badge ${inv.papel === 'HUB' ? 'badge-red' : inv.papel === 'BROKER' ? 'badge-orange' : 'badge-gray'}`}>{inv.papel}</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button disabled={!!loadingExport} className="chip active" style={{ flex: 1, fontSize: '12px' }} onClick={() => exportarConectividade('PDF')}>
                                        {loadingExport === 'REDE-PDF' ? '...' : '📄 PDF'}
                                    </button>
                                    <button disabled={!!loadingExport} className="chip" style={{ flex: 1, fontSize: '12px' }} onClick={() => exportarConectividade('CSV')}>
                                        {loadingExport === 'REDE-CSV' ? '...' : '📊 CSV'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Selecione um caso para ver a análise de rede.</div>
                        )}
                    </div>
                </section>

                {/* CARD 3: Mancha Criminal */}
                <section style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ padding: '12px', backgroundColor: 'var(--hover-bg)', borderRadius: '12px' }}>
                            <Map size={32} color="var(--success-color)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Mancha Criminal</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Heatmap de endereços e incidência criminal por região.</p>
                        </div>
                    </div>

                    <div style={{ height: '160px', borderRadius: '8px', overflow: 'hidden', marginTop: '20px', border: '1px solid var(--border-color)' }}>
                        <MapContainer center={[-10.1843, -48.3336]} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url={theme === 'dark'
                                    ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
                                    : "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
                                }
                            />
                            {manchaData?.filter((e: any) => e.lat && e.lng).map((e: any, i: number) => (
                                <CircleMarker key={i} center={[Number(e.lat), Number(e.lng)]} radius={8} fillColor="var(--accent-color)" fillOpacity={0.6} stroke={false}>
                                    <LeafletTooltip>{e.logradouro}</LeafletTooltip>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    </div>
                    <button className="chip active" style={{ width: '100%', marginTop: '16px', fontSize: '12px' }} onClick={exportarMancha}>
                        📊 Exportar Geoprocessamento (CSV)
                    </button>
                </section>

                {/* CARD 4: Financeiro */}
                <section style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ padding: '12px', backgroundColor: 'var(--hover-bg)', borderRadius: '12px' }}>
                            <Landmark size={32} color="var(--warning-color)" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Follow the Money</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Rastreamento de ativos, PJs e alertas de operadores financeiros.</p>
                        </div>
                    </div>

                    <select className="select-role" style={{ width: '100%', marginTop: '20px' }} value={casoFinanceiro} onChange={e => setCasoFinanceiro(e.target.value)}>
                        <option value="">Selecionar Caso...</option>
                        {casos?.map((c: any) => <option key={c.id} value={c.id}>{c.codinome}</option>)}
                    </select>

                    {financeiroData && financeiroData.alertas.length > 0 && (
                        <div style={{ marginTop: '16px', backgroundColor: 'var(--hover-bg)', border: '1px solid var(--warning-color)', borderRadius: '6px', padding: '12px', display: 'flex', gap: '12px' }}>
                            <AlertTriangle size={18} color="var(--warning-color)" />
                            <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                                <strong>Alerta de Operador Financeiro!</strong> {financeiroData.alertas.length} alvo(s) con papel "Financiamento" detectado(s).
                            </div>
                        </div>
                    )}

                    {financeiroData && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                            {financeiroData.pjs.length} PJ(s) encontradas neste caso.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button disabled={!financeiroData || !!loadingExport} className="chip active" style={{ flex: 1, fontSize: '12px' }} onClick={() => exportarFinanceiro('PDF')}>
                            {loadingExport === 'FIN-PDF' ? '...' : '📄 PDF Financeiro'}
                        </button>
                        <button disabled={!financeiroData || !!loadingExport} className="chip" style={{ flex: 1, fontSize: '12px' }} onClick={() => exportarFinanceiro('CSV')}>
                            {loadingExport === 'FIN-CSV' ? '...' : '📊 CSV'}
                        </button>
                    </div>
                </section>

                {/* CARD 5: Efetividade (span 2 col) */}
                <section style={{ gridColumn: 'span 2', padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ padding: '12px', backgroundColor: 'rgba(139, 148, 158, 0.1)', borderRadius: '12px' }}>
                                <BarChart2 size={32} color="var(--text-secondary)" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Métricas de Efetividade</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Monitoramento global de produtividade e impacto operacional do GAECO.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                disabled={loadingExport === 'FACC'}
                                onClick={exportarFaccionados}
                                style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            >
                                <Download size={16} />
                                {loadingExport === 'FACC' ? 'Gerando...' : 'Relatório de Faccionados'}
                            </button>
                            <button
                                disabled={!efetividade || loadingExport === 'EFET'}
                                onClick={exportarEfetividade}
                                style={{ backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: !efetividade ? 0.5 : 1 }}
                            >
                                <Download size={16} />
                                {loadingExport === 'EFET' ? 'Gerando...' : 'Exportar Consolidado'}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3FB950' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MANDADOS CUMPRIDOS</div>
                                <div style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 700, marginTop: '4px' }}>
                                    {efetividade?.cautelares.filter((c: any) => !c.ativo).length ?? '—'}
                                </div>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #58A6FF' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>INVESTIGADOS FACCIONADOS</div>
                                <div style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 700, marginTop: '4px' }}>
                                    {efetividade?.investigados.filter((i: any) => i.faccionado && i.faccionado !== 'Não Faccionado' && i.faccionado !== 'Nenhuma').length ?? '—'}
                                </div>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL DE CASOS</div>
                                <div style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 700, marginTop: '4px' }}>
                                    {efetividade?.totalCasos ?? '—'}
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '220px' }}>
                            {pieDataFaccoes.length === 0 ? (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Sem investigados faccionados</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220} minWidth={0}>
                                    <PieChart>
                                        <Pie data={pieDataFaccoes} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieDataFaccoes.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
                            {['BUSCA_APREENSAO', 'PRISAO_CAUTELAR'].map(tipo => {
                                const total = efetividade?.cautelares.filter((c: any) => c.tipo === tipo).length || 0
                                const ativas = efetividade?.cautelares.filter((c: any) => c.tipo === tipo && c.ativo).length || 0
                                const perc = total > 0 ? (ativas / total) * 100 : 0
                                return (
                                    <div key={tipo}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            <span>{tipo === 'BUSCA_APREENSAO' ? 'Buscas Ativas' : 'Prisões Ativas'}</span>
                                            <span style={{ color: 'var(--text-primary)' }}>{ativas}/{total} ({Math.round(perc)}%)</span>
                                        </div>
                                        <div style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${perc}%`, height: '100%', backgroundColor: tipo === 'BUSCA_APREENSAO' ? 'var(--accent-secondary)' : 'var(--accent-color)', transition: 'width 0.5s ease' }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
