-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migração: Corrige FK de colaborador_id em fato_mao_obra_propria
-- Data: 18/03/2026
-- ============================================================
-- Problema: fato_mao_obra_propria.colaborador_id referenciava dim_colaboradores,
-- mas o módulo de Cadastros registra colaboradores em d_colaboradores.
-- Correção: redireciona a FK para d_colaboradores.
-- ============================================================

-- 1. Remove a FK antiga (que apontava para dim_colaboradores)
ALTER TABLE fato_mao_obra_propria
  DROP CONSTRAINT IF EXISTS fato_mao_obra_propria_colaborador_id_fkey;

-- 2. Adiciona nova FK apontando para d_colaboradores
ALTER TABLE fato_mao_obra_propria
  ADD CONSTRAINT fato_mao_obra_propria_colaborador_id_fkey
  FOREIGN KEY (colaborador_id)
  REFERENCES d_colaboradores(id)
  ON DELETE SET NULL;
