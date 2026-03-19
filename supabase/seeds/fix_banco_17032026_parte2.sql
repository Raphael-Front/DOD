-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Script de limpeza final — 17/03/2026 (parte 2)
-- Executar no SQL Editor do Supabase após fix_banco_17032026.sql
-- ============================================================
-- Situação atual:  obras=3, funções=12, fornecedores=11, equipamentos=71
-- Situação alvo:   obras=2, funções=10, fornecedores=10, equipamentos=15
-- ============================================================


-- ============================================================
-- PASSO 1 — Corrigir obras (sobrou 1 extra)
-- Manter apenas as 2 obras do seed; deletar qualquer outra.
-- Redirecionar FKs antes de deletar.
-- ============================================================

-- Identificar a obra extra (não é nenhuma das 2 do seed)
-- e redirecionar diários para a obra mais recente de mesmo nome,
-- ou para a primeira obra conhecida se não houver correspondência.

DO $$
DECLARE
  obras_seed TEXT[] := ARRAY[
    'Residencial Parque das Flores',
    'Edifício Comercial Central Park'
  ];
  obra_fallback UUID;
BEGIN
  -- Pegar uma obra válida do seed para usar como fallback
  SELECT id INTO obra_fallback
  FROM dim_obras
  WHERE nome = ANY(obras_seed)
  ORDER BY criado_em DESC
  LIMIT 1;

  -- Redirecionar fato_diarios das obras que não são do seed
  UPDATE fato_diarios
  SET obra_id = obra_fallback
  WHERE obra_id IN (
    SELECT id FROM dim_obras WHERE nome <> ALL(obras_seed)
  );

  -- Redirecionar dim_usuario_obra
  DELETE FROM dim_usuario_obra
  WHERE obra_id IN (
    SELECT id FROM dim_obras WHERE nome <> ALL(obras_seed)
  );

  -- Redirecionar dim_equipamentos.obra_alocacao_id
  UPDATE dim_equipamentos
  SET obra_alocacao_id = NULL
  WHERE obra_alocacao_id IN (
    SELECT id FROM dim_obras WHERE nome <> ALL(obras_seed)
  );

  -- Deletar obras extras
  DELETE FROM dim_obras WHERE nome <> ALL(obras_seed);
END $$;


-- ============================================================
-- PASSO 2 — Corrigir funções (sobrou 2 extras)
-- Manter exatamente as 10 funções do seed.
-- ============================================================

-- Remover vínculos de fato_mao_obra_propria/terceirizada
-- que apontem para funções fora do seed (via funcao_id em fato_servicos)
UPDATE fato_servicos
SET funcao_id = NULL
WHERE funcao_id IN (
  SELECT id FROM dim_funcoes
  WHERE nome NOT IN (
    'Pedreiro','Eletricista','Encarregado','Carpinteiro','Soldador',
    'Armador','Encanador','Gesseiro','Operador de Máquinas','Servente'
  )
);

-- Remover funções extras
DELETE FROM dim_funcoes
WHERE nome NOT IN (
  'Pedreiro','Eletricista','Encarregado','Carpinteiro','Soldador',
  'Armador','Encanador','Gesseiro','Operador de Máquinas','Servente'
);


-- ============================================================
-- PASSO 3 — Corrigir fornecedores (sobrou 1 extra)
-- Manter exatamente os 10 fornecedores do seed (por CNPJ).
-- ============================================================
DELETE FROM dim_fornecedores
WHERE cnpj NOT IN (
  '12.345.678/0001-90',
  '23.456.789/0001-01',
  '34.567.890/0001-12',
  '45.678.901/0001-23',
  '56.789.012/0001-34',
  '67.890.123/0001-45',
  '78.901.234/0001-56',
  '89.012.345/0001-67',
  '90.123.456/0001-78',
  '01.234.567/0001-89'
)
AND cnpj IS NOT NULL;

-- Deletar fornecedor sem CNPJ que não seja do seed (se houver)
DELETE FROM dim_fornecedores
WHERE cnpj IS NULL
  AND razao_social NOT IN (
    'Construtora Beta Ltda','Elétrica Novapower S/A','Locações Pesadas Omega Ltda',
    'Hidráulica Saneamento Total Ltda','Pintura & Acabamentos Prime S/A',
    'Terraplanagem Norte Ltda','Serralheria Moderna S/A','Revestimentos Brasil Ltda',
    'Impermeabilizações Santos Ltda','Estrutura & Formas Engenharia Ltda'
  );


-- ============================================================
-- PASSO 4 — Corrigir equipamentos (71 → 15)
-- Não há constraint única, então apagamos tudo e reinserimos.
-- equipamento_id em fato_equipamentos é NOT NULL → deletar os registros.
-- ============================================================

