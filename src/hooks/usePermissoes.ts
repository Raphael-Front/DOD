import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PermissaoRow = {
  acao: string;
  acao_label: string;
  perfil: string;
  permitido: boolean;
  valor: string | null;
};

export type ModuloPermissaoExtras = {
  reabrir_diario?: boolean;
  exportar_uau?: boolean;
  debitar_folha?: boolean;
  alterar_parametros_folha?: boolean;
};

export type ModuloPermissaoRow = {
  grupo_id: string;
  modulo_id: string;
  ler: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
  extras: ModuloPermissaoExtras;
  dim_modulos: {
    slug: string;
    nome: string;
    tem_aprovar: boolean;
    permite_editar: boolean;
    permite_excluir: boolean;
    ordem: number;
  };
};

export type PermissaoTipo = "ler" | "editar" | "excluir" | "aprovar";

async function fetchPermissoes(): Promise<PermissaoRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_permissoes")
    .select("acao, acao_label, perfil, permitido, valor")
    .order("acao")
    .order("perfil");
  if (error) throw error;
  return data ?? [];
}

async function fetchPermissoesPorModulo(perfil: string): Promise<ModuloPermissaoRow[]> {
  const supabase = createClient();
  const { data: grupo, error: e1 } = await supabase
    .from("dim_grupos")
    .select("id")
    .eq("slug", perfil)
    .maybeSingle();
  if (e1) throw e1;
  if (!grupo) return [];

  const { data, error } = await supabase
    .from("dim_grupo_permissao")
    .select(
      `
      grupo_id,
      modulo_id,
      ler,
      editar,
      excluir,
      aprovar,
      extras,
      dim_modulos (
        slug,
        nome,
        tem_aprovar,
        permite_editar,
        permite_excluir,
        ordem
      )
    `
    )
    .eq("grupo_id", grupo.id);

  if (error) throw error;
  const rows = (data ?? []) as unknown as ModuloPermissaoRow[];
  return rows.sort(
    (a, b) => (a.dim_modulos?.ordem ?? 0) - (b.dim_modulos?.ordem ?? 0)
  );
}

export function usePermissoes() {
  const { profile, status } = useAuth();
  const perfil = profile?.perfil ?? "leitura";

  const { data: permissoes = [], isLoading: loadingLegacy } = useQuery({
    queryKey: ["dim_permissoes"],
    queryFn: fetchPermissoes,
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  const { data: permissoesModulo = [], isLoading: loadingModulo } = useQuery({
    queryKey: ["dim_grupo_permissao", perfil],
    queryFn: () => fetchPermissoesPorModulo(perfil),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  function temPermissao(acao: string): boolean {
    const row = permissoes.find((p) => p.acao === acao && p.perfil === perfil);
    return row?.permitido ?? false;
  }

  function getValor(acao: string): string | null {
    const row = permissoes.find((p) => p.acao === acao && p.perfil === perfil);
    return row?.valor ?? null;
  }

  function temPermissaoModulo(moduloSlug: string, tipo: PermissaoTipo): boolean {
    const row = permissoesModulo.find((r) => r.dim_modulos?.slug === moduloSlug);
    if (!row) return false;
    switch (tipo) {
      case "ler":
        return row.ler;
      case "editar":
        return row.editar;
      case "excluir":
        return row.excluir;
      case "aprovar":
        return row.aprovar;
      default:
        return false;
    }
  }

  function getExtrasModulo(moduloSlug: string): ModuloPermissaoExtras {
    const row = permissoesModulo.find((r) => r.dim_modulos?.slug === moduloSlug);
    const ex = row?.extras;
    if (!ex || typeof ex !== "object") return {};
    return ex as ModuloPermissaoExtras;
  }

  function temExtraModulo(
    moduloSlug: string,
    chave: keyof ModuloPermissaoExtras
  ): boolean {
    const v = getExtrasModulo(moduloSlug)[chave];
    return Boolean(v);
  }

  return {
    permissoes,
    permissoesModulo,
    temPermissao,
    getValor,
    temPermissaoModulo,
    getExtrasModulo,
    temExtraModulo,
    isLoading: loadingLegacy || loadingModulo,
  };
}
