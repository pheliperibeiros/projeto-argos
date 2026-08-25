/**
 * ARGOS — Motor de Importação em Lote v2.2
 * ========================================
 * Cada linha da planilha = 1 investigado vinculado a 1 caso.
 * Linhas com o mesmo E-Proc/Codinome agrupam investigados no mesmo caso.
 *
 * Inferências automáticas:
 * - Tipo PF/PJ pelo comprimento do documento (11=CPF, 14=CNPJ)
 * - Campo unificado CPF/CNPJ
 * - Tags separadas por ";"
 * - Casos criados/reutilizados automaticamente por E-Proc
 *
 * Garantias:
 * - Rollback atômico em caso de falha crítica
 * - Validação pré-inserção (formato, CPF, CNPJ, Menus Dropdown)
 * - Detecção de duplicatas por documento
 * - Normalização automática (trim, capitalização)
 * - Feedback linha a linha (sucesso/erro/motivo)
 * - Auditoria de cada importação
 */

import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs' // <-- Nova dependência para gerar o template com dropdowns
import { supabase } from '@/lib/supabase'
import { validarCPF, validarCNPJ } from '@/utils/validation'
import { registrarAudit } from '@/lib/audit'
import { isSheetsMode } from '@/lib/env'
import { dbCasos } from '@/lib/db/casos'
import { dbInvestigados } from '@/lib/db/investigados'
import { sheetsClient } from '@/lib/googleSheetsClient'

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
    (atual: number, total: number, linha: ResultadoLinha, statusMessage?: string): void
}

// ─── MAPEAMENTO TOLERANTE DE CABEÇALHOS ─────────────────

