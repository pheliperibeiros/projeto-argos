import { supabase } from '@/lib/supabase'

export const dbRelatorios = {
    async buscarDII(investigadoId: string) {
        const { data, error } = await supabase
            .from('investigados')
            .select(`
        *,
        enderecos (*),
        caso_investigado (
          casos (*)
        ),
        cautelares (
          *,
          casos ( codinome )
        )
      `)
            .eq('id', investigadoId)
            .single()

        if (error) throw error

        return {
            ...data,
            casos: (data as any).caso_investigado?.map((ci: any) => ci.casos) || [],
            cautelares: (data as any).cautelares?.map((c: any) => ({
                ...c,
                casoCodinome: c.casos?.codinome
            })) || []
        }
    },

    async buscarConectividade(casoId: string) {
        // 1. Buscar investigados do caso
        const { data: vinculos, error: e1 } = await supabase
            .from('caso_investigado')
            .select('investigados(*)')
            .eq('caso_id', casoId)

        if (e1) throw e1

        const investigados = vinculos?.map((v: any) => v.investigados) || []

        // 2. Para cada investigado, ver em quantos casos participa (grau)
        const results = await Promise.all(investigados.map(async (inv: any) => {
            const { count } = await supabase
                .from('caso_investigado')
                .select('id', { count: 'exact', head: true })
                .eq('investigado_id', inv.id)

            return {
                ...inv,
                grau: count || 0
            }
        }))

        // 3. Definir Papel
        const processed = results.map(inv => {
            let papel = null
            if (inv.grau >= 5) papel = 'HUB'
            else if (inv.grau >= 2) papel = 'BROKER'
            else if (inv.grau === 1) papel = 'ISOLADO'
            return { ...inv, papel }
        })

        return {
            investigados: processed.sort((a, b) => b.grau - a.grau)
        }
    },

    async buscarFinanceiro(casoId: string) {
        // Investigados PJ do caso
        const { data: vinculos, error } = await supabase
            .from('caso_investigado')
            .select(`
        investigados (
          id, nome, cnpj, cpf, tipo, papel_organizacao, faccionado
        )
      `)
            .eq('caso_id', casoId)

        if (error) throw error

        const todos = vinculos?.map((v: any) => v.investigados) || []
        const pjs = todos.filter((i: any) => i.tipo === 'PESSOA_JURIDICA')

        // Alertas mockados para fins de demonstração da lógica
        const alertas = todos.filter((i: any) => i.papel_organizacao === 'Financiamento')

        return { pjs, alertas }
    },

    async buscarEfetividade() {
        const [cautelares, investigados, casos] = await Promise.all([
            supabase.from('cautelares').select('tipo, ativo'),
            supabase.from('investigados').select('faccionado'),
            supabase.from('casos').select('id', { count: 'exact', head: true })
        ])

        return {
            cautelares: cautelares.data || [],
            investigados: investigados.data || [],
            totalCasos: casos.count || 0
        }
    },

    async buscarFaccionados() {
        const { data, error } = await supabase
            .from('investigados')
            .select('id, nome, vulgo, cpf, data_nascimento, faccionado, papel_organizacao')
            .not('faccionado', 'is', null)
            .neq('faccionado', '')
            .neq('faccionado', 'Nenhuma')
            .neq('faccionado', 'Não Faccionado')

        if (error) throw error
        return data || []
    }
}
