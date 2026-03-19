-- =============================================================================
-- MIGRAÇÃO: Substitui obra_id e funcao_id (UUID/FK) por obra e funcao (TEXT)
-- Data: 2026-03-19
-- Tabela alterada: d_colaboradores
-- Motivo: Permitir importação de dados legados sem exigir UUIDs válidos
-- =============================================================================

-- Remove o índice criado sobre obra_id
DROP INDEX IF EXISTS idx_d_colaboradores_obra;

-- Remove a FK de obra_id e a coluna
ALTER TABLE d_colaboradores
  DROP COLUMN IF EXISTS obra_id;

-- Remove a FK de funcao_id e a coluna
ALTER TABLE d_colaboradores
  DROP COLUMN IF EXISTS funcao_id;

-- Adiciona as novas colunas em texto livre
ALTER TABLE d_colaboradores
  ADD COLUMN IF NOT EXISTS obra   TEXT,
  ADD COLUMN IF NOT EXISTS funcao TEXT;
