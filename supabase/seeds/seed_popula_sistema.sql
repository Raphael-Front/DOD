-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Seed Completo: Migração + Dados Fictícios — v2.1
-- Data: 17/03/2026
-- ============================================================
-- ARQUIVO AUTO-SUFICIENTE: executa as DDLs necessárias antes
-- de inserir os dados. Pode ser rodado diretamente no SQL
-- Editor do Supabase sem depender de migrações anteriores.
-- ============================================================


-- ============================================================
-- PARTE 1 — DDL: Tabelas e colunas necessárias
-- ============================================================

-- Coluna servicos em dim_funcoes
ALTER TABLE dim_funcoes
  ADD COLUMN IF NOT EXISTS servicos TEXT[] NOT NULL DEFAULT '{}';

-- Tabela de colaboradores
CREATE TABLE IF NOT EXISTS dim_colaboradores (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT        NOT NULL,
  cpf           TEXT        UNIQUE,
  telefone      TEXT,
  funcao_id     UUID        REFERENCES dim_funcoes(id) ON DELETE SET NULL,
  empresa       TEXT,
  matricula     TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de locais/áreas
CREATE TABLE IF NOT EXISTS dim_locais (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT        NOT NULL,
  descricao     TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de departamentos
CREATE TABLE IF NOT EXISTS dim_departamentos (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT        NOT NULL UNIQUE,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de categorias de ocorrências
CREATE TABLE IF NOT EXISTS dim_categorias_ocorrencias (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT        NOT NULL UNIQUE,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de tipos de ocorrências
CREATE TABLE IF NOT EXISTS dim_tipos_ocorrencias (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id  UUID        NOT NULL REFERENCES dim_categorias_ocorrencias(id) ON DELETE CASCADE,
  nome          TEXT        NOT NULL,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (categoria_id, nome)
);

-- Colunas extras em fato_visitas
ALTER TABLE fato_visitas
  ADD COLUMN IF NOT EXISTS departamento_id    UUID REFERENCES dim_departamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS departamento_outro TEXT;

-- Colunas extras em fato_ocorrencias
ALTER TABLE fato_ocorrencias
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES dim_categorias_ocorrencias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_id      UUID REFERENCES dim_tipos_ocorrencias(id) ON DELETE SET NULL;

-- Colunas extras em fato_servicos
ALTER TABLE fato_servicos
  ADD COLUMN IF NOT EXISTS local_id     UUID REFERENCES dim_locais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funcao_id    UUID REFERENCES dim_funcoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS servico_nome TEXT;

-- RLS básico para as novas tabelas
ALTER TABLE dim_colaboradores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_locais               ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_departamentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_categorias_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_tipos_ocorrencias    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- dim_colaboradores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_colaboradores' AND policyname = 'colab_select') THEN
    CREATE POLICY colab_select ON dim_colaboradores FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_colaboradores' AND policyname = 'colab_write') THEN
    CREATE POLICY colab_write ON dim_colaboradores FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM dim_perfis WHERE id = auth.uid() AND perfil IN ('admin','engenheiro','operador')));
  END IF;
  -- dim_locais
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_locais' AND policyname = 'locais_select') THEN
    CREATE POLICY locais_select ON dim_locais FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_locais' AND policyname = 'locais_write') THEN
    CREATE POLICY locais_write ON dim_locais FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM dim_perfis WHERE id = auth.uid() AND perfil IN ('admin','engenheiro')));
  END IF;
  -- dim_departamentos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_departamentos' AND policyname = 'depts_select') THEN
    CREATE POLICY depts_select ON dim_departamentos FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_departamentos' AND policyname = 'depts_write') THEN
    CREATE POLICY depts_write ON dim_departamentos FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM dim_perfis WHERE id = auth.uid() AND perfil IN ('admin','engenheiro','operador')));
  END IF;
  -- dim_categorias_ocorrencias
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_categorias_ocorrencias' AND policyname = 'cat_ocorr_select') THEN
    CREATE POLICY cat_ocorr_select ON dim_categorias_ocorrencias FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_categorias_ocorrencias' AND policyname = 'cat_ocorr_write') THEN
    CREATE POLICY cat_ocorr_write ON dim_categorias_ocorrencias FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM dim_perfis WHERE id = auth.uid() AND perfil IN ('admin','engenheiro')));
  END IF;
  -- dim_tipos_ocorrencias
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_tipos_ocorrencias' AND policyname = 'tipos_ocorr_select') THEN
    CREATE POLICY tipos_ocorr_select ON dim_tipos_ocorrencias FOR SELECT TO authenticated USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dim_tipos_ocorrencias' AND policyname = 'tipos_ocorr_write') THEN
    CREATE POLICY tipos_ocorr_write ON dim_tipos_ocorrencias FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM dim_perfis WHERE id = auth.uid() AND perfil IN ('admin','engenheiro')));
  END IF;
