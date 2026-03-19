-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Script de correção — 17/03/2026
-- Executar UMA VEZ no SQL Editor do Supabase
-- ============================================================
-- O que este script faz:
--   1. Remove duplicatas de obras e locais
--   2. Garante coluna `servicos` em dim_funcoes
--   3. Habilita RLS e recria policies que foram perdidas
--   4. Insere funções, fornecedores e equipamentos
-- ============================================================


-- ============================================================
-- PASSO 1 — Remover duplicatas de obras
-- (sem UNIQUE constraint, o seed criou cópias a cada execução)
-- Estratégia: manter a obra mais recente por nome e redirecionar
-- todas as FKs das duplicatas para o registro que será mantido.
-- ============================================================

-- 1a. Redirecionar fato_diarios das duplicatas → obra keeper
UPDATE fato_diarios fd
SET obra_id = keeper.id
FROM dim_obras dup
JOIN (
  SELECT DISTINCT ON (nome) id, nome
  FROM dim_obras
  ORDER BY nome, criado_em DESC
) keeper ON keeper.nome = dup.nome
WHERE fd.obra_id = dup.id
  AND dup.id <> keeper.id;

-- 1b. Redirecionar dim_usuario_obra das duplicatas → obra keeper
UPDATE dim_usuario_obra duo
SET obra_id = keeper.id
FROM dim_obras dup
JOIN (
  SELECT DISTINCT ON (nome) id, nome
  FROM dim_obras
  ORDER BY nome, criado_em DESC
) keeper ON keeper.nome = dup.nome
WHERE duo.obra_id = dup.id
  AND dup.id <> keeper.id
  AND NOT EXISTS (
    SELECT 1 FROM dim_usuario_obra
    WHERE usuario_id = duo.usuario_id AND obra_id = keeper.id
  );

-- Remover vínculos usuario_obra restantes que apontam para duplicatas
DELETE FROM dim_usuario_obra duo
USING dim_obras dup
JOIN (
  SELECT DISTINCT ON (nome) id, nome
  FROM dim_obras
  ORDER BY nome, criado_em DESC
) keeper ON keeper.nome = dup.nome
WHERE duo.obra_id = dup.id
  AND dup.id <> keeper.id;

-- 1c. Redirecionar dim_equipamentos.obra_alocacao_id das duplicatas → obra keeper
UPDATE dim_equipamentos eq
SET obra_alocacao_id = keeper.id
FROM dim_obras dup
JOIN (
  SELECT DISTINCT ON (nome) id, nome
  FROM dim_obras
  ORDER BY nome, criado_em DESC
) keeper ON keeper.nome = dup.nome
WHERE eq.obra_alocacao_id = dup.id
  AND dup.id <> keeper.id;

-- 1d. Agora sim, deletar as duplicatas
DELETE FROM dim_obras a
USING (
  SELECT DISTINCT ON (nome) id, nome
  FROM dim_obras
  ORDER BY nome, criado_em DESC
) keeper
WHERE a.nome = keeper.nome
  AND a.id <> keeper.id;


-- ============================================================
-- PASSO 2 — Remover duplicatas de locais
-- ============================================================

-- 2a. Redirecionar fato_servicos.local_id das duplicatas → local keeper
UPDATE fato_servicos fs
SET local_id = keeper.id
FROM dim_locais dup
JOIN (
  SELECT DISTINCT ON (nome) id, nome
  FROM dim_locais
  ORDER BY nome, criado_em DESC
) keeper ON keeper.nome = dup.nome
WHERE fs.local_id = dup.id
  AND dup.id <> keeper.id;

-- 2b. Deletar os locais duplicados
DELETE FROM dim_locais a
USING (
  SELECT DISTINCT ON (nome) id, nome
  FROM dim_locais
  ORDER BY nome, criado_em DESC
) keeper
WHERE a.nome = keeper.nome
  AND a.id <> keeper.id;


-- ============================================================
-- PASSO 3 — Garantir coluna servicos em dim_funcoes
-- ============================================================
ALTER TABLE dim_funcoes
  ADD COLUMN IF NOT EXISTS servicos TEXT[] NOT NULL DEFAULT '{}';


-- ============================================================
-- PASSO 4 — Habilitar RLS e recriar policies
-- (migration 20260316000001 derrubou todas sem recriar)
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