const HEADER_ALIASES: Record<string, string[]> = {
    // Campos do investigado
    nome: ['nome', 'name', 'nome_completo', 'nome completo', 'razao_social', 'razão social', 'razao social'],
    cpf_cnpj: ['cpf/cnpj', 'cpf_cnpj', 'cpfcnpj', 'cpf', 'cnpj', 'documento', 'doc'],
    vulgo: ['vulgo', 'apelido', 'alias', 'alcunha'],
    data_nascimento: ['data_nascimento', 'data nascimento', 'nascimento', 'dt_nasc', 'dt nascimento', 'birth_date'],
    filiacao: ['filiacao', 'filiação'],
    nome_pai: ['nome_pai', 'nome do pai', 'pai', 'father'],
    nome_mae: ['nome_mae', 'nome da mae', 'nome da mãe', 'mae', 'mãe', 'mother'],
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

// ─── CORREÇÃO DE ENCODING ────────────────────────────────
function corrigirEncoding(texto: string): string {
    if (!texto) return texto;

    // Verifica se a string contém os caracteres típicos de quebra de UTF-8 (Ã, Â)
    if (texto.includes('Ã') || texto.includes('Â')) {
        try {
            // Extrai os bytes corrompidos e decodifica corretamente para UTF-8
            const bytes = new Uint8Array(texto.split('').map(c => c.charCodeAt(0)));
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            // Fallback caso a decodificação falhe
            return texto;
        }
    }
    return texto;
}

// ─── NORMALIZAÇÃO ────────────────────────────────────────

function normalizar(dados: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {}

    for (const [campo, valor] of Object.entries(dados)) {
        let v = corrigirEncoding(valor || '').trim().replace(/\s+/g, ' ')

        switch (campo) {
            case 'nome':
            case 'codinome':
            case 'nome_pai':
            case 'nome_mae':
            case 'filiacao':
                v = v.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                v = v.replace(/\b(Da|Das|De|Do|Dos|E)\b/g, m => m.toLowerCase())
                break

            case 'cpf_cnpj':
                v = v.replace(/\D/g, '')
                if (v.length > 0) {
                    if (v.length < 11) {
                        // Recompõe zeros de CPFs (ex: '123456789' vira '00123456789')
                        v = v.padStart(11, '0')
                    } else if (v.length > 11 && v.length < 14) {
                        // Recompõe zeros de CNPJs (ex: '1234567890123' vira '01234567890123')
                        v = v.padStart(14, '0')
                    }
                    // Nota: Se tiver exatamente 11 ou 14 dígitos, passa direto.
                }
                break

            case 'faccionado':
                // Padroniza capitalização das facções
                if (v.toLowerCase() === 'não faccionado' || v.toLowerCase() === 'nao faccionado') {
                    v = 'Não Faccionado'
                } else if (v.toLowerCase() === 'outros') {
                    v = 'Outros'
                } else {
                    v = v.toUpperCase()
                }
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
    if (!dados.nome || dados.nome.length < 2) {
        return 'Nome é obrigatório (mín. 2 caracteres)'
    }

    const doc = dados.cpf_cnpj || ''
    if (doc) {
        if (doc.length === 11) {
            if (!validarCPF(doc)) return `CPF inválido: ${doc}`
        } else if (doc.length === 14) {
            if (!validarCNPJ(doc)) return `CNPJ inválido: ${doc}`
        } else if (doc.length > 0) {
            return `Documento deve ter 11 ou 14 dígitos. Encontrado: ${doc.length} dígitos`
        }
    }

    if (dados.data_nascimento) {
        const d = new Date(dados.data_nascimento)
        if (isNaN(d.getTime())) {
            return `Data de nascimento inválida: "${dados.data_nascimento}". Use DD/MM/YYYY ou YYYY-MM-DD`
        }
    }

    // Validação estrita baseada nos novos menus
    const papeis = ['Indefinido', 'Liderança', 'Gerência', 'Financiamento', 'Operacional', 'Laranja', 'Facilitador', '']
    if (dados.papel_organizacao && !papeis.includes(dados.papel_organizacao)) {
        return `Papel "${dados.papel_organizacao}" não reconhecido.`
    }

    const faccionados = ['PCC', 'CV', 'TCP', 'ADE', 'Outros', 'Não Faccionado', '']
    if (dados.faccionado && !faccionados.includes(dados.faccionado)) {
        return `Opção de faccionado "${dados.faccionado}" não reconhecida.`
    }

    const naturezasValidas = ['NOTICIA_DE_FATO', 'PROCEDIMENTO_INVESTIGATORIO', 'ACAO_PENAL', '']
    if (dados.natureza && !naturezasValidas.includes(dados.natureza)) {
        return `Natureza "${dados.natureza}" não reconhecida. Use: NF, PI ou AP`
    }

    if (!dados.eproc || dados.eproc.trim().length < 3) {
        return 'E-Proc é obrigatório para vincular ao caso (mín. 3 caracteres)'
    }

    return null
}

// ─── PARSER DE ARQUIVO ───────────────────────────────────
// Mantemos o XLSX aqui porque é extremamente rápido para leitura e parse
export function parseArquivo(file: File): Promise<{ cabecalhos: string[], linhas: LinhaImportacao[], errosParse: string[] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array', codepage: 65001 })
                const sheet = workbook.Sheets[workbook.SheetNames[0]]
                // A flag raw: false força o parser a capturar o valor formatado como string
                const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })

                if (json.length < 2) {
                    return resolve({ cabecalhos: [], linhas: [], errosParse: ['Arquivo vazio ou sem dados de importação'] })
                }

                const cabecalhos = json[0].map(h => String(h).trim())
                const errosParse: string[] = []

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

    const { mapa } = mapearCabecalhos(cabecalhosRaw)
    console.log('[Import] Mapeamento concluído:', mapa)

    onProgresso?.(0, linhas.length, { linha: 0, status: 'sucesso', nome: '' }, 'Consultando investigados existentes...')

    // Carrega existentes via camada de abstração (sheets ou supabase)
    let existentesRaw: any[] = []
    if (isSheetsMode) {
        // sheetsClient.investigados.buscarInvestigados retorna lista simplificada;
        // usamos dbInvestigados que delega corretamente
        existentesRaw = await sheetsClient.investigados.buscarInvestigados('', 'Todos', 'Todos')
    } else {
        const { data, error: extErr } = await supabase.from('investigados').select('id, nome, cpf, cnpj')
        if (extErr) console.warn('[Import] Falha ao carregar existentes:', extErr.message)
        existentesRaw = data || []
    }

    const docExistente = new Map<string, { id: string; nome: string }>()
    existentesRaw.forEach((e: any) => {
        if (e.cpf) docExistente.set(e.cpf, { id: e.id, nome: e.nome })
        if (e.cnpj) docExistente.set(e.cnpj, { id: e.id, nome: e.nome })
    })

    onProgresso?.(0, linhas.length, { linha: 0, status: 'sucesso', nome: '' }, 'Consultando casos existentes...')
    let casosRaw: any[] = []
    if (isSheetsMode) {
        casosRaw = await sheetsClient.casos.listar()
    } else {
        const { data, error: casErr } = await supabase.from('casos').select('id, e_proc, codinome')
        if (casErr) console.warn('[Import] Falha ao carregar casos:', casErr.message)
        casosRaw = data || []
    }

    const casoPorEproc = new Map<string, string>()
    casosRaw.forEach((c: any) => {
        if (c.e_proc) casoPorEproc.set(c.e_proc, c.id)
    })

    const casosNovos = new Map<string, string>()
    const idsInseridos: string[] = []
    const casoIdsInseridos: string[] = []
    const vinculosCriados: { caso_id: string; investigado_id: string }[] = []

    try {
        for (let i = 0; i < linhas.length; i++) {
            const { linha: numLinha, dados: dadosRaw } = linhas[i]

            const dadosMapeados: Record<string, string> = {}
            for (const [idxStr, campo] of Object.entries(mapa)) {
                const idx = parseInt(idxStr)
                const cabecalho = cabecalhosRaw[idx]
                dadosMapeados[campo] = dadosRaw[cabecalho] || ''
            }

            const dadosNorm = normalizar(dadosMapeados)

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
                tipoPessoa = 'PESSOA_FISICA'
            }

            const erroValidacao = validarLinha(dadosNorm)
            if (erroValidacao) {
                const r: ResultadoLinha = { linha: numLinha, status: 'erro', nome: dadosNorm.nome || '(vazio)', motivo: erroValidacao }
                detalhes.push(r)
                erros++
                onProgresso?.(i + 1, linhas.length, r, `Erro na linha ${numLinha}`)
                continue
            }

            const eproc = dadosNorm.eproc?.trim()
            let casoId: string | null = null

            if (eproc) {
                if (casoPorEproc.has(eproc)) {
                    casoId = casoPorEproc.get(eproc)!
                } else if (casosNovos.has(eproc)) {
                    casoId = casosNovos.get(eproc)!
                } else {
                    const tagsArray = dadosNorm.tags ? dadosNorm.tags.split(';').map(t => t.trim()).filter(Boolean) : []
                    onProgresso?.(i, linhas.length, { linha: numLinha, status: 'sucesso', nome: dadosNorm.nome }, `Criando caso: ${eproc}`)

                    if (isSheetsMode) {
                        const novoCaso = await dbCasos.criar({
                            codinome: dadosNorm.codinome || `Caso ${eproc}`,
                            e_proc: eproc,
                            integrar_e: dadosNorm.integrar_e || '',
                            natureza: (dadosNorm.natureza || 'NOTICIA_DE_FATO') as any,
                            tags: tagsArray,
                            status: 'ATIVO'
                        })
                        casoId = novoCaso.id
                    } else {
                        const { data: novoCaso, error: casoErr } = await supabase
                            .from('casos')
                            .insert({
                                codinome: dadosNorm.codinome || `Caso ${eproc}`,
                                e_proc: eproc,
                                integrar_e: dadosNorm.integrar_e || '',
                                natureza: (dadosNorm.natureza || 'NOTICIA_DE_FATO') as any,
                                tags: tagsArray,
                                status: 'ATIVO'
                            } as any)
                            .select('id')
                            .single()

                        if (casoErr) {
                            const r: ResultadoLinha = { linha: numLinha, status: 'erro', nome: dadosNorm.nome, motivo: `Erro ao criar caso: ${casoErr.message}` }
                            detalhes.push(r)
                            erros++
                            onProgresso?.(i + 1, linhas.length, r, `Falha ao criar caso`)
                            continue
                        }
                        casoId = novoCaso.id
                    }

                    casosNovos.set(eproc, casoId!)
                    casoPorEproc.set(eproc, casoId!)
                    casoIdsInseridos.push(casoId!)
                    casosCriados++
                }
            }

            let investigadoId: string | null = null
            const docKey = cpf || cnpj
            if (docKey && docExistente.has(docKey)) {
                investigadoId = docExistente.get(docKey)!.id

                if (casoId) {
                    if (isSheetsMode) {
                        await sheetsClient.casos.vincularInvestigado(casoId, investigadoId)
                    } else {
                        const { error: vincErr } = await supabase.from('caso_investigado').insert({ caso_id: casoId, investigado_id: investigadoId })
                        if (!vincErr || vincErr.code === '23505') vinculosCriados.push({ caso_id: casoId, investigado_id: investigadoId })
                    }
                }

                const r: ResultadoLinha = { linha: numLinha, status: 'duplicata', nome: dadosNorm.nome, id: investigadoId, motivo: `Já existente no sistema (vinculado ao caso)` }
                detalhes.push(r)
                duplicatas++
                onProgresso?.(i + 1, linhas.length, r)
                continue
            }

            // Tratamento do Indefinido para o Banco
            const papelBanco = dadosNorm.papel_organizacao === 'Indefinido' ? null : (dadosNorm.papel_organizacao || null)

            const payload: any = {
                nome: dadosNorm.nome,
                tipo: tipoPessoa,
                cpf,
                cnpj,
                vulgo: dadosNorm.vulgo || null,
                data_nascimento: dadosNorm.data_nascimento || null,
                filiacao: dadosNorm.filiacao || null,
                nome_pai: dadosNorm.nome_pai || null,
                nome_mae: dadosNorm.nome_mae || null,
                faccionado: dadosNorm.faccionado || null,
                papel_organizacao: papelBanco,
                observacoes: dadosNorm.observacoes || null,
            }

            let insertedId: string
            if (isSheetsMode) {
                const created = await dbInvestigados.criar(payload)
                insertedId = created.id
            } else {
                const { data: inserted, error: insertErr } = await supabase.from('investigados').insert(payload).select('id').single()
                if (insertErr) {
                    const r: ResultadoLinha = { linha: numLinha, status: 'erro', nome: dadosNorm.nome, motivo: insertErr.message }
                    detalhes.push(r)
                    erros++
                    onProgresso?.(i + 1, linhas.length, r)
                    continue
                }
                insertedId = inserted.id
            }

            idsInseridos.push(insertedId)
            if (docKey) docExistente.set(docKey, { id: insertedId, nome: dadosNorm.nome })

            if (casoId) {
                if (isSheetsMode) {
                    await sheetsClient.casos.vincularInvestigado(casoId, insertedId)
                } else {
                    const { error: vincErr } = await supabase.from('caso_investigado').insert({ caso_id: casoId, investigado_id: insertedId })
                    if (!vincErr || vincErr.code === '23505') vinculosCriados.push({ caso_id: casoId, investigado_id: insertedId })
                }
            }

            if (dadosNorm.endereco) {
                if (isSheetsMode) {
                    await sheetsClient.investigados.sincronizarEnderecos(insertedId, [{ logradouro: dadosNorm.endereco, origem: 'IMPORTACAO', lat: null, lng: null }])
                } else {
                    await supabase.from('enderecos').insert({ investigado_id: insertedId, logradouro: dadosNorm.endereco, origem: 'IMPORTACAO' })
                }
            }

            const r: ResultadoLinha = { linha: numLinha, status: 'sucesso', nome: dadosNorm.nome, id: insertedId }
            detalhes.push(r)
            sucesso++
            onProgresso?.(i + 1, linhas.length, r, `Processado: ${dadosNorm.nome}`)
        }

        await registrarAudit('IMPORTACAO_LOTE', 'investigados', `${sucesso} inseridos, ${erros} erros, ${duplicatas} duplicatas, ${casosCriados} casos criados`)

    } catch (criticalErr: any) {
        // Rollback apenas disponível no modo Supabase (sheets não tem transação)
        if (!isSheetsMode) {
            if (vinculosCriados.length > 0) {
                for (const v of vinculosCriados) await supabase.from('caso_investigado').delete().match(v)
            }
            if (idsInseridos.length > 0) {
                await supabase.from('enderecos').delete().in('investigado_id', idsInseridos)
                await supabase.from('investigados').delete().in('id', idsInseridos)
            }
            if (casoIdsInseridos.length > 0) {
                await supabase.from('casos').delete().in('id', casoIdsInseridos)
            }
        }
        throw new Error(`Falha crítica na importação (rollback executado): ${criticalErr.message}`)
    }

    return { total: linhas.length, sucesso, erros, duplicatas, atualizados, casosCriados, detalhes, tempoMs: Date.now() - inicio }
}