END $$;


-- ============================================================
-- PARTE 2 — DADOS: Inserção dos registros
-- ============================================================


-- ------------------------------------------------------------
-- 2.1 OBRAS (2 registros)
-- ------------------------------------------------------------

INSERT INTO dim_obras (
  nome, endereco, cidade, estado, cep,
  responsavel_tecnico, data_inicio, data_prevista_fim,
  status, observacoes, ativo
)
VALUES
  (
    'Residencial Parque das Flores',
    'Rua das Palmeiras, 450 — Jardim Paulista',
    'São Paulo', 'SP', '01310-100',
    'Eng. Ricardo Monteiro CREA-SP 123456',
    '2025-09-01', '2027-03-31',
    'em_andamento',
    'Empreendimento residencial de alto padrão — 2 torres de 18 andares',
    TRUE
  ),
  (
    'Edifício Comercial Central Park',
    'Av. José de Souza Campos, 900 — Nova Campinas',
    'Campinas', 'SP', '13092-123',
    'Eng. Fernanda Costa CREA-SP 654321',
    '2025-11-15', '2027-06-30',
    'em_andamento',
    'Edifício corporativo — 14 andares com laje técnica e heliporto',
    TRUE
  )
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- 2.2 FUNÇÕES (10 registros com serviços)
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 2.2.b FUNÇÕES — 5 registros adicionais (total: 10)
-- ------------------------------------------------------------

INSERT INTO dim_funcoes (nome, categoria, servicos, observacoes, ativo)
VALUES
  (
    'Armador de Ferro', 'Estrutura',
    ARRAY['Corte e dobra de aço', 'Montagem de armadura', 'Posicionamento de ferragem', 'Cobrimento de concreto', 'Emenda de barras'],
    'Montagem de armaduras para estruturas de concreto armado', TRUE
  ),
  (
    'Encanador', 'Instalações',
    ARRAY['Instalação hidráulica', 'Instalação sanitária', 'Passagem de tubulação', 'Teste de pressão', 'Instalação de registros e válvulas'],
    'Instalações hidrossanitárias prediais', TRUE
  ),
  (
    'Gesseiro', 'Acabamentos',
    ARRAY['Reboco de gesso', 'Forro de gesso', 'Molduras', 'Textura interna', 'Chapisco de gesso'],
    'Aplicação de gesso em paredes, tetos e forros', TRUE
  ),
  (
    'Operador de Máquinas', 'Operação de Equipamentos',
    ARRAY['Operação de escavadeira', 'Operação de retroescavadeira', 'Operação de grua', 'Operação de guindaste', 'Movimentação de cargas'],
    'Operação de equipamentos pesados e de elevação', TRUE
  ),
  (
    'Servente de Obra', 'Apoio',
    ARRAY['Limpeza de canteiro', 'Transporte de materiais', 'Apoio a pedreiro', 'Preparo de massa', 'Carga e descarga'],
    'Serviços gerais de apoio às frentes de trabalho', TRUE
  )
ON CONFLICT (nome) DO UPDATE
  SET servicos      = EXCLUDED.servicos,
      categoria     = EXCLUDED.categoria,
      observacoes   = EXCLUDED.observacoes,
      atualizado_em = NOW();


-- ------------------------------------------------------------
-- 2.3 FORNECEDORES (10 registros)
-- ------------------------------------------------------------

