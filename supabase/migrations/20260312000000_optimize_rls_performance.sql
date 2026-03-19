-- ============================================================
-- Otimização de RLS para performance
-- Baseado em: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices
-- ============================================================
-- Principais mudanças:
-- 1. Wrapper (SELECT fn()) para permitir initPlan/cache do resultado
-- 2. Índice composto em dim_usuario_obra para EXISTS
-- 3. Otimizar usuario_tem_acesso_obra para evitar chamada dupla a auth_perfil
-- ============================================================

-- Índice composto para EXISTS em usuario_tem_acesso_obra
CREATE INDEX IF NOT EXISTS idx_dim_usuario_obra_usuario_obra
  ON dim_usuario_obra(usuario_id, obra_id);

-- Índice para auth_perfil (dim_perfis.id já é PK, mas garantir)
CREATE INDEX IF NOT EXISTS idx_dim_perfis_id_perfil
  ON dim_perfis(id) WHERE id IS NOT NULL;

-- Recriar funções com otimizações (manter mesma lógica)
CREATE OR REPLACE FUNCTION auth_perfil()
RETURNS perfil_usuario
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT perfil FROM dim_perfis WHERE id = auth.uid()
$$;

-- usuario_tem_acesso_obra: otimizar para não chamar auth_perfil em cascata desnecessária
-- Ordem correta: filtrar por auth.uid() primeiro (índice em usuario_id)
CREATE OR REPLACE FUNCTION usuario_tem_acesso_obra(p_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM dim_usuario_obra
    WHERE usuario_id = auth.uid() AND obra_id = p_obra_id
  )
  OR EXISTS (
    SELECT 1 FROM dim_perfis
    WHERE id = auth.uid() AND perfil IN ('admin', 'coordenador')
  )
$$;

-- Obter obra_ids acessíveis (evita N chamadas a usuario_tem_acesso_obra por linha)
-- Executada 1x por query via (SELECT usuario_obras_acessiveis())
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
      WHERE dim_perfis.id = auth.uid() AND dim_perfis.perfil IN ('admin', 'coordenador')
    )
  ) x
$$;

-- ============================================================
-- Políticas: usar (SELECT fn()) para cache via initPlan
-- ============================================================

-- dim_perfis
DROP POLICY IF EXISTS "dim_perfis_select_proprio" ON dim_perfis;
CREATE POLICY "dim_perfis_select_proprio" ON dim_perfis
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT auth_perfil()) IN ('admin', 'coordenador')
  );

DROP POLICY IF EXISTS "dim_perfis_update_proprio" ON dim_perfis;
CREATE POLICY "dim_perfis_update_proprio" ON dim_perfis
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "dim_perfis_insert_admin" ON dim_perfis;
CREATE POLICY "dim_perfis_insert_admin" ON dim_perfis
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_perfil()) = 'admin');

-- dim_obras
DROP POLICY IF EXISTS "dim_obras_select" ON dim_obras;
CREATE POLICY "dim_obras_select" ON dim_obras
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_perfil()) IN ('admin', 'coordenador')
    OR id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
  );

DROP POLICY IF EXISTS "dim_obras_insert_coord" ON dim_obras;
CREATE POLICY "dim_obras_insert_coord" ON dim_obras
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_perfil()) IN ('admin', 'coordenador'));

DROP POLICY IF EXISTS "dim_obras_update_coord" ON dim_obras;
CREATE POLICY "dim_obras_update_coord" ON dim_obras
  FOR UPDATE TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'coordenador'));

DROP POLICY IF EXISTS "dim_obras_delete_admin" ON dim_obras;
CREATE POLICY "dim_obras_delete_admin" ON dim_obras
  FOR DELETE TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- dim_funcoes
DROP POLICY IF EXISTS "dim_funcoes_select_all" ON dim_funcoes;
CREATE POLICY "dim_funcoes_select_all" ON dim_funcoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "dim_funcoes_write_coord" ON dim_funcoes;
CREATE POLICY "dim_funcoes_write_coord" ON dim_funcoes
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'coordenador'));

