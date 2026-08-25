import { env } from '@/lib/env'

// Interfaces de Tipo idênticas ao banco
export interface Caso {
    id: string
    codinome: string
    e_proc: string
    e_proc_investigacao: string | null
    integrar_e: string | null
    tags: string[]
    status: 'ATIVO' | 'INATIVO'
    natureza: 'NOTICIA_DE_FATO' | 'PROCEDIMENTO_INVESTIGATORIO' | 'ACAO_PENAL'
    created_at: string
    updated_at: string
}

export interface Investigado {
    id: string
    nome: string
    tipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA'
    cpf: string | null
    cnpj: string | null
    vulgo: string | null
    data_nascimento: string | null
    filiacao: string | null
    nome_pai: string | null
    nome_mae: string | null
    faccionado: string | null
    papel_organizacao: string | null
    observacoes: string | null
    razao_social: string | null
    situacao: string | null
    natureza_juridica: string | null
    capital_social: number | null
    abertura: string | null
    ultima_consulta_ws: string | null
    created_at: string
    updated_at: string
}

export interface CasoInvestigado {
    id: string
    caso_id: string
    investigado_id: string
    created_at: string
}

export interface Cautelar {
    id: string
    caso_id: string
    investigado_id: string
    tipo: 'BUSCA_APREENSAO' | 'PRISAO_CAUTELAR' | 'SIGILO_BANCARIO' | 'SIGILO_TELEMATICO'
    status: 'Peticionado' | 'Em Execucao' | 'Cumprido' | 'Indeferido'
    ativo: boolean
    observacao: string | null
    created_at: string
    updated_at: string
}

export interface Endereco {
    id: string
    investigado_id: string
    logradouro: string
    lat: number | null
    lng: number | null
    origem: string | null
    created_at: string
}

export interface SocioEmpresa {
    id: string
    empresa_id: string
    socio_id: string
    created_at: string
}

export interface Profile {
    id: string
    username: string
    role: 'Administrador' | 'Analista'
    email: string
    password?: string
}

export interface AuditLog {
    id: string
    user_id: string
    username: string
    acao: string
    entidade: string
    entidade_id: string | null
    created_at: string
}

export interface HistoricoCaso {
    ano_mes: string
    nf: number
    pic: number
    ap: number
}

