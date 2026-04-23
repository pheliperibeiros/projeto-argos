import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Activity,
    Users,
    Search,
    Gavel
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import 'leaflet.heat'
import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'

import { dbDashboard } from '@/lib/db/dashboard'
import { registrarAudit } from '@/lib/audit'
import { StatCard, PageHeader } from '@/components'
import { useThemeStore } from '@/store/themeStore'
import './Dashboard.css'

function EmptyChartState({ title }: { title: string }) {
    return (
        <div style={{
            height: '220px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', gap: 8, fontSize: 13
        }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="3" /><path d="M7 12l4-4 4 4" /></svg>
            {title}
        </div>
    )
}

function MapSearchControl() {
    const map = useMap()
    const [query, setQuery] = useState('')

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
            const data = await resp.json()
            if (data && data.length > 0) {
                const { lat, lon } = data[0]
                map.setView([parseFloat(lat), parseFloat(lon)], 14)
            }
        } catch (err) {
            console.error('Erro na busca do mapa:', err)
        }
    }

    return (
        <div style={{ position: 'absolute', top: '12px', left: '50px', zIndex: 1000 }}>
            <form onSubmit={handleSearch} style={{
                display: 'flex',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                height: '38px',
                width: '300px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                overflow: 'hidden'
            }}>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Localizar endereço ou cidade..."
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        padding: '0 12px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none'
                    }}
                />
                <button type="submit" style={{
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    padding: '0 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <SearchIcon size={16} />
                </button>
            </form>
        </div>
    )
}

function HeatmapLayer({ points, theme }: { points: [number, number, number?][], theme: string }) {
    const map = useMap()

    useEffect(() => {
        if (!points || points.length === 0) return

        const gradient = theme === 'dark'
            ? { 0.4: 'cyan', 0.65: 'lime', 1: 'red' }
            : { 0.4: '#feb24c', 0.65: '#f03b20', 1: '#bd0026' }

        // @ts-ignore
        const heat = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient
        }).addTo(map)

        return () => {
            map.removeLayer(heat)
        }
    }, [map, points, theme])

    return null
}

export default function DashboardPage() {
    const { theme } = useThemeStore()
    const { data, isLoading, isError } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: dbDashboard.buscarStats,
        refetchInterval: 30000 // 30 segundos
    })

    useEffect(() => {
        registrarAudit('ACESSO_DASHBOARD', 'dashboard')
    }, [])

    if (isError) {
        return (
            <div className="p-6">
                <div className="error-banner">
                    Falha ao carregar dados do dashboard. Verifique sua conexão.
                </div>
            </div>
        )
    }

    const stats = data || {
        casosAtivos: 0,
        buscasAno: 0,
        cumpridasAno: 0,
        faccionadosCadastrados: 0,
        historicoCasos: [],
        distribuicaoFaccoes: [],
        rankingTags: [],
        mandadosPorUF: [],
        pontosCalor: []
    }

    return (
        <div className="dashboard-grid">
            <PageHeader
                title="Dashboard"
                subtitle="Panorama operacional e estatísticas de inteligência"
            />

            {/* ROW 1: Stats */}
            <div className="dashboard-row-1">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '110px' }}></div>
                    ))
                ) : (
                    <>
                        <StatCard label="Casos Ativos" value={stats.casosAtivos} icon={Activity} />
                        <StatCard label="Buscas Ap. (Ano Corrente)" value={stats.buscasAno} icon={Search} />
                        <StatCard label="Cautelares Cumpridas (Ano)" value={stats.cumpridasAno} icon={Gavel} />
                        <StatCard label="Faccionados Cadastrados" value={stats.faccionadosCadastrados} icon={Users} />
                    </>
                )}
            </div>

            {/* ROW 2: Charts */}
            <div className="dashboard-row-2">
                <div className="chart-container-large">
                    <div className="chart-header">
                        <h3 className="chart-title">Histórico de Casos (Em Trâmite)</h3>
                    </div>
                    {isLoading ? (
                        <div className="skeleton" style={{ height: '220px' }}></div>
                    ) : stats.historicoCasos.length === 0 ? (
                        <EmptyChartState title="Sem dados de histórico" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={stats.historicoCasos}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis
                                    dataKey="mes"
                                    stroke="var(--text-secondary)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    cursor={{ fill: 'var(--border-color)', opacity: 0.2 }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                                <Bar dataKey="nf" name="Notícia de Fato" fill="#58A6FF" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pic" name="Procedimento Investigatório" fill="#F0883E" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ap" name="Ação Penal" fill="#3FB950" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-container-small">
                    <div className="chart-header">
                        <h3 className="chart-title">Ranking: Princ. Matérias Investigadas</h3>
                    </div>
                    {isLoading ? (
                        <div className="skeleton" style={{ height: '220px' }}></div>
                    ) : stats.rankingTags.length === 0 ? (
                        <EmptyChartState title="Sem tags cadastradas nos casos" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={stats.rankingTags} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="materia"
                                    stroke="var(--text-secondary)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={100}
                                    tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + '...' : val}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    cursor={{ fill: 'var(--border-color)', opacity: 0.2 }}
                                />
                                <Bar dataKey="quantidade" name="Ocorrências" fill="#8C8CF2" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ROW 3: Map */}
            <div className="map-container-full">
                {isLoading ? (
                    <div className="skeleton" style={{ height: '100%', width: '100%' }}></div>
                ) : stats.pontosCalor.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                        Sem endereços georreferenciados para exibir
                    </div>
                ) : (
                    <MapContainer
                        center={[-10.1843, -48.3336]}
                        zoom={10}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            url={theme === 'dark'
                                ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
                                : "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
                            }
                        />
                        <MapSearchControl />
                        {stats.pontosCalor && <HeatmapLayer points={stats.pontosCalor as any} theme={theme} />}
                    </MapContainer>
                )}
            </div>
        </div >
    )
}
