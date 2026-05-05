import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LOGO_B64 } from './logo_login_b64'

interface PDFConfig {
    title: string
    columns: string[]
    rows: (string | number)[][]
    user: { username: string }
    tipo: string // ex: 'DII', 'CONECTIVIDADE', 'EFETIVIDADE'
}

// ─── Paleta modo claro (printer-friendly) ──────────────────────────────────
const C = {
    headerBg: [10, 25, 60] as [number, number, number],        // Azul escuro institucional
    headerText: [255, 255, 255] as [number, number, number],
    argosAccent: [180, 140, 60] as [number, number, number],   // Dourado Cinzel
    bodyBg: [255, 255, 255] as [number, number, number],
    altRowBg: [240, 244, 250] as [number, number, number],
    headBg: [10, 25, 60] as [number, number, number],          // Azul para cabeçalho da tabela
    headText: [255, 255, 255] as [number, number, number],
    cellText: [20, 20, 40] as [number, number, number],
    footerText: [100, 100, 120] as [number, number, number],
    watermark: [10, 25, 60] as [number, number, number],
    border: [200, 210, 230] as [number, number, number],
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function normalizeName(name: string): string {
    // Remove caracteres de controle e substitui unicode problemático
    return name
        .normalize('NFC')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim()
}

function setFont(doc: jsPDF, family: 'arial' | 'cinzel', style: 'normal' | 'bold' = 'normal') {
    // jsPDF built-in: helvetica ≈ arial, times ≈ serif roman
    // Cinzel é a fonte do sistema para "ARGOS"; usamos 'times' como aproximação no jsPDF
    if (family === 'cinzel') {
        doc.setFont('times', 'bold') // aproximação da fonte Cinzel/Roman para jsPDF
    } else {
        doc.setFont('helvetica', style) // Arial / Helvetica
    }
}

// ─── Cabeçalho: chamado em CADA página ────────────────────────────────────
function drawHeader(doc: jsPDF, title: string, now: string) {
    const pageW = doc.internal.pageSize.getWidth()
    const headerH = 34

    // Fundo do cabeçalho
    doc.setFillColor(...C.headerBg)
    doc.rect(0, 0, pageW, headerH, 'F')

    // Logo (quadrada, 24×24 mm, margem 5)
    try {
        doc.addImage(LOGO_B64, 'PNG', 6, 5, 24, 24)
    } catch (_) {
        // Se falhar silencia
    }

    // ARGOS — fonte Cinzel/times bold, cor dourada
    setFont(doc, 'cinzel')
    doc.setTextColor(...C.argosAccent)
    doc.setFontSize(18)
    doc.text('ARGOS', 34, 13)

    // Linha separadora dourada fina
    doc.setDrawColor(...C.argosAccent)
    doc.setLineWidth(0.3)
    doc.line(34, 15, pageW - 6, 15)

    // Título do relatório
    setFont(doc, 'arial', 'bold')
    doc.setTextColor(...C.headerText)
    doc.setFontSize(9)
    doc.text(normalizeName(title), 34, 22)

    // Data/hora alinhada à direita
    setFont(doc, 'arial', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 215, 240)
    doc.text(now, pageW - 6, 22, { align: 'right' })

    // Linha de fechamento do header
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.line(0, headerH, pageW, headerH)
}

// ─── Marca d'água em toda a página ────────────────────────────────────────
function drawWatermarks(doc: jsPDF, username: string, now: string) {
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const label = `${normalizeName(username)}  ·  ${now}`

    doc.saveGraphicsState()
    try {
        doc.setGState(new (doc as any).GState({ opacity: 0.12 }))
    } catch (_) { /* fallback */ }

    doc.setTextColor(...C.watermark)
    setFont(doc, 'arial', 'normal')
    doc.setFontSize(14)

    // Grid diagonal cobrindo a página inteira - MAIS DENSO
    const angleDeg = 30
    const stepY = 45
    const stepX = 75
    for (let y = -40; y < pageH + 60; y += stepY) {
        for (let x = -60; x < pageW + 60; x += stepX) {
            // Alterna levemente o X para não ficar uma grade tão rígida
            const offset = (Math.floor(y / stepY) % 2) * (stepX / 2)
            doc.text(label, x + offset, y, { angle: angleDeg })
        }
    }

    doc.restoreGraphicsState()
}

// ─── Rodapé ───────────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, username: string, now: string, page: number, total: number) {
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.2)
    doc.line(6, pageH - 12, pageW - 6, pageH - 12)

    setFont(doc, 'arial', 'normal')
    doc.setTextColor(...C.footerText)
    doc.setFontSize(7)
    doc.text(
        `CONFIDENCIAL — USO RESTRITO | Gerado por: ${normalizeName(username)} | ${now}`,
        6, pageH - 7
    )
    doc.text(`Pag. ${page}/${total}`, pageW - 6, pageH - 7, { align: 'right' })
}

// ─── Exportação principal ─────────────────────────────────────────────────
export function gerarPDF(config: PDFConfig): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const now = new Date().toLocaleString('pt-BR')
    const username = normalizeName(config.user.username)

    // Cabeçalho da primeira página
    drawHeader(doc, config.title, now)

    // Tabela — tema claro
    autoTable(doc, {
        head: [config.columns],
        body: config.rows.map(row =>
            row.map(cell => normalizeName(String(cell)))
        ),
        startY: 38,
        margin: { left: 6, right: 6 },
        styles: {
            fontSize: 8.5,
            cellPadding: 3,
            textColor: C.cellText,
            fillColor: C.bodyBg,
            font: 'helvetica',
            lineColor: C.border,
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: C.headBg,
            textColor: C.headText,
            fontStyle: 'bold',
            fontSize: 8.5,
        },
        alternateRowStyles: {
            fillColor: C.altRowBg,
        },
        tableLineColor: C.border,
        tableLineWidth: 0.1,
        didDrawPage: (data) => {
            // Redesenha cabeçalho em cada nova página
            if (data.pageNumber > 1) {
                drawHeader(doc, config.title, now)
            }
        },
    })

    // Pós-processamento: marca d'água e rodapé em TODAS as páginas
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        drawWatermarks(doc, username, now)
        drawFooter(doc, username, now, i, totalPages)
    }

    doc.save(`ARGOS_${config.tipo}_${Date.now()}.pdf`)
}

// ─── Exportação CSV ────────────────────────────────────────────────────────
export function gerarCSV(columns: string[], rows: (string | number)[][], filename: string): void {
    const header = columns.join(',')
    const body = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
