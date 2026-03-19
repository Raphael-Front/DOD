-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migração: Perfil padrão de novos usuários → leitura
-- Data: 16/03/2026
-- ============================================================

ALTER TABLE dim_perfis
  ALTER COLUMN perfil SET DEFAULT 'leitura';