-- dim_fornecedores
DROP POLICY IF EXISTS "dim_fornecedores_select_all" ON dim_fornecedores;
CREATE POLICY "dim_fornecedores_select_all" ON dim_fornecedores
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "dim_fornecedores_write_coord" ON dim_fornecedores;
CREATE POLICY "dim_fornecedores_write_coord" ON dim_fornecedores
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'coordenador'));

-- dim_equipamentos
DROP POLICY IF EXISTS "dim_equipamentos_select_all" ON dim_equipamentos;
CREATE POLICY "dim_equipamentos_select_all" ON dim_equipamentos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "dim_equipamentos_write_admin" ON dim_equipamentos;
CREATE POLICY "dim_equipamentos_write_admin" ON dim_equipamentos
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- dim_usuario_obra
DROP POLICY IF EXISTS "dim_uo_select_admin" ON dim_usuario_obra;
CREATE POLICY "dim_uo_select_admin" ON dim_usuario_obra
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_perfil()) IN ('admin', 'coordenador')
    OR usuario_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "dim_uo_write_admin" ON dim_usuario_obra;
CREATE POLICY "dim_uo_write_admin" ON dim_usuario_obra
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- fato_diarios - usar obra_id IN (SELECT usuario_obras_acessiveis()) em vez de fn por linha
DROP POLICY IF EXISTS "fato_diarios_select" ON fato_diarios;
CREATE POLICY "fato_diarios_select" ON fato_diarios
  FOR SELECT TO authenticated
  USING (obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis()))));

DROP POLICY IF EXISTS "fato_diarios_insert" ON fato_diarios;
CREATE POLICY "fato_diarios_insert" ON fato_diarios
  FOR INSERT TO authenticated
  WITH CHECK (
    obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
    AND (SELECT auth_perfil()) IN ('admin', 'coordenador', 'operador_obra')
  );

DROP POLICY IF EXISTS "fato_diarios_update_rascunho" ON fato_diarios;
CREATE POLICY "fato_diarios_update_rascunho" ON fato_diarios
  FOR UPDATE TO authenticated
  USING (
    (criado_por = (SELECT auth.uid()) AND status IN ('rascunho', 'devolvido'))
    OR (SELECT auth_perfil()) IN ('admin', 'coordenador')
  );

DROP POLICY IF EXISTS "fato_diarios_delete_admin" ON fato_diarios;
CREATE POLICY "fato_diarios_delete_admin" ON fato_diarios
  FOR DELETE TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');

-- Fatos dependentes: usar EXISTS com usuario_obras_acessiveis (evita chamar usuario_tem_acesso_obra por linha)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fato_clima',
    'fato_mao_obra_propria',
    'fato_mao_obra_terceirizada',
    'fato_equipamentos',
    'fato_servicos',
    'fato_visitas',
    'fato_ocorrencias',
    'fato_diarios_aprovacoes',
    'fato_anexos'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', t, t);
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
    EXECUTE format('DROP POLICY IF EXISTS "%s_write" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_write" ON %I FOR ALL TO authenticated
       USING (
         EXISTS (
           SELECT 1 FROM fato_diarios d
           WHERE d.id = %I.diario_id
           AND d.obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
           AND (SELECT auth_perfil()) IN (''admin'', ''coordenador'', ''operador_obra'')
         )
       )',
      t, t, t
    );
  END LOOP;
END$$;

-- fato_servico_locais
DROP POLICY IF EXISTS "fato_servico_locais_select" ON fato_servico_locais;
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

DROP POLICY IF EXISTS "fato_servico_locais_write" ON fato_servico_locais;
CREATE POLICY "fato_servico_locais_write" ON fato_servico_locais
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fato_servicos ms
      JOIN fato_diarios d ON d.id = ms.diario_id
      WHERE ms.id = fato_servico_locais.servico_id
      AND d.obra_id IN (SELECT unnest((SELECT usuario_obras_acessiveis())))
      AND (SELECT auth_perfil()) IN ('admin', 'coordenador', 'operador_obra')
    )
  );

-- fato_auditoria
DROP POLICY IF EXISTS "fato_auditoria_select_admin" ON fato_auditoria;
CREATE POLICY "fato_auditoria_select_admin" ON fato_auditoria
  FOR SELECT TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'coordenador'));
