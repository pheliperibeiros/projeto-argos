/**
 * ARGOS — Motor de Importação em Lote v2
 * ========================================
 * Cada linha da planilha = 1 investigado vinculado a 1 caso.
 * Linhas com o mesmo E-Proc/Codinome agrupam investigados no mesmo caso.
 *
 * Inferências automáticas:
 *  - Tipo PF/PJ pelo comprimento do documento (11=CPF, 14=CNPJ)
 *  - Campo unificado CPF/CNPJ
 *  - Tags separadas por ";"
 *  - Casos criados/reutilizados automaticamente por E-Proc
 *
 * Garantias:
 *  - Rollback atômico em caso de falha crítica
 *  - Validação pré-inserção (formato, CPF, CNPJ)
 *  - Detecção de duplicatas por documento
 *  - Normalização automática (trim, capitalização)
 *  - Feedback linha a linha (sucesso/erro/motivo)
 *  - Auditoria de cada importação
 */

import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { validarCPF, validarCNPJ } from '@/utils/validation'
import { registrarAudit } from '@/lib/audit'

// ─── TIPOS ───────────────────────────────────────────────

export type TipoImportacao = 'investigados'

export interface LinhaImportacao {
    linha: number
    dados: Record<string, string>
}

export interface ResultadoLinha {
    linha: number
    status: 'sucesso' | 'erro' | 'duplicata' | 'atualizado'
    nome: string
    motivo?: string
    id?: string
}

export interface ResultadoImportacao {
    total: number
    sucesso: number
    erros: number
    duplicatas: number
    atualizados: number
    casosCriados: number
    detalhes: ResultadoLinha[]
    tempoMs: number
}

export interface ProgressoCallback {
    (atual: number, total: number, linha: ResultadoLinha): void
}

// ─── MAPEAMENTO TOLERANTE DE CABEÇALHOS ─────────────────

const HEADER_ALIASES: Record<string, string[]> = {
    // Campos do investigado
    nome: ['nome', 'name', 'nome_completo', 'nome completo', 'razao_social', 'razão social', 'razao social'],
    cpf_cnpj: ['cpf/cnpj', 'cpf_cnpj', 'cpfcnpj', 'cpf', 'cnpj', 'documento', 'doc'],
    vulgo: ['vulgo', 'apelido', 'alias', 'alcunha'],
    data_nascimento: ['data_nascimento', 'data nascimento', 'nascimento', 'dt_nasc', 'dt nascimento', 'birth_date'],
    filiacao: ['filiacao', 'filiação', 'nome_mae', 'nome da mae', 'nome da mãe', 'mae', 'mãe'],
    faccionado: ['faccionado', 'faccao', 'facção', 'organizacao_criminosa', 'orcrim'],
    papel_organizacao: ['papel_organizacao', 'papel organização', 'papel na organização', 'papel', 'funcao', 'função', 'role'],
    observacoes: ['observacoes', 'observações', 'obs', 'notas', 'notes'],
    endereco: ['endereco', 'endereço', 'address', 'logradouro'],

    // Campos do caso
    eproc: ['eproc', 'e-proc', 'e_proc', 'numero_eproc', 'número eproc', 'processo'],
    codinome: ['codinome', 'operacao', 'operação', 'caso', 'nome_caso'],
    tags: ['tags', 'marcadores', 'etiquetas'],
    natureza: ['natureza', 'natureza_caso', 'tipo_caso', 'natureza do caso'],
    integrar_e: ['integrar-e', 'integrar_e', 'integrare', 'integrar e', 'identificador_integrar'],
}

function mapearCabecalhos(raw: string[]): { mapa: Record<number, string>; naoMapeados: string[] } {
    const mapa: Record<number, string> = {}
    const naoMapeados: string[] = []

    raw.forEach((header, idx) => {
        const normalizado = header.trim().toLowerCase()
            .replace(/[^a-záàãâéêíóôõúç_/\-\s]/g, '')
            .replace(/\s+/g, ' ')

        let encontrou = false
        for (const [campo, aliases] of Object.entries(HEADER_ALIASES)) {
            if (aliases.includes(normalizado)) {
                mapa[idx] = campo
                encontrou = true
                break
            }
        }

        if (!encontrou) {
            naoMapeados.push(header)
        }
    })

    return { mapa, naoMapeados }
}

// ─── NORMALIZAÇÃO ────────────────────────────────────────

