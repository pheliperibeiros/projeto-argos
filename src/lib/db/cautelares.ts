import { supabase } from '@/lib/supabase'
import { isSheetsMode } from '@/lib/env'
import { sheetsClient } from '@/lib/googleSheetsClient'

export async function listar(filtros?: { tipo?: string; casoId?: string; ativo?: boolean; status?: string }) {
    if (isSheetsMode) {
        return sheetsClient.cautelares.listar(filtros)
    }

    let query = supabase
        .from('cautelares')
        .select('*, casos(codinome, e_proc), investigados(nome, cpf, cnpj)')

    if (filtros) {
        if (filtros.tipo && filtros.tipo !== 'Todos') {
            query = query.eq('tipo', filtros.tipo as any)
        }
        if (filtros.casoId) {
            query = query.eq('caso_id', filtros.casoId)
        }
        if (filtros.ativo !== undefined) {
            query = query.eq('ativo', filtros.ativo)
        }
        if (filtros.status && filtros.status !== 'Todos') {
            query = query.eq('status', filtros.status as any)
        }
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw new Error(error.message)

    return (data || []).map((item: any) => ({
        ...item,
        casoCodinome: item.casos?.codinome,
        casoEProc: item.casos?.e_proc,
        investigadoNome: item.investigados?.nome,
        investigadoDocumento: item.investigados?.cpf || item.investigados?.cnpj
    }))
}

export async function criarLote(tipo: string, casoId: string, investigadoIds: string[], observacao?: string) {
    if (isSheetsMode) {
        return sheetsClient.cautelares.criarLote(tipo, casoId, investigadoIds, observacao)
    }

    const rows = investigadoIds.map(investigado_id => ({
        tipo: tipo as any,
        caso_id: casoId,
        investigado_id,
        observacao: observacao ?? null,
        status: 'Peticionado' as any,
        ativo: true
    }))

    const { error } = await supabase.from('cautelares').insert(rows)
    if (error) throw new Error(error.message)
}

export async function atualizarStatus(id: string, status: string) {
    if (isSheetsMode) {
        return sheetsClient.cautelares.atualizarStatus(id, status)
    }

    const { error } = await supabase
        .from('cautelares')
        .update({ status: status as any })
        .eq('id', id)

    if (error) throw new Error(error.message)
}


export async function atualizarObservacao(id: string, observacao: string) {
    if (isSheetsMode) {
        return sheetsClient.cautelares.atualizarObservacao(id, observacao)
    }

    const { error } = await supabase
        .from('cautelares')
        .update({ observacao })
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export const dbCautelares = {
    listar,
    criarLote,
    atualizarStatus,
    atualizarObservacao
}

