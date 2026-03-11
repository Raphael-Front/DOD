-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Schema PostgreSQL / Supabase — v1.0
-- Março 2026
-- ============================================================
-- MODELO DIMENSIONAL (Star Schema)
--
-- DIMENSÕES (dim_*): dados descritivos de referência
--   dim_obras          — Obras da GPL
--   dim_funcoes        — Funções/cargos (Pedreiro, Armador, etc.)
--   dim_fornecedores   — Empresas terceirizadas
--   dim_equipamentos   — Equipamentos próprios e locados
--   dim_perfis         — Usuários/perfis (extende auth.users)
--   dim_usuario_obra   — Bridge N:N usuário ↔ obra
--
-- FATOS (fato_*): eventos transacionais com medidas
--   fato_diarios              — Fato central do diário
--   fato_diarios_aprovacoes   — Transições de aprovação
--   fato_clima                — Condição climática do dia
--   fato_mao_obra_propria     — Medida: horas_trabalhadas
--   fato_mao_obra_terceirizada — Medida: quantidade
--   fato_equipamentos         — Medida: horas_uso
--   fato_servicos             — Medida: quantidade
--   fato_servico_locais       — Detalhe de locais
--   fato_visitas              — Visitas na obra
--   fato_ocorrencias          — Ocorrências
--   fato_anexos               — Fotos/arquivos
--   fato_auditoria            — Log de auditoria
-- ============================================================
-- Ordem de criação:
--   1. Extensions & ENUMs
--   2. DIMENSÕES (cadastros base)
--   3. FATOS (eventos e transações)
--   4. Tabelas auxiliares (bridge, auditoria)
--   5. Row Level Security (RLS)
--   6. Triggers & Functions
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1.1 REMOÇÃO DE TABELAS ANTIGAS (pré modelo dimensional)
-- Exclui tabelas substituídas por dim_* e fato_*
-- ============================================================

DROP TABLE IF EXISTS servico_locais CASCADE;
DROP TABLE IF EXISTS modulo_servicos CASCADE;
DROP TABLE IF EXISTS modulo_ocorrencias CASCADE;
DROP TABLE IF EXISTS modulo_visitas CASCADE;
DROP TABLE IF EXISTS modulo_equipamentos CASCADE;
DROP TABLE IF EXISTS modulo_mao_obra_terceirizada CASCADE;
DROP TABLE IF EXISTS modulo_mao_obra_propria CASCADE;
DROP TABLE IF EXISTS modulo_clima CASCADE;
DROP TABLE IF EXISTS diarios_aprovacoes CASCADE;
DROP TABLE IF EXISTS anexos CASCADE;
DROP TABLE IF EXISTS auditoria CASCADE;
DROP TABLE IF EXISTS diarios CASCADE;
DROP TABLE IF EXISTS usuarios_obras CASCADE;
DROP TABLE IF EXISTS equipamentos CASCADE;
DROP TABLE IF EXISTS fornecedores CASCADE;
DROP TABLE IF EXISTS funcoes CASCADE;
DROP TABLE IF EXISTS obras CASCADE;
DROP TABLE IF EXISTS perfis CASCADE;


-- ============================================================
-- 2. ENUMS (cria apenas se não existir — permite re-executar)
-- ============================================================

