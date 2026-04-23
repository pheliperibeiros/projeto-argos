import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hjbuotwbrowochkvvdrm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYnVvdHdicm93b2Noa3Z2ZHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTU5ODQsImV4cCI6MjA5MTQ5MTk4NH0.AYvuhvQpMG9tAw2UyUbhAO1abqRq6_riv23mhsRVjkw'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
    const { data: c1, error: e1 } = await supabase.from('casos').insert({
        codinome: 'Caso Teste 1',
        e_proc: '12345.1',
        tags: ['TesteTag']
    }).select()

    const { data: c2, error: e2 } = await supabase.from('casos').insert({
        codinome: 'Caso Teste 2',
        e_proc: '12345.2',
        tags: ['TesteTag']
    }).select()

    console.log("Error 1:", e1)
    console.log("Error 2:", e2)

    console.log("Data 1:", c1)
    console.log("Data 2:", c2)
}

run()
