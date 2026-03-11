-- GPL INCORPORADORA — DIÁRIO DE OBRA DIGITAL
-- Migration inicial - Modelo Dimensional (dim_* / fato_*)
-- Para schema completo, execute schema_diario_obra_gpl.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE perfil_usuario AS ENUM ('admin', 'coordenador', 'operador_obra', 'leitura');
CREATE TYPE status_obra AS ENUM ('planejamento', 'em_andamento', 'paralisada', 'concluida', 'cancelada');

-- DIMENSÕES
CREATE TABLE dim_obras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  endereco TEXT, cidade TEXT, estado CHAR(2), cep TEXT,
  responsavel_tecnico TEXT, data_inicio DATE, data_prevista_fim DATE, data_real_fim DATE,
  status status_obra NOT NULL DEFAULT 'em_andamento',
  observacoes TEXT, ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dim_funcoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE, categoria TEXT, observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dim_fornecedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social TEXT NOT NULL, nome_fantasia TEXT, cnpj TEXT UNIQUE,
  responsavel TEXT, telefone TEXT, email TEXT, tipo_servico TEXT,
  contrato_numero TEXT, contrato_inicio DATE, contrato_fim DATE,
  observacoes TEXT, ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE tipo_equipamento AS ENUM ('proprio', 'locado');

CREATE TABLE dim_equipamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo tipo_equipamento NOT NULL, nome TEXT NOT NULL, identificacao TEXT,
  fabricante TEXT, modelo TEXT, obra_alocacao_id UUID REFERENCES dim_obras(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES dim_fornecedores(id) ON DELETE SET NULL,
  contrato_numero TEXT, locacao_inicio DATE, locacao_fim DATE, valor_locacao NUMERIC(12, 2),
  observacoes TEXT, ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_proprio_sem_fornecedor CHECK (tipo <> 'proprio' OR fornecedor_id IS NULL),
  CONSTRAINT chk_locado_com_fornecedor CHECK (tipo <> 'locado' OR fornecedor_id IS NOT NULL)
);

CREATE TABLE dim_perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, email TEXT NOT NULL,
  perfil perfil_usuario NOT NULL DEFAULT 'operador_obra',
  avatar_url TEXT, preferencia_tema TEXT NOT NULL DEFAULT 'claro' CHECK (preferencia_tema IN ('claro', 'escuro')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dim_usuario_obra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES dim_perfis(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES dim_obras(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, obra_id)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.dim_perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
