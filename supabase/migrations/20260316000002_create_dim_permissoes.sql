-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migração: Matriz de Permissões Dinâmica
--   Cria dim_permissoes como fonte de verdade da matriz.
--   Policies de fato_diarios e dim_obras passam a consultar
--   essa tabela em vez de usar perfis hardcoded.
-- Data: 16/03/2026
-- ============================================================

-- ============================================================
-- 1. DROPAR POLICIES QUE SERÃO SUBSTITUÍDAS
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'dim_obras',
        'fato_diarios',
        'fato_clima', 'fato_mao_obra_propria', 'fato_mao_obra_terceirizada',
        'fato_equipamentos', 'fato_servicos', 'fato_visitas', 'fato_ocorrencias',
        'fato_diarios_aprovacoes', 'fato_anexos',
        'fato_servico_locais'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END$$;

-- ============================================================
-- 2. DROPAR FUNÇÕES QUE SERÃO ATUALIZADAS
-- ============================================================
DROP FUNCTION IF EXISTS usuario_obras_acessiveis();
DROP FUNCTION IF EXISTS usuario_tem_acesso_obra(UUID);
DROP FUNCTION IF EXISTS tem_permissao(TEXT);

-- ============================================================
-- 3. CRIAR TABELA dim_permissoes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dim_permissoes (
  acao        TEXT    NOT NULL,
  acao_label  TEXT    NOT NULL,
  perfil      TEXT    NOT NULL,
  permitido   BOOLEAN NOT NULL DEFAULT false,
  valor       TEXT    DEFAULT NULL,
  PRIMARY KEY (acao, perfil)
);

ALTER TABLE public.dim_permissoes ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler (necessário para as policies RLS consultarem a tabela)
CREATE POLICY "dim_permissoes_select_authenticated"
  ON public.dim_permissoes FOR SELECT TO authenticated
  USING (true);

-- Somente admin pode alterar
CREATE POLICY "dim_permissoes_update_admin"
  ON public.dim_permissoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dim_perfis
      WHERE id = auth.uid() AND perfil::text = 'admin'
    )
  );

CREATE POLICY "dim_permissoes_insert_admin"
  ON public.dim_permissoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dim_perfis
      WHERE id = auth.uid() AND perfil::text = 'admin'
    )
  );

-- ============================================================
-- 4. SEED — valores iniciais da matriz
-- ============================================================
INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor) VALUES
  ('rota_dashboard',  '/dashboard',        'admin',      true,  NULL),
  ('rota_dashboard',  '/dashboard',        'engenheiro', true,  NULL),
  ('rota_dashboard',  '/dashboard',        'operador',   true,  NULL),
  ('rota_dashboard',  '/dashboard',        'leitura',    true,  NULL),

  ('criar_diario',    'Criar diário',      'admin',      true,  NULL),
  ('criar_diario',    'Criar diário',      'engenheiro', true,  NULL),
  ('criar_diario',    'Criar diário',      'operador',   true,  NULL),
  ('criar_diario',    'Criar diário',      'leitura',    false, NULL),

  ('aprovar_diario',  'Aprovar diário',    'admin',      true,  NULL),
  ('aprovar_diario',  'Aprovar diário',    'engenheiro', true,  NULL),
  ('aprovar_diario',  'Aprovar diário',    'operador',   false, NULL),
  ('aprovar_diario',  'Aprovar diário',    'leitura',    false, NULL),

  ('rota_relatorios', '/relatorios',       'admin',      true,  NULL),
  ('rota_relatorios', '/relatorios',       'engenheiro', true,  NULL),
  ('rota_relatorios', '/relatorios',       'operador',   false, NULL),
  ('rota_relatorios', '/relatorios',       'leitura',    true,  NULL),

  ('rota_cadastros',  '/cadastros',        'admin',      true,  NULL),
  ('rota_cadastros',  '/cadastros',        'engenheiro', true,  NULL),
  ('rota_cadastros',  '/cadastros',        'operador',   false, NULL),
  ('rota_cadastros',  '/cadastros',        'leitura',    false, NULL),

  ('rota_usuarios',   '/usuarios',         'admin',      true,  NULL),
  ('rota_usuarios',   '/usuarios',         'engenheiro', false, NULL),
  ('rota_usuarios',   '/usuarios',         'operador',   false, NULL),
  ('rota_usuarios',   '/usuarios',         'leitura',    false, NULL),

  ('excluir_diario',  'Excluir diário',    'admin',      true,  NULL),
  ('excluir_diario',  'Excluir diário',    'engenheiro', false, NULL),
  ('excluir_diario',  'Excluir diário',    'operador',   false, NULL),
  ('excluir_diario',  'Excluir diário',    'leitura',    false, NULL),

  ('reabrir_diario',  'Reabrir diário',    'admin',      true,  NULL),
  ('reabrir_diario',  'Reabrir diário',    'engenheiro', false, NULL),
  ('reabrir_diario',  'Reabrir diário',    'operador',   false, NULL),
  ('reabrir_diario',  'Reabrir diário',    'leitura',    false, NULL),

  ('seletor_obras',   'Seletor de obras',  'admin',      true,  'Todas'),
  ('seletor_obras',   'Seletor de obras',  'engenheiro', true,  'Todas'),
  ('seletor_obras',   'Seletor de obras',  'operador',   true,  'Vinculadas'),
  ('seletor_obras',   'Seletor de obras',  'leitura',    true,  'Todas'),

  ('dark_mode',       'Dark mode toggle',  'admin',      true,  NULL),
  ('dark_mode',       'Dark mode toggle',  'engenheiro', true,  NULL),
  ('dark_mode',       'Dark mode toggle',  'operador',   true,  NULL),
  ('dark_mode',       'Dark mode toggle',  'leitura',    true,  NULL)
