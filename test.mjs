const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYnVvdHdicm93b2Noa3Z2ZHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTU5ODQsImV4cCI6MjA5MTQ5MTk4NH0.AYvuhvQpMG9tAw2UyUbhAO1abqRq6_riv23mhsRVjkw';
const query = `select=*,enderecos(*),socios:socios_empresa!empresa_id(socio:investigados!socio_id(*)),caso_investigado(casos(id,codinome,e_proc,integrar_e,created_at,cautelares(*))),cautelares(*,casos(codinome))&id=eq.b4c9e2c7-1c4c-5c2b-ac2b-2b3c4d5e6f7a`;
fetch(`https://hjbuotwbrowochkvvdrm.supabase.co/rest/v1/investigados?${query}`, {
    headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`
    }
}).then(r => r.json()).then(console.log).catch(console.error);
