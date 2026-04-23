import { useEffect, useRef, useState } from 'react'
import { DataSet } from 'vis-data'
import { useNavigate } from 'react-router-dom'
import { Layout, Maximize, Activity } from 'lucide-react'

export interface GraphNode {
    id: string
    label: string
    sublabel?: string
    tipo?: string
    group?: string
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
    pessoa: { accent: '#F59E42', dim: 'rgba(245,158,66,.14)', glow: 'rgba(245,158,66,.22)' },
    empresa: { accent: '#34D399', dim: 'rgba(52,211,153,.14)', glow: 'rgba(52,211,153,.22)' },
    veiculo: { accent: '#A78BFA', dim: 'rgba(167,139,250,.14)', glow: 'rgba(167,139,250,.22)' },
    telefone: { accent: '#F87171', dim: 'rgba(248,113,113,.14)', glow: 'rgba(248,113,113,.22)' },
    conta: { accent: '#60A5FA', dim: 'rgba(96,165,250,.14)', glow: 'rgba(96,165,250,.22)' },
    endereco: { accent: '#C084FC', dim: 'rgba(192,132,252,.14)', glow: 'rgba(192,132,252,.22)' },
    caso: { accent: '#FCD34D', dim: 'rgba(252,211,77,.14)', glow: 'rgba(252,211,77,.22)' },
    default: { accent: '#94A3B8', dim: 'rgba(148,163,184,.10)', glow: 'rgba(148,163,184,.15)' },
}

/* =========================================
   PALETA DE ARESTAS — tons coesos
========================================= */

const EDGE_PALETTE = {
    ligacao: { color: '#F59E42', opacity: 0.80, dash: false },
    parentesco: { color: '#F87171', opacity: 0.80, dash: false },
    transferencia: { color: '#34D399', opacity: 0.80, dash: false },
    sociedade: { color: '#60A5FA', opacity: 0.80, dash: false },
    presenca: { color: '#C084FC', opacity: 0.75, dash: true },
    padrao: { color: '#64748B', opacity: 0.28, dash: false },
}

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

    <!-- Preenchimento do disco interno (glass) -->
    <radialGradient id="disk_${uid}" cx="38%" cy="32%" r="65%">
      <stop offset="0%"   stop-color="${isDark ? '#1E293B' : '#F8FAFF'}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${isDark ? '#0F172A' : '#EEF2FF'}" stop-opacity="1"/>
    </radialGradient>

    <!-- Reflexo de luz superior -->
    <radialGradient id="shine_${uid}" cx="42%" cy="28%" r="48%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="${isDark ? '.10' : '.55'}"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Borda gradiente do anel -->
    <linearGradient id="ring_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${pal.accent}" stop-opacity="${isHighlighted ? '1' : '.85'}"/>
      <stop offset="50%"  stop-color="${pal.accent}" stop-opacity="${isHighlighted ? '.70' : '.45'}"/>
      <stop offset="100%" stop-color="${pal.accent}" stop-opacity="${isHighlighted ? '1' : '.85'}"/>
    </linearGradient>

    <!-- Sombra suave do disco -->
    <filter id="shadow_${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="${isHighlighted ? '6' : '3.5'}"
        flood-color="${pal.accent}" flood-opacity="${isHighlighted ? '.35' : '.20'}"/>
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
    stroke-width="${ringW}"
    filter="url(#shadow_${uid})"/>

  <!-- Reflexo de vidro superior -->
  <circle cx="50" cy="50" r="${isHighlighted ? 35 : 32}"
    fill="url(#shine_${uid})"/>

  <!-- Ícone centralizado -->
  <g transform="translate(${isHighlighted ? 25 : 26}, ${isHighlighted ? 25 : 26}) scale(${isHighlighted ? 2.08 : 2.0})"
     stroke="${pal.accent}"
     fill="none"
     stroke-linecap="round"
     stroke-linejoin="round"
     color="${pal.accent}"
     opacity="${isDark ? '.92' : '.82'}">
    ${icon}
  </g>

</svg>`

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/* =========================================
   OPTIONS VIS-NETWORK
========================================= */

const getOptions = (layout: 'force' | 'hierarchical') => ({
    physics: {
        enabled: layout === 'force',
        forceAtlas2Based: {
            gravitationalConstant: -160,
            centralGravity: 0.01,
            springLength: 160,
            springConstant: 0.07,
            damping: 0.9
        },
        solver: 'forceAtlas2Based',
        stabilization: { iterations: 180 }
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
        hierarchical:
            layout === 'hierarchical'
                ? {
                    enabled: true,
                    direction: 'UD',
                    sortMethod: 'directed',
                    nodeSpacing: 160,
                    levelSeparation: 160
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

function resolveEdgeType(e: GraphEdge): keyof typeof EDGE_PALETTE {
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

    const [layout, setLayout] = useState<'force' | 'hierarchical'>('force')
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
            const ds = new DataSet(
                nodes.map((n) => {
                    const typeKey = resolveNodeType(n)
                    const isHighlighted = n.id === highlightNodeId
                    const pal = PALETTE[typeKey] ?? PALETTE.default

                    return {
                        id: n.id,
                        label: `<b>${n.label}</b>${n.sublabel ? `\n${n.sublabel}` : ''}`,
                        shape: 'image',
                        image: createSvgIcon(typeKey, isDark, isHighlighted),
                        size: isHighlighted ? 46 : 30,
                        chosen: false,
                        borderWidth: 0,
                        borderWidthSelected: 0,

                        font: {
                            color: isDark ? '#CBD5E1' : '#374151',
                            size: 11,
                            face: '"DM Sans", "Geist", ui-sans-serif, sans-serif',
                            multi: 'html',
                            vadjust: 4,
                            bold: {
                                color: isDark ? '#F1F5F9' : '#111827',
                                size: 12,
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

                        _tipo: typeKey
                    }
                })
            )

            /* ---------- ARESTAS ---------- */
            const es = new DataSet(
                edges.map((e, i) => {
                    const eType = resolveEdgeType(e)
                    const ep = EDGE_PALETTE[eType]

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
                    if ((node?._tipo === 'pessoa' || node?._tipo === 'empresa') && nodeId !== highlightNodeId) {
                        navigate(`/investigado/${nodeId}`)
                    }
                    if (node?._tipo === 'caso' && nodeId !== highlightNodeId) {
                        navigate(`/casos/${nodeId}`)
                    }
                }
            })

            net.once('stabilizationIterationsDone', () => {
                if (layout === 'force') net.setOptions({ physics: { enabled: false } })
            })

            netRef.current = net
        })

        return () => {
            netRef.current?.destroy()
            netRef.current = null
        }
    }, [nodes, edges, layout, isDark, highlightNodeId])

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
                <button onClick={() => setLayout('force')} style={toolBtn(layout === 'force')} title="Layout de força">      <Activity size={15} /> </button>
                <button onClick={() => setLayout('hierarchical')} style={toolBtn(layout === 'hierarchical')} title="Layout hierárquico">    <Layout size={15} /> </button>
                <button onClick={() => netRef.current?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })}
                    style={toolBtn(false)} title="Encaixar tudo"><Maximize size={15} /></button>
            </div>

            {/* Canvas da rede */}
            <div
                ref={ref}
                style={{
                    height: '100%',
                    backgroundImage: isDark
                        ? 'radial-gradient(circle, rgba(255,255,255,.04) 1px, transparent 1px)'
                        : 'radial-gradient(circle, rgba(0,0,0,.045) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />
        </div>
    )
}