ON CONFLICT (acao, perfil) DO NOTHING;

-- ============================================================
-- 5. FUNÇÃO AUXILIAR: tem_permissao(acao)
--    SECURITY DEFINER para evitar recursão de RLS ao consultar
--    dim_permissoes de dentro de outras policies.
-- ============================================================
CREATE OR REPLACE FUNCTION public.tem_permissao(p_acao TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT permitido
     FROM public.dim_permissoes
     WHERE acao = p_acao
       AND perfil = (SELECT auth_perfil()::text)
     LIMIT 1),
    false
  );
$$;

-- ============================================================
-- 6. RECRIAR usuario_obras_acessiveis() — dinâmica via seletor_obras
-- ============================================================
CREATE OR REPLACE FUNCTION public.usuario_obras_acessiveis()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_perfil TEXT;
  v_valor  TEXT;
BEGIN
  SELECT auth_perfil()::text INTO v_perfil;

  SELECT valor INTO v_valor
  FROM public.dim_permissoes
  WHERE acao = 'seletor_obras' AND perfil = v_perfil;

  IF v_valor = 'Todas' THEN
    RETURN QUERY SELECT id FROM public.dim_obras;
  ELSE
    RETURN QUERY
      SELECT obra_id FROM public.dim_usuario_obra
      WHERE usuario_id = auth.uid();
  END IF;
END;
$$;

-- ============================================================
-- 7. RECRIAR usuario_tem_acesso_obra()
-- ============================================================
CREATE OR REPLACE FUNCTION public.usuario_tem_acesso_obra(p_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p_obra_id IN (SELECT usuario_obras_acessiveis());
$$;

-- ============================================================
-- 8. RECRIAR POLICIES DE dim_obras
-- ============================================================

-- Acesso a obras agora é inteiramente controlado por usuario_obras_acessiveis()
-- que por sua vez respeita o seletor_obras de dim_permissoes
CREATE POLICY "dim_obras_select" ON public.dim_obras
  FOR SELECT TO authenticated
  USING (id IN (SELECT usuario_obras_acessiveis()));

CREATE POLICY "dim_obras_insert" ON public.dim_obras
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

CREATE POLICY "dim_obras_update" ON public.dim_obras
  FOR UPDATE TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

CREATE POLICY "dim_obras_delete" ON public.dim_obras
  FOR DELETE TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- ============================================================
-- 9. RECRIAR POLICIES DE fato_diarios (dinâmicas)
-- ============================================================

CREATE POLICY "fato_diarios_select" ON public.fato_diarios
  FOR SELECT TO authenticated
  USING (obra_id IN (SELECT usuario_obras_acessiveis()));

CREATE POLICY "fato_diarios_insert" ON public.fato_diarios
  FOR INSERT TO authenticated
  WITH CHECK (
    tem_permissao('criar_diario')
    AND obra_id IN (SELECT usuario_obras_acessiveis())
  );

CREATE POLICY "fato_diarios_update" ON public.fato_diarios
  FOR UPDATE TO authenticated
  USING (
    -- Criador pode editar seus próprios rascunhos/devolvidos
    (criado_por = (SELECT auth.uid())
      AND status IN ('rascunho', 'devolvido')
      AND tem_permissao('criar_diario'))
    OR tem_permissao('aprovar_diario')
    OR tem_permissao('reabrir_diario')
  );

CREATE POLICY "fato_diarios_delete" ON public.fato_diarios
  FOR DELETE TO authenticated
  USING (tem_permissao('excluir_diario'));

-- ============================================================
-- 10. RECRIAR POLICIES DOS FATOS DEPENDENTES (dinâmicas)
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fato_clima','fato_mao_obra_propria','fato_mao_obra_terceirizada',
    'fato_equipamentos','fato_servicos','fato_visitas','fato_ocorrencias',
    'fato_diarios_aprovacoes','fato_anexos'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated
       USING (
         EXISTS (
           SELECT 1 FROM fato_diarios d
           WHERE d.id = %I.diario_id
             AND d.obra_id IN (SELECT usuario_obras_acessiveis())
         )
       )',
      t, t, t
    );
    EXECUTE format(
      'CREATE POLICY "%s_write" ON %I FOR ALL TO authenticated
       USING (
         EXISTS (
           SELECT 1 FROM fato_diarios d
           WHERE d.id = %I.diario_id
             AND d.obra_id IN (SELECT usuario_obras_acessiveis())
             AND tem_permissao(''criar_diario'')
         )
       )',
      t, t, t
    );
  END LOOP;
END$$;

-- fato_servico_locais
CREATE POLICY "fato_servico_locais_select" ON public.fato_servico_locais
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fato_servicos ms
      JOIN fato_diarios d ON d.id = ms.diario_id
      WHERE ms.id = fato_servico_locais.servico_id
        AND d.obra_id IN (SELECT usuario_obras_acessiveis())
    )
  );

CREATE POLICY "fato_servico_locais_write" ON public.fato_servico_locais
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fato_servicos ms
      JOIN fato_diarios d ON d.id = ms.diario_id
      WHERE ms.id = fato_servico_locais.servico_id
        AND d.obra_id IN (SELECT usuario_obras_acessiveis())
        AND tem_permissao('criar_diario')
    )
  );