INSERT INTO dim_fornecedores (
  razao_social, nome_fantasia, cnpj, responsavel,
  telefone, email, tipo_servico, ativo
)
VALUES
  ('Construtora Beta Ltda',              'Beta Obras',           '12.345.678/0001-90', 'Fernando Almeida',  '(11) 3333-1111', 'contato@betaobras.com.br',          'Mão de obra especializada',      TRUE),
  ('Elétrica Novapower S/A',             'Novapower',            '23.456.789/0001-01', 'Cláudia Martins',   '(11) 3333-2222', 'claudia@novapower.com.br',           'Instalações elétricas',          TRUE),
  ('Locações Pesadas Omega Ltda',        'Omega Locações',       '34.567.890/0001-12', 'Paulo Henrique',    '(11) 3333-3333', 'paulo@omegalocacoes.com.br',         'Locação de equipamentos',        TRUE),
  ('Hidráulica Saneamento Total Ltda',   'HS Total',             '45.678.901/0001-23', 'Marcos Bicalho',    '(11) 3333-4444', 'marcos@hstotal.com.br',              'Instalações hidrossanitárias',   TRUE),
  ('Pintura & Acabamentos Prime S/A',    'Prime Acabamentos',    '56.789.012/0001-34', 'Carla Fonseca',     '(11) 3333-5555', 'carla@primeacabamentos.com.br',      'Pintura e acabamentos',          TRUE),
  ('Terraplanagem Norte Ltda',           'Norte Terraplenagem',  '67.890.123/0001-45', 'Ricardo Nunes',     '(11) 3444-1111', 'ricardo@norteterrap.com.br',         'Terraplanagem e escavação',      TRUE),
  ('Serralheria Moderna S/A',            'Moderna Serralheria',  '78.901.234/0001-56', 'Patrícia Souza',    '(11) 3444-2222', 'patricia@modernaserr.com.br',        'Esquadrias e estruturas metálicas', TRUE),
  ('Revestimentos Brasil Ltda',          'Revest Brasil',        '89.012.345/0001-67', 'Anderson Lima',     '(11) 3444-3333', 'anderson@revestbrasil.com.br',       'Revestimentos e cerâmicas',      TRUE),
  ('Impermeabilizações Santos Ltda',     'Imp Santos',           '90.123.456/0001-78', 'Juliana Castro',    '(11) 3444-4444', 'juliana@impsantos.com.br',           'Impermeabilização',              TRUE),
  ('Estrutura & Formas Engenharia Ltda', 'EF Formas',            '01.234.567/0001-89', 'Thiago Barbosa',    '(11) 3444-5555', 'thiago@efformas.com.br',             'Estrutura e concretagem',        TRUE)
ON CONFLICT (cnpj) DO NOTHING;


-- ------------------------------------------------------------
-- 2.4 EQUIPAMENTOS (15 registros — 11 próprios + 4 locados)
-- ------------------------------------------------------------

-- 11 próprios
INSERT INTO dim_equipamentos (tipo, nome, identificacao, fabricante, modelo, observacoes, ativo)
VALUES
  ('proprio', 'Betoneira 400L',              'PAT-001', 'Menegotti',  'B400',          'Betoneira elétrica trifásica 400L',               TRUE),
  ('proprio', 'Andaime Metálico 12m',        'PAT-002', 'Plaka',      'AM-12',         'Conjunto de andaimes metálicos 12m',              TRUE),
  ('proprio', 'Esmerilhadeira Angular 7"',   'PAT-003', 'Bosch',      'GWS 7-115',     'Esmerilhadeira angular 720W',                     TRUE),
  ('proprio', 'Vibrador de Concreto',        'PAT-004', 'Wacker',     'M2000',         'Vibrador de imersão para concreto',               TRUE),
  ('proprio', 'Compactador de Solo',         'PAT-005', 'Wacker',     'BS 60-4',       'Compactador vibratório 60kg',                     TRUE),
  ('proprio', 'Serra Circular de Mesa',      'PAT-006', 'Makita',     '2704',          'Serra circular de mesa 10"',                      TRUE),
  ('proprio', 'Compressor de Ar 150L',       'PAT-007', 'Schulz',     'MSV 15/150',    'Compressor de pistão 150L 15 bar',                TRUE),
  ('proprio', 'Nível a Laser Rotativo',      'PAT-008', 'Bosch',      'GRL 300 HV',    'Nível rotativo autonivelante 300m',               TRUE),
  ('proprio', 'Máquina de Solda MIG',        'PAT-009', 'Lincoln',    'Idealarc MIG',  'Soldadora MIG/MAG 250A trifásica',                TRUE),
  ('proprio', 'Martelete Demolidor',         'PAT-010', 'Bosch',      'GSH 16-28',     'Martelete demolidor 1750W',                       TRUE),
  ('proprio', 'Plataforma Elevatória 6m',    'PAT-011', 'Genie',      'GS-1930',       'Plataforma tesoura elétrica até 6m',              TRUE)