// ----------------------------------------------------
// BANCO DE DADOS DE BACKUP EM LOCALSTORAGE
// ----------------------------------------------------
const DEFAULT_DB = {
    casos: [
        {
            id: 'c1',
            codinome: 'Operação Fênix',
            e_proc: '5001234-92.2026.8.27.2701',
            e_proc_investigacao: '5009876-12.2026.8.27.2701',
            integrar_e: 'INT-654321',
            tags: ['TRÁFICO', 'ORGANIZAÇÃO CRIMINOSA'],
            status: 'ATIVO',
            natureza: 'PROCEDIMENTO_INVESTIGATORIO',
            created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        },
        {
            id: 'c2',
            codinome: 'Fraternos GAECO',
            e_proc: '5005577-44.2026.8.27.2701',
            e_proc_investigacao: '',
            integrar_e: 'INT-999333',
            tags: ['LAVAGEM DE DINHEIRO', 'CORRUPÇÃO'],
            status: 'ATIVO',
            natureza: 'ACAO_PENAL',
            created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
        }
    ] as Caso[],
    investigados: [
        {
            id: 'i1',
            nome: 'Carlos Eduardo Santos',
            tipo: 'PESSOA_FISICA',
            cpf: '52998224725',
            cnpj: null,
            vulgo: 'Cadu, Gordinho',
            data_nascimento: '1988-04-12',
            filiacao: 'Julio Santos e Rosa Santos',
            nome_pai: 'Julio Santos',
            nome_mae: 'Rosa Santos',
            faccionado: 'PCC',
            papel_organizacao: 'Liderança',
            observacoes: 'Principal articulador da logística na capital.',
            razao_social: null,
            situacao: null,
            natureza_juridica: null,
            capital_social: null,
            abertura: null,
            ultima_consulta_ws: null,
            created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        },
        {
            id: 'i2',
            nome: 'Distribuidora Fênix Ltda',
            tipo: 'PESSOA_JURIDICA',
            cpf: null,
            cnpj: '11222333000181',
            vulgo: 'Distribuidora',
            data_nascimento: null,
            filiacao: null,
            nome_pai: null,
            nome_mae: null,
            faccionado: 'Não Faccionado',
            papel_organizacao: 'Financiamento',
            observacoes: 'Empresa de fachada utilizada para lavagem de dinheiro.',
            razao_social: 'Distribuidora Comercial Fênix Ltda',
            situacao: 'ATIVA',
            natureza_juridica: 'Sociedade Limitada',
            capital_social: 150000,
            abertura: '2020-05-15',
            ultima_consulta_ws: new Date().toISOString(),
            created_at: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()
        },
        {
            id: 'i3',
            nome: 'Ricardo Antunes Bezerra',
            tipo: 'PESSOA_FISICA',
            cpf: '11144477735',
            cnpj: null,
            vulgo: 'Rico, Playboy',
            data_nascimento: '1995-10-22',
            filiacao: 'Marcos Bezerra e Sandra Antunes Bezerra',
            nome_pai: 'Marcos Bezerra',
            nome_mae: 'Sandra Antunes Bezerra',
            faccionado: 'CV',
            papel_organizacao: 'Operacional',
            observacoes: 'Apontado em conversas telemáticas como distribuidor do setor norte.',
            razao_social: null,
            situacao: null,
            natureza_juridica: null,
            capital_social: null,
            abertura: null,
            ultima_consulta_ws: null,
            created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString()
        }
    ] as Investigado[],
    caso_investigado: [
        { id: 'v1', caso_id: 'c1', investigado_id: 'i1', created_at: new Date().toISOString() },
        { id: 'v2', caso_id: 'c1', investigado_id: 'i2', created_at: new Date().toISOString() },
        { id: 'v3', caso_id: 'c2', investigado_id: 'i3', created_at: new Date().toISOString() }
    ] as CasoInvestigado[],
    cautelares: [
        {
            id: 'ct1',
            caso_id: 'c1',
            investigado_id: 'i1',
            tipo: 'PRISAO_CAUTELAR',
            status: 'Cumprido',
            ativo: false,
            observacao: 'Prisão efetuada com sucesso na residência.',
            created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
        },
        {
            id: 'ct2',
            caso_id: 'c1',
            investigado_id: 'i2',
            tipo: 'BUSCA_APREENSAO',
            status: 'Peticionado',
            ativo: true,
            observacao: 'Busca requerida nos endereços comerciais.',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ] as Cautelar[],
    enderecos: [
        {
            id: 'e1',
            investigado_id: 'i1',
            logradouro: 'Quadra 104 Norte, Avenida LO 4, Lote 12 - Palmas - TO',
            lat: -10.181234,
            lng: -48.332456,
            origem: 'CADASTRO',
            created_at: new Date().toISOString()
        },
        {
            id: 'e2',
            investigado_id: 'i2',
            logradouro: 'Quadra 508 Sul, Alameda 3, Lote 15 - Palmas - TO',
            lat: -10.204561,
            lng: -48.351234,
            origem: 'RECEITA_WS',
            created_at: new Date().toISOString()
        }
    ] as Endereco[],
    socios_empresa: [
        { id: 'se1', empresa_id: 'i2', socio_id: 'i1', created_at: new Date().toISOString() }
    ] as SocioEmpresa[],
    dashboard_historico_casos: [
        { ano_mes: '2026-06', nf: 3, pic: 5, ap: 2 },
        { ano_mes: '2026-07', nf: 4, pic: 7, ap: 3 },
        { ano_mes: '2026-08', nf: 5, pic: 9, ap: 3 }
    ] as HistoricoCaso[],
    profiles: [
        { id: 'p1', username: 'admin', role: 'Administrador', email: 'admin@mpto.mp.br', password: 'admin' },
        { id: 'p2', username: 'membro', role: 'Analista', email: 'membro@mpto.mp.br', password: 'membro' }
    ] as Profile[],
    audit_logs: [] as AuditLog[]
}

// Inicializa no LocalStorage se não existir
function getLocalDb() {
    const val = localStorage.getItem('argos_sheets_db')
    if (!val) {
        localStorage.setItem('argos_sheets_db', JSON.stringify(DEFAULT_DB))
        return DEFAULT_DB
    }
    try {
        const parsed = JSON.parse(val)
        // Garante que todas as chaves obrigatórias estejam lá
        const keys = Object.keys(DEFAULT_DB) as (keyof typeof DEFAULT_DB)[]
        for (const k of keys) {
            if (!parsed[k]) parsed[k] = []
        }
        return parsed
    } catch {
        localStorage.setItem('argos_sheets_db', JSON.stringify(DEFAULT_DB))
        return DEFAULT_DB
    }
}

function saveLocalDb(db: any) {
    localStorage.setItem('argos_sheets_db', JSON.stringify(db))
}

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// ----------------------------------------------------
// COMUNICAÇÃO COM GOOGLE SHEETS VIA WEB APP (doPost)
// ----------------------------------------------------
async function postToSheets<T>(action: string, params: Record<string, any> = {}): Promise<T> {
    const url = env.VITE_GOOGLE_SHEETS_WEBAPP_URL
    if (!url) {
        throw new Error('VITE_GOOGLE_SHEETS_WEBAPP_URL não está configurada no .env.local')
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8' // evita preflight CORS complexo com redirecionamentos no GAS
        },
        body: JSON.stringify({
            action,
            ...params
        })
    })

    if (!response.ok) {
        throw new Error(`Falha ao se comunicar com a planilha Google. Status HTTP: ${response.status}`)
    }

    const res = await response.json()
    if (!res.success) {
        throw new Error(res.error || 'Erro desconhecido na planilha Google Sheets')
    }
    return res.data as T
}