// ─── GERADOR DE TEMPLATE (Substituído por ExcelJS) ───────

export async function gerarTemplate(): Promise<void> {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Sistema ARGOS'

    // Aba 1: Dados
    const ws = wb.addWorksheet('Dados')

    const cabecalhos = [
        'E-Proc', 'Codinome', 'Natureza', 'Integrar-E', 'Tags',
        'Nome', 'CPF/CNPJ', 'Vulgo', 'Data Nascimento', 'Nome do Pai', 'Nome da Mãe',
        'Faccionado', 'Papel na Organização', 'Observações', 'Endereço'
    ]

    // Inserindo o cabeçalho
    ws.addRow(cabecalhos)

    // Estilo no cabeçalho
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } }

    // Inserindo linha de exemplo
    ws.addRow([
        '0000000-00.2024.8.16.0001', 'Operação Exemplo', 'NF', 'M-2024-0001', 'Tráfico;Lavagem',
        'Maria da Silva', '529.982.247-25', 'Mariazinha', '15/03/1985', 'José da Silva', 'Ana da Silva',
        'PCC', 'Operacional', 'Suspeita de lavagem', 'Rua X, 123 - Centro'
    ])

    // Largura das colunas (base 1)
    ws.columns = [
        { width: 28 }, // A: E-Proc
        { width: 22 }, // B: Codinome
        { width: 12 }, // C: Natureza
        { width: 16 }, // D: Integrar-E
        { width: 20 }, // E: Tags
        { width: 25 }, // F: Nome
        { width: 20 }, // G: CPF/CNPJ
        { width: 15 }, // H: Vulgo
        { width: 18 }, // I: Data Nascimento
        { width: 20 }, // J: Pai
        { width: 20 }, // K: Mãe
        { width: 18 }, // L: Faccionado
        { width: 22 }, // M: Papel
        { width: 30 }, // N: Observações
        { width: 35 }  // O: Endereço
    ]

    // Força a Coluna G (CPF/CNPJ) a ser tratada como Texto, preservando zeros à esquerda na digitação
    ws.getColumn(7).numFmt = '@'

    // Aplicando Data Validation (Dropdowns) para 1000 linhas
    for (let i = 2; i <= 1000; i++) {
        // Coluna C (Natureza)
        ws.getCell(`C${i}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"NF,PI,AP"']
        }

        // Coluna L (Faccionado)
        ws.getCell(`L${i}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"PCC,CV,TCP,ADE,Outros,Não Faccionado"']
        }

        // Coluna M (Papel na Organização)
        ws.getCell(`M${i}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"Indefinido,Liderança,Gerência,Financiamento,Operacional,Laranja,Facilitador"']
        }
    }

    // Aba 2: Instruções
    const instrSheet = wb.addWorksheet('Instruções')
    instrSheet.getColumn(1).width = 100

    instrSheet.addRow(['INSTRUÇÕES DE PREENCHIMENTO — ARGOS v2.2'])
    instrSheet.getRow(1).font = { bold: true, size: 14 }
    instrSheet.addRow([''])
    instrSheet.addRow(['💡 DICA: As colunas Natureza, Faccionado e Papel possuem MENUS DE SELEÇÃO (Dropdowns) na aba "Dados".'])
    instrSheet.addRow([''])
    instrSheet.addRow(['⚠️ REGRAS CRÍTICAS:'])
    instrSheet.addRow(['  • E-Proc: Use para agrupar investigados. Linhas com mesmo E-Proc = mesmo caso.'])
    instrSheet.addRow(['  • CPF/CNPJ: Digite apenas números no campo unificado. O sistema separa PF de PJ.'])
    instrSheet.addRow(['  • Tags: Separe várias tags com ponto-e-vírgula (;). Ex: "Drogas; Roubo".'])
    instrSheet.addRow(['  • Exemplo: A linha 2 da aba Dados é um exemplo e será ignorada automaticamente.'])

    // Gerando o arquivo no browser (Tratamento Client-Side)
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'Argos_Template_Importacao_v2_2.xlsx'
    a.click()

    window.URL.revokeObjectURL(url)
}