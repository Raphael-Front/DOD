# Análise de RLS e Otimização de Performance

## Contexto

A lentidão ao receber dados do Supabase pode estar relacionada às políticas RLS (Row Level Security), que são avaliadas **para cada linha** retornada. Conforme a [documentação oficial do Supabase](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices), políticas RLS mal otimizadas podem deixar consultas **10x a 100x mais lentas**.

---

## Problemas Identificados no Schema Original

### 1. Funções chamadas por linha (sem cache)

`auth_perfil()` e `usuario_tem_acesso_obra(obra_id)` eram chamadas diretamente nas políticas. O PostgreSQL tende a executá-las **uma vez por linha** em vez de uma única vez por query.

**Exemplo problemático:**
```sql
-- Antes: auth_perfil() executada N vezes
CREATE POLICY "dim_obras_select" ON dim_obras
  FOR SELECT USING (
    auth_perfil() IN ('admin', 'coordenador')
    OR usuario_tem_acesso_obra(id)
  );
```

### 2. Cascata de chamadas

`usuario_tem_acesso_obra()` chama `auth_perfil()` internamente. Assim, para cada verificação havia:
- 1 query em `dim_usuario_obra`
- 1 query em `dim_perfis` (via auth_perfil)

Em tabelas com centenas de linhas, isso vira milhares de subconsultas.

### 3. Políticas EXISTS em fatos

As tabelas fato_* (fato_clima, fato_mao_obra_propria, etc.) usam:
```sql
EXISTS (
  SELECT 1 FROM fato_diarios d
  WHERE d.id = fato_xxx.diario_id
  AND usuario_tem_acesso_obra(d.obra_id)  -- chamada por linha
)
```

Cada linha de fato_clima, fato_servicos etc. dispara uma nova chamada a `usuario_tem_acesso_obra()`.

### 4. Ordem da subconsulta (docs Supabase)

A documentação recomenda filtrar pelo valor fixo (auth.uid()) na subconsulta e comparar com a coluna da linha:
- Menos eficiente: `auth.uid() IN (SELECT user_id FROM ... WHERE team_id = table.team_id)`
- Mais eficiente: `team_id IN (SELECT team_id FROM ... WHERE user_id = auth.uid())`

### 5. Ausência de `TO authenticated`

Políticas sem `TO authenticated` fazem o banco avaliar RLS até para requests anônimos, desperdiçando tempo.

---

## Otimizações Implementadas na Migração

### 1. Wrapper `(SELECT fn())` para cache (initPlan)

Permite ao planner cachear o resultado da função:
```sql
-- Depois
USING ((SELECT auth_perfil()) IN ('admin', 'coordenador'))
```

### 2. Função `usuario_obras_acessiveis()`

Substitui chamadas repetidas a `usuario_tem_acesso_obra(obra_id)` por uma única chamada que retorna o array de obra_ids permitidos:
```sql
-- 1 execução por query
USING (obra_id = ANY((SELECT usuario_obras_acessiveis())))
```

### 3. Índices para colunas usadas em RLS

```sql
CREATE INDEX idx_dim_usuario_obra_usuario_obra
  ON dim_usuario_obra(usuario_id, obra_id);
```

### 4. `TO authenticated` em todas as políticas

Evita processar RLS para role `anon` quando não for necessário.

---

## Como Aplicar

1. **Backup**: faça backup do banco antes de rodar a migração.
2. **Execução** no SQL Editor do Supabase (ou via `supabase db push`):
   - Arquivo: `supabase/migrations/20260312000000_optimize_rls_performance.sql`
3. **Validação**:
   - Rode as mesmas queries da aplicação
   - Compare tempo de resposta antes e depois

---

## Teste de Performance (opcional)

Para habilitar EXPLAIN nas respostas do cliente (apenas em dev):

```sql
ALTER ROLE authenticator SET pgrst.db_plan_enabled = true;
NOTIFY pgrst, 'reload config';
```

Depois, no código:
```ts
const { data } = await supabase
  .from('fato_diarios')
  .select('*')
  .explain({ analyze: true });
```

---

## MCP Supabase

O plugin Supabase MCP (`plugin-supabase-supabase`) presente no projeto expõe basicamente autenticação (`mcp_auth`). Para inspecionar ou alterar RLS no banco, use o **SQL Editor** do Supabase ou o CLI.