export const sheetsClient = {
    casos: {
        async listar(): Promise<any[]> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                return db.casos.map(c => {
                    const totalInvestigados = db.caso_investigado.filter(ci => ci.caso_id === c.id).length
                    const cautelares = db.cautelares.filter(ct => ct.caso_id === c.id)
                    const cautelaresAtivas = cautelares.filter(ct => ct.ativo).length
                    return {
                        ...c,
                        eProc: c.e_proc,
                        eProcInvestigacao: c.e_proc_investigacao,
                        integrarE: c.integrar_e,
                        totalInvestigados,
                        cautelaresAtivas
                    }
                }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }
            return postToSheets<any[]>('listarCasos')
        },

        async buscarPorId(id: string): Promise<any> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const caso = db.casos.find(c => c.id === id)
                if (!caso) throw new Error('Caso não encontrado')

                const casoInvestigados = db.caso_investigado.filter(ci => ci.caso_id === id)
                const investigados = casoInvestigados.map(ci => {
                    return db.investigados.find(inv => inv.id === ci.investigado_id)
                }).filter(Boolean)

                const cautelares = db.cautelares.filter(ct => ct.caso_id === id).map(ct => {
                    const inv = db.investigados.find(i => i.id === ct.investigado_id)
                    return { ...ct, investigados: inv ? { nome: inv.nome, cpf: inv.cpf } : null }
                })

                return {
                    ...caso,
                    eProc: caso.e_proc,
                    eProcInvestigacao: caso.e_proc_investigacao,
                    integrarE: caso.integrar_e,
                    investigados,
                    cautelares
                }
            }
            return postToSheets<any>('buscarCasoPorId', { id })
        },

        async criar(data: any): Promise<Caso> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const novo: Caso = {
                    id: generateUUID(),
                    codinome: data.codinome,
                    e_proc: data.e_proc || data.eProc,
                    e_proc_investigacao: data.e_proc_investigacao || data.eProcInvestigacao || '',
                    integrar_e: data.integrar_e || data.integrarE || '',
                    tags: data.tags || [],
                    natureza: data.natureza || 'NOTICIA_DE_FATO',
                    status: data.status || 'ATIVO',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
                db.casos.push(novo)
                saveLocalDb(db)
                return novo
            }
            return postToSheets<Caso>('criarCaso', { data })
        },

        async atualizar(id: string, data: any, updatedAt?: string): Promise<Caso> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const idx = db.casos.findIndex(c => c.id === id)
                if (idx === -1) throw new Error('Caso não encontrado')

                const atual = db.casos[idx]
                if (updatedAt && new Date(atual.updated_at).getTime() !== new Date(updatedAt).getTime()) {
                    throw new Error('CONCURRENCY_CONFLICT_caso')
                }

                const modificado: Caso = {
                    ...atual,
                    codinome: data.codinome !== undefined ? data.codinome : atual.codinome,
                    e_proc: data.eProc !== undefined ? data.eProc : (data.e_proc !== undefined ? data.e_proc : atual.e_proc),
                    e_proc_investigacao: data.eProcInvestigacao !== undefined ? data.eProcInvestigacao : (data.e_proc_investigacao !== undefined ? data.e_proc_investigacao : atual.e_proc_investigacao),
                    integrar_e: data.integrarE !== undefined ? data.integrarE : (data.integrar_e !== undefined ? data.integrar_e : atual.integrar_e),
                    tags: data.tags !== undefined ? data.tags : atual.tags,
                    natureza: data.natureza !== undefined ? data.natureza : atual.natureza,
                    status: data.status !== undefined ? data.status : atual.status,
                    updated_at: new Date().toISOString()
                }

                db.casos[idx] = modificado
                saveLocalDb(db)
                return modificado
            }
            return postToSheets<Caso>('atualizarCaso', { id, data, updatedAt })
        },

        async excluir(id: string): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                db.casos = db.casos.filter(c => c.id !== id)
                db.caso_investigado = db.caso_investigado.filter(ci => ci.caso_id !== id)
                db.cautelares = db.cautelares.filter(ct => ct.caso_id !== id)
                saveLocalDb(db)
                return
            }
            return postToSheets<void>('excluirCaso', { id })
        },

        async checarEProcUnico(eProc: string, excludeId?: string): Promise<boolean> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const exact = db.casos.some(c => c.e_proc === eProc && c.id !== excludeId)
                return !exact
            }
            return postToSheets<boolean>('checarEProcUnico', { eProc, excludeId })
        },

        async vincularInvestigado(casoId: string, investigadoId: string): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const existe = db.caso_investigado.some(ci => ci.caso_id === casoId && ci.investigado_id === investigadoId)
                if (!existe) {
                    db.caso_investigado.push({
                        id: generateUUID(),
                        caso_id: casoId,
                        investigado_id: investigadoId,
                        created_at: new Date().toISOString()
                    })
                    saveLocalDb(db)
                }
                return
            }
            return postToSheets<void>('vincularInvestigado', { casoId, investigadoId })
        },

        async desvincularInvestigado(casoId: string, investigadoId: string): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                db.caso_investigado = db.caso_investigado.filter(ci => !(ci.caso_id === casoId && ci.investigado_id === investigadoId))
                saveLocalDb(db)
                return
            }
            return postToSheets<void>('desvincularInvestigado', { casoId, investigadoId })
        },

        async buscarComInvestigados(q: string): Promise<any[]> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const lower = q.toLowerCase()
                const filtrados = db.casos.filter(c =>
                    c.codinome.toLowerCase().includes(lower) ||
                    c.e_proc.toLowerCase().includes(lower) ||
                    (c.integrar_e && c.integrar_e.toLowerCase().includes(lower))
                ).slice(0, 10)

                return filtrados.map(c => {
                    const links = db.caso_investigado.filter(ci => ci.caso_id === c.id)
                    const investigados = links.map(ci => db.investigados.find(i => i.id === ci.investigado_id)).filter(Boolean)
                    return {
                        id: c.id,
                        codinome: c.codinome,
                        eProc: c.e_proc,
                        integrarE: c.integrar_e,
                        investigados
                    }
                })
            }
            return postToSheets<any[]>('buscarCasosComInvestigados', { q })
        }
    },

    investigados: {
        async buscarInvestigados(q: string, campo: string = 'Todos', papel: string = 'Todos'): Promise<any[]> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const lower = q.toLowerCase()
                let list = db.investigados

                // Filtra pesquisa
                if (q) {
                    list = list.filter(inv => {
                        const matchNome = inv.nome.toLowerCase().includes(lower)
                        const matchVulgo = inv.vulgo && inv.vulgo.toLowerCase().includes(lower)
                        const matchCpf = inv.cpf && inv.cpf.includes(lower)
                        const matchCnpj = inv.cnpj && inv.cnpj.includes(lower)
                        const matchDoc = matchCpf || matchCnpj

                        if (campo === 'Nome') return matchNome
                        if (campo === 'Vulgo') return matchVulgo
                        if (campo === 'CPF/CNPJ') return matchDoc
                        return matchNome || matchVulgo || matchDoc
                    })
                }

                // Filtra papel
                if (papel && papel !== 'Todos') {
                    list = list.filter(inv => inv.papel_organizacao === papel)
                }

                return list.map(inv => {
                    const casoLink = db.caso_investigado.find(ci => ci.investigado_id === inv.id)
                    const caso = casoLink ? db.casos.find(c => c.id === casoLink.caso_id) : null
                    const emCautelar = db.cautelares.some(ct => ct.investigado_id === inv.id && ct.ativo)
                    return {
                        id: inv.id,
                        nome: inv.nome,
                        cpf: inv.cpf,
                        cnpj: inv.cnpj,
                        vulgo: inv.vulgo,
                        papelOrganizacao: inv.papel_organizacao,
                        temCautelar: emCautelar,
                        casoId: caso?.id || null,
                        codinomeCaso: caso?.codinome || null,
                        eProc: caso?.e_proc || null,
                        integrarE: caso?.integrar_e || null
                    }
                })
            }
            return postToSheets<any[]>('buscarInvestigados', { q, campo, papel })
        },

        async buscarParaAutocomplete(q: string): Promise<any[]> {
            if (q.length < 3) return []
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const lower = q.toLowerCase()
                return db.investigados.filter(inv =>
                    inv.nome.toLowerCase().includes(lower) ||
                    (inv.cpf && inv.cpf.includes(lower)) ||
                    (inv.cnpj && inv.cnpj.includes(lower))
                ).map(i => ({
                    id: i.id,
                    nome: i.nome,
                    cpf: i.cpf,
                    cnpj: i.cnpj
                })).slice(0, 15)
            }
            return postToSheets<any[]>('buscarParaAutocomplete', { q })
        },

        async buscarPorId(id: string): Promise<any> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const inv = db.investigados.find(i => i.id === id)
                if (!inv) throw new Error('Investigado não encontrado')

                const enderecos = db.enderecos.filter(e => e.investigado_id === id)
                const socioLinks = db.socios_empresa.filter(se => se.empresa_id === id)
                const socios = socioLinks.map(se => db.investigados.find(i => i.id === se.socio_id)).filter(Boolean)

                const casoLinks = db.caso_investigado.filter(ci => ci.investigado_id === id)
                const casos = casoLinks.map(cl => {
                    const c = db.casos.find(casoItem => casoItem.id === cl.caso_id)
                    if (!c) return null
                    const cautelares = db.cautelares.filter(ct => ct.caso_id === c.id)
                    return { ...c, cautelares }
                }).filter(Boolean)

                const cautelares = db.cautelares.filter(ct => ct.investigado_id === id).map(ct => {
                    const c = db.casos.find(casoItem => casoItem.id === ct.caso_id)
                    return { ...ct, casos: c ? { id: c.id, codinome: c.codinome } : null }
                })

                // Grafo de vínculos
                const nodesMap = new Map()
                nodesMap.set(id, {
                    id,
                    label: inv.nome,
                    sublabel: inv.cpf || inv.cnpj ? (inv.tipo === 'PESSOA_FISICA' ? `CPF: ${inv.cpf}` : `CNPJ: ${inv.cnpj}`) : undefined,
                    group: 'investigado_principal',
                    tipo: inv.tipo,
                    pai: inv.nome_pai,
                    mae: inv.nome_mae
                })

                const edges: any[] = []
                casos.forEach((caso: any) => {
                    nodesMap.set(caso.id, { id: caso.id, label: caso.codinome, sublabel: caso.e_proc, group: 'caso' })
                    edges.push({ from: id, to: caso.id })

                    // outros investigados no mesmo caso
                    const outrosLinks = db.caso_investigado.filter(ci => ci.caso_id === caso.id && ci.investigado_id !== id)
                    outrosLinks.forEach(ol => {
                        const outroInv = db.investigados.find(i => i.id === ol.investigado_id)
                        if (outroInv) {
                            nodesMap.set(outroInv.id, {
                                id: outroInv.id,
                                label: outroInv.nome,
                                sublabel: outroInv.cpf || outroInv.cnpj ? (outroInv.tipo === 'PESSOA_FISICA' ? `CPF: ${outroInv.cpf}` : `CNPJ: ${outroInv.cnpj}`) : undefined,
                                group: 'investigado',
                                tipo: outroInv.tipo,
                                pai: outroInv.nome_pai,
                                mae: outroInv.nome_mae
                            })
                            edges.push({ from: caso.id, to: outroInv.id })
                        }
                    })
                })

                return {
                    ...inv,
                    tipo: inv.tipo,
                    casos,
                    dataNascimento: inv.data_nascimento,
                    nomePai: inv.nome_pai,
                    nomeMae: inv.nome_mae,
                    observacoes: inv.observacoes,
                    socios,
                    enderecos,
                    cautelares: cautelares.map(c => ({
                        ...c,
                        casoId: c.casos?.id,
                        casoCodinome: c.casos?.codinome,
                        createdAt: c.created_at
                    })),
                    vinculos: {
                        nodes: Array.from(nodesMap.values()),
                        edges
                    }
                }
            }
            return postToSheets<any>('buscarInvestigadoPorId', { id })
        },

        async criar(data: any): Promise<Investigado> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const cpfLimpo = data.cpf ? String(data.cpf).replace(/\D/g, '') : null
                const cnpjLimpo = data.cnpj ? String(data.cnpj).replace(/\D/g, '') : null

                // Valida duplicado por CPF/CNPJ
                if (cpfLimpo || cnpjLimpo) {
                    const existente = db.investigados.find(i =>
                        (cpfLimpo && i.cpf === cpfLimpo) ||
                        (cnpjLimpo && i.cnpj === cnpjLimpo)
                    )
                    if (existente) {
                        // Se já existe e veio com endereços, insere
                        if (data.enderecos && data.enderecos.length > 0) {
                            const newEnds = data.enderecos.map((e: any) => ({
                                id: generateUUID(),
                                investigado_id: existente.id,
                                logradouro: e.logradouro,
                                lat: e.lat || null,
                                lng: e.lng || null,
                                origem: e.origem || 'CADASTRO',
                                created_at: new Date().toISOString()
                            }))
                            db.enderecos.push(...newEnds)
                            saveLocalDb(db)
                        }
                        return existente
                    }
                }

                const novo: Investigado = {
                    id: generateUUID(),
                    nome: data.nome,
                    tipo: data.tipo,
                    cpf: cpfLimpo,
                    cnpj: cnpjLimpo,
                    vulgo: data.vulgo || null,
                    data_nascimento: data.data_nascimento || data.dataNascimento || null,
                    filiacao: data.filiacao || null,
                    nome_pai: data.nome_pai || data.nomePai || null,
                    nome_mae: data.nome_mae || data.nomeMae || null,
                    faccionado: data.faccionado || 'Não Faccionado',
                    papel_organizacao: data.papel_organizacao || data.papelOrganizacao || 'Indefinido',
                    observacoes: data.observacoes || null,
                    razao_social: data.razao_social || data.razaoSocial || null,
                    situacao: data.situacao || null,
                    natureza_juridica: data.natureza_juridica || null,
                    capital_social: data.capital_social || null,
                    abertura: data.abertura || null,
                    ultima_consulta_ws: data.ultima_consulta_ws || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }

                db.investigados.push(novo)

                if (data.enderecos && data.enderecos.length > 0) {
                    const newEnds = data.enderecos.map((e: any) => ({
                        id: generateUUID(),
                        investigado_id: novo.id,
                        logradouro: e.logradouro,
                        lat: e.lat || null,
                        lng: e.lng || null,
                        origem: e.origem || 'CADASTRO',
                        created_at: new Date().toISOString()
                    }))
                    db.enderecos.push(...newEnds)
                }

                saveLocalDb(db)
                return novo
            }
            return postToSheets<Investigado>('criarInvestigado', { data })
        },

        async atualizar(id: string, data: any, updatedAt?: string): Promise<Investigado> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const idx = db.investigados.findIndex(i => i.id === id)
                if (idx === -1) throw new Error('Investigado não encontrado')

                const atual = db.investigados[idx]
                if (updatedAt && new Date(atual.updated_at).getTime() !== new Date(updatedAt).getTime()) {
                    throw new Error('CONCURRENCY_CONFLICT_investigado')
                }

                const modificado: Investigado = {
                    ...atual,
                    nome: data.nome !== undefined ? data.nome : atual.nome,
                    vulgo: data.vulgo !== undefined ? data.vulgo : atual.vulgo,
                    cpf: data.cpf !== undefined ? (data.cpf ? String(data.cpf).replace(/\D/g, '') : null) : atual.cpf,
                    cnpj: data.cnpj !== undefined ? (data.cnpj ? String(data.cnpj).replace(/\D/g, '') : null) : atual.cnpj,
                    data_nascimento: data.data_nascimento !== undefined ? data.data_nascimento : (data.dataNascimento !== undefined ? data.dataNascimento : atual.data_nascimento),
                    nome_pai: data.nome_pai !== undefined ? data.nome_pai : (data.nomePai !== undefined ? data.nomePai : atual.nome_pai),
                    nome_mae: data.nome_mae !== undefined ? data.nome_mae : (data.nomeMae !== undefined ? data.nomeMae : atual.nome_mae),
                    faccionado: data.faccionado !== undefined ? data.faccionado : atual.faccionado,
                    papel_organizacao: data.papel_organizacao !== undefined ? data.papel_organizacao : (data.papelOrganizacao !== undefined ? data.papelOrganizacao : atual.papel_organizacao),
                    observacoes: data.observacoes !== undefined ? data.observacoes : atual.observacoes,
                    razao_social: data.razao_social !== undefined ? data.razao_social : atual.razao_social,
                    situacao: data.situacao !== undefined ? data.situacao : atual.situacao,
                    natureza_juridica: data.natureza_juridica !== undefined ? data.natureza_juridica : atual.natureza_juridica,
                    capital_social: data.capital_social !== undefined ? Number(data.capital_social) : atual.capital_social,
                    abertura: data.abertura !== undefined ? data.abertura : atual.abertura,
                    ultima_consulta_ws: data.ultima_consulta_ws !== undefined ? data.ultima_consulta_ws : atual.ultima_consulta_ws,
                    updated_at: new Date().toISOString()
                }

                db.investigados[idx] = modificado
                saveLocalDb(db)
                return modificado
            }
            return postToSheets<Investigado>('atualizarInvestigado', { id, data, updatedAt })
        },

        async vincularSocio(empresaId: string, socioId: string): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const existe = db.socios_empresa.some(se => se.empresa_id === empresaId && se.socio_id === socioId)
                if (!existe) {
                    db.socios_empresa.push({
                        id: generateUUID(),
                        empresa_id: empresaId,
                        socio_id: socioId,
                        created_at: new Date().toISOString()
                    })
                    saveLocalDb(db)
                }
                return
            }
            return postToSheets<void>('vincularSocio', { empresaId, socioId })
        },

        async sincronizarEnderecos(investigadoId: string, enderecos: any[]): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                // Limpa todos do investigado
                db.enderecos = db.enderecos.filter(e => e.investigado_id !== investigadoId)
                // Reinsere os novos
                if (enderecos.length > 0) {
                    const rows = enderecos.map(e => ({
                        id: generateUUID(),
                        investigado_id: investigadoId,
                        logradouro: e.logradouro,
                        lat: e.lat ? Number(e.lat) : null,
                        lng: e.lng ? Number(e.lng) : null,
                        origem: e.origem || 'MANUAL',
                        created_at: new Date().toISOString()
                    }))
                    db.enderecos.push(...rows)
                }
                saveLocalDb(db)
                return
            }
            return postToSheets<void>('sincronizarEnderecos', { investigadoId, enderecos })
        },

        async sincronizarReceitaWS(id: string, cnpj: string): Promise<any> {
            // Essa chamada consulta um proxy público do ReceitaWS no backend,
            // e depois de obter a resposta, salva as informações do investigado.
            // Para ser compatível independente de banco local ou sheets,
            // chamamos o fetch e pedimos para atualizar os dados básicos baseados no retorno:
            const cnpjLimpo = cnpj.replace(/\D/g, '')
            try {
                const response = await fetch(`/api-receita/v1/cnpj/${cnpjLimpo}`)
                const data = await response.json()
                if (data.status === 'ERROR') throw new Error(data.message)

                const updateData = {
                    razao_social: data.nome,
                    situacao: data.situacao,
                    natureza_juridica: data.natureza_juridica,
                    capital_social: parseFloat(data.capital_social) || 0,
                    abertura: data.abertura ? data.abertura.split('/').reverse().join('-') : null,
                    ultima_consulta_ws: new Date().toISOString()
                }

                await this.atualizar(id, updateData)
                return { success: true, data: updateData }
            } catch (err: any) {
                console.error('[ReceitaWS] Sincronização falhou:', err)
                throw err
            }
        }
    },

    cautelares: {
        async listar(filtros?: { tipo?: string; casoId?: string; ativo?: boolean; status?: string }): Promise<any[]> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                let list = db.cautelares

                if (filtros) {
                    if (filtros.tipo && filtros.tipo !== 'Todos') {
                        list = list.filter(ct => ct.tipo === filtros.tipo)
                    }
                    if (filtros.casoId) {
                        list = list.filter(ct => ct.caso_id === filtros.casoId)
                    }
                    if (filtros.ativo !== undefined) {
                        list = list.filter(ct => ct.ativo === filtros.ativo)
                    }
                    if (filtros.status && filtros.status !== 'Todos') {
                        list = list.filter(ct => ct.status === filtros.status)
                    }
                }

                return list.map(ct => {
                    const caso = db.casos.find(c => c.id === ct.caso_id)
                    const inv = db.investigados.find(i => i.id === ct.investigado_id)
                    return {
                        ...ct,
                        casoCodinome: caso?.codinome || null,
                        casoEProc: caso?.e_proc || null,
                        investigadoNome: inv?.nome || null,
                        investigadoDocumento: inv ? (inv.cpf || inv.cnpj) : null
                    }
                }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }
            return postToSheets<any[]>('listarCautelares', { filtros })
        },

        async criarLote(tipo: string, casoId: string, investigadoIds: string[], observacao?: string): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                investigadoIds.forEach(invId => {
                    db.cautelares.push({
                        id: generateUUID(),
                        caso_id: casoId,
                        investigado_id: invId,
                        tipo: tipo as any,
                        status: 'Peticionado',
                        ativo: true,
                        observacao: observacao || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                })
                saveLocalDb(db)
                return
            }
            return postToSheets<void>('criarCautelaresLote', { tipo, casoId, investigadoIds, observacao })
        },

        async atualizarStatus(id: string, status: string): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const ct = db.cautelares.find(c => c.id === id)
                if (ct) {
                    ct.status = status as any
                    ct.ativo = status !== 'Indeferido' && status !== 'Cumprido'
                    ct.updated_at = new Date().toISOString()
                    saveLocalDb(db)
                }
                return
            }
            return postToSheets<void>('atualizarCautelarStatus', { id, status })
        },

        async atualizarObservacao(id: string, observacao: string): Promise<void> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const ct = db.cautelares.find(c => c.id === id)
                if (ct) {
                    ct.observacao = observacao
                    ct.updated_at = new Date().toISOString()
                    saveLocalDb(db)
                }
                return
            }
            return postToSheets<void>('atualizarCautelarObservacao', { id, observacao })
        }
    },

    relatorios: {
        async buscarDII(investigadoId: string): Promise<any> {
            return sheetsClient.investigados.buscarPorId(investigadoId)
        },

        async buscarConectividade(casoId: string): Promise<any> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                // investigados deste caso
                const links = db.caso_investigado.filter(ci => ci.caso_id === casoId)
                const investigados = links.map(l => db.investigados.find(i => i.id === l.investigado_id)).filter(Boolean)

                const processed = investigados.map(inv => {
                    const contagemCasos = db.caso_investigado.filter(ci => ci.investigado_id === inv!.id).length
                    let papel = 'ISOLADO'
                    if (contagemCasos >= 5) papel = 'HUB'
                    else if (contagemCasos >= 2) papel = 'BROKER'

                    return {
                        ...inv,
                        grau: contagemCasos,
                        papel
                    }
                })

                return {
                    investigados: processed.sort((a, b) => b.grau - a.grau)
                }
            }
            return postToSheets<any>('buscarRelatorioConectividade', { casoId })
        },

        async buscarFinanceiro(casoId: string): Promise<any> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const links = db.caso_investigado.filter(ci => ci.caso_id === casoId)
                const todos = links.map(l => db.investigados.find(i => i.id === l.investigado_id)).filter(Boolean)

                const pjs = todos.filter(i => i!.tipo === 'PESSOA_JURIDICA')
                const alertas = todos.filter(i => i!.papel_organizacao === 'Financiamento')

                return { pjs, alertas }
            }
            return postToSheets<any>('buscarRelatorioFinanceiro', { casoId })
        },

        async buscarEfetividade(): Promise<any> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                return {
                    cautelares: db.cautelares,
                    investigados: db.investigados,
                    totalCasos: db.casos.length
                }
            }
            return postToSheets<any>('buscarRelatorioEfetividade')
        },

        async buscarFaccionados(): Promise<any[]> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                return db.investigados.filter(inv =>
                    inv.faccionado &&
                    inv.faccionado !== 'Não Faccionado' &&
                    inv.faccionado !== 'Nenhuma' &&
                    inv.faccionado !== ''
                )
            }
            return postToSheets<any[]>('buscarRelatorioFaccionados')
        },

        async buscarEnderecosGeolocalizados(): Promise<any[]> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                return db.enderecos.filter(e => e.lat !== null && e.lng !== null)
            }
            return postToSheets<any[]>('buscarEnderecosGeolocalizados')
        }
    },

    dashboard: {
        async buscarStats(): Promise<any> {
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const mesAtual = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
                const anoCorrente = `${new Date().getFullYear()}-01-01`

                const casosAtivos = db.casos.filter(c => c.status === 'ATIVO')
                const buscasAno = db.cautelares.filter(c => c.tipo === 'BUSCA_APREENSAO' && c.created_at >= anoCorrente).length
                const cumpridasAno = db.cautelares.filter(c => c.status === 'Cumprido' && c.created_at >= anoCorrente).length
                const faccionadosCadastrados = db.investigados.filter(i => i.faccionado && i.faccionado !== 'Não Faccionado' && i.faccionado !== 'Nenhuma').length

                const nfAtual = casosAtivos.filter(c => c.natureza === 'NOTICIA_DE_FATO').length
                const picAtual = casosAtivos.filter(c => c.natureza === 'PROCEDIMENTO_INVESTIGATORIO').length
                const apAtual = casosAtivos.filter(c => c.natureza === 'ACAO_PENAL').length

                // Gerencia historico
                let historico = db.dashboard_historico_casos || []
                const idxHistorico = historico.findIndex(h => h.ano_mes === mesAtual)
                if (idxHistorico !== -1) {
                    const row = historico[idxHistorico]
                    row.nf = Math.max(row.nf, nfAtual)
                    row.pic = Math.max(row.pic, picAtual)
                    row.ap = Math.max(row.ap, apAtual)
                } else {
                    historico.push({ ano_mes: mesAtual, nf: nfAtual, pic: picAtual, ap: apAtual })
                }
                saveLocalDb(db)

                // Tags ranking
                const tagsMap: Record<string, number> = {}
                casosAtivos.forEach(c => {
                    c.tags.forEach(t => {
                        const word = t.trim().toUpperCase()
                        if (word) tagsMap[word] = (tagsMap[word] || 0) + 1
                    })
                })
                const rankingTags = Object.entries(tagsMap)
                    .map(([materia, quantidade]) => ({ materia, quantidade }))
                    .sort((a, b) => b.quantidade - a.quantidade)
                    .slice(0, 10)

                // Facções pie chart
                const faccoesMap: Record<string, number> = {}
                db.investigados.forEach(i => {
                    if (i.faccionado && i.faccionado !== 'Não Faccionado' && i.faccionado !== 'Nenhuma') {
                        faccoesMap[i.faccionado] = (faccoesMap[i.faccionado] || 0) + 1
                    }
                })
                const distribuicaoFaccoes = Object.entries(faccoesMap).map(([faccao, total]) => ({
                    faccao,
                    total
                })).sort((a, b) => b.total - a.total)

                // UFs Map
                const ufMap = new Map<string, { uf: string, lat: number, lng: number, total: number }>()
                db.enderecos.forEach(e => {
                    if (e.lat !== null && e.lng !== null) {
                        let uf = 'Outros'
                        let centerLat = e.lat
                        let centerLng = e.lng
                        if (e.lat < -22 && e.lat > -26 && e.lng < -47 && e.lng > -54) { uf = 'PR'; centerLat = -25.42; centerLng = -49.27 }
                        else if (e.lat < -25 && e.lat > -29 && e.lng < -48 && e.lng > -53) { uf = 'SC'; centerLat = -27.59; centerLng = -48.54 }
                        else if (e.lat < -27 && e.lat > -33 && e.lng < -49 && e.lng > -57) { uf = 'RS'; centerLat = -30.03; centerLng = -51.21 }
                        else if (e.lat < -20 && e.lat > -25 && e.lng < -44 && e.lng > -53) { uf = 'SP'; centerLat = -23.55; centerLng = -46.63 }
                        else if (e.lat < -5 && e.lat > -15 && e.lng < -45 && e.lng > -52) { uf = 'TO'; centerLat = -10.18; centerLng = -48.33 }

                        const x = ufMap.get(uf)
                        if (x) {
                            x.total++
                        } else {
                            ufMap.set(uf, { uf, lat: centerLat, lng: centerLng, total: 1 })
                        }
                    }
                })

                // Ultimos 3 meses
                const ultimos3 = Array.from({ length: 3 }, (_, i) => {
                    const d = new Date()
                    d.setMonth(d.getMonth() - (2 - i))
                    return d.toISOString().slice(0, 7)
                })

                const historicoCasos = ultimos3.map(mKey => {
                    const h = historico.find(x => x.ano_mes === mKey)
                    const [y, m] = mKey.split('-')
                    const mesStr = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('pt-BR', { month: 'short' })
                    return {
                        mes: mesStr.charAt(0).toUpperCase() + mesStr.slice(1).replace('.', '') + '/' + y.slice(2),
                        nf: h?.nf || 0,
                        pic: h?.pic || 0,
                        ap: h?.ap || 0
                    }
                })

                return {
                    casosAtivos: casosAtivos.length,
                    nfAtivos: nfAtual,
                    picAtivos: picAtual,
                    apAtivos: apAtual,
                    buscasAno,
                    cumpridasAno,
                    faccionadosCadastrados,
                    historicoCasos,
                    rankingTags,
                    distribuicaoFaccoes,
                    mandadosPorUF: Array.from(ufMap.values()).filter(x => x.uf !== 'Outros'),
                    pontosCalor: db.enderecos.filter(e => e.lat !== null && e.lng !== null).map(e => {
                        const inv = db.investigados.find(i => i.id === e.investigado_id)
                        return {
                            lat: e.lat,
                            lng: e.lng,
                            faccao: inv && inv.faccionado ? inv.faccionado : 'Não Faccionados'
                        }
                    })
                }
            }
            return postToSheets<any>('buscarDashboardStats')
        }
    },

    auth: {
        async init(): Promise<Profile | null> {
            const userStr = localStorage.getItem('argos_sheets_user')
            if (!userStr) return null
            try {
                return JSON.parse(userStr) as Profile
            } catch {
                localStorage.removeItem('argos_sheets_user')
                return null
            }
        },

        async login(username: string, password?: string): Promise<Profile> {
            const userLower = username.toLowerCase().trim()
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const p = db.profiles.find(user => user.username.toLowerCase() === userLower && user.password === password)
                if (!p) throw new Error('Credenciais inválidas')
                const sessionProfile: Profile = { id: p.id, username: p.username, email: p.email, role: p.role }
                localStorage.setItem('argos_sheets_user', JSON.stringify(sessionProfile))
                return sessionProfile
            }

            const p = await postToSheets<Profile>('authLogin', { username: userLower, password })
            localStorage.setItem('argos_sheets_user', JSON.stringify(p))
            return p
        },

        async register(email: string, username: string, password?: string): Promise<Profile> {
            const userLower = username.toLowerCase().trim()
            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                const existe = db.profiles.some(user => user.username.toLowerCase() === userLower || user.email.toLowerCase() === email.toLowerCase())
                if (existe) throw new Error('Usuário ou email já cadastrado')

                const novo: Profile = {
                    id: generateUUID(),
                    username: userLower,
                    role: 'Analista',
                    email: email.toLowerCase().trim(),
                    password
                }
                db.profiles.push(novo)
                saveLocalDb(db)

                const sessionProfile = { id: novo.id, username: novo.username, email: novo.email, role: novo.role }
                localStorage.setItem('argos_sheets_user', JSON.stringify(sessionProfile))
                return sessionProfile
            }

            const p = await postToSheets<Profile>('authRegister', { email, username: userLower, password })
            localStorage.setItem('argos_sheets_user', JSON.stringify(p))
            return p
        },

        async logout(): Promise<void> {
            localStorage.removeItem('argos_sheets_user')
        }
    },

    pep: {
        async checkPep(cpf: string): Promise<any | null> {
            // Em sheets mode, a verificação da base PEP da CGU é simulada / mockada localmente.
            // Para CPFs comuns retornamos nulo, mas para CPFs de teste ou aleatórios
            // podemos retornar uma resposta estruturada de exemplo.
            const cpfNum = cpf.replace(/\D/g, '')
            if (cpfNum === '52998224725') {
                return {
                    descricaoFuncao: 'Prefeito Municipal de Capital',
                    nomeOrgao: 'Prefeitura Municipal de Palmas',
                    dataInicioExercicio: '2024-01-01'
                }
            }
            return null
        }
    },

    auditLogs: {
        async registrar(acao: string, entidade: string, entidadeId: string | null = null): Promise<void> {
            const userStr = localStorage.getItem('argos_sheets_user')
            if (!userStr) return
            const user = JSON.parse(userStr) as Profile

            if (!env.VITE_GOOGLE_SHEETS_WEBAPP_URL) {
                const db = getLocalDb()
                db.audit_logs.push({
                    id: generateUUID(),
                    user_id: user.id || 'system',
                    username: user.username || 'anon',
                    acao,
                    entidade,
                    entidade_id: entidadeId,
                    created_at: new Date().toISOString()
                })
                saveLocalDb(db)
                return
            }

            // fire-and-forget, sem await para não travar a UX
            postToSheets<void>('registrarAuditLog', {
                userId: user.id,
                username: user.username,
                acao,
                entidade,
                entidadeId
            }).catch(err => console.warn('[Audit] Erro ao salvar audit remoto:', err))
        }
    }
}
