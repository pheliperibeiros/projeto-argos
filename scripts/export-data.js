import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://hjbuotwbrowochkvvdrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYnVvdHdicm93b2Noa3Z2ZHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTU5ODQsImV4cCI6MjA5MTQ5MTk4NH0.AYvuhvQpMG9tAw2UyUbhAO1abqRq6_riv23mhsRVjkw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function exportAllData() {
    console.log('📦 Baixando dados do Supabase para exportação...');
    const tables = ['casos', 'investigados', 'caso_investigado', 'cautelares', 'enderecos', 'socios_empresa', 'profiles'];
    const exportData = {};

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
            console.error(`❌ Erro ao baixar tabela ${table}:`, error.message);
            exportData[table] = [];
        } else {
            console.log(`✅ ${table}: ${data.length} registros encontrados.`);
            exportData[table] = data || [];
        }
    }

    const outPath = path.join(process.cwd(), 'exported_data.json');
    fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`\n🎉 Todos os dados foram salvos com sucesso em: ${outPath}`);
}

exportAllData().catch(err => {
    console.error('Erro na exportação:', err);
});
