import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFConfig {
    title: string
    columns: string[]
    rows: (string | number)[][]
    user: { username: string }
    tipo: string // ex: 'DII', 'CONECTIVIDADE', 'EFETIVIDADE'
}

export function gerarPDF(config: PDFConfig): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const now = new Date().toLocaleString('pt-BR')

    // Cabeçalho
    doc.setFillColor(22, 27, 34)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(247, 129, 102)
    doc.setFontSize(16)
    doc.setFont('courier', 'bold')
    doc.text('ARGOS — GAECO', 14, 12)
    doc.setTextColor(200, 200, 200)
    doc.setFontSize(10)
    doc.setFont('courier', 'normal')
    doc.text(config.title, 14, 20)
    doc.text(now, 210 - 14, 20, { align: 'right' })

    // Tabela
    autoTable(doc, {
        head: [config.columns],
        body: config.rows,
        startY: 34,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [230, 237, 243],
            fillColor: [22, 27, 34],
        },
        headStyles: { fillColor: [48, 54, 61], textColor: [247, 129, 102] },
        alternateRowStyles: { fillColor: [13, 17, 23] },
    })

    // Marca d'água em todas as páginas
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.saveGraphicsState()
        // Algumas versões do jsPDF precisam de GState explícito
        try {
            doc.setGState(new (doc as any).GState({ opacity: 0.07 }))
        } catch (e) {
            // Fallback or skip opacity if GState not found
        }

        doc.setTextColor(247, 129, 102)
        doc.setFontSize(18)
        doc.setFont('courier', 'bold')
        // Diagonal — 3 repetições espaçadas
        for (let y = 60; y < 280; y += 80) {
            doc.text(
                `${config.user.username} · ${now}`,
                105, y, { align: 'center', angle: 45 }
            )
        }
        doc.restoreGraphicsState()

        // Rodapé
        doc.setTextColor(130, 130, 130)
        doc.setFontSize(8)
        doc.setFont('courier', 'normal')
        doc.text(
            `CONFIDENCIAL — USO RESTRITO · Gerado por: ${config.user.username} · ${now} · Pág. ${i}/${totalPages}`,
            105, 290, { align: 'center' }
        )
    }

    doc.save(`ARGOS_${config.tipo}_${Date.now()}.pdf`)
}

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
