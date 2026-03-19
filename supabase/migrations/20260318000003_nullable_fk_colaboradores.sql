-- =============================================================================
-- MIGRAÇÃO: Torna obra_id e funcao_id opcionais em d_colaboradores
-- Data: 2026-03-18
-- =============================================================================

ALTER TABLE d_colaboradores
  ALTER COLUMN obra_id   DROP NOT NULL,
  ALTER COLUMN funcao_id DROP NOT NULL;
