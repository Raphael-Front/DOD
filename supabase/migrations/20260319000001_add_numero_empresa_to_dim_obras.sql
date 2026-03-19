-- =============================================================================
-- MIGRAÇÃO: Adiciona numero_empresa e cnpj à dim_obras + VIEW v_colaboradores
-- Data: 2026-03-19
-- Motivo: Vincular colaboradores às obras via número da empresa (campo legado)
-- =============================================================================

-- Adiciona número da empresa (único por obra) e CNPJ da SPE
ALTER TABLE dim_obras
  ADD COLUMN IF NOT EXISTS numero_empresa INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS cnpj           TEXT;

-- =============================================================================
-- VIEW: v_colaboradores
-- Expõe todos os campos de d_colaboradores + nome_obra resolvido via JOIN
-- com dim_obras usando d_colaboradores.empresa = dim_obras.numero_empresa::TEXT
-- Quando não houver obra cadastrada com aquele número, nome_obra fica NULL
-- =============================================================================
CREATE OR REPLACE VIEW v_colaboradores AS
SELECT
  c.*,
  o.nome AS nome_obra
FROM d_colaboradores c
LEFT JOIN dim_obras o
  ON c.empresa = o.numero_empresa::TEXT;

-- =============================================================================
-- Dados iniciais — empresas/obras já conhecidas
-- =============================================================================
INSERT INTO dim_obras (nome, cnpj, numero_empresa, status)
VALUES
  ('Universitario R235 Empreendimento Imobiliário SPE Ltda', '39.843.541/0001-17', 42, 'em_andamento'),
  ('Nova Suíça C-181 Empreendimento Imobiliário SPE Ltda',  '41.516.291/0001-52', 44, 'em_andamento'),
  ('SPE R4A Aeroporto Empreendimento Imobiliário Ltda',     '50.832.438/0001-04', 59, 'em_andamento'),
  ('Rio Verde R15 Empreendimento Imobiliário SPE Ltda',     '53.638.836/0001-82', 62, 'em_andamento'),
  ('Rio Verde R11 Empreendimento Imobiliário SPE Ltda',     '58.444.386/0001-00', 69, 'em_andamento')
ON CONFLICT DO NOTHING;
