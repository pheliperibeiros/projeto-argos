import { z } from 'zod';

// ----------------------------------------------------------------
// Schema de variáveis de ambiente do Argos
//
// VITE_BACKEND_MODE controla qual backend está em uso:
//   'supabase' → SDK Supabase (padrão atual / Netlify)
//   'api'      → API REST própria (ambiente institucional / Intranet)
//
// As variáveis do Supabase são obrigatórias apenas quando
// VITE_BACKEND_MODE === 'supabase', mas por simplicidade ainda são
// validadas normalmente neste arquivo — durante a migração, troque
// para o bloco discriminatedUnion abaixo se necessário.
// ----------------------------------------------------------------

const envSchema = z.object({
    // --- Modo de backend ---
    VITE_BACKEND_MODE: z.enum(['supabase', 'api', 'sheets']).default('supabase'),

    // --- Supabase (ambiente atual) ---
    VITE_SUPABASE_URL: z.string().url().or(z.literal('')).optional(),
    VITE_SUPABASE_ANON_KEY: z.string().optional(),

    // --- API REST própria (ambiente institucional) ---
    // Exemplo: 'http://argos.intranet.gov.br/api'
    VITE_API_BASE_URL: z.string().url().or(z.literal('')).optional(),

    // --- Provedor de Autenticação (ambiente institucional) ---
    // 'google' | 'local' | 'sso'
    VITE_AUTH_PROVIDER: z.enum(['google', 'local', 'sso']).optional(),

    // Google OAuth2 — Client ID do Google Cloud Console da instituição
    VITE_GOOGLE_CLIENT_ID: z.string().optional(),

    // --- Google Sheets ---
    VITE_GOOGLE_SHEETS_WEBAPP_URL: z.string().url().or(z.literal('')).optional(),
});

const _env = import.meta.env;

const parsedEnv = envSchema.safeParse(_env);

if (!parsedEnv.success) {
    console.error(
        '❌ Variáveis de ambiente inválidas ou ausentes. Verifique o arquivo .env.local (baseado no .env.example):',
        parsedEnv.error.format()
    );
    throw new Error('As variáveis de ambiente obrigatórias não estão configuradas corretamente.');
}

// Validação adicional por modo
const data = parsedEnv.data;

if (data.VITE_BACKEND_MODE === 'supabase') {
    if (!data.VITE_SUPABASE_URL || !data.VITE_SUPABASE_ANON_KEY) {
        throw new Error(
            '❌ VITE_BACKEND_MODE=supabase exige que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estejam definidos no .env.local'
        );
    }
}

if (data.VITE_BACKEND_MODE === 'api') {
    if (!data.VITE_API_BASE_URL) {
        throw new Error(
            '❌ VITE_BACKEND_MODE=api exige que VITE_API_BASE_URL esteja definido no .env.local'
        );
    }
}

export const env = data;

// Helpers para uso no código
export const isSupabaseMode = data.VITE_BACKEND_MODE === 'supabase';
export const isApiMode = data.VITE_BACKEND_MODE === 'api';
export const isSheetsMode = data.VITE_BACKEND_MODE === 'sheets';

