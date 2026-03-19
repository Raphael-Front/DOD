-- ============================================================
-- GPL — Grupos, módulos e matriz de permissões (ler/editar/excluir/aprovar)
-- Mantém dim_permissoes sincronizada para RLS e compatibilidade.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dim_grupos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  nome              TEXT NOT NULL,
  ordem             INTEGER NOT NULL DEFAULT 0,
  seletor_obras     TEXT NOT NULL DEFAULT 'Todas' CHECK (seletor_obras IN ('Todas', 'Vinculadas')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dim_modulos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  nome              TEXT NOT NULL,
  ordem             INTEGER NOT NULL DEFAULT 0,
  tem_aprovar       BOOLEAN NOT NULL DEFAULT FALSE,
  permite_editar    BOOLEAN NOT NULL DEFAULT TRUE,
  permite_excluir   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dim_grupo_permissao (
  grupo_id          UUID NOT NULL REFERENCES public.dim_grupos(id) ON DELETE CASCADE,
  modulo_id         UUID NOT NULL REFERENCES public.dim_modulos(id) ON DELETE CASCADE,
  ler               BOOLEAN NOT NULL DEFAULT FALSE,
  editar            BOOLEAN NOT NULL DEFAULT FALSE,
  excluir           BOOLEAN NOT NULL DEFAULT FALSE,
  aprovar           BOOLEAN NOT NULL DEFAULT FALSE,
  extras            JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (grupo_id, modulo_id)
);

COMMENT ON COLUMN public.dim_grupo_permissao.extras IS
  'Chaves opcionais: reabrir_diario, exportar_uau, debitar_folha, alterar_parametros_folha (boolean)';

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.dim_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_grupo_permissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dim_grupos_select_authenticated"
  ON public.dim_grupos FOR SELECT TO authenticated USING (true);

CREATE POLICY "dim_modulos_select_authenticated"
  ON public.dim_modulos FOR SELECT TO authenticated USING (true);

CREATE POLICY "dim_grupo_permissao_select_authenticated"
  ON public.dim_grupo_permissao FOR SELECT TO authenticated USING (true);

CREATE POLICY "dim_grupos_write_admin"
  ON public.dim_grupos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dim_perfis WHERE id = auth.uid() AND perfil::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dim_perfis WHERE id = auth.uid() AND perfil::text = 'admin'));

CREATE POLICY "dim_modulos_write_admin"
  ON public.dim_modulos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dim_perfis WHERE id = auth.uid() AND perfil::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dim_perfis WHERE id = auth.uid() AND perfil::text = 'admin'));

CREATE POLICY "dim_grupo_permissao_write_admin"
  ON public.dim_grupo_permissao FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dim_perfis WHERE id = auth.uid() AND perfil::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dim_perfis WHERE id = auth.uid() AND perfil::text = 'admin'));

-- ---------------------------------------------------------------------------
-- 3. Seeds — grupos (alinhados ao enum perfil_usuario atual)
-- ---------------------------------------------------------------------------
INSERT INTO public.dim_grupos (slug, nome, ordem, seletor_obras) VALUES
  ('admin',        'Administrador', 1, 'Todas'),
  ('engenheiro',   'Engenheiro',    2, 'Todas'),
  ('operador',     'Operador',      3, 'Vinculadas'),
  ('leitura',      'Leitura',       4, 'Todas')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Seeds — módulos
