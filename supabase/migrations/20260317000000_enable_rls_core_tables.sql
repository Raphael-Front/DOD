-- ============================================================
-- Habilitar RLS + recriar policies para tabelas core que
-- ficaram sem policies após 20260316000001 dropar tudo sem
-- recriar dim_funcoes, dim_fornecedores e dim_equipamentos.
-- ============================================================

ALTER TABLE dim_funcoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_equipamentos ENABLE ROW LEVEL SECURITY;

-- dim_funcoes
DROP POLICY IF EXISTS "dim_funcoes_select_all"  ON dim_funcoes;
DROP POLICY IF EXISTS "dim_funcoes_write_coord" ON dim_funcoes;

CREATE POLICY "dim_funcoes_select_all" ON dim_funcoes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "dim_funcoes_write_coord" ON dim_funcoes
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

-- dim_fornecedores
DROP POLICY IF EXISTS "dim_fornecedores_select_all"  ON dim_fornecedores;
DROP POLICY IF EXISTS "dim_fornecedores_write_coord" ON dim_fornecedores;

CREATE POLICY "dim_fornecedores_select_all" ON dim_fornecedores
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "dim_fornecedores_write_coord" ON dim_fornecedores
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) IN ('admin', 'engenheiro'));

-- dim_equipamentos
DROP POLICY IF EXISTS "dim_equipamentos_select_all"  ON dim_equipamentos;
DROP POLICY IF EXISTS "dim_equipamentos_write_admin" ON dim_equipamentos;

CREATE POLICY "dim_equipamentos_select_all" ON dim_equipamentos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "dim_equipamentos_write_admin" ON dim_equipamentos
  FOR ALL TO authenticated
  USING ((SELECT auth_perfil()) = 'admin');
