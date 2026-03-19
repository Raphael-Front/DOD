-- =============================================================================
-- MIGRAÇÃO: Módulo Folha de Pagamento
-- Data: 2026-03-18
-- Novas tabelas: d_colaboradores, d_servicos, d_configuracoes_folha,
--                f_folhas, f_folha_lancamentos, f_producao_lancamentos,
--                f_folha_audit_log
-- Nenhuma tabela existente é modificada ou removida.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DIMENSÃO: Serviços
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS d_servicos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL UNIQUE,
  unidade         TEXT NOT NULL,
  valor_referencia NUMERIC(12,2) NOT NULL,
  categoria       TEXT NOT NULL CHECK (categoria IN ('produtivo','apoio','retrabalho')),
  descricao       TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- DIMENSÃO: Colaboradores (para Folha de Pagamento)
-- Tabela separada de dim_colaboradores — não substitui, coexiste.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS d_colaboradores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                TEXT,
  nome                  TEXT NOT NULL,
  matricula             TEXT NOT NULL UNIQUE,
  codigo_legado         TEXT,
  obra_id               UUID NOT NULL REFERENCES dim_obras(id),
  funcao_id             UUID NOT NULL REFERENCES dim_funcoes(id),
  num_dependentes       INTEGER DEFAULT 0,
  data_admissao         DATE NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('ativo','ferias','afastado','demitido')),
  adicional_insalubridade NUMERIC(12,2) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_d_colaboradores_obra ON d_colaboradores(obra_id);
CREATE INDEX IF NOT EXISTS idx_d_colaboradores_status ON d_colaboradores(status);

-- -----------------------------------------------------------------------------
-- DIMENSÃO: Parâmetros de cálculo da folha
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS d_configuracoes_folha (
  campo       TEXT PRIMARY KEY,
  parametro   NUMERIC(12,4) NOT NULL,
  descricao   TEXT,
  categoria   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

-- -----------------------------------------------------------------------------
-- FATO: Folhas (cabeçalho)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS f_folhas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id     UUID NOT NULL REFERENCES dim_obras(id),
  competencia DATE NOT NULL,  -- sempre dia 01 do mês
  tipo        TEXT NOT NULL CHECK (tipo IN ('tarefado','nao_tarefado')),
  status      TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada')),
  debitada    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(obra_id, competencia, tipo)
);

CREATE INDEX IF NOT EXISTS idx_f_folhas_obra ON f_folhas(obra_id);
CREATE INDEX IF NOT EXISTS idx_f_folhas_status ON f_folhas(status);