ON CONFLICT DO NOTHING;

-- 4 locados (vinculados à Omega Locações — CNPJ 34.567.890/0001-12)
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


-- ------------------------------------------------------------
-- 2.5 LOCAIS / ÁREAS (11 registros — Pavimento Térreo + 1 ao 10)
-- ------------------------------------------------------------

INSERT INTO dim_locais (nome, descricao, ativo)
VALUES
  ('Pavimento Térreo', 'Térreo — Portaria, hall social e garagem',         TRUE),
  ('Pavimento 1',      '1º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 2',      '2º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 3',      '3º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 4',      '4º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 5',      '5º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 6',      '6º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 7',      '7º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 8',      '8º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 9',      '9º Pavimento — Unidades tipo',                      TRUE),
  ('Pavimento 10',     '10º Pavimento — Unidades tipo',                     TRUE)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------
-- 2.6 DEPARTAMENTOS (5 registros)
-- ------------------------------------------------------------

INSERT INTO dim_departamentos (nome, ativo)
VALUES
  ('Engenharia',            TRUE),
  ('Segurança do Trabalho', TRUE),
  ('Administrativo',        TRUE),
  ('Diretoria',             TRUE),
  ('Planejamento',          TRUE)
ON CONFLICT (nome) DO NOTHING;


-- ------------------------------------------------------------
-- 2.7 CATEGORIAS DE OCORRÊNCIAS (5 registros)
-- ------------------------------------------------------------

INSERT INTO dim_categorias_ocorrencias (nome, ativo)
VALUES
  ('Segurança do Trabalho', TRUE),
  ('Qualidade',             TRUE),
  ('Meio Ambiente',         TRUE),
  ('Administrativo',        TRUE),
  ('Patrimônio',            TRUE)
ON CONFLICT (nome) DO NOTHING;


-- ------------------------------------------------------------
-- 2.8 TIPOS DE OCORRÊNCIAS (1 por categoria = 5 tipos)
-- ------------------------------------------------------------

INSERT INTO dim_tipos_ocorrencias (categoria_id, nome, ativo)
SELECT c.id, t.tipo_nome, TRUE
FROM dim_categorias_ocorrencias c
JOIN (VALUES
  ('Segurança do Trabalho', 'Acidente de Trabalho'),
  ('Qualidade',             'Não conformidade'),
  ('Meio Ambiente',         'Descarte irregular'),
  ('Administrativo',        'Atraso de equipe'),
  ('Patrimônio',            'Dano a equipamento')
) AS t(cat_nome, tipo_nome) ON c.nome = t.cat_nome
ON CONFLICT (categoria_id, nome) DO NOTHING;


-- ============================================================
-- FIM DO SEED
-- ============================================================
-- Verificação rápida:
-- SELECT nome, status FROM dim_obras;
-- SELECT nome, categoria, array_length(servicos,1) AS qtd_servicos FROM dim_funcoes ORDER BY nome;
-- SELECT razao_social, tipo_servico FROM dim_fornecedores ORDER BY razao_social;
-- SELECT tipo, COUNT(*) FROM dim_equipamentos GROUP BY tipo;
-- SELECT nome FROM dim_locais ORDER BY nome;
-- SELECT c.nome AS categoria, t.nome AS tipo FROM dim_tipos_ocorrencias t JOIN dim_categorias_ocorrencias c ON c.id = t.categoria_id;
