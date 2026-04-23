export function inicioMes(): string {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
}

export function inicioAno(): string {
    return new Date(new Date().getFullYear(), 0, 1).toISOString()
}

export function subMeses(date: Date, n: number): string {
    const d = new Date(date)
    d.setMonth(d.getMonth() - n)
    return d.toISOString()
}

export function formatarData(dataH?: string | null): string {
    if (!dataH) return '-'
    const d = new Date(dataH)
    return d.toLocaleDateString('pt-BR')
}

export function formatarCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export function formatarCNPJ(cnpj: string): string {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
}

// Aliases para compatibilidade com imports externos
export const formatCPF = formatarCPF
export const formatCNPJ = formatarCNPJ
export const formatDate = formatarData

export function formatDocumento(doc: string): string {
    if (!doc) return ''
    const clean = doc.replace(/\D/g, '')
    if (clean.length === 11) return formatarCPF(clean)
    if (clean.length === 14) return formatarCNPJ(clean)
    return doc
}
