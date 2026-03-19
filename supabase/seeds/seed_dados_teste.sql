-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Seeds de Dados de Teste — v1.0
-- Data: 13/03/2026
-- ============================================================
-- INSTRUÇÕES DE USO:
-- Execute este script no SQL Editor do Supabase APÓS rodar a
-- migração 20260313000000_add_modulos_tables.sql
-- Os INSERTs usam ON CONFLICT DO NOTHING para ser re-executável.
-- ============================================================


-- ============================================================
-- 1. FUNÇÕES (com serviços associados)
-- ============================================================

INSERT INTO dim_funcoes (nome, categoria, servicos, observacoes, ativo)
VALUES
  ('Pedreiro',     'Construção Civil',  ARRAY['Alvenaria', 'Reboco', 'Contrapiso', 'Regularização de piso'],      'Profissional de execução de alvenaria e revestimentos', TRUE),
  ('Eletricista',  'Instalações',       ARRAY['Instalação elétrica', 'Quadro de distribuição', 'Cabeamento estruturado', 'Teste e medição'], 'Profissional de instalações elétricas prediais', TRUE),
  ('Encarregado',  'Gestão de Obra',    ARRAY['Controle de equipe', 'Relatório diário', 'Inspeção de qualidade'],  'Responsável pela gestão da equipe em campo', TRUE),
  ('Carpinteiro',  'Construção Civil',  ARRAY['Forma de concreto', 'Escoramento', 'Cobertura de madeira', 'Forro'],  'Profissional de carpintaria de obra', TRUE),
  ('Soldador',     'Serralheria',       ARRAY['Soldagem MIG/MAG', 'Corte de aço', 'Montagem de estrutura metálica', 'Reforço estrutural'], 'Profissional de soldagem e estruturas metálicas', TRUE)
ON CONFLICT (nome) DO UPDATE
  SET servicos = EXCLUDED.servicos,
      categoria = EXCLUDED.categoria,
      atualizado_em = NOW();


-- ============================================================
-- 2. COLABORADORES (Pessoas)
-- ============================================================

INSERT INTO dim_colaboradores (nome, cpf, telefone, funcao_id, empresa, matricula, ativo)
SELECT
  c.nome,
  c.cpf,
  c.telefone,
  f.id AS funcao_id,
  c.empresa,
  c.matricula,
  TRUE
FROM (VALUES
  ('Carlos Lima',       '123.456.789-00', '(11) 98765-4321', 'Pedreiro',    'GPL Incorporadora',   'COL-001'),
  ('Ana Souza',         '234.567.890-11', '(11) 97654-3210', 'Eletricista', 'GPL Incorporadora',   'COL-002'),
  ('Roberto Neves',     '345.678.901-22', '(11) 96543-2109', 'Encarregado', 'GPL Incorporadora',   'COL-003'),
  ('Juliana Pires',     '456.789.012-33', '(11) 95432-1098', 'Carpinteiro', 'GPL Incorporadora',   'COL-004'),
  ('Marcos Teixeira',   '567.890.123-44', '(11) 94321-0987', 'Soldador',    'Construtora Beta Ltda', 'COL-005')
) AS c(nome, cpf, telefone, funcao_nome, empresa, matricula)
JOIN dim_funcoes f ON f.nome = c.funcao_nome
ON CONFLICT (cpf) DO NOTHING;


-- ============================================================
-- 3. FORNECEDORES
-- ============================================================

INSERT INTO dim_fornecedores (razao_social, nome_fantasia, cnpj, responsavel, telefone, email, tipo_servico, ativo)
VALUES
  ('Construtora Beta Ltda',       'Beta Obras',       '12.345.678/0001-90', 'Fernando Almeida',   '(11) 3333-1111', 'contato@betaobras.com.br',    'Mão de obra especializada',  TRUE),
  ('Elétrica Novapower S/A',      'Novapower',        '23.456.789/0001-01', 'Cláudia Martins',    '(11) 3333-2222', 'claudia@novapower.com.br',     'Instalações elétricas',      TRUE),
  ('Locações Pesadas Omega Ltda', 'Omega Locações',   '34.567.890/0001-12', 'Paulo Henrique',     '(11) 3333-3333', 'paulo@omegalocacoes.com.br',   'Locação de equipamentos',    TRUE)
ON CONFLICT (cnpj) DO NOTHING;


-- ============================================================
-- 4. EQUIPAMENTOS (incluindo ao menos 1 locado)
-- ============================================================

