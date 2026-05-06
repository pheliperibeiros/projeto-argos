import { useEffect, useRef, useState } from 'react'
import { DataSet } from 'vis-data'
import { useNavigate } from 'react-router-dom'
import { Layout, Maximize, Activity, Users, GitGraph, Circle } from 'lucide-react'

export interface GraphNode {
    id: string
    label: string
    sublabel?: string
    tipo?: string
    group?: string
    pai?: string
    mae?: string
}

export interface GraphEdge {
    id?: string | number
    from: string
    to: string
    label?: string
    tipo?: string
    intensidade?: number
    direcional?: boolean
}

interface Props {
    nodes: GraphNode[]
    edges: GraphEdge[]
    highlightNodeId?: string
}

/* =========================================
   ÍCONES — stroke refinado, viewBox 24×24
========================================= */

const ICONS: Record<string, string> = {
    pessoa: `
        <circle cx="12" cy="7.5" r="3.5" stroke-width="1.8"/>
        <path d="M4.5 20c1.5-4.2 4.5-6 7.5-6s6 1.8 7.5 6" stroke-width="1.8" stroke-linecap="round"/>`,

    empresa: `
        <rect x="4" y="4" width="16" height="17" rx="2" stroke-width="1.8"/>
        <path d="M9 21v-5h6v5" stroke-width="1.6"/>
        <rect x="8.5" y="8.5" width="2" height="2" rx=".4" fill="currentColor" stroke="none"/>
        <rect x="13" y="8.5" width="2" height="2" rx=".4" fill="currentColor" stroke="none"/>
        <rect x="8.5" y="13" width="2" height="2" rx=".4" fill="currentColor" stroke="none"/>
        <rect x="13" y="13" width="2" height="2" rx=".4" fill="currentColor" stroke="none"/>`,

    veiculo: `
        <path d="M4 15h16l-1.6-5.2A2 2 0 0 0 16.5 8h-9a2 2 0 0 0-1.9 1.8L4 15z" stroke-width="1.8"/>
        <circle cx="8" cy="17.5" r="2" stroke-width="1.8"/>
        <circle cx="16" cy="17.5" r="2" stroke-width="1.8"/>
        <path d="M10 8.5V6m4 2.5V6" stroke-width="1.4" stroke-linecap="round"/>`,

    telefone: `
        <rect x="7" y="3" width="10" height="18" rx="2.5" stroke-width="1.8"/>
        <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none"/>
        <line x1="10" y1="6.5" x2="14" y2="6.5" stroke-width="1.6" stroke-linecap="round"/>`,

    conta: `
        <rect x="3" y="6" width="18" height="13" rx="2.2" stroke-width="1.8"/>
        <path d="M3 10.5h18" stroke-width="1.6"/>
        <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
        <line x1="7" y1="14.5" x2="12" y2="14.5" stroke-width="1.6" stroke-linecap="round"/>`,

    endereco: `
        <path d="M12 22S5.5 15.5 5.5 10a6.5 6.5 0 0 1 13 0c0 5.5-6.5 12-6.5 12z" stroke-width="1.8"/>
        <circle cx="12" cy="10" r="2.5" stroke-width="1.6"/>`,

    caso: `
        <rect x="5" y="3" width="14" height="18" rx="2" stroke-width="1.8"/>
        <line x1="9" y1="8.5" x2="15" y2="8.5" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="9" y1="12" x2="15" y2="12" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="9" y1="15.5" x2="12.5" y2="15.5" stroke-width="1.6" stroke-linecap="round"/>`,

    default: `<circle cx="12" cy="12" r="7.5" stroke-width="1.8"/>`
}

/* =========================================
   PALETA DE NÓS — refinada e consistente
========================================= */

