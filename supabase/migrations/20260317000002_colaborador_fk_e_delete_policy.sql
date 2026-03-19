-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migração: FK de colaborador em fato_mao_obra_propria + policy DELETE
-- Data: 17/03/2026
-- ============================================================

-- 1. Adicionar coluna colaborador_id em fato_mao_obra_propria
--    Permite vincular um registro do diário a um colaborador pré-cadastrado.
--    ON DELETE SET NULL garante que excluir um colaborador não remove o histórico do diário.

ALTER TABLE fato_mao_obra_propria
  ADD COLUMN IF NOT EXISTS colaborador_id UUID REFERENCES dim_colaboradores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fato_mao_obra_propria_colaborador
  ON fato_mao_obra_propria(colaborador_id);

-- 2. Tornar funcao_id nullable em fato_mao_obra_propria
--    O schema original definiu NOT NULL, mas o frontend já permite null.
--    Alinhar para permitir inserções sem função definida.

ALTER TABLE fato_mao_obra_propria
  ALTER COLUMN funcao_id DROP NOT NULL;

-- 3. Policy DELETE para dim_colaboradores (faltou na migration 20260313)

DROP POLICY IF EXISTS "colaboradores_delete_admin" ON dim_colaboradores;

CREATE POLICY "colaboradores_delete_admin"
  ON dim_colaboradores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'engenheiro')
    )
  );

-- 4. Corrigir policies existentes de dim_colaboradores para usar perfis atuais
--    (admin, engenheiro, operador em vez de admin, coordenador, operador_obra)

DROP POLICY IF EXISTS "colaboradores_insert_coordenador_admin" ON dim_colaboradores;
DROP POLICY IF EXISTS "colaboradores_update_coordenador_admin" ON dim_colaboradores;

CREATE POLICY "colaboradores_insert_admin_engenheiro_operador"
  ON dim_colaboradores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'engenheiro', 'operador')
    )
  );

CREATE POLICY "colaboradores_update_admin_engenheiro"
  ON dim_colaboradores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'engenheiro')
    )
  );