-- ---------------------------------------------------------------------------
INSERT INTO public.dim_modulos (slug, nome, ordem, tem_aprovar, permite_editar, permite_excluir) VALUES
  ('dashboard',         'Dashboard',            1, FALSE, FALSE, FALSE),
  ('diario_obra',       'Diário de Obra',       2, TRUE,  TRUE,  TRUE),
  ('folha_pagamento',   'Folha de Pagamento',   3, TRUE,  TRUE,  TRUE),
  ('relatorios',        'Relatórios',           4, FALSE, FALSE, FALSE),
  ('usuarios',          'Usuários',             5, FALSE, TRUE,  TRUE),
  ('controle_acesso',   'Controle de Acesso',   6, FALSE, TRUE,  FALSE),
  ('cadastros',         'Cadastros',            7, FALSE, TRUE,  TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Seeds — matriz (equivalente ao comportamento anterior de dim_permissoes)
-- ---------------------------------------------------------------------------
INSERT INTO public.dim_grupo_permissao (grupo_id, modulo_id, ler, editar, excluir, aprovar, extras)
SELECT g.id, m.id, v.ler, v.editar, v.excluir, v.aprovar, v.extras::jsonb
FROM (
  VALUES
  ('admin', 'dashboard',         TRUE,  FALSE, FALSE, FALSE, '{}'::text),
  ('admin', 'diario_obra',       TRUE,  TRUE,  TRUE,  TRUE,  '{"reabrir_diario": true}'),
  ('admin', 'folha_pagamento',   TRUE,  TRUE,  TRUE,  TRUE,  '{"exportar_uau": true, "debitar_folha": true, "alterar_parametros_folha": true}'),
  ('admin', 'relatorios',        TRUE,  FALSE, FALSE, FALSE, '{}'),
  ('admin', 'usuarios',          TRUE,  TRUE,  TRUE,  FALSE, '{}'),
  ('admin', 'controle_acesso',   TRUE,  TRUE,  FALSE, FALSE, '{}'),
  ('admin', 'cadastros',         TRUE,  TRUE,  TRUE,  FALSE, '{}'),
  ('engenheiro', 'dashboard',         TRUE,  FALSE, FALSE, FALSE, '{}'),
  ('engenheiro', 'diario_obra',       TRUE,  TRUE,  FALSE, TRUE,  '{"reabrir_diario": false}'),
  ('engenheiro', 'folha_pagamento',   TRUE,  TRUE,  FALSE, FALSE, '{"exportar_uau": false, "debitar_folha": false, "alterar_parametros_folha": false}'),
  ('engenheiro', 'relatorios',        TRUE,  FALSE, FALSE, FALSE, '{}'),
  ('engenheiro', 'usuarios',          FALSE, FALSE, FALSE, FALSE, '{}'),
  ('engenheiro', 'controle_acesso',   FALSE, FALSE, FALSE, FALSE, '{}'),
  ('engenheiro', 'cadastros',         TRUE,  TRUE,  FALSE, FALSE, '{}'),
  ('operador', 'dashboard',         TRUE,  FALSE, FALSE, FALSE, '{}'),
  ('operador', 'diario_obra',       TRUE,  TRUE,  FALSE, FALSE, '{"reabrir_diario": false}'),
  ('operador', 'folha_pagamento',   FALSE, FALSE, FALSE, FALSE, '{"exportar_uau": false, "debitar_folha": false, "alterar_parametros_folha": false}'),
  ('operador', 'relatorios',        FALSE, FALSE, FALSE, FALSE, '{}'),
  ('operador', 'usuarios',          FALSE, FALSE, FALSE, FALSE, '{}'),
  ('operador', 'controle_acesso',   FALSE, FALSE, FALSE, FALSE, '{}'),
  ('operador', 'cadastros',         FALSE, FALSE, FALSE, FALSE, '{}'),
  ('leitura', 'dashboard',         TRUE,  FALSE, FALSE, FALSE, '{}'),
  ('leitura', 'diario_obra',       TRUE,  FALSE, FALSE, FALSE, '{"reabrir_diario": false}'),
  ('leitura', 'folha_pagamento',   TRUE,  FALSE, FALSE, FALSE, '{"exportar_uau": false, "debitar_folha": false, "alterar_parametros_folha": false}'),
  ('leitura', 'relatorios',        TRUE,  FALSE, FALSE, FALSE, '{}'),
  ('leitura', 'usuarios',          FALSE, FALSE, FALSE, FALSE, '{}'),
  ('leitura', 'controle_acesso',   FALSE, FALSE, FALSE, FALSE, '{}'),
  ('leitura', 'cadastros',         FALSE, FALSE, FALSE, FALSE, '{}')
) AS v(grupo_slug, modulo_slug, ler, editar, excluir, aprovar, extras)
JOIN public.dim_grupos g ON g.slug = v.grupo_slug
JOIN public.dim_modulos m ON m.slug = v.modulo_slug
ON CONFLICT (grupo_id, modulo_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Sincronizar dim_permissoes a partir da matriz + extras
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_dim_permissoes_from_grupos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  perm RECORD;
  v_perfil TEXT;
  v_seletor TEXT;
BEGIN
  DELETE FROM public.dim_permissoes
  WHERE perfil IN (SELECT slug FROM public.dim_grupos);

  FOR g IN SELECT id, slug, seletor_obras FROM public.dim_grupos LOOP
    v_perfil := g.slug;
    v_seletor := g.seletor_obras;

    FOR perm IN
      SELECT m.slug AS mod_slug, gpm.ler, gpm.editar, gpm.excluir, gpm.aprovar, gpm.extras
      FROM public.dim_grupo_permissao gpm
      JOIN public.dim_modulos m ON m.id = gpm.modulo_id
      WHERE gpm.grupo_id = g.id
    LOOP
      IF perm.mod_slug = 'dashboard' THEN
        INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor)
        VALUES ('rota_dashboard', '/dashboard', v_perfil, perm.ler, NULL)
        ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, acao_label = EXCLUDED.acao_label;
      END IF;

      IF perm.mod_slug = 'diario_obra' THEN
        INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor) VALUES
          ('criar_diario', 'Criar diário', v_perfil, perm.editar, NULL),
          ('aprovar_diario', 'Aprovar diário', v_perfil, perm.aprovar, NULL),
          ('excluir_diario', 'Excluir diário', v_perfil, perm.excluir, NULL),
          ('reabrir_diario', 'Reabrir diário', v_perfil, COALESCE((perm.extras->>'reabrir_diario')::boolean, false), NULL)
        ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, acao_label = EXCLUDED.acao_label;
      END IF;

      IF perm.mod_slug = 'folha_pagamento' THEN
        INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor) VALUES
          ('rota_folha', 'Acesso ao módulo Folha de Pagamento', v_perfil, perm.ler, NULL),
          ('lancar_folha', 'Lançar/editar folha de pagamento', v_perfil, perm.editar, NULL),
          ('fechar_folha', 'Fechar/reabrir folha de pagamento', v_perfil, perm.aprovar, NULL),
          ('exportar_uau', 'Exportar arquivo UAU!', v_perfil, COALESCE((perm.extras->>'exportar_uau')::boolean, false), NULL),
          ('debitar_folha', 'Debitar folha em despesas', v_perfil, COALESCE((perm.extras->>'debitar_folha')::boolean, false), NULL),
          ('alterar_parametros_folha', 'Alterar parâmetros de cálculo da folha', v_perfil, COALESCE((perm.extras->>'alterar_parametros_folha')::boolean, false), NULL)
        ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, acao_label = EXCLUDED.acao_label;
      END IF;

      IF perm.mod_slug = 'relatorios' THEN
        INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor)
        VALUES ('rota_relatorios', '/relatorios', v_perfil, perm.ler, NULL)
        ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, acao_label = EXCLUDED.acao_label;
      END IF;

      IF perm.mod_slug = 'usuarios' THEN
        INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor)
        VALUES ('rota_usuarios', '/usuarios', v_perfil, perm.ler, NULL)
        ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, acao_label = EXCLUDED.acao_label;
      END IF;

      IF perm.mod_slug = 'controle_acesso' THEN
        INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor)
        VALUES ('rota_controle_acesso', 'Controle de Acesso', v_perfil, perm.ler, NULL)
        ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, acao_label = EXCLUDED.acao_label;
      END IF;

      IF perm.mod_slug = 'cadastros' THEN
        INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor)
        VALUES ('rota_cadastros', '/cadastros', v_perfil, perm.ler, NULL)
        ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, acao_label = EXCLUDED.acao_label;
      END IF;
    END LOOP;

    INSERT INTO public.dim_permissoes (acao, acao_label, perfil, permitido, valor) VALUES
      ('seletor_obras', 'Seletor de obras', v_perfil, true, v_seletor),
      ('dark_mode', 'Dark mode toggle', v_perfil, true, NULL)
    ON CONFLICT (acao, perfil) DO UPDATE SET permitido = EXCLUDED.permitido, valor = EXCLUDED.valor, acao_label = EXCLUDED.acao_label;
  END LOOP;