-- ============================================================
-- PASSO 5 — Inserir 10 funções
-- ============================================================
INSERT INTO dim_funcoes (nome, categoria, servicos, observacoes, ativo)
VALUES
  (
    'Pedreiro', 'Construção Civil',
    ARRAY['Alvenaria', 'Reboco', 'Contrapiso', 'Regularização de piso', 'Assentamento de bloco'],
    'Execução de alvenaria estrutural e de vedação', TRUE
  ),
  (
    'Eletricista', 'Instalações',
    ARRAY['Instalação elétrica', 'Quadro de distribuição', 'Cabeamento estruturado', 'SPDA', 'Iluminação'],
    'Instalações elétricas prediais de baixa e média tensão', TRUE
  ),
  (
    'Encarregado', 'Gestão de Obra',
    ARRAY['Controle de equipe', 'Relatório diário', 'Inspeção de qualidade', 'Medição de serviços'],
    'Gestão da equipe de campo e interface com engenharia', TRUE
  ),
  (
    'Carpinteiro', 'Construção Civil',
    ARRAY['Forma de concreto', 'Escoramento', 'Cobertura de madeira', 'Forro', 'Divisórias'],
    'Carpintaria de obra — formas e acabamentos em madeira', TRUE
  ),
  (
    'Soldador', 'Serralheria',
    ARRAY['Soldagem MIG/MAG', 'Corte de aço', 'Montagem de estrutura metálica', 'Reforço estrutural'],
    'Soldagem e montagem de estruturas metálicas', TRUE
  ),
  (
    'Armador', 'Estrutura',
    ARRAY['Montagem de armadura', 'Corte e dobramento de aço', 'Espaçadores e cobrimento', 'Concretagem'],
    'Armação de estruturas de concreto armado', TRUE
  ),
  (
    'Encanador', 'Instalações',
    ARRAY['Instalação hidráulica', 'Instalação sanitária', 'Gás predial', 'Combate a incêndio', 'Pressurização'],
    'Instalações hidrossanitárias e de gás predial', TRUE
  ),
  (
    'Gesseiro', 'Acabamentos',
    ARRAY['Forro de gesso', 'Sancas e molduras', 'Divisórias de gesso', 'Reboco de gesso', 'Nivelamento'],
    'Aplicação de gesso e execução de forros e molduras', TRUE
  ),
  (
    'Operador de Máquinas', 'Operação de Equipamentos',
    ARRAY['Operação de retroescavadeira', 'Operação de grua', 'Operação de guindaste', 'Operação de plataforma elevatória'],
    'Operação de equipamentos pesados e plataformas', TRUE
  ),
  (
    'Servente', 'Apoio',
    ARRAY['Limpeza de obra', 'Transporte de material', 'Apoio à concretagem', 'Remoção de entulho'],
    'Serviços gerais de apoio às frentes de trabalho', TRUE
  )
ON CONFLICT (nome) DO UPDATE
  SET servicos      = EXCLUDED.servicos,
      categoria     = EXCLUDED.categoria,
      observacoes   = EXCLUDED.observacoes,
      atualizado_em = NOW();


