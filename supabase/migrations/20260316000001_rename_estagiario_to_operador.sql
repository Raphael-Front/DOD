-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migração: Renomear perfil estagiario → operador
-- Data: 16/03/2026
-- ============================================================

-- ============================================================
-- 1. DROPAR TODAS AS POLICIES DAS TABELAS AFETADAS
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
-- 2. DROPAR FUNÇÕES QUE USAM perfil_usuario
-- ============================================================
DROP FUNCTION IF EXISTS auth_perfil();
DROP FUNCTION IF EXISTS usuario_tem_acesso_obra(UUID);
DROP FUNCTION IF EXISTS usuario_obras_acessiveis();

-- ============================================================
-- 3. CONVERTER COLUNA PARA TEXT TEMPORARIAMENTE
-- ============================================================
ALTER TABLE dim_perfis ALTER COLUMN perfil DROP DEFAULT;

ALTER TABLE dim_perfis
  ALTER COLUMN perfil TYPE text
  USING perfil::text;

-- ============================================================
-- 4. RECRIAR ENUM COM NOVO VALOR
-- ============================================================
DROP TYPE IF EXISTS perfil_usuario;

CREATE TYPE perfil_usuario AS ENUM ('admin', 'engenheiro', 'operador', 'leitura');

-- ============================================================
-- 5. MIGRAR DADOS: estagiario → operador
-- ============================================================
UPDATE dim_perfis SET perfil = 'operador' WHERE perfil = 'estagiario';

-- ============================================================
-- 6. RECONVERTER COLUNA PARA O NOVO ENUM
-- ============================================================
ALTER TABLE dim_perfis
  ALTER COLUMN perfil TYPE perfil_usuario
  USING perfil::perfil_usuario;

ALTER TABLE dim_perfis
  ALTER COLUMN perfil SET DEFAULT 'operador';

-- ============================================================
-- 7. RECRIAR FUNÇÕES
-- ============================================================
CREATE OR REPLACE FUNCTION auth_perfil()
RETURNS perfil_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT perfil FROM public.dim_perfis WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION usuario_tem_acesso_obra(p_obra_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dim_usuario_obra
    WHERE usuario_id = auth.uid()
      AND obra_id = p_obra_id
  );
$$;

CREATE OR REPLACE FUNCTION usuario_obras_acessiveis()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT obra_id FROM public.dim_usuario_obra WHERE usuario_id = auth.uid();
$$;

-- ============================================================
-- 8. RECRIAR POLICIES
-- ============================================================

-- dim_perfis
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON dim_perfis FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admin pode ver todos os perfis"
  ON dim_perfis FOR SELECT
  USING ((SELECT auth_perfil()) = 'admin');

CREATE POLICY "Admin pode atualizar perfis"
  ON dim_perfis FOR UPDATE
  USING ((SELECT auth_perfil()) = 'admin');

CREATE POLICY "Admin pode inserir perfis"
  ON dim_perfis FOR INSERT
  WITH CHECK ((SELECT auth_perfil()) = 'admin');

-- dim_obras
CREATE POLICY "Admin e engenheiro veem todas as obras"
  ON dim_obras FOR SELECT
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro', 'leitura'));

CREATE POLICY "Operador vê obras vinculadas"
  ON dim_obras FOR SELECT
  USING (
    (SELECT auth_perfil()) = 'operador'
    AND usuario_tem_acesso_obra(id)
  );

CREATE POLICY "Admin pode gerenciar obras"
  ON dim_obras FOR ALL
  USING ((SELECT auth_perfil()) = 'admin');

CREATE POLICY "Engenheiro pode gerenciar obras"
  ON dim_obras FOR ALL
  USING ((SELECT auth_perfil()) = 'engenheiro');

-- fato_diarios
CREATE POLICY "Leitura de diários para perfis autorizados"
  ON fato_diarios FOR SELECT
  USING (
    (SELECT auth_perfil()) IN ('admin', 'engenheiro', 'leitura')
    OR (
      (SELECT auth_perfil()) = 'operador'
      AND usuario_tem_acesso_obra(obra_id)
    )
  );

CREATE POLICY "Criação de diários para admin, engenheiro e operador"
  ON fato_diarios FOR INSERT
  WITH CHECK (
    (SELECT auth_perfil()) IN ('admin', 'engenheiro', 'operador')
    AND (
      (SELECT auth_perfil()) IN ('admin', 'engenheiro')
      OR usuario_tem_acesso_obra(obra_id)
    )
  );

CREATE POLICY "Atualização de diários para admin e engenheiro"
  ON fato_diarios FOR UPDATE
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

CREATE POLICY "Exclusão de diários apenas para admin"
  ON fato_diarios FOR DELETE
  USING ((SELECT auth_perfil()) = 'admin');

-- dim_usuario_obra
CREATE POLICY "Admin pode gerenciar vínculos usuário-obra"
  ON dim_usuario_obra FOR ALL
  USING ((SELECT auth_perfil()) = 'admin');

CREATE POLICY "Usuário pode ver seus próprios vínculos"
  ON dim_usuario_obra FOR SELECT
  USING (usuario_id = auth.uid());
