-- =============================================================================
-- MIGRAÇÃO: Adiciona colunas para receber dados da migração de colaboradores
-- Data: 2026-03-18
-- Tabela alterada: d_colaboradores
-- =============================================================================

-- Adiciona colunas faltantes para receber os dados da planilha de migração
ALTER TABLE d_colaboradores
  ADD COLUMN IF NOT EXISTS empresa         TEXT,
  ADD COLUMN IF NOT EXISTS salario_base    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vt_mensal       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refeicao_mensal NUMERIC(12,2) DEFAULT 0;

-- Expande o CHECK de status para incluir 'doente'
-- (necessário pois a planilha usa SITUACAO = 'DOENTE')
ALTER TABLE d_colaboradores
  DROP CONSTRAINT IF EXISTS d_colaboradores_status_check;

ALTER TABLE d_colaboradores
  ADD CONSTRAINT d_colaboradores_status_check
  CHECK (status IN ('ativo', 'ferias', 'afastado', 'demitido', 'doente'));