const PALETTE = {
    pessoa: { accent: '#F97316', dim: 'rgba(249,115,22,.18)', glow: 'rgba(249,115,22,.28)' },
    empresa: { accent: '#10B981', dim: 'rgba(16,185,129,.18)', glow: 'rgba(16,185,129,.28)' },
    veiculo: { accent: '#8B5CF6', dim: 'rgba(139,92,246,.18)', glow: 'rgba(139,92,246,.28)' },
    telefone: { accent: '#EF4444', dim: 'rgba(239,68,68,.18)', glow: 'rgba(239,68,68,.28)' },
    conta: { accent: '#3B82F6', dim: 'rgba(59,130,246,.18)', glow: 'rgba(59,130,246,.28)' },
    endereco: { accent: '#D946EF', dim: 'rgba(217,70,239,.18)', glow: 'rgba(217,70,239,.28)' },
    caso: { accent: '#EAB308', dim: 'rgba(234,179,8,.18)', glow: 'rgba(234,179,8,.28)' },
    default: { accent: '#64748B', dim: 'rgba(100,116,139,.10)', glow: 'rgba(100,116,139,.15)' },
}

/* =========================================
   PALETA DE ARESTAS — tons coesos
========================================= */

const getEdgePalette = (isDark: boolean) => ({
    ligacao: { color: '#F59E42', opacity: 0.85, dash: false },
    parentesco: { color: '#F87171', opacity: 0.85, dash: false },
    transferencia: { color: '#34D399', opacity: 0.85, dash: false },
    sociedade: { color: '#60A5FA', opacity: 0.85, dash: false },
    presenca: { color: '#C084FC', opacity: 0.80, dash: true },
    padrao: { color: isDark ? '#64748B' : '#475569', opacity: isDark ? 0.35 : 0.50, dash: false },
})

/* =========================================
   SVG REFINADO — glass + halo + gradiente
========================================= */

