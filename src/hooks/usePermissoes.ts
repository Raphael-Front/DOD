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

export function usePermissoes() {
  const { profile, status } = useAuth();
  const perfil = profile?.perfil ?? "leitura";

  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ["dim_permissoes"],
    queryFn: fetchPermissoes,
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

  return { permissoes, temPermissao, getValor, isLoading };
}
