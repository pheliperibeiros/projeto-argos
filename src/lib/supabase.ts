import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'

const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(url, anon, {
    auth: {
        persistSession: !env.VITE_BACKEND_MODE || env.VITE_BACKEND_MODE !== 'sheets',
        autoRefreshToken: !env.VITE_BACKEND_MODE || env.VITE_BACKEND_MODE !== 'sheets',
        detectSessionInUrl: false,
    },
})