DO $$ BEGIN CREATE TYPE perfil_usuario AS ENUM ('admin','coordenador','operador_obra','leitura'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_obra AS ENUM ('planejamento','em_andamento','paralisada','concluida','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE condicao_clima AS ENUM ('ensolarado','parcialmente_nublado','nublado','garoa','chuva_leve','chuva_forte','tempestade'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_diario AS ENUM ('rascunho','aguardando_aprovacao','aprovado','devolvido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_equipamento AS ENUM ('operando','parado','em_manutencao'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_visita AS ENUM ('tecnica','diretoria','projetos','vistoria_qualidade','fiscalizacao','cliente','reuniao'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE severidade_ocorrencia AS ENUM ('baixa','media','alta'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_equipamento AS ENUM ('proprio','locado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE acao_auditoria AS ENUM ('criacao','edicao','envio_aprovacao','aprovacao','devolucao','reabertura','exclusao'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 3. DIMENSÕES (DIM_*)
-- Tabelas de referência com dados descritivos
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 dim_obras — Dimensão de Obras
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_obras (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT        NOT NULL,
  endereco          TEXT,
  cidade            TEXT,
  estado            CHAR(2),
  cep               TEXT,
  responsavel_tecnico TEXT,
  data_inicio       DATE,
  data_prevista_fim DATE,
  data_real_fim     DATE,
  status            status_obra NOT NULL DEFAULT 'em_andamento',
  observacoes       TEXT,
  ativo             BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dim_obras IS 'DIMENSÃO: Cadastro central das obras da GPL Incorporadora';


-- ------------------------------------------------------------
-- 3.2 dim_funcoes — Dimensão de Funções/Cargos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_funcoes (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT    NOT NULL UNIQUE,
  categoria     TEXT,
  observacoes   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dim_funcoes IS 'DIMENSÃO: Funções/cargos utilizados em obra (Pedreiro, Armador, etc.)';


-- ------------------------------------------------------------
-- 3.3 dim_fornecedores — Dimensão de Fornecedores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_fornecedores (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social    TEXT    NOT NULL,
  nome_fantasia   TEXT,
  cnpj            TEXT    UNIQUE,
  responsavel     TEXT,
  telefone        TEXT,
  email           TEXT,
  tipo_servico    TEXT,
  contrato_numero TEXT,
  contrato_inicio DATE,
  contrato_fim    DATE,
  observacoes     TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dim_fornecedores IS 'DIMENSÃO: Empresas terceirizadas que prestam serviço nas obras';


-- ------------------------------------------------------------
-- 3.4 dim_equipamentos — Dimensão de Equipamentos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_equipamentos (
  id                  UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                tipo_equipamento  NOT NULL,
  nome                TEXT              NOT NULL,
  identificacao       TEXT,
  fabricante          TEXT,
  modelo              TEXT,
  obra_alocacao_id    UUID              REFERENCES dim_obras(id) ON DELETE SET NULL,
  fornecedor_id       UUID              REFERENCES dim_fornecedores(id) ON DELETE SET NULL,
  contrato_numero     TEXT,
  locacao_inicio      DATE,
  locacao_fim         DATE,
  valor_locacao       NUMERIC(12, 2),
  observacoes         TEXT,
  ativo               BOOLEAN           NOT NULL DEFAULT TRUE,
  criado_em           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_proprio_sem_fornecedor
    CHECK (tipo <> 'proprio' OR fornecedor_id IS NULL),
  CONSTRAINT chk_locado_com_fornecedor
    CHECK (tipo <> 'locado' OR fornecedor_id IS NOT NULL)
);

COMMENT ON TABLE dim_equipamentos IS 'DIMENSÃO: Equipamentos próprios (patrimônio) e locados';


-- ------------------------------------------------------------
-- 3.5 dim_perfis — Dimensão de Usuários/Perfis
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_perfis (
  id            UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT            NOT NULL,
  email         TEXT            NOT NULL,
  perfil        perfil_usuario  NOT NULL DEFAULT 'operador_obra',
  avatar_url    TEXT,
  preferencia_tema TEXT         NOT NULL DEFAULT 'claro' CHECK (preferencia_tema IN ('claro', 'escuro')),
  ativo         BOOLEAN         NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dim_perfis IS 'DIMENSÃO: Usuários/Perfis (extende auth.users do Supabase)';


-- ------------------------------------------------------------
-- 3.6 dim_usuario_obra — Bridge/Ponte N:N (usuário ↔ obra)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_usuario_obra (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID        NOT NULL REFERENCES dim_perfis(id) ON DELETE CASCADE,
  obra_id    UUID        NOT NULL REFERENCES dim_obras(id) ON DELETE CASCADE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (usuario_id, obra_id)
);

COMMENT ON TABLE dim_usuario_obra IS 'DIMENSÃO: Vínculo N:N entre usuários e obras — define escopo de acesso';


-- ============================================================
-- 4. FATOS (FATO_*)
-- Tabelas transacionais com eventos e medidas
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 fato_diarios — Fato principal do Diário de Obra
-- Medidas: status, retroativo | Dimensões: obra, data, criado_por
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_diarios (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id             UUID          NOT NULL REFERENCES dim_obras(id) ON DELETE RESTRICT,
  data_diario         DATE          NOT NULL,
  status              status_diario NOT NULL DEFAULT 'rascunho',
  retroativo          BOOLEAN       NOT NULL DEFAULT FALSE,
  justificativa_retro TEXT          CHECK (
    retroativo = FALSE OR (retroativo = TRUE AND char_length(justificativa_retro) >= 20)
  ),
  observacoes_gerais  TEXT,
  criado_por          UUID          NOT NULL REFERENCES dim_perfis(id),
  criado_em           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (obra_id, data_diario)
);

COMMENT ON TABLE fato_diarios IS 'FATO: Registro oficial do dia de obra — fato central do produto';


-- ------------------------------------------------------------
-- 4.2 fato_diarios_aprovacoes — Fato de transições de aprovação
-- Medidas: status_de, status_para | Dimensões: diario, usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_diarios_aprovacoes (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id   UUID          NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  status_de   status_diario NOT NULL,
  status_para status_diario NOT NULL,
  usuario_id  UUID          NOT NULL REFERENCES dim_perfis(id),
  comentario  TEXT,
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_diarios_aprovacoes IS 'FATO: Histórico imutável das transições de status do diário';


-- ------------------------------------------------------------
-- 4.3 fato_clima — Fato de condição climática do dia
-- Medidas: impactou_obra | Dimensões: diario, condicao
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_clima (
  id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id       UUID              NOT NULL UNIQUE REFERENCES fato_diarios(id) ON DELETE CASCADE,
  condicao        condicao_clima    NOT NULL,
  impactou_obra   BOOLEAN           NOT NULL DEFAULT FALSE,
  observacao      TEXT              CHECK (
    impactou_obra = FALSE OR (impactou_obra = TRUE AND observacao IS NOT NULL)
  ),
  criado_em       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_clima IS 'FATO: Condição climática do dia — um registro por diário';


-- ------------------------------------------------------------
-- 4.4 fato_mao_obra_propria — Fato de mão de obra própria
-- Medidas: horas_trabalhadas | Dimensões: diario, funcao
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_mao_obra_propria (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id     UUID        NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  nome_colaborador TEXT     NOT NULL,
  matricula     TEXT,
  funcao_id     UUID        NOT NULL REFERENCES dim_funcoes(id),
  horas_trabalhadas NUMERIC(4,2),
  origem_dado   TEXT        NOT NULL DEFAULT 'manual'
                            CHECK (origem_dado IN ('ponto', 'planilha', 'manual')),
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_mao_obra_propria IS 'FATO: Funcionários próprios presentes na obra no dia';


-- ------------------------------------------------------------
-- 4.5 fato_mao_obra_terceirizada — Fato de mão de obra terceirizada
-- Medidas: quantidade | Dimensões: diario, fornecedor, funcao
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_mao_obra_terceirizada (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id     UUID        NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  fornecedor_id UUID        NOT NULL REFERENCES dim_fornecedores(id),
  funcao_id     UUID        NOT NULL REFERENCES dim_funcoes(id),
  quantidade    INTEGER     NOT NULL CHECK (quantidade > 0),
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_mao_obra_terceirizada IS 'FATO: Mão de obra terceirizada — medida: quantidade por fornecedor/função';


-- ------------------------------------------------------------
-- 4.6 fato_equipamentos — Fato de uso de equipamentos no dia
-- Medidas: horas_uso | Dimensões: diario, equipamento
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_equipamentos (
  id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id       UUID                NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  equipamento_id  UUID                NOT NULL REFERENCES dim_equipamentos(id),
  status          status_equipamento  NOT NULL,
  motivo_parada   TEXT                CHECK (
    status <> 'parado' OR (status = 'parado' AND motivo_parada IS NOT NULL)
  ),
  horas_uso       NUMERIC(5, 2),
  observacao      TEXT,
  criado_em       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_equipamentos IS 'FATO: Equipamentos utilizados no dia — medida: horas_uso';


-- ------------------------------------------------------------
-- 4.7 fato_servicos — Fato de serviços executados
-- Medidas: quantidade | Dimensões: diario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_servicos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id   UUID        NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  descricao   TEXT        NOT NULL,
  quantidade  NUMERIC(10, 3),
  unidade     TEXT,
  fps_ref     TEXT,
  observacao  TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_servicos IS 'FATO: Serviços executados no dia — medida: quantidade';


-- ------------------------------------------------------------
-- 4.8 fato_servico_locais — Detalhe de locais por serviço
-- Dimensões: servico (bloco, pavimento, area)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_servico_locais (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  servico_id  UUID    NOT NULL REFERENCES fato_servicos(id) ON DELETE CASCADE,
  bloco       TEXT,
  pavimento   TEXT,
  area        TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_servico_locais IS 'FATO: Locais estruturados por serviço (Bloco + Pavimento + Área)';


-- ------------------------------------------------------------
-- 4.9 fato_visitas — Fato de visitas na obra
-- Dimensões: diario, tipo_visita
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_visitas (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id       UUID        NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  tipo            tipo_visita NOT NULL,
  visitantes      TEXT        NOT NULL,
  empresa_origem  TEXT,
  horario_entrada TIME,
  horario_saida   TIME,
  pauta           TEXT,
  observacao      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_visitas IS 'FATO: Visitas recebidas na obra no dia';


-- ------------------------------------------------------------
-- 4.10 fato_ocorrencias — Fato de ocorrências
-- Medidas: severidade, impactou_obra | Dimensões: diario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_ocorrencias (
  id            UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id     UUID                    NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  tipo          TEXT                    NOT NULL,
  descricao     TEXT                    NOT NULL,
  severidade    severidade_ocorrencia   NOT NULL DEFAULT 'baixa',
  impactou_obra BOOLEAN                 NOT NULL DEFAULT FALSE,
  criado_em     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_ocorrencias IS 'FATO: Ocorrências que impactam a execução da obra';


-- ------------------------------------------------------------
-- 4.11 fato_anexos — Fato de anexos/fotos
-- Medidas: tamanho_bytes | Dimensões: diario, modulo, criado_por
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_anexos (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id   UUID    NOT NULL REFERENCES fato_diarios(id) ON DELETE CASCADE,
  modulo      TEXT    NOT NULL CHECK (modulo IN (
                'diario', 'servico', 'ocorrencia', 'equipamento', 'visita', 'clima'
              )),
  modulo_ref_id UUID,
  legenda     TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  tipo_arquivo TEXT   NOT NULL CHECK (tipo_arquivo IN ('imagem', 'pdf', 'documento')),
  tamanho_bytes BIGINT,
  criado_por  UUID    NOT NULL REFERENCES dim_perfis(id),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_anexos IS 'FATO: Fotos e arquivos vinculados ao diário e módulos';


-- ------------------------------------------------------------
-- 4.12 fato_auditoria — Fato de auditoria (log de ações)
-- Dimensões: tabela, registro_id, usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fato_auditoria (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabela      TEXT            NOT NULL,
  registro_id UUID            NOT NULL,
  acao        acao_auditoria  NOT NULL,
  usuario_id  UUID            REFERENCES dim_perfis(id) ON DELETE SET NULL,
  dados_antes JSONB,
  dados_depois JSONB,
  criado_em   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_auditoria IS 'FATO: Log de auditoria — registra ações sensíveis';


-- ============================================================
-- 5. ÍNDICES DE PERFORMANCE
-- ============================================================

-- Fatos — consultas por obra e data
CREATE INDEX IF NOT EXISTS idx_fato_diarios_obra_id   ON fato_diarios(obra_id);
CREATE INDEX IF NOT EXISTS idx_fato_diarios_data      ON fato_diarios(data_diario DESC);
CREATE INDEX IF NOT EXISTS idx_fato_diarios_status    ON fato_diarios(status);
CREATE INDEX IF NOT EXISTS idx_fato_diarios_obra_data ON fato_diarios(obra_id, data_diario DESC);
CREATE INDEX IF NOT EXISTS idx_fato_diarios_retroativo ON fato_diarios(retroativo) WHERE retroativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_fato_aprovacoes_diario ON fato_diarios_aprovacoes(diario_id);

CREATE INDEX IF NOT EXISTS idx_fato_mop_diario        ON fato_mao_obra_propria(diario_id);
CREATE INDEX IF NOT EXISTS idx_fato_mot_diario        ON fato_mao_obra_terceirizada(diario_id);
CREATE INDEX IF NOT EXISTS idx_fato_equip_diario      ON fato_equipamentos(diario_id);
CREATE INDEX IF NOT EXISTS idx_fato_serv_diario       ON fato_servicos(diario_id);
CREATE INDEX IF NOT EXISTS idx_fato_visitas_diario    ON fato_visitas(diario_id);
CREATE INDEX IF NOT EXISTS idx_fato_ocorr_diario      ON fato_ocorrencias(diario_id);
CREATE INDEX IF NOT EXISTS idx_fato_ocorr_severidade  ON fato_ocorrencias(severidade) WHERE severidade = 'alta';

CREATE INDEX IF NOT EXISTS idx_fato_serv_locais       ON fato_servico_locais(servico_id);

CREATE INDEX IF NOT EXISTS idx_dim_uo_usuario         ON dim_usuario_obra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_dim_uo_obra            ON dim_usuario_obra(obra_id);

CREATE INDEX IF NOT EXISTS idx_fato_anexos_diario     ON fato_anexos(diario_id);
CREATE INDEX IF NOT EXISTS idx_fato_anexos_modulo     ON fato_anexos(modulo, modulo_ref_id);

CREATE INDEX IF NOT EXISTS idx_fato_audit_registro    ON fato_auditoria(tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_fato_audit_usuario     ON fato_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fato_audit_criado      ON fato_auditoria(criado_em DESC);


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE dim_obras                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_funcoes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_fornecedores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_equipamentos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_perfis                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_usuario_obra             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_diarios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_diarios_aprovacoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_clima                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_mao_obra_propria        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_mao_obra_terceirizada   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_equipamentos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_servicos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_servico_locais           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_visitas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_ocorrencias             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_anexos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_auditoria               ENABLE ROW LEVEL SECURITY;

-- ── Helper functions para RLS ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_perfil()
RETURNS perfil_usuario
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT perfil FROM dim_perfis WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION usuario_tem_acesso_obra(p_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM dim_usuario_obra
    WHERE usuario_id = auth.uid() AND obra_id = p_obra_id
  )
  OR auth_perfil() IN ('admin', 'coordenador')
$$;

-- ── Políticas: dim_perfis ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "dim_perfis_select_proprio" ON dim_perfis;
CREATE POLICY "dim_perfis_select_proprio" ON dim_perfis
  FOR SELECT USING (id = auth.uid() OR auth_perfil() IN ('admin', 'coordenador'));

DROP POLICY IF EXISTS "dim_perfis_update_proprio" ON dim_perfis;
CREATE POLICY "dim_perfis_update_proprio" ON dim_perfis
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "dim_perfis_insert_admin" ON dim_perfis;
CREATE POLICY "dim_perfis_insert_admin" ON dim_perfis
  FOR INSERT WITH CHECK (auth_perfil() = 'admin');

-- ── Políticas: dim_obras ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "dim_obras_select" ON dim_obras;
CREATE POLICY "dim_obras_select" ON dim_obras
  FOR SELECT USING (
    auth_perfil() IN ('admin', 'coordenador')
    OR usuario_tem_acesso_obra(id)
  );

DROP POLICY IF EXISTS "dim_obras_insert_coord" ON dim_obras;
CREATE POLICY "dim_obras_insert_coord" ON dim_obras
  FOR INSERT WITH CHECK (auth_perfil() IN ('admin', 'coordenador'));

DROP POLICY IF EXISTS "dim_obras_update_coord" ON dim_obras;
CREATE POLICY "dim_obras_update_coord" ON dim_obras
  FOR UPDATE USING (auth_perfil() IN ('admin', 'coordenador'));

DROP POLICY IF EXISTS "dim_obras_delete_admin" ON dim_obras;
CREATE POLICY "dim_obras_delete_admin" ON dim_obras
  FOR DELETE USING (auth_perfil() = 'admin');

-- ── Políticas: dim_funcoes, dim_fornecedores, dim_equipamentos ─────────────────

DROP POLICY IF EXISTS "dim_funcoes_select_all" ON dim_funcoes;
CREATE POLICY "dim_funcoes_select_all" ON dim_funcoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dim_funcoes_write_coord" ON dim_funcoes;
CREATE POLICY "dim_funcoes_write_coord" ON dim_funcoes
  FOR ALL USING (auth_perfil() IN ('admin', 'coordenador'));

DROP POLICY IF EXISTS "dim_fornecedores_select_all" ON dim_fornecedores;
CREATE POLICY "dim_fornecedores_select_all" ON dim_fornecedores
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dim_fornecedores_write_coord" ON dim_fornecedores;
CREATE POLICY "dim_fornecedores_write_coord" ON dim_fornecedores
  FOR ALL USING (auth_perfil() IN ('admin', 'coordenador'));

DROP POLICY IF EXISTS "dim_equipamentos_select_all" ON dim_equipamentos;
CREATE POLICY "dim_equipamentos_select_all" ON dim_equipamentos
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dim_equipamentos_write_admin" ON dim_equipamentos;
CREATE POLICY "dim_equipamentos_write_admin" ON dim_equipamentos
  FOR ALL USING (auth_perfil() = 'admin');

-- ── Políticas: dim_usuario_obra ───────────────────────────────────────────────

DROP POLICY IF EXISTS "dim_uo_select_admin" ON dim_usuario_obra;
CREATE POLICY "dim_uo_select_admin" ON dim_usuario_obra
  FOR SELECT USING (
    auth_perfil() IN ('admin', 'coordenador')
    OR usuario_id = auth.uid()
  );

DROP POLICY IF EXISTS "dim_uo_write_admin" ON dim_usuario_obra;
CREATE POLICY "dim_uo_write_admin" ON dim_usuario_obra
  FOR ALL USING (auth_perfil() = 'admin');

-- ── Políticas: fato_diarios ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "fato_diarios_select" ON fato_diarios;
CREATE POLICY "fato_diarios_select" ON fato_diarios
  FOR SELECT USING (usuario_tem_acesso_obra(obra_id));

DROP POLICY IF EXISTS "fato_diarios_insert" ON fato_diarios;
CREATE POLICY "fato_diarios_insert" ON fato_diarios
  FOR INSERT WITH CHECK (
    usuario_tem_acesso_obra(obra_id)
    AND auth_perfil() IN ('admin', 'coordenador', 'operador_obra')
  );

DROP POLICY IF EXISTS "fato_diarios_update_rascunho" ON fato_diarios;
CREATE POLICY "fato_diarios_update_rascunho" ON fato_diarios
  FOR UPDATE USING (
    (criado_por = auth.uid() AND status = 'rascunho')
    OR (criado_por = auth.uid() AND status = 'devolvido')
    OR auth_perfil() IN ('admin', 'coordenador')
  );

DROP POLICY IF EXISTS "fato_diarios_delete_admin" ON fato_diarios;
CREATE POLICY "fato_diarios_delete_admin" ON fato_diarios
  FOR DELETE USING (auth_perfil() = 'admin');

-- ── Políticas: fatos que herdam acesso via fato_diarios ────────────────────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fato_clima',
    'fato_mao_obra_propria',
    'fato_mao_obra_terceirizada',
    'fato_equipamentos',
    'fato_servicos',
    'fato_visitas',
    'fato_ocorrencias',
    'fato_diarios_aprovacoes',
    'fato_anexos'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_select" ON %I FOR SELECT
       USING (EXISTS (
         SELECT 1 FROM fato_diarios d
         WHERE d.id = %I.diario_id
         AND usuario_tem_acesso_obra(d.obra_id)
       ))',
      t, t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS "%s_write" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_write" ON %I FOR ALL
       USING (EXISTS (
         SELECT 1 FROM fato_diarios d
         WHERE d.id = %I.diario_id
         AND usuario_tem_acesso_obra(d.obra_id)
         AND auth_perfil() IN (''admin'', ''coordenador'', ''operador_obra'')
       ))',
      t, t, t
    );
  END LOOP;
END$$;

DROP POLICY IF EXISTS "fato_servico_locais_select" ON fato_servico_locais;
CREATE POLICY "fato_servico_locais_select" ON fato_servico_locais
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fato_servicos ms
      JOIN fato_diarios d ON d.id = ms.diario_id
      WHERE ms.id = fato_servico_locais.servico_id
      AND usuario_tem_acesso_obra(d.obra_id)
    )
  );

DROP POLICY IF EXISTS "fato_servico_locais_write" ON fato_servico_locais;
CREATE POLICY "fato_servico_locais_write" ON fato_servico_locais
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fato_servicos ms
      JOIN fato_diarios d ON d.id = ms.diario_id
      WHERE ms.id = fato_servico_locais.servico_id
      AND usuario_tem_acesso_obra(d.obra_id)
      AND auth_perfil() IN ('admin', 'coordenador', 'operador_obra')
    )
  );

DROP POLICY IF EXISTS "fato_auditoria_select_admin" ON fato_auditoria;
CREATE POLICY "fato_auditoria_select_admin" ON fato_auditoria
  FOR SELECT USING (auth_perfil() IN ('admin', 'coordenador'));


-- ============================================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dim_obras_atualizado_em ON dim_obras;
CREATE TRIGGER trg_dim_obras_atualizado_em
  BEFORE UPDATE ON dim_obras FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_dim_funcoes_atualizado_em ON dim_funcoes;
CREATE TRIGGER trg_dim_funcoes_atualizado_em
  BEFORE UPDATE ON dim_funcoes FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_dim_fornecedores_atualizado_em ON dim_fornecedores;
CREATE TRIGGER trg_dim_fornecedores_atualizado_em
  BEFORE UPDATE ON dim_fornecedores FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_dim_equipamentos_atualizado_em ON dim_equipamentos;
CREATE TRIGGER trg_dim_equipamentos_atualizado_em
  BEFORE UPDATE ON dim_equipamentos FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_dim_perfis_atualizado_em ON dim_perfis;
CREATE TRIGGER trg_dim_perfis_atualizado_em
  BEFORE UPDATE ON dim_perfis FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_diarios_atualizado_em ON fato_diarios;
CREATE TRIGGER trg_fato_diarios_atualizado_em
  BEFORE UPDATE ON fato_diarios FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_clima_atualizado_em ON fato_clima;
CREATE TRIGGER trg_fato_clima_atualizado_em
  BEFORE UPDATE ON fato_clima FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_mop_atualizado_em ON fato_mao_obra_propria;
CREATE TRIGGER trg_fato_mop_atualizado_em
  BEFORE UPDATE ON fato_mao_obra_propria FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_mot_atualizado_em ON fato_mao_obra_terceirizada;
CREATE TRIGGER trg_fato_mot_atualizado_em
  BEFORE UPDATE ON fato_mao_obra_terceirizada FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_equip_atualizado_em ON fato_equipamentos;
CREATE TRIGGER trg_fato_equip_atualizado_em
  BEFORE UPDATE ON fato_equipamentos FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_serv_atualizado_em ON fato_servicos;
CREATE TRIGGER trg_fato_serv_atualizado_em
  BEFORE UPDATE ON fato_servicos FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_visitas_atualizado_em ON fato_visitas;
CREATE TRIGGER trg_fato_visitas_atualizado_em
  BEFORE UPDATE ON fato_visitas FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_fato_ocorr_atualizado_em ON fato_ocorrencias;
CREATE TRIGGER trg_fato_ocorr_atualizado_em
  BEFORE UPDATE ON fato_ocorrencias FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();


CREATE OR REPLACE FUNCTION registrar_transicao_diario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO fato_diarios_aprovacoes (diario_id, status_de, status_para, usuario_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fato_diario_transicao ON fato_diarios;
CREATE TRIGGER trg_fato_diario_transicao
  AFTER UPDATE OF status ON fato_diarios
  FOR EACH ROW EXECUTE FUNCTION registrar_transicao_diario();


CREATE OR REPLACE FUNCTION bloquear_edicao_diario_aprovado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'aprovado' AND auth_perfil() <> 'admin' THEN
    RAISE EXCEPTION 'Diário aprovado não pode ser editado. Solicite reabertura ao Admin.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_edicao_aprovado ON fato_diarios;
CREATE TRIGGER trg_bloquear_edicao_aprovado
  BEFORE UPDATE ON fato_diarios
  FOR EACH ROW EXECUTE FUNCTION bloquear_edicao_diario_aprovado();


CREATE OR REPLACE FUNCTION validar_devolucao_com_comentario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status_para = 'devolvido' AND (NEW.comentario IS NULL OR trim(NEW.comentario) = '') THEN
    RAISE EXCEPTION 'Devolução de diário exige comentário obrigatório.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_devolucao ON fato_diarios_aprovacoes;
CREATE TRIGGER trg_validar_devolucao
  BEFORE INSERT ON fato_diarios_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION validar_devolucao_com_comentario();


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dim_perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;  -- Perfil já existe (ex: re-criação)
END;
$$;

-- Remove triggers antigos (migration usa on_auth_user_created)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_new_user_perfil ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Views (compatibilidade e análise) ─────────────────────────────────────────

CREATE OR REPLACE VIEW v_efetivo_diario AS
SELECT
  d.id AS diario_id,
  d.obra_id,
  d.data_diario,
  COUNT(DISTINCT mop.id) AS total_proprio,
  COALESCE(SUM(mot.quantidade), 0) AS total_terceirizado,
  COUNT(DISTINCT mop.id) + COALESCE(SUM(mot.quantidade), 0) AS total_efetivo
FROM fato_diarios d
LEFT JOIN fato_mao_obra_propria mop ON mop.diario_id = d.id
LEFT JOIN fato_mao_obra_terceirizada mot ON mot.diario_id = d.id
GROUP BY d.id, d.obra_id, d.data_diario;

COMMENT ON VIEW v_efetivo_diario IS 'Totalização de efetivo: próprios + terceirizados por diário';


CREATE OR REPLACE VIEW v_diarios_pendentes AS
SELECT
  d.id,
  d.obra_id,
  o.nome AS obra_nome,
  d.data_diario,
  d.status,
  d.retroativo,
  d.criado_por,
  p.nome AS criado_por_nome,
  d.criado_em,
  NOW() - d.atualizado_em AS tempo_em_espera
FROM fato_diarios d
JOIN dim_obras o ON o.id = d.obra_id
JOIN dim_perfis p ON p.id = d.criado_por
WHERE d.status = 'aguardando_aprovacao'
ORDER BY d.atualizado_em ASC;

COMMENT ON VIEW v_diarios_pendentes IS 'Diários aguardando aprovação — ordenados por tempo de espera';


CREATE OR REPLACE VIEW v_ocorrencias_alta_severidade AS
SELECT
  mo.id,
  mo.diario_id,
  d.obra_id,
  o.nome AS obra_nome,
  d.data_diario,
  mo.tipo,
  mo.descricao,
  mo.impactou_obra,
  mo.criado_em
FROM fato_ocorrencias mo
JOIN fato_diarios d ON d.id = mo.diario_id
JOIN dim_obras o ON o.id = d.obra_id
WHERE mo.severidade = 'alta'
ORDER BY mo.criado_em DESC;

COMMENT ON VIEW v_ocorrencias_alta_severidade IS 'Ocorrências de alta severidade para dashboard';


-- ============================================================
-- FIM DO SCHEMA
-- GPL Incorporadora · Diário de Obra Digital · v1.0 · Março 2026
-- ============================================================