END;
$$;

-- Disparo após alteração na matriz
CREATE OR REPLACE FUNCTION public.trg_sync_dim_permissoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_dim_permissoes_from_grupos();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_dim_grupo_permissao_sync ON public.dim_grupo_permissao;
CREATE TRIGGER trg_dim_grupo_permissao_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.dim_grupo_permissao
  FOR EACH STATEMENT EXECUTE PROCEDURE public.trg_sync_dim_permissoes();

DROP TRIGGER IF EXISTS trg_dim_grupos_sync ON public.dim_grupos;
CREATE TRIGGER trg_dim_grupos_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.dim_grupos
  FOR EACH STATEMENT EXECUTE PROCEDURE public.trg_sync_dim_permissoes();

-- Primeira sincronização (seed já inseriu dim_grupo_permissao antes dos triggers)
SELECT public.sync_dim_permissoes_from_grupos();

-- ---------------------------------------------------------------------------
-- 7. usuario_obras_acessiveis — lê seletor de dim_grupos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usuario_obras_acessiveis()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_seletor TEXT;
BEGIN
  SELECT g.slug, g.seletor_obras
  INTO v_slug, v_seletor
  FROM public.dim_perfis p
  JOIN public.dim_grupos g ON g.slug = p.perfil::text
  WHERE p.id = auth.uid();

  IF v_seletor IS NULL THEN
    SELECT seletor_obras INTO v_seletor FROM public.dim_grupos WHERE slug = 'leitura';
  END IF;

  IF v_seletor = 'Todas' THEN
    RETURN QUERY SELECT id FROM public.dim_obras;
  ELSE
    RETURN QUERY
      SELECT obra_id FROM public.dim_usuario_obra
      WHERE usuario_id = auth.uid();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. tem_permissao — continua usando dim_permissoes (atualizada pelo sync)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tem_permissao(p_acao TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT permitido
     FROM public.dim_permissoes
     WHERE acao = p_acao
       AND perfil = (SELECT auth_perfil()::text)
     LIMIT 1),
    false
  );
$$;