function normalizar(dados: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {}

    for (const [campo, valor] of Object.entries(dados)) {
        let v = (valor || '').trim().replace(/\s+/g, ' ')

        switch (campo) {
            case 'nome':
            case 'codinome':
                // Title Case
                v = v.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                // Preposições minúsculas
                v = v.replace(/\b(Da|Das|De|Do|Dos|E)\b/g, m => m.toLowerCase())
                break

            case 'cpf_cnpj':
                v = v.replace(/\D/g, '')
                break

            case 'faccionado':
                v = v.toUpperCase()
                break

            case 'papel_organizacao':
                if (v) v = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
                break

            case 'natureza': {
                const upper = v.toUpperCase().replace(/\s+/g, '_')
                if (['NF', 'NOTICIA', 'NOTICIA_DE_FATO', 'NOTÍCIA DE FATO'].includes(upper) || upper.includes('NOTICIA')) {
                    v = 'NOTICIA_DE_FATO'
                } else if (['PI', 'PROCEDIMENTO', 'PROCEDIMENTO_INVESTIGATORIO', 'INVESTIGATORIO'].includes(upper) || upper.includes('INVESTIGAT')) {
                    v = 'PROCEDIMENTO_INVESTIGATORIO'
                } else if (['AP', 'ACAO', 'ACAO_PENAL', 'AÇÃO PENAL'].includes(upper) || upper.includes('PENAL')) {
                    v = 'ACAO_PENAL'
                }
                break
            }

            case 'data_nascimento': {
                const brMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
                if (brMatch) {
                    v = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
                }
                break
            }
        }

        result[campo] = v
    }

    return result
}

// ─── VALIDAÇÃO ───────────────────────────────────────────

function validarLinha(dados: Record<string, string>): string | null {
    // Nome obrigatório
    if (!dados.nome || dados.nome.length < 2) {
        return 'Nome é obrigatório (mín. 2 caracteres)'
    }

    // Documento (CPF/CNPJ)
    const doc = dados.cpf_cnpj || ''
    if (doc) {
        if (doc.length === 11) {
            if (!validarCPF(doc)) return `CPF inválido: ${doc}`
        } else if (doc.length === 14) {
            if (!validarCNPJ(doc)) return `CNPJ inválido: ${doc}`
        } else if (doc.length > 0) {
            return `Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ). Encontrado: ${doc.length} dígitos`
        }
    }

    // Data de nascimento (se preenchida)
    if (dados.data_nascimento) {
        const d = new Date(dados.data_nascimento)
        if (isNaN(d.getTime())) {
            return `Data de nascimento inválida: "${dados.data_nascimento}". Use DD/MM/YYYY ou YYYY-MM-DD`
        }
    }

    // Papéis válidos
    const papeis = ['Liderança', 'Gerência', 'Financiamento', 'Operacional', 'Laranja', 'Facilitador', '']
    if (dados.papel_organizacao && !papeis.includes(dados.papel_organizacao)) {
        return `Papel "${dados.papel_organizacao}" não reconhecido. Valores: ${papeis.filter(Boolean).join(', ')}`
    }

    // Natureza (se preenchida)
    const naturezasValidas = ['NOTICIA_DE_FATO', 'PROCEDIMENTO_INVESTIGATORIO', 'ACAO_PENAL', '']
    if (dados.natureza && !naturezasValidas.includes(dados.natureza)) {
        return `Natureza "${dados.natureza}" não reconhecida. Use: NF, PI ou AP`
    }

    // Caso: eproc obrigatório para vincular
    if (!dados.eproc || dados.eproc.trim().length < 3) {
        return 'E-Proc é obrigatório para vincular ao caso (mín. 3 caracteres)'
    }

    return null
}

// ─── PARSER DE ARQUIVO ───────────────────────────────────

export function parseArquivo(file: File): Promise<{ cabecalhos: string[], linhas: LinhaImportacao[], errosParse: string[] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

                if (json.length < 2) {
                    return resolve({ cabecalhos: [], linhas: [], errosParse: ['Arquivo vazio ou sem dados de importação'] })
                }

                const cabecalhos = json[0].map(h => String(h).trim())
                const errosParse: string[] = []

                // Detecta se a segunda linha é exemplo do template
                let startRow = 1
                if (json.length > 1) {
                    const primeiraLinha = json[1].map(v => String(v).trim().toLowerCase())
                    const exemploKeywords = ['ex:', 'exemplo', 'john', 'maria', '000.000.000-00', '00.000.000/0000-00', 'operação exemplo']
                    if (primeiraLinha.some(v => exemploKeywords.some(kw => v.includes(kw)))) {
                        startRow = 2
                    }
                }

                const linhas: LinhaImportacao[] = []
                for (let i = startRow; i < json.length; i++) {
                    const row = json[i]
                    if (row.every(cell => String(cell).trim() === '')) continue

                    const dados: Record<string, string> = {}
                    cabecalhos.forEach((h, idx) => {
                        dados[h] = String(row[idx] || '').trim()
                    })
                    linhas.push({ linha: i + 1, dados })
                }

                resolve({ cabecalhos, linhas, errosParse })
            } catch (err: any) {
                reject(new Error('Erro ao ler arquivo: ' + err.message))
            }
        }

        reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
        reader.readAsArrayBuffer(file)
    })
}

