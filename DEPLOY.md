# Plano de Deploy - ChurchFlow

Este documento descreve os passos para colocar o projeto ChurchFlow em produção.

## 1. Banco de Dados (Supabase)

O banco de dados já possui scripts de produção preparados.

### Passo 1: Executar Migração de Produção
No painel do Supabase (SQL Editor), execute o conteúdo do arquivo:
- `production_deploy.sql`
  *(Este script cria as tabelas faltantes, funões auxiliares e aplica RLS rigoroso)*

### Passo 2: Executar Migração de Permissões de Grupos
Para garantir que a funcionalidade de líderes de grupos funcione:
- Execute `add_created_by_to_groups.sql`

## 2. Frontend (Vercel)

Recomendamos a Vercel para hospedar a aplicação React/Vite.

### Passo 0: Colocar no GitHub (Se ainda não estiver)
1.  Crie um novo repositório no [GitHub](https://github.com/new).
2.  No terminal do projeto (onde está este arquivo), execute:
    ```bash
    git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
    git branch -M main
    git push -u origin main
    ```
    *(Substitua a URL pela do seu repositório)*

### Passo 1: Configuração do Projeto
1.  Acesse [vercel.com](https://vercel.com) e faça login.
2.  Clique em "Add New..." -> "Project".
3.  Importe o repositório do GitHub `ChurchFlow`.

### Passo 2: Configurações de Build
A Vercel deve detectar automaticamente:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Passo 3: Variáveis de Ambiente
Em "Environment Variables", adicione as chaves do seu projeto Supabase de Produção:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | Sua URL do Supabase (https://xyz.supabase.co) |
| `VITE_SUPABASE_ANON_KEY` | Sua chave `anon` pública |

### Passo 4: Deploy
Clique em "Deploy".

## 3. Pós-Deploy

### Verificar Redirecionamentos
O arquivo `vercel.json` (se necessário) deve configurar rewrites para SPA, mas a Vercel costuma lidar com isso automaticamente para Vite. Se houver problemas de 404 ao recarregar páginas:
1. Crie um arquivo `vercel.json` na raiz:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Domínio Customizado
Configure seu domínio (ex: `app.suaigreja.com`) nas configurações do projeto na Vercel.
