import { supabase } from '@/lib/supabase'
import { inicioAno } from '@/lib/formatters'
import { isSheetsMode } from '@/lib/env'
import { sheetsClient } from '@/lib/googleSheetsClient'

export async function buscarStats() {
    if (isSheetsMode) {
        return sheetsClient.dashboard.buscarStats()
    }

    const anoCorrente = inicioAno()

    // Atualiza o pico do mês corrente antes de ler
    const mesAtual = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

    const [
        { count: casosAtivos },
        { count: buscasAno },
        { count: cumpridasAno },
        { count: faccionadosCadastrados },
        { data: investigados },
        { data: enderecos },
        { data: casosGeral },
        { data: historicoRows }
    ] = await Promise.all([
        supabase.from('casos').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
        supabase.from('cautelares').select('*', { count: 'exact', head: true }).eq('tipo', 'BUSCA_APREENSAO').gte('created_at', anoCorrente),
        supabase.from('cautelares').select('*', { count: 'exact', head: true }).eq('status', 'Cumprido').gte('created_at', anoCorrente),
        supabase.from('investigados').select('*', { count: 'exact', head: true }).not('faccionado', 'is', null).neq('faccionado', '').neq('faccionado', 'Nenhuma').neq('faccionado', 'Não Faccionado'),
        supabase.from('investigados').select('faccionado').not('faccionado', 'is', null).neq('faccionado', '').neq('faccionado', 'Nenhuma').neq('faccionado', 'Não Faccionado'),
        supabase.from('enderecos').select('lat, lng, investigados(faccionado)').not('lat', 'is', null),
        supabase.from('casos').select('natureza, tags').eq('status', 'ATIVO'),
        supabase.from('dashboard_historico_casos').select('*').order('ano_mes', { ascending: true })
    ])

    const casosAtivosList = casosGeral || []

    // Calcula totais atuais por natureza
    const nfAtual = casosAtivosList.filter(n => n.natureza === 'NOTICIA_DE_FATO').length
    const picAtual = casosAtivosList.filter(n => n.natureza === 'PROCEDIMENTO_INVESTIGATORIO').length
    const apAtual = casosAtivosList.filter(n => n.natureza === 'ACAO_PENAL').length

    // Lógica para atualizar/manter o pico mensal
    let historico = historicoRows || []
    const rowAtual = historico.find(r => r.ano_mes === mesAtual)

    if (rowAtual) {
        // Atualiza se o valor atual for maior que o pico armazenado
        if (nfAtual > rowAtual.nf || picAtual > rowAtual.pic || apAtual > rowAtual.ap) {
            const req = {
                ano_mes: mesAtual,
                nf: Math.max(nfAtual, rowAtual.nf),
                pic: Math.max(picAtual, rowAtual.pic),
                ap: Math.max(apAtual, rowAtual.ap)
            }
            // Fire and forget, no await to not block UI
            supabase.from('dashboard_historico_casos').upsert(req).then()

            // Corrige memory para exibição
            rowAtual.nf = req.nf
            rowAtual.pic = req.pic
            rowAtual.ap = req.ap
        }
    } else {
        // Primeiro acesso do mês
        const req = { ano_mes: mesAtual, nf: nfAtual, pic: picAtual, ap: apAtual }
        supabase.from('dashboard_historico_casos').upsert(req).then()
        historico.push(req)
    }

    // Calcula Ranking de Tags
    const tagsMap: Record<string, number> = {}
    casosAtivosList.forEach(c => {
        if (c.tags && Array.isArray(c.tags)) {
            c.tags.forEach(t => {
                const tag = String(t).trim().toUpperCase()
                if (tag) tagsMap[tag] = (tagsMap[tag] || 0) + 1
            })
        }
    })

    const rankingTags = Object.entries(tagsMap)
        .map(([materia, quantidade]) => ({ materia, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 10) // Top 10

    // Agrupar investigados por faccionado
    const faccoesMap = (investigados || []).reduce((acc: any, curr: any) => {
        const f = curr.faccionado || 'Outros'
        acc[f] = (acc[f] || 0) + 1
        return acc
    }, {})

    const distribuicaoFaccoes = Object.entries(faccoesMap).map(([faccao, total]) => ({
        faccao,
        total: total as number
    })).sort((a, b) => b.total - a.total)

    const ufMap = new Map<string, { uf: string, lat: number, lng: number, total: number }>()
    if (enderecos) {
        enderecos.forEach((e: any) => {
            const lat = Number(e.lat)
            const lng = Number(e.lng)
            let uf = 'Outros'
            let centerLat = lat
            let centerLng = lng
            if (lat < -22 && lat > -26 && lng < -47 && lng > -54) { uf = 'PR'; centerLat = -25.42; centerLng = -49.27 }
            else if (lat < -25 && lat > -29 && lng < -48 && lng > -53) { uf = 'SC'; centerLat = -27.59; centerLng = -48.54 }
            else if (lat < -27 && lat > -33 && lng < -49 && lng > -57) { uf = 'RS'; centerLat = -30.03; centerLng = -51.21 }
            else if (lat < -20 && lat > -25 && lng < -44 && lng > -53) { uf = 'SP'; centerLat = -23.55; centerLng = -46.63 }
            else if (lat < -5 && lat > -15 && lng < -45 && lng > -52) { uf = 'TO'; centerLat = -10.18; centerLng = -48.33 }
            const item = ufMap.get(uf)
            if (item) { item.total++ } else { ufMap.set(uf, { uf, lat: centerLat, lng: centerLng, total: 1 }) }
        })
    }

    // Garante exatamente os últimos 3 meses, mesmo sem dados no banco
    const ultimos3Meses = Array.from({ length: 3 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (2 - i))
        return d.toISOString().slice(0, 7) // 'YYYY-MM'
    })

    const historicoCasosFormatado = ultimos3Meses.map(mesKey => {
        const h = historico.find(r => r.ano_mes === mesKey)
        const [y, m] = mesKey.split('-')
        const mesStr = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('pt-BR', { month: 'short' })

        return {
            mes: mesStr.charAt(0).toUpperCase() + mesStr.slice(1).replace('.', '') + '/' + y.slice(2),
            nf: h?.nf || 0,
            pic: h?.pic || 0,
            ap: h?.ap || 0
        }
    })

    const mandadosPorUF = Array.from(ufMap.values()).filter(x => x.uf !== 'Outros' && x.lat && x.lng)

    return {
        casosAtivos: casosAtivos || 0,
        nfAtivos: nfAtual,
        picAtivos: picAtual,
        apAtivos: apAtual,
        buscasAno: buscasAno || 0,
        cumpridasAno: cumpridasAno || 0,
        faccionadosCadastrados: faccionadosCadastrados || 0,
        historicoCasos: historicoCasosFormatado,
        rankingTags,
        distribuicaoFaccoes,
        mandadosPorUF,
        pontosCalor: (enderecos || []).map((e: any) => {
            const f = e.investigados?.faccionado?.trim();
            const faccao = (!f || f === 'Nenhuma' || f === 'Não Faccionado' || f === 'Não Faccionados')
                ? 'Não Faccionados'
                : f;
            return {
                lat: Number(e.lat),
                lng: Number(e.lng),
                faccao
            };
        })
    }
}


export const dbDashboard = {
    buscarStats
}