-- -----------------------------------------------------------------------------
-- FATO: Lançamentos da folha (uma linha por colaborador)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS f_folha_lancamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id        UUID NOT NULL REFERENCES f_folhas(id) ON DELETE CASCADE,
  colaborador_id  UUID NOT NULL REFERENCES d_colaboradores(id),
  servico_etapa   TEXT,
  hora_tarefa     NUMERIC(12,2) DEFAULT 0,
  tarefa_mensal   NUMERIC(12,2) DEFAULT 0,
  he_50           NUMERIC(12,2) DEFAULT 0,
  he_100          NUMERIC(12,2) DEFAULT 0,
  faltas          NUMERIC(12,2) DEFAULT 0,
  gratificacao    NUMERIC(12,2) DEFAULT 0,
  adicional       NUMERIC(12,2) DEFAULT 0,
  inss            NUMERIC(12,2) DEFAULT 0,
  irrf            NUMERIC(12,2) DEFAULT 0,
  vt              NUMERIC(12,2) DEFAULT 0,
  refeicao        NUMERIC(12,2) DEFAULT 0,
  total_proventos NUMERIC(12,2) GENERATED ALWAYS AS (
    tarefa_mensal + he_50 + he_100 + gratificacao + adicional
  ) STORED,
  total_descontos NUMERIC(12,2) GENERATED ALWAYS AS (
    inss + irrf + vt + refeicao
  ) STORED,
  liquido         NUMERIC(12,2) GENERATED ALWAYS AS (
    (tarefa_mensal + he_50 + he_100 + gratificacao + adicional) - (inss + irrf + vt + refeicao)
  ) STORED,
  UNIQUE(folha_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_f_lancamentos_folha ON f_folha_lancamentos(folha_id);

-- -----------------------------------------------------------------------------
-- FATO: Produção por colaborador
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS f_producao_lancamentos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id            UUID NOT NULL REFERENCES f_folha_lancamentos(id) ON DELETE CASCADE,
  servico_id               UUID REFERENCES d_servicos(id),
  classificacao_apoio      TEXT,  -- quando não é serviço tarefado
  quantidade               NUMERIC(12,4) NOT NULL,
  percentual_participacao  NUMERIC(5,2),
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_f_producao_lancamento ON f_producao_lancamentos(lancamento_id);

-- -----------------------------------------------------------------------------
-- FATO: Audit log imutável
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS f_folha_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id    UUID REFERENCES f_folhas(id),
  acao        TEXT NOT NULL,
  usuario_id  UUID REFERENCES auth.users(id),
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para tornar imutável: permite apenas INSERT, bloqueia UPDATE e DELETE
ALTER TABLE f_folha_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_insert_only" ON f_folha_audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_log_select" ON f_folha_audit_log
  FOR SELECT USING (true);

-- Bloquear UPDATE e DELETE explicitamente (sem policy = negado por padrão com RLS ativo)

-- =============================================================================
-- SEEDS: Parâmetros de cálculo da folha (tabela 2024)
-- =============================================================================
INSERT INTO d_configuracoes_folha (campo, parametro, descricao, categoria) VALUES
  ('inss_faixa1_ate',          1412.00,   'Teto faixa 1 INSS',                   'INSS'),
  ('inss_faixa1_aliq',            7.50,   'Alíquota faixa 1 INSS (%)',            'INSS'),
  ('inss_faixa2_ate',          2666.68,   'Teto faixa 2 INSS',                   'INSS'),
  ('inss_faixa2_aliq',            9.00,   'Alíquota faixa 2 INSS (%)',            'INSS'),
  ('inss_faixa3_ate',          4000.03,   'Teto faixa 3 INSS',                   'INSS'),
  ('inss_faixa3_aliq',           12.00,   'Alíquota faixa 3 INSS (%)',            'INSS'),
  ('inss_faixa4_ate',          7786.02,   'Teto faixa 4 INSS',                   'INSS'),
  ('inss_faixa4_aliq',           14.00,   'Alíquota faixa 4 INSS (%)',            'INSS'),
  ('irrf_isento_ate',          2259.20,   'Teto isenção IRRF',                   'IRRF'),
  ('irrf_faixa1_ate',          2826.65,   'Teto faixa 1 IRRF',                   'IRRF'),
  ('irrf_faixa1_aliq',            7.50,   'Alíquota faixa 1 IRRF (%)',            'IRRF'),
  ('irrf_faixa1_deducao',       169.44,   'Dedução faixa 1 IRRF (R$)',            'IRRF'),
  ('irrf_faixa2_ate',          3751.05,   'Teto faixa 2 IRRF',                   'IRRF'),
  ('irrf_faixa2_aliq',           15.00,   'Alíquota faixa 2 IRRF (%)',            'IRRF'),
  ('irrf_faixa2_deducao',       381.44,   'Dedução faixa 2 IRRF (R$)',            'IRRF'),
  ('irrf_faixa3_ate',          4664.68,   'Teto faixa 3 IRRF',                   'IRRF'),
  ('irrf_faixa3_aliq',           22.50,   'Alíquota faixa 3 IRRF (%)',            'IRRF'),
  ('irrf_faixa3_deducao',       662.77,   'Dedução faixa 3 IRRF (R$)',            'IRRF'),
  ('irrf_faixa4_aliq',           27.50,   'Alíquota faixa 4 IRRF (acima faixa3)','IRRF'),
  ('irrf_faixa4_deducao',       896.00,   'Dedução faixa 4 IRRF (R$)',            'IRRF'),
  ('irrf_deducao_dependente',   189.59,   'Dedução por dependente IRRF (R$)',     'IRRF'),
  ('vt_teto',                   350.00,   'Teto desconto VT mensal (R$)',         'BENEFICIO'),
  ('refeicao_valor',            150.00,   'Desconto mensal refeição (R$)',        'BENEFICIO')
ON CONFLICT (campo) DO NOTHING;

-- =============================================================================
-- SEEDS: Permissões para novos perfis e novas ações
-- =============================================================================

-- Novas ações para o módulo Folha de Pagamento
-- Formato: (acao, perfil, permitido, valor, acao_label)

-- rota_folha: visibilidade do item na sidebar
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('rota_folha', 'admin',       true,  null, 'Acesso ao módulo Folha de Pagamento'),
  ('rota_folha', 'coordenador', true,  null, 'Acesso ao módulo Folha de Pagamento'),
  ('rota_folha', 'dp',          true,  null, 'Acesso ao módulo Folha de Pagamento'),
  ('rota_folha', 'engenheiro',  true,  null, 'Acesso ao módulo Folha de Pagamento'),
  ('rota_folha', 'leitura',     true,  null, 'Acesso ao módulo Folha de Pagamento'),
  ('rota_folha', 'operador',    false, null, 'Acesso ao módulo Folha de Pagamento')
ON CONFLICT (acao, perfil) DO NOTHING;

-- lancar_folha: editar campos do grid
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('lancar_folha', 'admin',       true,  null, 'Lançar/editar folha de pagamento'),
  ('lancar_folha', 'coordenador', true,  null, 'Lançar/editar folha de pagamento'),
  ('lancar_folha', 'dp',          true,  null, 'Lançar/editar folha de pagamento'),
  ('lancar_folha', 'engenheiro',  true,  null, 'Lançar/editar folha de pagamento'),
  ('lancar_folha', 'leitura',     false, null, 'Lançar/editar folha de pagamento'),
  ('lancar_folha', 'operador',    false, null, 'Lançar/editar folha de pagamento')
ON CONFLICT (acao, perfil) DO NOTHING;

-- fechar_folha: fechar e reabrir
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('fechar_folha', 'admin',       true,  null, 'Fechar/reabrir folha de pagamento'),
  ('fechar_folha', 'coordenador', true,  null, 'Fechar/reabrir folha de pagamento'),
  ('fechar_folha', 'dp',          true,  null, 'Fechar/reabrir folha de pagamento'),
  ('fechar_folha', 'engenheiro',  false, null, 'Fechar/reabrir folha de pagamento'),
  ('fechar_folha', 'leitura',     false, null, 'Fechar/reabrir folha de pagamento'),
  ('fechar_folha', 'operador',    false, null, 'Fechar/reabrir folha de pagamento')
ON CONFLICT (acao, perfil) DO NOTHING;

-- exportar_uau: exportação do arquivo UAU!
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('exportar_uau', 'admin',       true,  null, 'Exportar arquivo UAU!'),
  ('exportar_uau', 'coordenador', true,  null, 'Exportar arquivo UAU!'),
  ('exportar_uau', 'dp',          true,  null, 'Exportar arquivo UAU!'),
  ('exportar_uau', 'engenheiro',  false, null, 'Exportar arquivo UAU!'),
  ('exportar_uau', 'leitura',     false, null, 'Exportar arquivo UAU!'),
  ('exportar_uau', 'operador',    false, null, 'Exportar arquivo UAU!')
ON CONFLICT (acao, perfil) DO NOTHING;

-- debitar_folha: debitar em despesas
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('debitar_folha', 'admin',       true,  null, 'Debitar folha em despesas'),
  ('debitar_folha', 'coordenador', false, null, 'Debitar folha em despesas'),
  ('debitar_folha', 'dp',          true,  null, 'Debitar folha em despesas'),
  ('debitar_folha', 'engenheiro',  false, null, 'Debitar folha em despesas'),
  ('debitar_folha', 'leitura',     false, null, 'Debitar folha em despesas'),
  ('debitar_folha', 'operador',    false, null, 'Debitar folha em despesas')
ON CONFLICT (acao, perfil) DO NOTHING;

-- alterar_parametros_folha: alterar faixas INSS/IRRF/benefícios
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('alterar_parametros_folha', 'admin',       true,  null, 'Alterar parâmetros de cálculo da folha'),
  ('alterar_parametros_folha', 'coordenador', false, null, 'Alterar parâmetros de cálculo da folha'),
  ('alterar_parametros_folha', 'dp',          false, null, 'Alterar parâmetros de cálculo da folha'),
  ('alterar_parametros_folha', 'engenheiro',  false, null, 'Alterar parâmetros de cálculo da folha'),
  ('alterar_parametros_folha', 'leitura',     false, null, 'Alterar parâmetros de cálculo da folha'),
  ('alterar_parametros_folha', 'operador',    false, null, 'Alterar parâmetros de cálculo da folha')
ON CONFLICT (acao, perfil) DO NOTHING;

-- Replicar permissões existentes para os novos perfis coordenador e dp
-- rota_dashboard
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('rota_dashboard', 'coordenador', true, null, 'Acesso ao Dashboard'),
  ('rota_dashboard', 'dp',          true, null, 'Acesso ao Dashboard')
ON CONFLICT (acao, perfil) DO NOTHING;

-- rota_relatorios
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('rota_relatorios', 'coordenador', true,  null, 'Acesso a Relatórios'),
  ('rota_relatorios', 'dp',          false, null, 'Acesso a Relatórios')
ON CONFLICT (acao, perfil) DO NOTHING;

-- rota_cadastros
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('rota_cadastros', 'coordenador', true,  null, 'Acesso a Cadastros'),
  ('rota_cadastros', 'dp',          false, null, 'Acesso a Cadastros')
ON CONFLICT (acao, perfil) DO NOTHING;

-- criar_diario
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('criar_diario', 'coordenador', true,  null, 'Criar Diário de Obra'),
  ('criar_diario', 'dp',          false, null, 'Criar Diário de Obra')
ON CONFLICT (acao, perfil) DO NOTHING;

-- aprovar_diario
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('aprovar_diario', 'coordenador', true,  null, 'Aprovar Diário de Obra'),
  ('aprovar_diario', 'dp',          false, null, 'Aprovar Diário de Obra')
ON CONFLICT (acao, perfil) DO NOTHING;

-- seletor_obras
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('seletor_obras', 'coordenador', true, null, 'Seletor de Obras'),
  ('seletor_obras', 'dp',          true, null, 'Seletor de Obras')
ON CONFLICT (acao, perfil) DO NOTHING;

-- dark_mode
INSERT INTO dim_permissoes (acao, perfil, permitido, valor, acao_label) VALUES
  ('dark_mode', 'coordenador', true, null, 'Dark Mode'),
  ('dark_mode', 'dp',          true, null, 'Dark Mode')
ON CONFLICT (acao, perfil) DO NOTHING;
