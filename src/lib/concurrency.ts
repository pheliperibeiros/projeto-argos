/**
 * concurrency.ts
 *
 * Controle de Concorrência por Bloqueio Otimista (Optimistic Locking)
 *
 * COMO FUNCIONA:
 * 1. Quando uma tela de edição é aberta, o `updated_at` do registro é capturado.
 * 2. Ao salvar, esse timestamp é enviado junto com os novos dados.
 * 3. A função de atualização verifica se o banco ainda tem o mesmo `updated_at`.
 *    - Igual → Ninguém mexeu. Salva normalmente.
 *    - Diferente → Outro usuário salvou antes. Lança ConcurrencyError (código 409).
 * 4. O componente React captura o ConcurrencyError e exibe aviso ao usuário.
 *
 * PARA A MIGRAÇÃO (API REST):
 * O Backend deve implementar o mesmo padrão:
 *   UPDATE tabela SET ... WHERE id = $1 AND updated_at = $2
 *   Se nenhuma linha for afetada → retornar HTTP 409 Conflict
 */

// Usamos o supabase sem tipagem estrita aqui pois a função é genérica
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Cliente sem tipagem estrita para uso genérico (tabela como string)
const supabaseGeneric = createClient(
    env.VITE_SUPABASE_URL!,
    env.VITE_SUPABASE_ANON_KEY!
)

// ----------------------------------------------------------------
// Erro especializado de conflito de concorrência
// ----------------------------------------------------------------
export class ConcurrencyError extends Error {
    readonly code = 'CONCURRENCY_CONFLICT'
    readonly entityName: string

    constructor(entityName: string) {
        super(
            `Este ${entityName} foi modificado por outro usuário enquanto você editava. ` +
            `Recarregue a página para ver as alterações mais recentes antes de salvar.`
        )
        this.name = 'ConcurrencyError'
        this.entityName = entityName
    }
}

// ----------------------------------------------------------------
// Verifica se um erro é de concorrência
// ----------------------------------------------------------------
export function isConcurrencyError(err: unknown): err is ConcurrencyError {
    return err instanceof ConcurrencyError
}

// ----------------------------------------------------------------
// Atualiza um registro com verificação de conflito otimista.
//
// @param tabela     Nome da tabela no banco de dados
// @param id         ID do registro
// @param dados      Campos a atualizar (sem updated_at)
// @param updatedAt  Timestamp capturado quando a tela foi aberta
// @param label      Nome amigável da entidade (ex: "caso", "investigado")
// @returns          O registro atualizado
// @throws           ConcurrencyError se outro usuário salvou antes
// ----------------------------------------------------------------
export async function atualizarComControle(
    tabela: string,
    id: string,
    dados: Record<string, unknown>,
    updatedAt: string,
    label = 'registro'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    // Passo 1: Verificar o timestamp atual no banco
    const { data: atual, error: errVerif } = await supabaseGeneric
        .from(tabela)
        .select('updated_at')
        .eq('id', id)
        .single()

    if (errVerif) throw new Error(errVerif.message)

    const tsAtual = atual?.updated_at as string | null
    const tsFotografia = updatedAt

    // Passo 2: Comparar timestamps
    if (tsAtual && tsFotografia) {
        const tsBanco = new Date(tsAtual).getTime()
        const tsForm = new Date(tsFotografia).getTime()

        if (tsBanco !== tsForm) {
            throw new ConcurrencyError(label)
        }
    }

    // Passo 3: Timestamps batem → executa o UPDATE
    const { data: atualizado, error: errUpdate } = await supabaseGeneric
        .from(tabela)
        .update(dados)
        .eq('id', id)
        .select()
        .single()

    if (errUpdate) throw new Error(errUpdate.message)

    return atualizado
}

// ----------------------------------------------------------------
// Mensagem padrão de conflito para exibir ao usuário
// ----------------------------------------------------------------
export function mensagemConflito(entityName: string): string {
    return (
        `⚠️ Conflito detectado: este ${entityName} foi alterado por outro analista ` +
        `enquanto você editava. Recarregue a página e tente novamente.`
    )
}
