import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        const admin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const body = await req.json()
        const ip = req.headers.get('x-forwarded-for') ?? 'desconhecido'

        const { error } = await admin.from('audit_logs').insert({
            user_id: body.user_id,
            username: body.username,
            acao: body.acao,
            entidade: body.entidade,
            entidade_id: body.entidade_id ?? null,
            ip,
        })

        return new Response(
            JSON.stringify({ ok: !error, error }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        )
    } catch (err: any) {
        return new Response(
            JSON.stringify({ ok: false, error: err.message }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        )
    }
})