// ─── PROCESSADOR PRINCIPAL ───────────────────────────────

export async function processarImportacao(
    linhas: LinhaImportacao[],
    cabecalhosRaw: string[],
    _casoIdManual: string | null,
    onProgresso?: ProgressoCallback
): Promise<ResultadoImportacao> {
    const inicio = Date.now()
    const detalhes: ResultadoLinha[] = []
    let sucesso = 0, erros = 0, duplicatas = 0, atualizados = 0, casosCriados = 0

    // 1. Mapear cabeçalhos
    const { mapa } = mapearCabecalhos(cabecalhosRaw)

    // 2. Pré-carregar documentos existentes para deduplicação
    const { data: existentes } = await supabase
        .from('investigados')
        .select('id, nome, cpf, cnpj')

    const docExistente = new Map<string, { id: string; nome: string }>()
        ; (existentes || []).forEach((e: any) => {
            if (e.cpf) docExistente.set(e.cpf, { id: e.id, nome: e.nome })
            if (e.cnpj) docExistente.set(e.cnpj, { id: e.id, nome: e.nome })
        })

    // 3. Pré-carregar casos existentes por eproc
    const { data: casosExistentes } = await supabase
        .from('casos')
        .select('id, e_proc, codinome')

    const casoPorEproc = new Map<string, string>()
        ; (casosExistentes || []).forEach((c: any) => {
            if (c.e_proc) casoPorEproc.set(c.e_proc, c.id)
        })

    // 4. Cache local de casos criados nesta importação
    const casosNovos = new Map<string, string>() // eproc → id

    // 5. IDs inseridos para rollback
    const idsInseridos: string[] = []
    const casoIdsInseridos: string[] = []
    const vinculosCriados: { caso_id: string; investigado_id: string }[] = []

    try {
        for (let i = 0; i < linhas.length; i++) {
            const { linha: numLinha, dados: dadosRaw } = linhas[i]

            // 5a. Converter usando mapa de cabeçalhos
            const dadosMapeados: Record<string, string> = {}
            for (const [idxStr, campo] of Object.entries(mapa)) {
                const idx = parseInt(idxStr)
                const cabecalho = cabecalhosRaw[idx]
                dadosMapeados[campo] = dadosRaw[cabecalho] || ''
            }

            // 5b. Normalizar
            const dadosNorm = normalizar(dadosMapeados)

            // 5c. Inferir tipo pelo documento
            const docLimpo = dadosNorm.cpf_cnpj || ''
            let tipoPessoa: string
            let cpf: string | null = null
            let cnpj: string | null = null

            if (docLimpo.length === 14) {
                tipoPessoa = 'PESSOA_JURIDICA'
                cnpj = docLimpo
            } else if (docLimpo.length === 11) {
                tipoPessoa = 'PESSOA_FISICA'
                cpf = docLimpo
            } else {
                tipoPessoa = 'PESSOA_FISICA' // Default
            }

            // 5d. Validar
            const erroValidacao = validarLinha(dadosNorm)
            if (erroValidacao) {
                const r: ResultadoLinha = { linha: numLinha, status: 'erro', nome: dadosNorm.nome || '(vazio)', motivo: erroValidacao }
                detalhes.push(r)
                erros++
                onProgresso?.(i + 1, linhas.length, r)
                continue
            }

            // 5e. Resolver caso (criar ou reutilizar)
            const eproc = dadosNorm.eproc?.trim()
            let casoId: string | null = null

            if (eproc) {
                // Prioridade: caso existente no DB → caso criado nesta importação → criar novo
                if (casoPorEproc.has(eproc)) {
                    casoId = casoPorEproc.get(eproc)!
                } else if (casosNovos.has(eproc)) {
                    casoId = casosNovos.get(eproc)!
                } else {
                    // Criar caso novo
                    const tagsArray = dadosNorm.tags
                        ? dadosNorm.tags.split(';').map(t => t.trim()).filter(Boolean)
                        : []

                    const { data: novoCaso, error: casoErr } = await supabase
                        .from('casos')
                        .insert({
                            codinome: dadosNorm.codinome || `Caso ${eproc}`,
                            e_proc: eproc,
                            integrar_e: dadosNorm.integrar_e || '',
                            natureza: dadosNorm.natureza || 'NOTICIA_DE_FATO',
                            tags: tagsArray,
                            status: 'ATIVO'
                        })
                        .select('id')
                        .single()

                    if (casoErr) {
                        const r: ResultadoLinha = { linha: numLinha, status: 'erro', nome: dadosNorm.nome, motivo: `Erro ao criar caso: ${casoErr.message}` }
                        detalhes.push(r)
                        erros++
                        onProgresso?.(i + 1, linhas.length, r)
                        continue
                    }

                    casoId = novoCaso.id
                    casosNovos.set(eproc, novoCaso.id)
                    casoPorEproc.set(eproc, novoCaso.id)
                    casoIdsInseridos.push(novoCaso.id)
                    casosCriados++
                }
            }

            // 5f. Detectar duplicata de investigado
            let investigadoId: string | null = null
            const docKey = cpf || cnpj
            if (docKey && docExistente.has(docKey)) {
                investigadoId = docExistente.get(docKey)!.id

                // Vincular ao caso se necessário
                if (casoId) {
                    const { error: vincErr } = await supabase
                        .from('caso_investigado')
                        .insert({ caso_id: casoId, investigado_id: investigadoId })

                    if (!vincErr || vincErr.code === '23505') {
                        vinculosCriados.push({ caso_id: casoId, investigado_id: investigadoId })
                    }
                }

                const r: ResultadoLinha = {
                    linha: numLinha, status: 'duplicata',
                    nome: dadosNorm.nome, id: investigadoId,
                    motivo: `Já existente no sistema (vinculado ao caso)`
                }
                detalhes.push(r)
                duplicatas++
                onProgresso?.(i + 1, linhas.length, r)
                continue
            }

            // 5g. Inserir investigado
            const payload: any = {
                nome: dadosNorm.nome,
                tipo: tipoPessoa,
                cpf,
                cnpj,
                vulgo: dadosNorm.vulgo || null,
                data_nascimento: dadosNorm.data_nascimento || null,
                filiacao: dadosNorm.filiacao || null,
                faccionado: dadosNorm.faccionado || null,
                papel_organizacao: dadosNorm.papel_organizacao || null,
                observacoes: dadosNorm.observacoes || null,
            }

            const { data: inserted, error: insertErr } = await supabase
                .from('investigados')
                .insert(payload)
                .select('id')
                .single()

            if (insertErr) {
                const r: ResultadoLinha = { linha: numLinha, status: 'erro', nome: dadosNorm.nome, motivo: insertErr.message }
                detalhes.push(r)
                erros++
                onProgresso?.(i + 1, linhas.length, r)
                continue
            }

            idsInseridos.push(inserted.id)

            // Registra no mapa local para detectar duplicatas intralote
            if (docKey) docExistente.set(docKey, { id: inserted.id, nome: dadosNorm.nome })

            // 5h. Vincular ao caso
            if (casoId) {
                const { error: vincErr } = await supabase
                    .from('caso_investigado')
                    .insert({ caso_id: casoId, investigado_id: inserted.id })

                if (!vincErr || vincErr.code === '23505') {
                    vinculosCriados.push({ caso_id: casoId, investigado_id: inserted.id })
                }
            }

            // 5i. Endereço (se fornecido)
            if (dadosNorm.endereco) {
                await supabase.from('enderecos').insert({
                    investigado_id: inserted.id,
                    logradouro: dadosNorm.endereco,
                    origem: 'Importação em Lote'
                })
            }

            const r: ResultadoLinha = { linha: numLinha, status: 'sucesso', nome: dadosNorm.nome, id: inserted.id }
            detalhes.push(r)
            sucesso++
            onProgresso?.(i + 1, linhas.length, r)
        }

        // 6. Registrar auditoria
        await registrarAudit(
            'IMPORTACAO_LOTE', 'investigados',
            `${sucesso} inseridos, ${erros} erros, ${duplicatas} duplicatas, ${casosCriados} casos criados`
        )

    } catch (criticalErr: any) {
        // ── ROLLBACK ATÔMICO ──
        if (vinculosCriados.length > 0) {
            for (const v of vinculosCriados) {
                await supabase.from('caso_investigado').delete().match(v)
            }
        }
        if (idsInseridos.length > 0) {
            await supabase.from('enderecos').delete().in('investigado_id', idsInseridos)
            await supabase.from('investigados').delete().in('id', idsInseridos)
        }
        if (casoIdsInseridos.length > 0) {
            await supabase.from('casos').delete().in('id', casoIdsInseridos)
        }

        throw new Error(`Falha crítica na importação (rollback executado): ${criticalErr.message}`)
    }

    return {
        total: linhas.length,
        sucesso,
        erros,
        duplicatas,
        atualizados,
        casosCriados,
        detalhes,
        tempoMs: Date.now() - inicio
    }
}

