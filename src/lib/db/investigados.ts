import { supabase } from '@/lib/supabase'


export async function buscarInvestigados(q: string, campo: string = 'Todos', papel: string = 'Todos') {
    const { data, error } = await supabase.rpc('search_investigados_v5', {
        p_term: q,
        p_campo: campo,
        p_papel: papel
    })

    if (error) throw new Error(error.message)

    return (data || []).map((inv: any) => ({
        id: inv.id,
        nome: inv.nome,
        cpf: inv.cpf,
        cnpj: inv.cnpj,
        vulgo: inv.vulgo,
        papelOrganizacao: inv.papel_organizacao,
        temCautelar: inv.tem_cautelar,
        casoId: inv.caso_id,
        codinomeCaso: inv.codinome_caso,
        eProc: inv.e_proc,
        integrarE: inv.integrar_e
    }))
}

export async function buscarParaAutocomplete(q: string) {
    if (q.length < 3) return []

    const { data, error } = await supabase.rpc('autocomplete_investigados_v2', {
        p_term: q
    })

    if (error) throw new Error(error.message)
    return data || []
}

export async function buscarPorId(id: string) {
    const { data: inv, error } = await supabase
        .from('investigados')
        .select(`
            *,
            enderecos (*),
            socios:socios_empresa!empresa_id(
                socio:investigados!socio_id(*)
            ),
            caso_investigado (
                casos (
                    id, codinome, e_proc, integrar_e, created_at,
                    cautelares ( * )
                )
            ),
            cautelares (
                *, casos ( codinome )
            )
        `)
        .eq('id', id)
        .single()

    if (error || !inv) throw new Error(error?.message || 'Investigado não encontrado')

    // Mapear os casos
    const casos = inv.caso_investigado?.map((ci: any) => ci.casos) || []
    const casoIds = casos.map((c: any) => c.id)

    // Buscar outros investigados nos mesmos casos para montar rede (nodes e edges)
    let outrosInvestigados = []
    if (casoIds.length > 0) {
        const { data: outros } = await supabase
            .from('caso_investigado')
            .select(`
                caso_id,
                investigados ( id, nome, tipo )
            `)
            .in('caso_id', casoIds)
            .neq('investigado_id', id)

        outrosInvestigados = outros || []
    }

    const nodesMap = new Map()
    nodesMap.set(id, {
        id,
        label: inv.nome,
        sublabel: inv.cpf || inv.cnpj ? (inv.tipo === 'PESSOA_FISICA' ? `CPF: ${inv.cpf}` : `CNPJ: ${inv.cnpj}`) : undefined,
        group: 'investigado_principal',
        tipo: inv.tipo
    })

    const edges = []

    casos.forEach((caso: any) => {
        nodesMap.set(caso.id, { id: caso.id, label: caso.codinome, sublabel: caso.e_proc, group: 'caso' })
        edges.push({ from: id, to: caso.id })
    })

    outrosInvestigados.forEach((outro: any) => {
        const invOutro = outro.investigados
        if (invOutro) {
            nodesMap.set(invOutro.id, {
                id: invOutro.id,
                label: invOutro.nome,
                sublabel: invOutro.cpf || invOutro.cnpj ? (invOutro.tipo === 'PESSOA_FISICA' ? `CPF: ${invOutro.cpf}` : `CNPJ: ${invOutro.cnpj}`) : undefined,
                group: 'investigado',
                tipo: invOutro.tipo
            })
            edges.push({ from: outro.caso_id, to: invOutro.id })
        }
    })

    return {
        ...inv,
        tipo: inv.tipo,
        casos,
        dataNascimento: inv.data_nascimento,
        nomePai: inv.nome_pai,
        nomeMae: inv.nome_mae,
        observacoes: inv.observacoes,
        socios: inv.socios?.map((s: any) => s.socio) || [],
        cautelares: inv.cautelares?.map((c: any) => ({
            ...c,
            casoId: c.casos?.id,
            casoCodinome: c.casos?.codinome,
            createdAt: c.created_at
        })) || [],
        vinculos: {
            nodes: Array.from(nodesMap.values()),
            edges
        }
    }
}

export async function sincronizarReceitaWS(id: string, cnpj: string) {
    try {
        const cnpjLimpo = cnpj.replace(/\D/g, '')
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

        const { error } = await supabase
            .from('investigados')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
        return { success: true, data: updateData }
    } catch (error) {
        console.error('[ReceitaWS] Erro na sincronização:', error)
        throw error
    }
}

export async function criar(data: any) {
    const enderecosInfo = data.enderecos
    const insertData = { ...data }
    delete insertData.enderecos

    const { data: created, error } = await supabase
        .from('investigados')
        .insert(insertData)
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            const cleanCnpj = insertData.cnpj ? insertData.cnpj.replace(/\D/g, '') : null;
            const cleanCpf = insertData.cpf ? insertData.cpf.replace(/\D/g, '') : null;

            // Busca ignorando formatação para garantir que encontramos o registro mesmo se estiver "sujo" no banco
            const { data: existingRecords } = await supabase
                .from('investigados')
                .select('*')
                .or(`cnpj.eq.${cleanCnpj || 'null'},cpf.eq.${cleanCpf || 'null'}`)
                .limit(1)

            const existing = existingRecords?.[0]

            if (existing) {
                if (enderecosInfo && enderecosInfo.length > 0) {
                    try {
                        const rows = enderecosInfo.map((e: any) => ({ ...e, investigado_id: existing.id }))
                        await supabase.from('enderecos').insert(rows)
                    } catch (e) {
                        console.warn('[DB] Erro ao adicionar endereço ao investigado existente:', e)
                    }
                }
                return existing
            }
        }
        console.error('[DB] Erro ao criar investigado:', error)
        throw new Error(error.message || 'Erro de banco de dados ao criar')
    }

    if (enderecosInfo && enderecosInfo.length > 0) {
        const rows = enderecosInfo.map((e: any) => ({ ...e, investigado_id: created.id }))
        const { error: endErr } = await supabase.from('enderecos').insert(rows)
        if (endErr) {
            console.error('[DB] Erro ao salvar endereços:', endErr)
            throw new Error(`Investigado criado, mas erro nos endereços: ${endErr.message}`)
        }
    }

    return created
}

export async function atualizar(id: string, data: any) {
    const updateData = { ...data }
    delete updateData.enderecos // Endereços devem ser geridos separadamente ou em lote

    const { data: updated, error } = await supabase
        .from('investigados')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return updated
}

export async function vincularSocio(empresaId: string, socioId: string) {
    const { error } = await supabase
        .from('socios_empresa')
        .insert({ empresa_id: empresaId, socio_id: socioId })

    if (error && error.code !== '23505') {
        throw new Error(error.message)
    }
}

export const dbInvestigados = {
    buscarInvestigados,
    buscarParaAutocomplete,
    buscarPorId,
    criar,
    atualizar,
    vincularSocio,
    sincronizarReceitaWS
}
