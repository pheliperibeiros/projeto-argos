import { supabase } from '@/lib/supabase'

export async function listar(filtros?: { tipo?: string; casoId?: string; ativo?: boolean; status?: string }) {
    let query = supabase
        .from('cautelares')
        .select('*, casos(codinome, e_proc), investigados(nome, cpf, cnpj)')

    if (filtros) {
        if (filtros.tipo && filtros.tipo !== 'Todos') {
            query = query.eq('tipo', filtros.tipo)
        }
        if (filtros.casoId) {
            query = query.eq('caso_id', filtros.casoId)
        }
        if (filtros.ativo !== undefined) {
            query = query.eq('ativo', filtros.ativo)
        }
        if (filtros.status && filtros.status !== 'Todos') {
            query = query.eq('status', filtros.status)
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
    const rows = investigadoIds.map(investigado_id => ({
        tipo,
        caso_id: casoId,
        investigado_id,
        observacao: observacao ?? null,
        status: 'Peticionado',
        ativo: true
    }))

    const { error } = await supabase.from('cautelares').insert(rows)
    if (error) throw new Error(error.message)
}

export async function atualizarStatus(id: string, status: string) {
    const { error } = await supabase
        .from('cautelares')
        .update({ status })
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function atualizarObservacao(id: string, observacao: string) {
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