-- Inserir equipamentos próprios (sem fornecedor)
INSERT INTO dim_equipamentos (tipo, nome, identificacao, fabricante, modelo, observacoes, ativo)
VALUES
  ('proprio', 'Betoneira 400L',         'PAT-001', 'Menegotti',  'B400',        'Betoneira elétrica trifásica 400 litros', TRUE),
  ('proprio', 'Andaime Metálico 12m',   'PAT-002', 'Plaka',      'AM-12',       'Conjunto de andaimes metálicos 12 metros', TRUE),
  ('proprio', 'Esmerilhadeira Angular', 'PAT-003', 'Bosch',      'GWS 7-115',   'Esmerilhadeira 7 polegadas 720W', TRUE),
  ('proprio', 'Vibrador de Concreto',   'PAT-004', 'Wacker',     'M2000',       'Vibrador de imersão para concreto', TRUE)
ON CONFLICT DO NOTHING;

-- Inserir equipamento LOCADO (precisa de fornecedor)
INSERT INTO dim_equipamentos (tipo, nome, identificacao, fabricante, modelo, fornecedor_id, contrato_numero, locacao_inicio, locacao_fim, valor_locacao, observacoes, ativo)
SELECT
  'locado',
  'Guindaste Telescópico 50T',
  'LOC-001',
  'Liebherr',
  'LTM 1050',
  f.id,
  'CONTR-LOC-2026/001',
  '2026-03-01',
  '2026-06-30',
  18500.00,
  'Guindaste telescópico 50 toneladas — locado da Omega Locações',
  TRUE
FROM dim_fornecedores f
WHERE f.cnpj = '34.567.890/0001-12'
ON CONFLICT DO NOTHING;


-- ============================================================
-- 5. LOCAIS / ÁREAS DA OBRA
-- ============================================================

INSERT INTO dim_locais (nome, descricao, ativo)
VALUES
  ('Bloco A',     'Bloco residencial principal — Pavimentos 1 ao 15',        TRUE),
  ('Subsolo',     'Pavimento de garagem e infraestrutura — 2 subsolos',       TRUE),
  ('Cobertura',   'Cobertura do edifício — laje técnica e casa de máquinas', TRUE),
  ('Garagem',     'Área de manobra e vagas de garagem térrea',               TRUE),
  ('Hall de Entrada', 'Hall social de entrada e portaria',                   TRUE)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 6. DEPARTAMENTOS (para visitas)
-- ============================================================

INSERT INTO dim_departamentos (nome, ativo)
VALUES
  ('Engenharia',      TRUE),
  ('Segurança do Trabalho', TRUE),
  ('Administrativo',  TRUE),
  ('Diretoria',       TRUE)
ON CONFLICT (nome) DO NOTHING;


-- ============================================================
-- 7. CATEGORIAS E TIPOS DE OCORRÊNCIAS
-- ============================================================

-- Categorias
INSERT INTO dim_categorias_ocorrencias (nome, ativo)
VALUES
  ('Segurança do Trabalho', TRUE),
  ('Qualidade',             TRUE),
  ('Meio Ambiente',         TRUE),
  ('Administrativo',        TRUE),
  ('Patrimônio',            TRUE)
ON CONFLICT (nome) DO NOTHING;

-- Tipos por categoria
INSERT INTO dim_tipos_ocorrencias (categoria_id, nome, ativo)
SELECT c.id, t.nome, TRUE
FROM dim_categorias_ocorrencias c
JOIN (VALUES
  -- Segurança do Trabalho
  ('Segurança do Trabalho', 'Acidente de Trabalho'),
  ('Segurança do Trabalho', 'Quase Acidente'),
  ('Segurança do Trabalho', 'EPI não utilizado'),
  -- Qualidade
  ('Qualidade', 'Não conformidade'),
  ('Qualidade', 'Retrabalho'),
  ('Qualidade', 'Material fora do padrão'),
  -- Meio Ambiente
  ('Meio Ambiente', 'Descarte irregular'),
  ('Meio Ambiente', 'Derramamento de resíduo'),
  ('Meio Ambiente', 'Poluição sonora'),
  -- Administrativo
  ('Administrativo', 'Atraso de equipe'),
  ('Administrativo', 'Falta de material'),
  ('Administrativo', 'Paralisação de serviço'),
  -- Patrimônio
  ('Patrimônio', 'Dano a equipamento'),
  ('Patrimônio', 'Furto/Roubo'),
  ('Patrimônio', 'Vandalismo')
) AS t(categoria_nome, nome) ON c.nome = t.categoria_nome
ON CONFLICT (categoria_id, nome) DO NOTHING;


-- ============================================================
-- FIM DO SEED
-- ============================================================
-- Verificação rápida (executar separadamente se necessário):
-- SELECT nome, servicos FROM dim_funcoes ORDER BY nome;
-- SELECT nome FROM dim_colaboradores;
-- SELECT nome, tipo FROM dim_equipamentos;
-- SELECT nome FROM dim_locais;
-- SELECT nome FROM dim_departamentos;
-- SELECT c.nome, t.nome FROM dim_tipos_ocorrencias t JOIN dim_categorias_ocorrencias c ON c.id = t.categoria_id ORDER BY c.nome, t.nome;
