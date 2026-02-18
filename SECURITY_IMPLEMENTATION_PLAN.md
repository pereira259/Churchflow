# IMPLANTAÇÃO DE SEGURANÇA (RLS OVERHAUL)

## Objetivo
Corrigir vulnerabilidades críticas de isolamento entre inquilinos (multi-tenancy) no ChurchFlow. Garantir que **nenhum** dado vaze entre igrejas e que apenas usuários autorizados (Admins/Líderes) possam modificar dados sensíveis.

## 1. Funções de Segurança (PostgreSQL)
Criaremos funções robustas no banco para centralizar a lógica de autorização. Isso evita "Risco de Implementação Dispersa".

- `auth.get_user_church_id()`: Retorna o `church_id` do usuário logado de forma segura.
- `public.is_admin()`: Verifica se o usuário é Admin/Pastor.
- `public.verify_church_access(row_church_id)`: Retorna `true` apenas se o usuário pertencer à mesma igreja do dado.

## 2. Estratégia de Policies (RLS)

### Tabela `churches`
| Ação | Política |
| :--- | :--- |
| SELECT | Permitido para usuários autenticados (para listar sua própria igreja). |
| UPDATE | **Restrito:** Apenas Admins da *própria* igreja. |
| INSERT | Permitido (Fluxo de criação de nova conta). |
| DELETE | **Restrito:** Apenas Super Admins. |

### Tabela `users` e `members` (Crítico)
- **Correção:** Remover acesso global.
- **Regra:** Admins só podem ver/editar usuários onde `users.church_id` corresponde ao seu.

### Tabelas de Dados (`ministries`, `groups`, `events`, `financials`)
- **Regra Padrão:**
  - `SELECT`: `church_id = auth.get_user_church_id()`
  - `INSERT`: `church_id = auth.get_user_church_id()`
  - `UPDATE/DELETE`: `church_id = auth.get_user_church_id()` AND `is_admin_or_leader()`

## 3. Plano de Execução

### Fase 1: Helpers e Limpeza
- Criar script `migrations/security_01_helpers.sql`.
- Revogar policies antigas permissivas.

### Fase 2: Aplicação Core
- Aplicar RLS em `churches`, `users`, `profiles`.

### Fase 3: Módulos
- Aplicar RLS em `members`, `ministries`, `groups`, `financials`.

## 4. Verificação
- Tentar ler dados de outra `church_id` simulada.
- Tentar update em igreja alheia.
