import { z } from 'zod';

const envSchema = z.object({
    VITE_SUPABASE_URL: z.string().url('A variável VITE_SUPABASE_URL deve ser uma URL válida e não pode estar vazia.'),
    VITE_SUPABASE_ANON_KEY: z.string().min(1, 'A variável VITE_SUPABASE_ANON_KEY não pode estar vazia.'),
});

const _env = import.meta.env;

const parsedEnv = envSchema.safeParse(_env);

if (!parsedEnv.success) {
    console.error(
        '❌ Variáveis de ambiente inválidas ou ausentes. Crie o arquivo .env.local baseado no .env.example:',
        parsedEnv.error.format()
    );
    throw new Error('As variáveis de ambiente obrigatórias não estão configuradas corretamente.');
}

export const env = parsedEnv.data;