// ─── GERADOR DE TEMPLATE ─────────────────────────────────

export function gerarTemplate(): void {
    const wb = XLSX.utils.book_new()

    // Aba 1: Dados
    const cabecalhos = [
        'E-Proc', 'Codinome', 'Natureza', 'Integrar-E', 'Tags',
        'Nome', 'CPF/CNPJ', 'Vulgo', 'Data Nascimento', 'Filiação',
        'Faccionado', 'Papel na Organização', 'Observações', 'Endereço'
    ]

    const exemplo1 = [
        '0000000-00.2024.8.16.0001', 'Operação Exemplo', 'NF', 'M-2024-0001', 'Tráfico;Lavagem',
        'Maria da Silva', '529.982.247-25', 'Mariazinha', '15/03/1985', 'Ana da Silva',
        'PCC', 'Operacional', 'Suspeita de lavagem', 'Rua X, 123 - Centro'
    ]

    const dadosSheet = XLSX.utils.aoa_to_sheet([cabecalhos, exemplo1])

    // Largura das colunas
    dadosSheet['!cols'] = [
        { wch: 30 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 20 },
        { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 20 },
        { wch: 15 }, { wch: 22 }, { wch: 30 }, { wch: 30 }
    ]

    XLSX.utils.book_append_sheet(wb, dadosSheet, 'Dados')

    // Aba 2: Configurações (Valores Válidos)
    const opcoes = [
        ['NATUREZA', 'FACCIONADO', 'PAPEL NA ORGANIZAÇÃO'],
        ['NF', 'PCC', 'Liderança'],
        ['PI', 'CV', 'Gerência'],
        ['AP', 'TCP', 'Financiamento'],
        ['', 'ADE', 'Operacional'],
        ['', 'Outros', 'Laranja'],
        ['', 'Não Faccionado', 'Facilitador'],
    ]
    const dicSheet = XLSX.utils.aoa_to_sheet(opcoes)
    XLSX.utils.book_append_sheet(wb, dicSheet, 'Configuracoes')

    // Aba 3: Instruções
    const instrucoes = [
        ['INSTRUÇÕES DE PREENCHIMENTO — ARGOS v2.1'],
        [''],
        ['📋 MENUS DE SELEÇÃO (Dropdowns):'],
        ['Para evitar erros de digitação, utilize APENAS os termos listados abaixo:'],
        [''],
        ['1. NATUREZA (Coluna C):'],
        ['   • NF (Notícia de Fato)'],
        ['   • PI (Procedimento Investigatório)'],
        ['   • AP (Ação Penal)'],
        [''],
        ['2. FACCIONADO (Coluna K):'],
        ['   • PCC, CV, TCP, ADE, Outros ou Não Faccionado'],
        [''],
        ['3. PAPEL NA ORGANIZAÇÃO (Coluna L):'],
        ['   • Liderança, Gerência, Financiamento, Operacional, Laranja, Facilitador'],
        [''],
        ['💡 DICA: Você pode copiar os termos exatos da aba "Configuracoes".'],
        [''],
        ['⚠️ REGRAS CRÍTICAS:'],
        ['  • E-Proc: Use para agrupar investigados. Linhas com mesmo E-Proc = mesmo caso.'],
        ['  • CPF/CNPJ: Digite apenas números no campo unificado. O sistema separa PF de PJ.'],
        ['  • Tags: Separe várias tags com ponto-e-vírgula (;). Ex: "Drogas; Roubo".'],
        ['  • Exemplo: A linha 2 é um exemplo e será ignorada automaticamente.'],
    ]

    const instrSheet = XLSX.utils.aoa_to_sheet(instrucoes)
    instrSheet['!cols'] = [{ wch: 30 }, { wch: 80 }]
    XLSX.utils.book_append_sheet(wb, instrSheet, 'Instrucoes')

    XLSX.writeFile(wb, 'Argos_Template_Importacao_v2_1.xlsx')
}