function createSvgIcon(
    tipoKey: keyof typeof PALETTE,
    isDark: boolean,
    isHighlighted: boolean
): string {
    const icon = ICONS[tipoKey] ?? ICONS.default
    const pal = PALETTE[tipoKey] ?? PALETTE.default
    const uid = tipoKey + (isHighlighted ? '_h' : '')
    const ringW = isHighlighted ? 2.2 : 1.6

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <defs>

    <!-- Halo radial externo -->
    <radialGradient id="halo_${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${pal.accent}" stop-opacity=".28"/>
      <stop offset="55%"  stop-color="${pal.accent}" stop-opacity=".08"/>
      <stop offset="100%" stop-color="${pal.accent}" stop-opacity="0"/>
    </radialGradient>

    <!-- Preenchimento do disco interno (glass) - com tint da cor de acento para saturação -->
    <radialGradient id="disk_${uid}" cx="38%" cy="32%" r="65%">
      <stop offset="0%"   stop-color="${isDark ? '#1E293B' : '#FFFFFF'}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${isDark ? '#0F172A' : `${pal.accent}15`}" stop-opacity="1"/>
    </radialGradient>

    <!-- Reflexo de luz superior -->
    <radialGradient id="shine_${uid}" cx="42%" cy="28%" r="48%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="${isDark ? '.10' : '.55'}"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Borda gradiente do anel - mais intensa -->
    <linearGradient id="ring_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${pal.accent}" stop-opacity="1"/>
      <stop offset="50%"  stop-color="${pal.accent}" stop-opacity="${isHighlighted ? '.90' : '.75'}"/>
      <stop offset="100%" stop-color="${pal.accent}" stop-opacity="1"/>
    </linearGradient>

    <!-- Sombra forte para destaque -->
    <filter id="shadow_${uid}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="${isHighlighted ? '8' : '5'}"
        flood-color="#000000" flood-opacity="${isDark ? '.65' : '.25'}"/>
      <feDropShadow dx="0" dy="0" stdDeviation="2.5"
        flood-color="${pal.accent}" flood-opacity=".4"/>
    </filter>

  </defs>

  <!-- Halo externo difuso -->
  <circle cx="50" cy="50" r="49" fill="url(#halo_${uid})"/>

  ${isHighlighted ? `
  <!-- Anel rotativo tracejado (highlight) -->
  <circle cx="50" cy="50" r="44"
    fill="none"
    stroke="${pal.accent}"
    stroke-width="1.4"
    stroke-dasharray="3 7"
    stroke-linecap="round"
    opacity=".7">
    <animateTransform attributeName="transform"
      type="rotate" from="0 50 50" to="360 50 50"
      dur="14s" repeatCount="indefinite"/>
  </circle>
  <!-- Anel externo sólido -->
  <circle cx="50" cy="50" r="40"
    fill="none"
    stroke="${pal.accent}"
    stroke-width="1"
    opacity=".25"/>
  ` : ''}

  <!-- Disco principal com sombra colorida -->
  <circle cx="50" cy="50" r="${isHighlighted ? 35 : 32}"
    fill="url(#disk_${uid})"
    stroke="url(#ring_${uid})"
    stroke-width="${isDark ? ringW : ringW + 0.4}"
    filter="url(#shadow_${uid})"/>

  <!-- Reflexo de vidro superior -->
  <circle cx="50" cy="50" r="${isHighlighted ? 35 : 32}"
    fill="url(#shine_${uid})"/>

  <!-- Ícone centralizado - opacidade máxima para destaque -->
  <g transform="translate(${isHighlighted ? 25 : 26}, ${isHighlighted ? 25 : 26}) scale(${isHighlighted ? 2.08 : 2.0})"
     stroke="${pal.accent}"
     fill="none"
     stroke-width="2.1"
     stroke-linecap="round"
     stroke-linejoin="round"
     color="${pal.accent}"
     opacity="1">
    ${icon}
  </g>

</svg>`

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/* =========================================
   OPTIONS VIS-NETWORK
========================================= */

const getOptions = (layout: 'force' | 'hierarchical' | 'hierarchical-lr' | 'circular') => ({
    physics: {
        enabled: layout === 'force' || layout === 'circular',
        forceAtlas2Based: layout === 'force' ? {
            gravitationalConstant: -180,
            centralGravity: 0.015,
            springLength: 180,
            springConstant: 0.08,
            damping: 0.9,
            avoidOverlap: 1.0
        } : undefined,
        barnesHut: layout === 'circular' ? {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 200,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 1
        } : undefined,
        solver: layout === 'circular' ? 'barnesHut' : 'forceAtlas2Based',
        stabilization: { iterations: layout === 'circular' ? 250 : 180 }
    },

    interaction: {
        zoomView: true,
        dragNodes: true,
        hover: true,
        tooltipDelay: 150,
        selectConnectedEdges: true
    },

    layout: {
        improvedLayout: true,
        hierarchical: (layout === 'hierarchical' || layout === 'hierarchical-lr')
            ? {
                enabled: true,
                direction: layout === 'hierarchical' ? 'UD' : 'LR',
                sortMethod: 'directed',
                nodeSpacing: 180,
                levelSeparation: 200
            }
            : { enabled: false }
    },
    nodes: {
        chosen: false,
        borderWidth: 0,
        borderWidthSelected: 0
    }
})

/* =========================================
   RESOLVE TIPO DO NÓ
========================================= */

function resolveNodeType(n: GraphNode): keyof typeof PALETTE {
    const t = (n.tipo || n.group || '').toLowerCase()
    if (t.includes('empresa') || t.includes('juridica') || t.includes('pj')) return 'empresa'
    if (t.includes('pessoa') || t.includes('fisica') || t.includes('pf') || t.includes('investigado')) return 'pessoa'
    if (t.includes('veiculo') || t.includes('carro')) return 'veiculo'
    if (t.includes('telefone') || t.includes('chip')) return 'telefone'
    if (t.includes('conta') || t.includes('pix') || t.includes('banc')) return 'conta'
    if (t.includes('endereco') || t.includes('local')) return 'endereco'
    if (t.includes('caso') || t.includes('processo')) return 'caso'
    return 'default'
}

/* =========================================
   RESOLVE TIPO DA ARESTA
========================================= */

function resolveEdgeType(e: GraphEdge): keyof ReturnType<typeof getEdgePalette> {
    const t = (e.tipo || '').toLowerCase()
    if (t.includes('ligacao')) return 'ligacao'
    if (t.includes('parentesco')) return 'parentesco'
    if (t.includes('transferencia')) return 'transferencia'
    if (t.includes('sociedade')) return 'sociedade'
    if (t.includes('presenca')) return 'presenca'
    return 'padrao'
}

/* =========================================
   COMPONENTE
========================================= */

export default function VisNetworkGraph({ nodes, edges, highlightNodeId }: Props) {
    const navigate = useNavigate()
    const ref = useRef<HTMLDivElement>(null)
    const netRef = useRef<any>(null)

    const [layout, setLayout] = useState<'force' | 'hierarchical' | 'hierarchical-lr' | 'circular'>('force')
    const [showParents, setShowParents] = useState(false)
    const [isDark, setIsDark] = useState(
        document.documentElement.getAttribute('data-theme') !== 'light'
    )

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.getAttribute('data-theme') !== 'light')
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!ref.current) return

        import('vis-network').then((mod) => {
            const NetworkClass = (mod as any).Network ?? (mod as any).default?.Network
            if (!NetworkClass || !ref.current) return

            /* ---------- NODOS ---------- */
            const finalNodes = [...nodes]
            const finalEdges = [...edges]

            if (showParents) {
                nodes.forEach(n => {
                    const typeKey = resolveNodeType(n)
                    const isPerson = typeKey === 'pessoa';
                    if (isPerson && n.pai) {
                        const parentId = `pai_${n.id}`
                        finalNodes.push({
                            id: parentId,
                            label: n.pai,
                            sublabel: 'Genitor (Pai)',
                            tipo: 'pessoa',
                            group: 'familia'
                        })
                        // Invertida a direção: do Genitor PARA o Alvo
                        finalEdges.push({ from: parentId, to: n.id, label: 'Pai', tipo: 'parentesco', direcional: true })
                    }
                    if (isPerson && n.mae) {
                        const parentId = `mae_${n.id}`
                        finalNodes.push({
                            id: parentId,
                            label: n.mae,
                            sublabel: 'Genitora (Mãe)',
                            tipo: 'pessoa',
                            group: 'familia'
                        })
                        // Invertida a direção: da Genitora PARA o Alvo
                        finalEdges.push({ from: parentId, to: n.id, label: 'Mãe', tipo: 'parentesco', direcional: true })
                    }
                })
            }

            const ds = new DataSet(
                finalNodes.map((n) => {
                    const typeKey = resolveNodeType(n)
                    const isHighlighted = n.id === highlightNodeId
                    const isFamily = n.group === 'familia'
                    const pal = PALETTE[typeKey] ?? PALETTE.default

                    return {
                        id: n.id,
                        label: `<b>${n.label}</b>${n.sublabel ? `\n${n.sublabel}` : ''}`,
                        shape: 'image',
                        image: createSvgIcon(typeKey, isDark, isHighlighted || isFamily),
                        size: isHighlighted ? 46 : (isFamily ? 24 : 30),
                        chosen: false,
                        borderWidth: 0,
                        borderWidthSelected: 0,

                        font: {
                            color: isDark ? '#E2E8F0' : '#1E293B', // Texto mais escuro no modo claro
                            size: 11,
                            face: '"DM Sans", "Geist", ui-sans-serif, sans-serif',
                            multi: 'html',
                            vadjust: 6,
                            bold: {
                                color: isDark ? '#F8FAFC' : '#000000', // Preto total para negrito no modo claro
                                size: 12.5,
                                face: '"DM Sans", "Geist", ui-sans-serif, sans-serif',
                            }
                        },

                        shadow: {
                            enabled: true,
                            color: isDark ? `rgba(0,0,0,.6)` : pal.glow,
                            size: isHighlighted ? 20 : 10,
                            x: 0,
                            y: isHighlighted ? 6 : 4,
                        },

                        _tipo: typeKey,
                        group: n.group
                    }
                })
            )

            /* ---------- ARESTAS ---------- */
            const epMap = getEdgePalette(isDark)
            const es = new DataSet(
                finalEdges.map((e, i) => {
                    const eType = resolveEdgeType(e)
                    const ep = epMap[eType]

                    /* Largura base + intensidade mapeada suavemente */
                    const baseWidth = eType === 'padrao' ? 1 : 1.6
                    const width = baseWidth + ((e.intensidade ?? 1) - 1) * 0.4

                    return {
                        id: e.id ?? i,
                        from: e.from,
                        to: e.to,
                        label: e.label ?? '',

                        font: {
                            color: isDark ? '#94A3B8' : '#80776bff',
                            size: 10,
                            face: '"DM Sans", ui-sans-serif, sans-serif',
                            background: isDark ? 'rgba(15,23,42,.85)' : 'rgba(255,255,255,.88)',
                            strokeWidth: 0,
                            align: 'middle',
                        },

                        color: {
                            color: ep.color,
                            highlight: ep.color,
                            hover: ep.color,
                            opacity: ep.opacity,
                        },

                        width,

                        /* Linhas tracejadas para relações de presença */
                        ...(ep.dash ? {
                            dashes: [6, 4],
                        } : {}),

                        arrows: e.direcional
                            ? { to: { enabled: true, scaleFactor: 0.45, type: 'arrow' } }
                            : undefined,

                        smooth: {
                            enabled: true,
                            type: 'curvedCW',
                            roundness: 0.15,
                        },

                        selectionWidth: (w: number) => w + 1.5,
                        hoverWidth: (w: number) => w + 0.8,
                    }
                })
            )

            /* ---------- REDE ---------- */
            const net = new NetworkClass(
                ref.current,
                { nodes: ds, edges: es },
                getOptions(layout)
            )

            net.on('click', (params: any) => {
                if (params.nodes?.length) {
                    const nodeId = params.nodes[0]
                    const node = ds.get(nodeId) as any

                    if (node?.group === 'familia') {
                        // Extrai ID do alvo a partir de pai_UUID ou mae_UUID
                        const targetId = nodeId.toString().replace(/^(pai_|mae_)/, '')
                        navigate(`/investigado/${targetId}`)
                        return
                    }

                    if ((node?._tipo === 'pessoa' || node?._tipo === 'empresa') && nodeId !== highlightNodeId) {
                        navigate(`/investigado/${nodeId}`)
                    }
                    if (node?._tipo === 'caso' && nodeId !== highlightNodeId) {
                        navigate(`/casos/${nodeId}`)
                    }
                }
            })

            net.once('stabilizationIterationsDone', () => {
                // Física habilitada permanentemente conforme pedido
                if (layout === 'force' || layout === 'circular') net.setOptions({ physics: { enabled: true } })
            })

            netRef.current = net
        })

        return () => {
            netRef.current?.destroy()
            netRef.current = null
        }
    }, [nodes, edges, layout, isDark, highlightNodeId, showParents])

    /* ---------- TOOLBAR ---------- */
    const toolBtn = (active: boolean) => ({
        padding: '6px 10px',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        background: active ? 'var(--accent-color)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
        transition: 'background .15s, color .15s',
    } as const)

    return (
        <div style={{
            position: 'relative',
            height: 500,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
        }}>
            {/* Toolbar */}
            <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 10,
                display: 'flex',
                gap: 6,
                padding: 5,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,.18)',
                backdropFilter: 'blur(8px)',
            }}>
                <button onClick={() => setLayout('force')} style={toolBtn(layout === 'force')} title="Layout de Força">      <Activity size={15} /> </button>
                <button onClick={() => setLayout('hierarchical')} style={toolBtn(layout === 'hierarchical')} title="Hierárquico Vertical">    <Layout size={15} /> </button>
                <button onClick={() => setLayout('hierarchical-lr')} style={toolBtn(layout === 'hierarchical-lr')} title="Hierárquico Horizontal"> <GitGraph size={15} /> </button>
                <button onClick={() => setLayout('circular')} style={toolBtn(layout === 'circular')} title="Layout Circular"> <Circle size={15} /> </button>
                <button onClick={() => setShowParents(!showParents)} style={toolBtn(showParents)} title="Exibir Genitores"> <Users size={15} /> </button>
                <button onClick={() => netRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })}
                    style={toolBtn(false)} title="Encaixar tudo"><Maximize size={15} /></button>
            </div>

            {/* Canvas da rede */}
            <div
                ref={ref}
                style={{
                    height: '100%',
                    backgroundColor: isDark ? '#0a0f1a' : '#f4f7fb', // Fundo que aumenta o contraste
                    backgroundImage: isDark
                        ? 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)'
                        : 'radial-gradient(circle, rgba(0,0,0,.06) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                }}
            />
        </div>
    )
}
