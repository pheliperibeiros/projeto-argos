/**
 * apiClient.ts
 *
 * Adaptador central de comunicação com o backend do Argos.
 *
 * HOJE   → VITE_BACKEND_MODE=supabase  → usa o SDK @supabase/supabase-js
 * FUTURO → VITE_BACKEND_MODE=api       → usa fetch() contra a API REST institucional
 *
 * Todos os módulos em src/lib/db/* devem importar daqui, nunca diretamente
 * do supabase.ts. Isso garante que a migração seja feita trocando apenas
 * este arquivo, sem tocar nas páginas ou componentes.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  COMO MIGRAR (quando a Intranet estiver pronta):
 *  1. Troque VITE_BACKEND_MODE=api no .env.local do servidor de aplicação
 *  2. Defina VITE_API_BASE_URL com o endereço da API da instituição
 *  3. Implemente os endpoints correspondentes na API Node.js/Backend
 *  4. Nenhuma alteração nas telas ou componentes será necessária
 * ─────────────────────────────────────────────────────────────────────────
 */

import { env, isApiMode } from '@/lib/env'

// ----------------------------------------------------------------
// Tipo genérico de resposta — idêntico ao retorno do Supabase SDK,
// facilitando a troca sem alterar os consumidores.
// ----------------------------------------------------------------
export interface ApiResponse<T> {
    data: T | null
    error: { message: string; code?: string } | null
}

// ----------------------------------------------------------------
// Modo Supabase (atual)
// Reexporta o cliente Supabase para uso nos módulos db/*
// ----------------------------------------------------------------
export { supabase } from '@/lib/supabase'

// ----------------------------------------------------------------
// Modo API REST (institucional)
// Cliente HTTP simples baseado em fetch(), com injeção automática
// do token JWT de autenticação.
// ----------------------------------------------------------------

function getAuthToken(): string | null {
    // Por enquanto lê do localStorage; na integração com Google OAuth
    // o token será gerenciado pelo authStore e persistido aqui.
    return localStorage.getItem('argos_token')
}

async function request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
): Promise<ApiResponse<T>> {
    const baseUrl = env.VITE_API_BASE_URL!.replace(/\/$/, '')
    const token = getAuthToken()

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    try {
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        })

        if (res.status === 204) return { data: null, error: null }

        const json = await res.json()

        if (!res.ok) {
            return {
                data: null,
                error: { message: json?.message || `Erro HTTP ${res.status}`, code: String(res.status) },
            }
        }

        return { data: json as T, error: null }
    } catch (err: any) {
        return { data: null, error: { message: err?.message || 'Erro de rede' } }
    }
}

// ----------------------------------------------------------------
// API Client público — use estes métodos nos módulos db/* quando
// VITE_BACKEND_MODE=api.
// ----------------------------------------------------------------
export const apiClient = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
}

// ----------------------------------------------------------------
// Utilitário: lança erro padronizado a partir de uma ApiResponse
// ----------------------------------------------------------------
export function assertSuccess<T>(response: ApiResponse<T>): T {
    if (response.error) throw new Error(response.error.message)
    if (response.data === null) throw new Error('Resposta vazia do servidor')
    return response.data
}

// ----------------------------------------------------------------
// Flag de conveniência para uso nos módulos db/*
// Exemplo:
//   if (USE_API) {
//       const data = assertSuccess(await apiClient.get<Caso[]>('/casos'))
//   } else {
//       const { data, error } = await supabase.from('casos').select(...)
//   }
// ----------------------------------------------------------------
export const USE_API = isApiMode
