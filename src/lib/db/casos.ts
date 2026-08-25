import { supabase } from '@/lib/supabase'
import { atualizarComControle } from '@/lib/concurrency'
import { isSheetsMode } from '@/lib/env'
import { sheetsClient } from '@/lib/googleSheetsClient'

export async function listar() {
    if (isSheetsMode) {
        return sheetsClient.casos.listar()
    }

    const { data, error } = await supabase
        .from('casos')
        .select(`
            id, codinome, e_proc, e_proc_investigacao, integrar_e, tags, status, natureza, created_at,
            caso_investigado ( investigado_id ),
            cautelares ( id, ativo )
        `)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data || []).map((item: any) => ({
        ...item,
        eProc: item.e_proc,
        eProcInvestigacao: item.e_proc_investigacao,
        integrarE: item.integrar_e,
        totalInvestigados: item.caso_investigado?.length || 0,
        cautelaresAtivas: item.cautelares?.filter((c: any) => c.ativo).length || 0
    }))
}

export async function buscarPorId(id: string) {
    if (isSheetsMode) {
        return sheetsClient.casos.buscarPorId(id)
    }

    const { data, error } = await supabase
        .from('casos')
        .select(`
            *,
            caso_investigado (
                investigados ( id, nome, cpf, cnpj, tipo, papel_organizacao, faccionado, nome_pai, nome_mae )
            ),
            cautelares (
                *, investigados ( nome, cpf )
            )
        `)
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)

    return {
        ...data,
        eProc: data.e_proc,
        eProcInvestigacao: data.e_proc_investigacao,
        integrarE: data.integrar_e,
        investigados: data.caso_investigado?.map((ci: any) => ci.investigados) || []
    }
}

export async function criar(data: any) {
    if (isSheetsMode) {
        return sheetsClient.casos.criar(data)
    }

    const { data: created, error } = await supabase
        .from('casos')
        .insert({
            codinome: data.codinome,
            e_proc: data.eProc,
            e_proc_investigacao: data.eProcInvestigacao,
            integrar_e: data.integrarE,
            tags: data.tags || [],
            natureza: data.natureza,
            status: data.status || 'ATIVO'
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return created
}

export async function atualizar(id: string, data: any, updatedAt?: string) {
    if (isSheetsMode) {
        return sheetsClient.casos.atualizar(id, data, updatedAt)
    }

    const payload = {
        codinome: data.codinome,
        e_proc: data.eProc,
        e_proc_investigacao: data.eProcInvestigacao,
        integrar_e: data.integrarE,
        tags: data.tags,
        natureza: data.natureza,
        status: data.status
    }

    // Se updatedAt for fornecido, usa o controle de concorrência otimista
    if (updatedAt) {
        return atualizarComControle('casos', id, payload, updatedAt, 'caso')
    }

    // Fallback sem controle (compatibilidade com chamadas sem snapshot)
    const { data: updated, error } = await supabase
        .from('casos')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updated
}

export async function excluir(id: string) {
    if (isSheetsMode) {
        return sheetsClient.casos.excluir(id)
    }

    const { error } = await supabase.from('casos').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

export async function checarEProcUnico(eProc: string, excludeId?: string) {
    if (isSheetsMode) {
        return sheetsClient.casos.checarEProcUnico(eProc, excludeId)
    }

    let query = supabase
        .from('casos')
        .select('id', { count: 'exact', head: true })
        .eq('e_proc', eProc)

    if (excludeId) query = query.neq('id', excludeId)

    const { count, error } = await query
    if (error) throw new Error(error.message)

    return count === 0
}

export async function vincularInvestigado(casoId: string, investigadoId: string) {
    if (isSheetsMode) {
        return sheetsClient.casos.vincularInvestigado(casoId, investigadoId)
    }

    const { error } = await supabase
        .from('caso_investigado')
        .insert({ caso_id: casoId, investigado_id: investigadoId })
    // supabase sdk in javascript doesnt have implicit onConflict ignore, 
    // mas unique constraint já vai lidar, logo ignoramos erro de duplicidade

    if (error && error.code !== '23505') {
        throw new Error(error.message)
    }
}

export async function desvincularInvestigado(casoId: string, investigadoId: string) {
    if (isSheetsMode) {
        return sheetsClient.casos.desvincularInvestigado(casoId, investigadoId)
    }

    const { error } = await supabase
        .from('caso_investigado')
        .delete()
        .match({ caso_id: casoId, investigado_id: investigadoId })

    if (error) throw new Error(error.message)
}

export async function buscarComInvestigados(q: string) {
    if (isSheetsMode) {
        return sheetsClient.casos.buscarComInvestigados(q)
    }

    const { data, error } = await supabase
        .from('casos')
        .select(`
            id, codinome, e_proc, integrar_e,
            caso_investigado (
                investigados ( id, nome, cpf, cnpj )
            )
        `)
        .or(`codinome.ilike.%${q}%,e_proc.ilike.%${q}%,integrar_e.ilike.%${q}%`)
        .limit(10)

    if (error) throw new Error(error.message)

    return (data || []).map((item: any) => ({
        id: item.id,
        codinome: item.codinome,
        eProc: item.e_proc,
        integrarE: item.integrar_e,
        investigados: item.caso_investigado?.map((ci: any) => ci.investigados) || []
    }))
}

export const dbCasos = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    excluir,
    checarEProcUnico,
    vincularInvestigado,
    desvincularInvestigado,
    buscarComInvestigados
}

