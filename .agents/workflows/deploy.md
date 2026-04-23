---
description: Como publicar alterações no site (commit + push + deploy)
---

# Deploy do Projeto Argos

Este workflow envia as alterações do código para o GitHub e atualiza o site no Netlify.

## Pré-requisitos
- Git configurado e autenticado
- Netlify CLI logado (`netlify login`)
- Repositório remoto: `https://github.com/pheliperibeiros/projeto-argos.git`
- Site Netlify ID: `8d0f8ba0-d4f1-41ce-9710-ae3ceaba79de`

## Passos

// turbo-all

1. Verificar o que mudou:
```bash
git status
```

2. Adicionar todas as alterações ao staging:
```bash
git add -A
```

3. Fazer o commit com a mensagem fornecida pelo usuário (ou uma padrão):
```bash
git commit -m "<mensagem do commit>"
```

4. Fazer o push para o GitHub:
```bash
git push origin main
```

5. Se o deploy automático do Netlify não estiver configurado, fazer o build e deploy manual:
```bash
npm run build
```

6. Deploy via Netlify MCP:
   - Usar a ferramenta `netlify-deploy-services-updater` com `deploy-site`
   - deployDirectory: `d:\Projeto Argos 1\dist`
   - siteId: `8d0f8ba0-d4f1-41ce-9710-ae3ceaba79de`

7. Verificar o deploy:
   - Usar a ferramenta `netlify-deploy-services-reader` com `get-deploy` para verificar o status
   - O site estará disponível em: https://projeto-argos.netlify.app