-- ============================================================
-- PASSO 6 — Inserir 10 fornecedores
-- ============================================================
INSERT INTO dim_fornecedores (
  razao_social, nome_fantasia, cnpj, responsavel,
  telefone, email, tipo_servico, ativo
)
VALUES
  ('Construtora Beta Ltda',              'Beta Obras',           '12.345.678/0001-90', 'Fernando Almeida',  '(11) 3333-1111', 'contato@betaobras.com.br',          'Mão de obra especializada',         TRUE),
  ('Elétrica Novapower S/A',             'Novapower',            '23.456.789/0001-01', 'Cláudia Martins',   '(11) 3333-2222', 'claudia@novapower.com.br',           'Instalações elétricas',             TRUE),
  ('Locações Pesadas Omega Ltda',        'Omega Locações',       '34.567.890/0001-12', 'Paulo Henrique',    '(11) 3333-3333', 'paulo@omegalocacoes.com.br',         'Locação de equipamentos',           TRUE),
  ('Hidráulica Saneamento Total Ltda',   'HS Total',             '45.678.901/0001-23', 'Marcos Bicalho',    '(11) 3333-4444', 'marcos@hstotal.com.br',              'Instalações hidrossanitárias',      TRUE),
  ('Pintura & Acabamentos Prime S/A',    'Prime Acabamentos',    '56.789.012/0001-34', 'Carla Fonseca',     '(11) 3333-5555', 'carla@primeacabamentos.com.br',      'Pintura e acabamentos',             TRUE),
  ('Terraplanagem Norte Ltda',           'Norte Terraplenagem',  '67.890.123/0001-45', 'Ricardo Nunes',     '(11) 3444-1111', 'ricardo@norteterrap.com.br',         'Terraplanagem e escavação',         TRUE),
  ('Serralheria Moderna S/A',            'Moderna Serralheria',  '78.901.234/0001-56', 'Patrícia Souza',    '(11) 3444-2222', 'patricia@modernaserr.com.br',        'Esquadrias e estruturas metálicas', TRUE),
  ('Revestimentos Brasil Ltda',          'Revest Brasil',        '89.012.345/0001-67', 'Anderson Lima',     '(11) 3444-3333', 'anderson@revestbrasil.com.br',       'Revestimentos e cerâmicas',         TRUE),
  ('Impermeabilizações Santos Ltda',     'Imp Santos',           '90.123.456/0001-78', 'Juliana Castro',    '(11) 3444-4444', 'juliana@impsantos.com.br',           'Impermeabilização',                 TRUE),
  ('Estrutura & Formas Engenharia Ltda', 'EF Formas',            '01.234.567/0001-89', 'Thiago Barbosa',    '(11) 3444-5555', 'thiago@efformas.com.br',             'Estrutura e concretagem',           TRUE)
ON CONFLICT (cnpj) DO NOTHING;


-- ============================================================
-- PASSO 7 — Inserir 11 equipamentos próprios
-- ============================================================
INSERT INTO dim_equipamentos (tipo, nome, identificacao, fabricante, modelo, observacoes, ativo)
VALUES
  ('proprio', 'Betoneira 400L',             'PAT-001', 'Menegotti', 'B400',         'Betoneira elétrica trifásica 400L',            TRUE),
  ('proprio', 'Andaime Metálico 12m',       'PAT-002', 'Plaka',     'AM-12',        'Conjunto de andaimes metálicos 12m',           TRUE),
  ('proprio', 'Esmerilhadeira Angular 7"',  'PAT-003', 'Bosch',     'GWS 7-115',    'Esmerilhadeira angular 720W',                  TRUE),
  ('proprio', 'Vibrador de Concreto',       'PAT-004', 'Wacker',    'M2000',        'Vibrador de imersão para concreto',            TRUE),
  ('proprio', 'Compactador de Solo',        'PAT-005', 'Wacker',    'BS 60-4',      'Compactador vibratório 60kg',                  TRUE),
  ('proprio', 'Serra Circular de Mesa',     'PAT-006', 'Makita',    '2704',         'Serra circular de mesa 10"',                   TRUE),
  ('proprio', 'Compressor de Ar 150L',      'PAT-007', 'Schulz',    'MSV 15/150',   'Compressor de pistão 150L 15 bar',             TRUE),
  ('proprio', 'Nível a Laser Rotativo',     'PAT-008', 'Bosch',     'GRL 300 HV',   'Nível rotativo autonivelante 300m',            TRUE),
  ('proprio', 'Máquina de Solda MIG',       'PAT-009', 'Lincoln',   'Idealarc MIG', 'Soldadora MIG/MAG 250A trifásica',             TRUE),
  ('proprio', 'Martelete Demolidor',        'PAT-010', 'Bosch',     'GSH 16-28',    'Martelete demolidor 1750W',                    TRUE),
  ('proprio', 'Plataforma Elevatória 6m',   'PAT-011', 'Genie',     'GS-1930',      'Plataforma tesoura elétrica até 6m',           TRUE)
ON CONFLICT DO NOTHING;


-- ============================================================
-- PASSO 8 — Inserir 4 equipamentos locados
-- (vinculados à Omega Locações — CNPJ 34.567.890/0001-12)
-- ============================================================
INSERT INTO dim_equipamentos (
  tipo, nome, identificacao, fabricante, modelo,
  fornecedor_id, contrato_numero,
  locacao_inicio, locacao_fim, valor_locacao,
  observacoes, ativo
)
SELECT
  'locado',
  e.nome, e.identificacao, e.fabricante, e.modelo,
  f.id,
  e.contrato,
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
JOIN dim_fornecedores f ON f.cnpj = '34.567.890/0001-12'
ON CONFLICT DO NOTHING;


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