-- Deletar registros de uso de equipamentos nos diários
-- (são dados de seed/teste, não há perda de dados reais)
DELETE FROM fato_equipamentos;

-- Deletar todos os equipamentos atuais
DELETE FROM dim_equipamentos;

-- Reinserir 11 equipamentos próprios
INSERT INTO dim_equipamentos (tipo, nome, identificacao, fabricante, modelo, observacoes, ativo)
VALUES
  ('proprio', 'Betoneira 400L',            'PAT-001', 'Menegotti', 'B400',         'Betoneira elétrica trifásica 400L',          TRUE),
  ('proprio', 'Andaime Metálico 12m',      'PAT-002', 'Plaka',     'AM-12',        'Conjunto de andaimes metálicos 12m',         TRUE),
  ('proprio', 'Esmerilhadeira Angular 7"', 'PAT-003', 'Bosch',     'GWS 7-115',    'Esmerilhadeira angular 720W',                TRUE),
  ('proprio', 'Vibrador de Concreto',      'PAT-004', 'Wacker',    'M2000',        'Vibrador de imersão para concreto',          TRUE),
  ('proprio', 'Compactador de Solo',       'PAT-005', 'Wacker',    'BS 60-4',      'Compactador vibratório 60kg',                TRUE),
  ('proprio', 'Serra Circular de Mesa',    'PAT-006', 'Makita',    '2704',         'Serra circular de mesa 10"',                 TRUE),
  ('proprio', 'Compressor de Ar 150L',     'PAT-007', 'Schulz',    'MSV 15/150',   'Compressor de pistão 150L 15 bar',           TRUE),
  ('proprio', 'Nível a Laser Rotativo',    'PAT-008', 'Bosch',     'GRL 300 HV',   'Nível rotativo autonivelante 300m',          TRUE),
  ('proprio', 'Máquina de Solda MIG',      'PAT-009', 'Lincoln',   'Idealarc MIG', 'Soldadora MIG/MAG 250A trifásica',           TRUE),
  ('proprio', 'Martelete Demolidor',       'PAT-010', 'Bosch',     'GSH 16-28',    'Martelete demolidor 1750W',                  TRUE),
  ('proprio', 'Plataforma Elevatória 6m',  'PAT-011', 'Genie',     'GS-1930',      'Plataforma tesoura elétrica até 6m',         TRUE);

-- Reinserir 4 equipamentos locados (vinculados à Omega Locações)
INSERT INTO dim_equipamentos (
  tipo, nome, identificacao, fabricante, modelo,
  fornecedor_id, contrato_numero,
  locacao_inicio, locacao_fim, valor_locacao,
  observacoes, ativo
)
SELECT
  'locado',
  e.nome, e.identificacao, e.fabricante, e.modelo,
  f.id, e.contrato,
  e.locacao_inicio::DATE,
  e.locacao_fim::DATE,
  e.valor_locacao,
  e.observacoes,
  TRUE
FROM (VALUES
  ('Guindaste Telescópico 50T',   'LOC-001', 'Liebherr',    'LTM 1050-3.1',  'CONTR-LOC-2026/001', '2026-03-01', '2026-09-30', 18500.00, 'Guindaste telescópico 50T — içamento de peças pesadas'),
  ('Bomba de Concreto Estacion.', 'LOC-002', 'Putzmeister', 'BSF 36-4.16 H', 'CONTR-LOC-2026/002', '2026-03-01', '2026-12-31',  9800.00, 'Bomba estacionária 80m³/h — lançamento de concreto'),
  ('Grua Torre 40m',              'LOC-003', 'Liebherr',    '63 K',          'CONTR-LOC-2026/003', '2026-04-01', '2027-04-30', 22000.00, 'Grua torre 40m, alcance 50m, carga máx. 2T na ponta'),
  ('Retroescavadeira',            'LOC-004', 'JCB',         '3CX',           'CONTR-LOC-2026/004', '2026-03-15', '2026-08-31',  7500.00, 'Retroescavadeira 4x4 — escavação e carregamento')
) AS e(nome, identificacao, fabricante, modelo, contrato, locacao_inicio, locacao_fim, valor_locacao, observacoes)
JOIN dim_fornecedores f ON f.cnpj = '34.567.890/0001-12';


-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'obras'        AS tabela, COUNT(*) AS total FROM dim_obras
UNION ALL
SELECT 'funcoes',       COUNT(*) FROM dim_funcoes
UNION ALL
SELECT 'fornecedores',  COUNT(*) FROM dim_fornecedores
UNION ALL
SELECT 'equipamentos',  COUNT(*) FROM dim_equipamentos
UNION ALL
SELECT 'locais',        COUNT(*) FROM dim_locais
UNION ALL
SELECT 'departamentos', COUNT(*) FROM dim_departamentos
ORDER BY tabela;
