import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'

const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(url, anon, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
})
