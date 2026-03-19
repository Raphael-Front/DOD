-- ============================================================
-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migração: Módulos Equipe, Equipamentos, Serviços, Visitas, Ocorrências
-- Data: 13/03/2026
-- ============================================================

-- ============================================================
-- 1. NOVAS DIMENSÕES DE SUPORTE
-- ============================================================

-- ------------------------------------------------------------
-- dim_colaboradores — Colaboradores próprios cadastrados
-- ------------------------------------------------------------
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

COMMENT ON TABLE dim_colaboradores IS 'DIMENSÃO: Colaboradores próprios pré-cadastrados para uso nos diários';

-- ------------------------------------------------------------
-- dim_locais — Locais/Áreas da obra
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_locais (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT        NOT NULL,
  descricao     TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dim_locais IS 'DIMENSÃO: Locais e áreas da obra (Bloco A, Subsolo, Cobertura, etc.)';

-- ------------------------------------------------------------
-- dim_departamentos — Departamentos visitantes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_departamentos (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT        NOT NULL UNIQUE,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dim_departamentos IS 'DIMENSÃO: Departamentos que realizam visitas à obra';

-- ------------------------------------------------------------
-- dim_categorias_ocorrencias — Categorias de ocorrências
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_categorias_ocorrencias (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT        NOT NULL UNIQUE,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dim_categorias_ocorrencias IS 'DIMENSÃO: Categorias de ocorrências (Segurança, Qualidade, etc.)';

-- ------------------------------------------------------------
-- dim_tipos_ocorrencias — Tipos de ocorrências (subcategorias)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_tipos_ocorrencias (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id  UUID        NOT NULL REFERENCES dim_categorias_ocorrencias(id) ON DELETE CASCADE,
  nome          TEXT        NOT NULL,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (categoria_id, nome)
);

COMMENT ON TABLE dim_tipos_ocorrencias IS 'DIMENSÃO: Tipos de ocorrência vinculados à categoria (subcategorias)';


-- ============================================================
-- 2. COLUNAS ADICIONAIS EM TABELAS EXISTENTES
-- ============================================================

-- dim_funcoes: array de serviços associados à função
ALTER TABLE dim_funcoes
  ADD COLUMN IF NOT EXISTS servicos TEXT[] NOT NULL DEFAULT '{}';

-- fato_visitas: departamento e campos extras
ALTER TABLE fato_visitas
  ADD COLUMN IF NOT EXISTS departamento_id    UUID REFERENCES dim_departamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS departamento_outro TEXT;

-- fato_ocorrencias: categorias estruturadas
ALTER TABLE fato_ocorrencias
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES dim_categorias_ocorrencias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_id      UUID REFERENCES dim_tipos_ocorrencias(id) ON DELETE SET NULL;

-- fato_servicos: local de execução e função/serviço estruturado
ALTER TABLE fato_servicos
  ADD COLUMN IF NOT EXISTS local_id     UUID REFERENCES dim_locais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funcao_id    UUID REFERENCES dim_funcoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS servico_nome TEXT;


-- ============================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dim_colaboradores_funcao ON dim_colaboradores(funcao_id);
CREATE INDEX IF NOT EXISTS idx_dim_tipos_ocorrencias_categoria ON dim_tipos_ocorrencias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fato_visitas_departamento ON fato_visitas(departamento_id);
CREATE INDEX IF NOT EXISTS idx_fato_ocorrencias_categoria ON fato_ocorrencias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fato_ocorrencias_tipo ON fato_ocorrencias(tipo_id);
CREATE INDEX IF NOT EXISTS idx_fato_servicos_local ON fato_servicos(local_id);
CREATE INDEX IF NOT EXISTS idx_fato_servicos_funcao ON fato_servicos(funcao_id);


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- dim_colaboradores
ALTER TABLE dim_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaboradores_select_authenticated"
  ON dim_colaboradores FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "colaboradores_insert_coordenador_admin"
  ON dim_colaboradores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador', 'operador_obra')
    )
  );

CREATE POLICY "colaboradores_update_coordenador_admin"
  ON dim_colaboradores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador')
    )
  );

-- dim_locais
ALTER TABLE dim_locais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locais_select_authenticated"
  ON dim_locais FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "locais_insert_coordenador_admin"
  ON dim_locais FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador')
    )
  );

CREATE POLICY "locais_update_coordenador_admin"
  ON dim_locais FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador')
    )
  );

CREATE POLICY "locais_delete_admin"
  ON dim_locais FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil = 'admin'
    )
  );

-- dim_departamentos
ALTER TABLE dim_departamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departamentos_select_authenticated"
  ON dim_departamentos FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "departamentos_insert_coordenador_admin"
  ON dim_departamentos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador', 'operador_obra')
    )
  );

CREATE POLICY "departamentos_update_coordenador_admin"
  ON dim_departamentos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador')
    )
  );

CREATE POLICY "departamentos_delete_admin"
  ON dim_departamentos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil = 'admin'
    )
  );

-- dim_categorias_ocorrencias
ALTER TABLE dim_categorias_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_ocorrencias_select_authenticated"
  ON dim_categorias_ocorrencias FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "categorias_ocorrencias_write_admin"
  ON dim_categorias_ocorrencias FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador')
    )
  );

-- dim_tipos_ocorrencias
ALTER TABLE dim_tipos_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tipos_ocorrencias_select_authenticated"
  ON dim_tipos_ocorrencias FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "tipos_ocorrencias_write_admin"
  ON dim_tipos_ocorrencias FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dim_perfis
      WHERE id = auth.uid()
        AND perfil IN ('admin', 'coordenador')
    )
  );
