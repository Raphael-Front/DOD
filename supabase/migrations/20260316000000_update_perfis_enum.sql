-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migração: Atualização dos perfis de usuário
--   coordenador   → engenheiro
--   operador_obra → estagiario
-- Data: 16/03/2026
-- ============================================================

-- ============================================================
-- 1. DROPAR TODAS AS POLICIES DE TODAS AS TABELAS AFETADAS
--    (abordagem dinâmica via pg_policies — independe de nomes)
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
        'dim_perfis', 'dim_obras', 'dim_funcoes', 'dim_fornecedores',
        'dim_equipamentos', 'dim_usuario_obra', 'fato_diarios',
        'fato_clima', 'fato_mao_obra_propria', 'fato_mao_obra_terceirizada',
        'fato_equipamentos', 'fato_servicos', 'fato_visitas', 'fato_ocorrencias',
        'fato_diarios_aprovacoes', 'fato_anexos', 'fato_servico_locais',
        'fato_auditoria', 'dim_colaboradores', 'dim_locais', 'dim_departamentos',
        'dim_categorias_ocorrencias', 'dim_tipos_ocorrencias'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END$$;

-- ============================================================
-- 2. DROPAR FUNÇÕES QUE RETORNAM OU USAM perfil_usuario
-- ============================================================
DROP FUNCTION IF EXISTS auth_perfil();
DROP FUNCTION IF EXISTS usuario_tem_acesso_obra(UUID);
DROP FUNCTION IF EXISTS usuario_obras_acessiveis();

-- ============================================================
-- 3. CONVERTER COLUNA PARA TEXT (sem mais dependências)
-- ============================================================
ALTER TABLE dim_perfis
  ALTER COLUMN perfil TYPE text
  USING perfil::text;

-- ============================================================
-- 4. DROPAR O ENUM ANTIGO E CRIAR O NOVO
-- ============================================================

-- Remover o DEFAULT antes de dropar o tipo (DEFAULT ainda referencia o ENUM)
ALTER TABLE dim_perfis ALTER COLUMN perfil DROP DEFAULT;

DROP TYPE IF EXISTS perfil_usuario;

CREATE TYPE perfil_usuario AS ENUM ('admin', 'engenheiro', 'estagiario', 'leitura');

-- ============================================================
-- 5. MIGRAR DADOS EXISTENTES
-- ============================================================
UPDATE dim_perfis SET perfil = 'engenheiro' WHERE perfil = 'coordenador';
UPDATE dim_perfis SET perfil = 'estagiario' WHERE perfil = 'operador_obra';

-- ============================================================
-- 6. RECONVERTER COLUNA PARA O NOVO ENUM
-- ============================================================
ALTER TABLE dim_perfis
  ALTER COLUMN perfil TYPE perfil_usuario
  USING perfil::perfil_usuario;

-- Restaurar DEFAULT
ALTER TABLE dim_perfis
  ALTER COLUMN perfil SET DEFAULT 'estagiario';

-- ============================================================
-- 7. RECRIAR FUNÇÕES
-- ============================================================
CREATE OR REPLACE FUNCTION auth_perfil()
RETURNS perfil_usuario
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT perfil FROM dim_perfis WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION usuario_tem_acesso_obra(p_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM dim_usuario_obra
    WHERE usuario_id = auth.uid() AND obra_id = p_obra_id
  )
  OR EXISTS (
    SELECT 1 FROM dim_perfis
    WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro')
  )
$$;

CREATE OR REPLACE FUNCTION usuario_obras_acessiveis()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(oid), ARRAY[]::UUID[])
  FROM (
    SELECT obra_id AS oid FROM dim_usuario_obra WHERE usuario_id = auth.uid()
    UNION
    SELECT dim_obras.id AS oid FROM dim_obras
    WHERE EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE dim_perfis.id = auth.uid() AND dim_perfis.perfil IN ('admin', 'engenheiro')
    )
  ) x
$$;

-- ============================================================
-- 8. RECRIAR TODAS AS POLICIES RLS
-- ============================================================

-- dim_perfis
CREATE POLICY "dim_perfis_select_proprio" ON dim_perfis
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT auth_perfil()) IN ('admin', 'engenheiro')
  );

CREATE POLICY "dim_perfis_update_proprio" ON dim_perfis
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "dim_perfis_insert_admin" ON dim_perfis
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_perfil()) = 'admin');

-- dim_obras
CREATE POLICY "dim_obras_select" ON dim_obras
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_perfil()) IN ('admin', 'engenheiro')
    OR id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
  );

CREATE POLICY "dim_obras_insert_coord" ON dim_obras
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

