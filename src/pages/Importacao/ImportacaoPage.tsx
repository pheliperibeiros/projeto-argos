import React, { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    Upload, FileSpreadsheet, Download, AlertTriangle,
    CheckCircle2, ArrowLeft, Loader,
    ShieldCheck, FolderOpen, ChevronDown, ChevronUp,
    ChevronsUpDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

import { PageHeader } from '@/components'
import {
    parseArquivo, processarImportacao,
    gerarTemplate,
} from '@/lib/importacao/engine'
import type { ResultadoImportacao, ResultadoLinha, LinhaImportacao } from '@/lib/importacao/engine'

/** Passos do wizard de importação */
type Passo = 'upload' | 'preview' | 'processando' | 'resultado'

export default function ImportacaoPage() {
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Estado do wizard
    const [passo, setPasso] = useState<Passo>('upload')
    const [arquivo, setArquivo] = useState<File | null>(null)
    const [cabecalhos, setCabecalhos] = useState<string[]>([])
    const [linhas, setLinhas] = useState<LinhaImportacao[]>([])
    const [errosParse, setErrosParse] = useState<string[]>([])

    // Progresso
    const [progresso, setProgresso] = useState<{ atual: number, total: number, msg?: string }>({ atual: 0, total: 0, msg: '' })
    const [logProgresso, setLogProgresso] = useState<ResultadoLinha[]>([])

    // Resultado final
    const [resultado, setResultado] = useState<ResultadoImportacao | null>(null)
    const [logExpandido, setLogExpandido] = useState(false)

    // Configurações da Tabela
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
    const [colWidths, setColWidths] = useState<Record<string, number>>({})
    const resizing = useRef<{ key: string, startX: number, startWidth: number } | null>(null)


    // ── HANDLERS ──────────────────────────────────────

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) await processarArquivo(f)
    }, [])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (f) await processarArquivo(f)
    }

    const processarArquivo = async (file: File) => {
        const extensoes = ['.xlsx', '.xls', '.csv']
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
        if (!extensoes.includes(ext)) {
            toast.error('Formato não suportado. Use .xlsx, .xls ou .csv')
            return
        }

        try {
            const { cabecalhos: cabs, linhas: lns, errosParse: ep } = await parseArquivo(file)
            setArquivo(file)
            setCabecalhos(cabs)
            setLinhas(lns)
            setErrosParse(ep)
            setPasso('preview')
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    const iniciarImportacao = async () => {
        setPasso('processando')
        setLogProgresso([])
        setProgresso({ atual: 0, total: linhas.length, msg: 'Iniciando motor de importação...' })

        try {
            const res = await processarImportacao(
                linhas,
                cabecalhos,
                null,
                (_atual, _total, _linha, statusMessage) => {
                    setProgresso(prev => ({ ...prev, atual: _atual, msg: statusMessage || 'Processando...' }))
                    setLogProgresso(prev => [...prev, _linha])
                }
            )
            setResultado(res)
            setPasso('resultado')
            queryClient.invalidateQueries({ queryKey: ['investigados'] })
            queryClient.invalidateQueries({ queryKey: ['casos'] })
        } catch (err: any) {
            console.error('[ImportacaoPage] Erro fatal:', err)
            toast.error(err.message || 'Erro durante a importação')
            setPasso('preview')
        }
    }

    const reiniciar = () => {
        setPasso('upload')
        setArquivo(null)
        setCabecalhos([])
        setLinhas([])
        setErrosParse([])
        setResultado(null)
        setLogProgresso([])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleCellChange = (linhaNum: number, cabecalho: string, valor: string) => {
        setLinhas(prev => prev.map(l =>
            l.linha === linhaNum
                ? { ...l, dados: { ...l.dados, [cabecalho]: valor } }
                : l
        ))
    }

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'asc' }
        })
    }

    const sortedLinhas = React.useMemo(() => {
        if (!sortConfig) return linhas
        return [...linhas].sort((a, b) => {
            const valA = a.dados[sortConfig.key] || ''
            const valB = b.dados[sortConfig.key] || ''
            return sortConfig.direction === 'asc'
                ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [linhas, sortConfig])

    // Redimensionamento
    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!resizing.current) return
        const { key, startX, startWidth } = resizing.current
        const newWidth = Math.max(80, startWidth + (e.clientX - startX))
        setColWidths(prev => ({ ...prev, [key]: newWidth }))
    }, [])

    const onMouseUp = useCallback(() => {
        resizing.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
    }, [onMouseMove])

    const onMouseDown = (key: string, e: React.MouseEvent) => {
        const th = (e.currentTarget as HTMLElement).parentElement
        if (!th) return
        resizing.current = {
            key,
            startX: e.clientX,
            startWidth: th.offsetWidth
        }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        e.preventDefault()
    }

    // ── RENDERS ───────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
            <PageHeader
                title="Importação em Lote"
                subtitle="Importe investigados a partir de planilhas CSV ou Excel"
                actions={
                    <button
                        onClick={async () => {
                            try {
                                await gerarTemplate()
                            } catch (err: any) {
                                toast.error('Erro ao gerar template: ' + err.message)
                            }
                        }}
                        style={{
                            backgroundColor: 'transparent', color: 'var(--accent-secondary)',
                            border: '1px solid var(--border-color)', padding: '8px 16px',
                            borderRadius: '6px', display: 'flex', alignItems: 'center',
                            gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                        }}
                    >
                        <Download size={16} /> Baixar Template
                    </button>
                }
            />

            {/* ── PASSO 1: UPLOAD ── */}
            {passo === 'upload' && (
                <section style={{
                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '48px 32px'
                }}>
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-color)', borderRadius: '12px',
                            padding: '64px 32px', textAlign: 'center', cursor: 'pointer',
                            transition: 'all 0.3s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-color)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                    >
                        <Upload size={48} color="var(--border-color)" />
                        <div>
                            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '18px' }}>
                                Arraste o arquivo ou clique para selecionar
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                                Formatos aceitos: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Instruções rápidas */}
                    <div style={{
                        marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '16px'
                    }}>
                        {[
                            { icon: <FileSpreadsheet size={20} color="var(--accent-secondary)" />, title: 'Template Guiado', desc: 'Baixe o modelo com exemplos e instruções' },
                            { icon: <ShieldCheck size={20} color="var(--success-color)" />, title: 'Validação Automática', desc: 'CPF/CNPJ validados, tipo inferido automaticamente' },
                            { icon: <FolderOpen size={20} color="var(--accent-color)" />, title: 'Casos na Planilha', desc: 'E-Proc, Codinome e Tags por linha — casos auto-criados' },
                        ].map((card, i) => (
                            <div key={i} style={{
                                padding: '20px', backgroundColor: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)', borderRadius: '8px',
                                display: 'flex', gap: '12px', alignItems: 'flex-start'
                            }}>
                                {card.icon}
                                <div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{card.title}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{card.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── PASSO 2: PREVIEW ── */}
            {passo === 'preview' && (
                <>
                    <section style={{
                        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '24px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                                    <FileSpreadsheet size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                    {arquivo?.name}
                                </h4>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    {linhas.length} registros detectados • {cabecalhos.length} colunas • <strong>Edição habilitada</strong>
                                </span>
                            </div>
                            <button
                                onClick={reiniciar}
                                style={{
                                    background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                                    padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px'
                                }}
                            >
                                <ArrowLeft size={14} /> Trocar arquivo
                            </button>
                        </div>

                        {errosParse.length > 0 && (
                            <div style={{
                                padding: '12px 16px', backgroundColor: 'rgba(248,81,73,0.1)',
                                border: '1px solid rgba(248,81,73,0.3)', borderRadius: '6px',
                                marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center'
                            }}>
                                <AlertTriangle size={16} color="var(--danger-color)" />
                                <span style={{ color: 'var(--danger-color)', fontSize: '13px' }}>{errosParse.join('; ')}</span>
                            </div>
                        )}

                        {/* Preview da tabela */}
                        <div style={{
                            overflowX: 'auto', maxHeight: '500px', overflowY: 'auto',
                            borderRadius: '6px', border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)'
                        }}>
                            <table style={{
                                width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0,
                                fontSize: '12px', tableLayout: 'fixed'
                            }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 10 }}>
                                        <th style={{ ...thStyle, width: '50px' }}>#</th>
                                        {cabecalhos.map((h, i) => {
                                            const currentWidth = colWidths[h] || 150
                                            return (
                                                <th
                                                    key={i}
                                                    style={{
                                                        ...thStyle,
                                                        width: `${currentWidth}px`,
                                                        position: 'relative',
                                                        cursor: 'default',
                                                        userSelect: 'none',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <div
                                                        onClick={() => handleSort(h)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            cursor: 'pointer', paddingRight: '12px',
                                                            whiteSpace: 'nowrap', overflow: 'hidden'
                                                        }}
                                                    >
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</span>
                                                        {sortConfig?.key === h ? (
                                                            sortConfig.direction === 'asc' ? <ChevronUp size={12} style={{ flexShrink: 0 }} /> : <ChevronDown size={12} style={{ flexShrink: 0 }} />
                                                        ) : (
                                                            <ChevronsUpDown size={12} opacity={0.3} style={{ flexShrink: 0 }} />
                                                        )}
                                                    </div>
                                                    {/* Handle de redimensionamento */}
                                                    <div
                                                        onMouseDown={(e) => onMouseDown(h, e)}
                                                        style={{
                                                            position: 'absolute', right: 0, top: 0, bottom: 0,
                                                            width: '6px', cursor: 'col-resize',
                                                            zIndex: 20,
                                                            borderRight: '1px solid var(--border-color)'
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.borderRightColor = '#F78166')}
                                                        onMouseLeave={e => (e.currentTarget.style.borderRightColor = 'var(--border-color)')}
                                                    />
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLinhas.map((l) => (
                                        <tr key={l.linha} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>{l.linha}</td>
                                            {cabecalhos.map((h, i) => (
                                                <td key={i} style={{ ...tdStyle, padding: 0, borderBottom: '1px solid var(--border-color)' }}>
                                                    <input
                                                        value={l.dados[h] || ''}
                                                        onChange={(e) => handleCellChange(l.linha, h, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--text-primary)',
                                                            padding: '8px 12px',
                                                            fontSize: '12px',
                                                            outline: 'none',
                                                            minWidth: '100%',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={(e) => e.target.parentElement!.style.backgroundColor = '#1C2128'}
                                                        onBlur={(e) => e.target.parentElement!.style.backgroundColor = 'transparent'}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Botão de ação */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            onClick={reiniciar}
                            style={{
                                background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                                padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={iniciarImportacao}
                            disabled={linhas.length === 0}
                            style={{
                                backgroundColor: '#F78166', color: 'white', border: 'none',
                                padding: '10px 32px', borderRadius: '6px', fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                opacity: linhas.length === 0 ? 0.5 : 1
                            }}
                        >
                            <Upload size={16} /> Importar {linhas.length} Registros
                        </button>
                    </div>
                </>
            )}

            {/* ── PASSO 3: PROCESSANDO ── */}
            {passo === 'processando' && (
                <section style={{
                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '48px 32px', textAlign: 'center'
                }}>
                    <Loader size={48} color="var(--accent-color)" style={{ animation: 'spin 1s linear infinite' }} />
                    <h3 style={{ color: 'var(--text-primary)', marginTop: '24px', marginBottom: '8px' }}>
                        Importando dados...
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 32px 0' }}>
                        {progresso.atual} de {progresso.total} registros processados
                    </p>
                    {progresso.msg && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', fontFamily: 'IBM Plex Mono' }}>
                            &gt; {progresso.msg}
                        </p>
                    )}

                    {/* Barra de Progresso */}
                    <div style={{
                        width: '100%', maxWidth: '500px', margin: '0 auto',
                        height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0}%`,
                            height: '100%', backgroundColor: 'var(--accent-color)', borderRadius: '4px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>

                    {/* Log em tempo real */}
                    {logProgresso.length > 0 && (
                        <div style={{
                            marginTop: '24px', maxHeight: '200px', overflowY: 'auto',
                            textAlign: 'left', padding: '16px', backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)', borderRadius: '6px',
                            fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px'
                        }}>
                            {logProgresso.slice(-8).map((log, i) => (
                                <div key={i} style={{ color: log.status === 'sucesso' ? 'var(--success-color)' : log.status === 'erro' ? 'var(--danger-color)' : 'var(--warning-color)', marginBottom: '4px' }}>
                                    [{log.status.toUpperCase()}] Linha {log.linha}: {log.nome}
                                    {log.motivo && <span style={{ color: 'var(--text-secondary)' }}> — {log.motivo}</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </section>
            )}

            {/* ── PASSO 4: RESULTADO ── */}
            {passo === 'resultado' && resultado && (
                <>
                    <section style={{
                        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '32px'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <CheckCircle2 size={48} color="#3FB950" />
                            <h3 style={{ color: 'var(--text-primary)', marginTop: '16px', marginBottom: '8px' }}>
                                Importação Concluída
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                                Processados em {(resultado.tempoMs / 1000).toFixed(1)}s
                            </p>
                        </div>

                        {/* Cards de resumo */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '32px' }}>
                            <SummaryCard value={resultado.total} label="Total" color="var(--accent-secondary)" />
                            <SummaryCard value={resultado.sucesso} label="Inseridos" color="var(--success-color)" />
                            <SummaryCard value={resultado.casosCriados} label="Casos Criados" color="var(--info-color)" />
                            <SummaryCard value={resultado.duplicatas} label="Duplicatas" color="var(--warning-color)" />
                            <SummaryCard value={resultado.erros} label="Erros" color="var(--danger-color)" />
                        </div>

                        {/* Detalhes expansíveis */}
                        <div>
                            <button
                                onClick={() => setLogExpandido(!logExpandido)}
                                style={{
                                    background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                    padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
                                    width: '100%', textAlign: 'left', display: 'flex',
                                    justifyContent: 'space-between', alignItems: 'center', fontSize: '13px'
                                }}
                            >
                                <span>📋 Log detalhado ({resultado.detalhes.length} linhas)</span>
                                {logExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {logExpandido && (
                                <div style={{
                                    maxHeight: '400px', overflowY: 'auto', marginTop: '12px',
                                    border: '1px solid var(--border-color)', borderRadius: '6px'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-primary)', position: 'sticky', top: 0 }}>
                                                <th style={thStyle}>Linha</th>
                                                <th style={thStyle}>Status</th>
                                                <th style={thStyle}>Nome</th>
                                                <th style={thStyle}>Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultado.detalhes.map((d, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={tdStyle}>{d.linha}</td>
                                                    <td style={tdStyle}>
                                                        <StatusBadge status={d.status} />
                                                    </td>
                                                    <td style={tdStyle}>{d.nome}</td>
                                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: '300px' }}>{d.motivo || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            onClick={() => exportarRelatorio(resultado)}
                            style={{
                                background: 'none', border: '1px solid var(--border-color)', color: 'var(--accent-secondary)',
                                padding: '10px 24px', borderRadius: '6px', cursor: 'pointer',
                                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
                            }}
                        >
                            <Download size={16} /> Exportar Relatório
                        </button>
                        <button
                            onClick={reiniciar}
                            style={{
                                backgroundColor: '#F78166', color: 'white', border: 'none',
                                padding: '10px 24px', borderRadius: '6px', fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Nova Importação
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

// ── SUB-COMPONENTES ────────────────────────────────────

function SummaryCard({ value, label, color }: { value: number; label: string; color: string }) {
    return (
        <div style={{
            padding: '20px', backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center'
        }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        sucesso: { bg: 'rgba(63,185,80,0.15)', color: 'var(--success-color)', label: 'INSERIDO' },
        erro: { bg: 'rgba(248,81,73,0.15)', color: 'var(--danger-color)', label: 'ERRO' },
        duplicata: { bg: 'rgba(210,153,34,0.15)', color: 'var(--warning-color)', label: 'DUPLICATA' },
        atualizado: { bg: 'rgba(88,166,255,0.15)', color: 'var(--accent-secondary)', label: 'ATUALIZADO' },
    }
    const s = map[status] || map.erro
    return (
        <span style={{
            padding: '2px 8px', borderRadius: '12px', fontSize: '10px',
            fontWeight: 600, backgroundColor: s.bg, color: s.color
        }}>
            {s.label}
        </span>
    )
}

// ── EXPORTAR RELATÓRIO ─────────────────────────────────

function exportarRelatorio(resultado: ResultadoImportacao) {
    const wb = XLSX.utils.book_new()

    // Resumo
    const resumo = [
        ['Relatório de Importação — ARGOS'],
        ['Data', new Date().toLocaleString('pt-BR')],
        ['Total de Registros', resultado.total],
        ['Inseridos com Sucesso', resultado.sucesso],
        ['Duplicatas Detectadas', resultado.duplicatas],
        ['Erros', resultado.erros],
        ['Tempo de Processamento', `${(resultado.tempoMs / 1000).toFixed(1)}s`],
    ]

    const resumoSheet = XLSX.utils.aoa_to_sheet(resumo)
    XLSX.utils.book_append_sheet(wb, resumoSheet, 'Resumo')

    // Detalhes
    const cabDet = ['Linha', 'Status', 'Nome', 'Motivo', 'ID']
    const linhasDet = resultado.detalhes.map(d => [d.linha, d.status.toUpperCase(), d.nome, d.motivo || '', d.id || ''])
    const detSheet = XLSX.utils.aoa_to_sheet([cabDet, ...linhasDet])
    XLSX.utils.book_append_sheet(wb, detSheet, 'Detalhes')

    XLSX.writeFile(wb, `Argos_Relatorio_Importacao_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ── ESTILOS ────────────────────────────────────────────

const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border-color)'
}

const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '12px'
}