CREATE POLICY "dim_obras_update_coord" ON dim_obras
  FOR UPDATE TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

CREATE POLICY "dim_obras_delete_admin" ON dim_obras
  FOR DELETE TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- dim_funcoes
CREATE POLICY "dim_funcoes_select_all" ON dim_funcoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "dim_funcoes_write_coord" ON dim_funcoes
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

-- dim_fornecedores
CREATE POLICY "dim_fornecedores_select_all" ON dim_fornecedores
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "dim_fornecedores_write_coord" ON dim_fornecedores
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

-- dim_equipamentos
CREATE POLICY "dim_equipamentos_select_all" ON dim_equipamentos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "dim_equipamentos_write_admin" ON dim_equipamentos
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- dim_usuario_obra
CREATE POLICY "dim_uo_select_admin" ON dim_usuario_obra
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_perfil()) IN ('admin', 'engenheiro')
    OR usuario_id = (SELECT auth.uid())
  );

CREATE POLICY "dim_uo_write_admin" ON dim_usuario_obra
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- fato_diarios
CREATE POLICY "fato_diarios_select" ON fato_diarios
  FOR SELECT TO authenticated
  USING (obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis()))));

CREATE POLICY "fato_diarios_insert" ON fato_diarios
  FOR INSERT TO authenticated
  WITH CHECK (
    obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
    AND (SELECT auth_perfil()) IN ('admin', 'engenheiro', 'estagiario')
  );

CREATE POLICY "fato_diarios_update_rascunho" ON fato_diarios
  FOR UPDATE TO authenticated
  USING (
    (criado_por = (SELECT auth.uid()) AND status IN ('rascunho', 'devolvido'))
    OR (SELECT auth_perfil()) IN ('admin', 'engenheiro')
  );

CREATE POLICY "fato_diarios_delete_admin" ON fato_diarios
  FOR DELETE TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- fatos dependentes (select + write)
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
           AND d.obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
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
           AND d.obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
           AND (SELECT auth_perfil()) IN (''admin'', ''engenheiro'', ''estagiario'')
         )
       )',
      t, t, t
    );
  END LOOP;
END$$;

-- fato_servico_locais
CREATE POLICY "fato_servico_locais_select" ON fato_servico_locais
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fato_servicos ms
      JOIN fato_diarios d ON d.id = ms.diario_id
      WHERE ms.id = fato_servico_locais.servico_id
      AND d.obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
    )
  );

CREATE POLICY "fato_servico_locais_write" ON fato_servico_locais
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fato_servicos ms
      JOIN fato_diarios d ON d.id = ms.diario_id
      WHERE ms.id = fato_servico_locais.servico_id
      AND d.obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
      AND (SELECT auth_perfil()) IN ('admin', 'engenheiro', 'estagiario')
    )
  );

-- fato_auditoria
CREATE POLICY "fato_auditoria_select_admin" ON fato_auditoria
  FOR SELECT TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

-- dim_colaboradores
CREATE POLICY "colaboradores_select_authenticated" ON dim_colaboradores
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "colaboradores_insert_coordenador_admin" ON dim_colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro', 'estagiario')
    )
  );

CREATE POLICY "colaboradores_update_coordenador_admin" ON dim_colaboradores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro')
    )
  );

-- dim_locais
CREATE POLICY "locais_select_authenticated" ON dim_locais
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "locais_insert_coordenador_admin" ON dim_locais
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro')
    )
  );

CREATE POLICY "locais_update_coordenador_admin" ON dim_locais
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro')
    )
  );

CREATE POLICY "locais_delete_admin" ON dim_locais
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil = 'admin'
    )
  );

-- dim_departamentos
CREATE POLICY "departamentos_select_authenticated" ON dim_departamentos
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "departamentos_insert_coordenador_admin" ON dim_departamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro', 'estagiario')
    )
  );

CREATE POLICY "departamentos_update_coordenador_admin" ON dim_departamentos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro')
    )
  );

CREATE POLICY "departamentos_delete_admin" ON dim_departamentos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil = 'admin'
    )
  );

-- dim_categorias_ocorrencias
CREATE POLICY "categorias_ocorrencias_select_authenticated" ON dim_categorias_ocorrencias
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "categorias_ocorrencias_write_admin" ON dim_categorias_ocorrencias
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro')
    )
  );

-- dim_tipos_ocorrencias
CREATE POLICY "tipos_ocorrencias_select_authenticated" ON dim_tipos_ocorrencias
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "tipos_ocorrencias_write_admin" ON dim_tipos_ocorrencias
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid() AND perfil IN ('admin', 'engenheiro')
    )
  );
