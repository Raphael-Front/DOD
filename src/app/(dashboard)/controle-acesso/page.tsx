"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Check,
  Search,
  Save,
  Loader2,
  Pencil,
  X,
  SlidersHorizontal,
  AlertTriangle,
  Eye,
  PencilLine,
  Trash2,
  BadgeCheck,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { toast } from "sonner";
import { clsx } from "clsx";
import { usePermissoes, type ModuloPermissaoExtras } from "@/hooks/usePermissoes";

const PERFIS: Record<string, string> = {
  admin: "Administrador",
  engenheiro: "Engenheiro",
  operador: "Operador",
  leitura: "Leitura",
};

const PERFIL_BADGE_VARIANT: Record<string, "red" | "blue" | "green" | "gray"> = {
  admin: "red",
  engenheiro: "blue",
  operador: "green",
  leitura: "gray",
};

type GrupoRow = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  seletor_obras: string;
};

type ModuloRow = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  tem_aprovar: boolean;
  permite_editar: boolean;
  permite_excluir: boolean;
};

type PermCell = {
  ler: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
  extras: ModuloPermissaoExtras;
};

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
};

function emptyExtras(): ModuloPermissaoExtras {
  return {};
}

async function fetchMatrizData(): Promise<{
  grupos: GrupoRow[];
  modulos: ModuloRow[];
  cells: Map<string, PermCell>;
}> {
  const supabase = createClient();
  const [{ data: grupos, error: e1 }, { data: modulos, error: e2 }, { data: raw, error: e3 }] =
    await Promise.all([
      supabase.from("dim_grupos").select("id, slug, nome, ordem, seletor_obras").order("ordem"),
      supabase.from("dim_modulos").select("id, slug, nome, ordem, tem_aprovar, permite_editar, permite_excluir").order("ordem"),
      supabase.from("dim_grupo_permissao").select("grupo_id, modulo_id, ler, editar, excluir, aprovar, extras"),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  const cells = new Map<string, PermCell>();
  for (const row of raw ?? []) {
    const ex = (row.extras && typeof row.extras === "object" ? row.extras : {}) as ModuloPermissaoExtras;
    cells.set(`${row.grupo_id}:${row.modulo_id}`, {
      ler: row.ler,
      editar: row.editar,
      excluir: row.excluir,
      aprovar: row.aprovar,
      extras: { ...emptyExtras(), ...ex },
    });
  }
  return {
    grupos: (grupos ?? []) as GrupoRow[],
    modulos: (modulos ?? []) as ModuloRow[],
    cells,
  };
}

async function fetchUsuarios(): Promise<Usuario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_perfis")
    .select("id, nome, email, perfil")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function IconToggle({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={clsx(
        "w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0",
        disabled && "opacity-40 cursor-not-allowed",
        !disabled && active && "bg-[var(--color-success,#22c55e)]/20 text-[var(--color-success,#22c55e)]",
        !disabled && !active && "bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--border-light)]"
      )}
    >
      {children}
    </button>
  );
}

export default function ControleAcessoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { temPermissaoModulo, isLoading: loadingPermHook } = usePermissoes();

  useEffect(() => {
    if (!loadingPermHook && !temPermissaoModulo("controle_acesso", "ler")) {
      router.replace("/dashboard");
    }
  }, [loadingPermHook, temPermissaoModulo, router]);

  const [busca, setBusca] = useState("");
  const [perfilEditado, setPerfilEditado] = useState<Record<string, string>>({});
  const [editandoMatriz, setEditandoMatriz] = useState(false);
  const [matrizEditada, setMatrizEditada] = useState<Map<string, PermCell>>(new Map());

  const { data: matrizData, isLoading: loadingMatriz } = useQuery({
    queryKey: ["controle-acesso-matriz"],
    queryFn: fetchMatrizData,
    enabled: temPermissaoModulo("controle_acesso", "ler"),
  });

  const grupos = matrizData?.grupos ?? [];
  const modulos = matrizData?.modulos ?? [];

  const cellsAtual = matrizData?.cells ?? new Map();

  const { data: usuarios = [], isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ["controle-acesso-usuarios"],
    queryFn: fetchUsuarios,
    enabled: temPermissaoModulo("controle_acesso", "ler"),
  });

  const salvarMatrizMutation = useMutation({
    mutationFn: async (map: Map<string, PermCell>) => {
      const supabase = createClient();
      const rows: {
        grupo_id: string;
        modulo_id: string;
        ler: boolean;
        editar: boolean;
        excluir: boolean;
        aprovar: boolean;
        extras: ModuloPermissaoExtras;
      }[] = [];
      map.forEach((cell, key) => {
        const [grupoId, moduloId] = key.split(":");
        rows.push({
          grupo_id: grupoId,
          modulo_id: moduloId,
          ler: cell.ler,
          editar: cell.editar,
          excluir: cell.excluir,
          aprovar: cell.aprovar,
          extras: cell.extras,
        });
      });
      const { error } = await supabase.from("dim_grupo_permissao").upsert(rows, {
        onConflict: "grupo_id,modulo_id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controle-acesso-matriz"] });
      queryClient.invalidateQueries({ queryKey: ["dim_permissoes"] });
      queryClient.invalidateQueries({ queryKey: ["dim_grupo_permissao"] });
      setEditandoMatriz(false);
      toast.success("Matriz de permissões atualizada.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar permissões: ${err.message}`);
    },
  });

  const perfilMutation = useMutation({
    mutationFn: async ({ id, novoPerfil }: { id: string; novoPerfil: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("dim_perfis").update({ perfil: novoPerfil }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, novoPerfil }) => {
      queryClient.invalidateQueries({ queryKey: ["controle-acesso-usuarios"] });
      setPerfilEditado((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success(`Grupo atualizado para ${PERFIS[novoPerfil] ?? novoPerfil}`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar grupo: ${err.message}`);
    },
  });

  const podeEditarMatriz = temPermissaoModulo("controle_acesso", "editar");

  const handleEditarMatriz = () => {
    if (matrizData) setMatrizEditada(new Map(matrizData.cells));
    setEditandoMatriz(true);
  };

  const handleSalvarMatriz = () => {
    salvarMatrizMutation.mutate(matrizEditada);
  };

  const defaultCell = (): PermCell => ({
    ler: false,
    editar: false,
    excluir: false,
    aprovar: false,
    extras: {},
  });

  const getCell = (grupoId: string, moduloId: string): PermCell => {
    const key = `${grupoId}:${moduloId}`;
    if (editandoMatriz) {
      const e = matrizEditada.get(key);
      if (e) return e;
    }
    return cellsAtual.get(key) ?? defaultCell();
  };

  const setCellField = (
    grupoId: string,
    moduloId: string,
    field: keyof Omit<PermCell, "extras">,
    value: boolean
  ) => {
    const key = `${grupoId}:${moduloId}`;
    setMatrizEditada((prev) => {
      const next = new Map(prev);
      const base = next.get(key) ?? cellsAtual.get(key) ?? defaultCell();
      const cur = { ...base, [field]: value };
      next.set(key, cur);
      return next;
    });
  };

  const toggleExtra = (
    grupoId: string,
    moduloId: string,
    k: keyof ModuloPermissaoExtras
  ) => {
    const key = `${grupoId}:${moduloId}`;
    setMatrizEditada((prev) => {
      const next = new Map(prev);
      const base = next.get(key) ?? cellsAtual.get(key) ?? defaultCell();
      const cur = {
        ...base,
        extras: { ...base.extras, [k]: !base.extras[k] },
      };
      next.set(key, cur);
      return next;
    });
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return u.nome?.toLowerCase().includes(b) || u.email?.toLowerCase().includes(b);
  });

  const usuariosPorGrupo = useMemo(() => {
    const map = new Map<string, Usuario[]>();
    for (const g of grupos) {
      map.set(
        g.slug,
        usuariosFiltrados.filter((u) => (perfilEditado[u.id] ?? u.perfil) === g.slug)
      );
    }
    return map;
  }, [grupos, usuariosFiltrados, perfilEditado]);

  const getPerfilAtual = (u: Usuario) => perfilEditado[u.id] ?? u.perfil;
  const temAlteracao = (u: Usuario) =>
    perfilEditado[u.id] !== undefined && perfilEditado[u.id] !== u.perfil;

  const handleSalvarPerfil = (u: Usuario) => {
    const novo = perfilEditado[u.id];
    if (!novo || novo === u.perfil) return;
    perfilMutation.mutate({ id: u.id, novoPerfil: novo });
  };

  if (loadingPermHook) return null;
  if (!temPermissaoModulo("controle_acesso", "ler")) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-[var(--color-primary)]" strokeWidth={2} />
          <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)]">
            Controle de Acesso
          </h1>
        </div>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1 ml-10">
          Grupos, módulos e permissões (ler, editar, excluir, aprovar)
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border-light)] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-[var(--font-size-body)]">
                Matriz de permissões por grupo
              </h2>
              <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-0.5">
                Módulos nas linhas; ícones: ler, editar, excluir, aprovar (Diário e Folha)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editandoMatriz ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditandoMatriz(false)}
                    disabled={salvarMatrizMutation.isPending}
                    className="gap-1.5 text-[var(--text-secondary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvarMatriz}
                    disabled={salvarMatrizMutation.isPending || !podeEditarMatriz}
                    className="gap-1.5"
                  >
                    {salvarMatrizMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Salvar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditarMatriz}
                  disabled={loadingMatriz || !podeEditarMatriz}
                  className="gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>

          {loadingMatriz ? (
            <div className="flex items-center justify-center py-16 gap-3 text-[var(--text-tertiary)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[var(--font-size-small)]">Carregando matriz...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-5">
              {/* Um card por grupo — módulos como colunas */}
              {grupos.map((g) => {
                const qtdModulos = modulos.filter((m) => {
                  const cell = getCell(g.id, m.id);
                  return cell.ler || cell.editar || cell.excluir || cell.aprovar;
                }).length;
                return (
                  <Card
                    key={g.id}
                    className="border-[var(--border-light)] overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-[var(--border-light)]">
                      <div className="flex items-center gap-2">
                        <Badge variant={PERFIL_BADGE_VARIANT[g.slug] ?? "gray"}>
                          {g.nome}
                        </Badge>
                        <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
                          {qtdModulos} módulo{qtdModulos !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-[var(--font-size-small)] min-w-[600px]">
                        <thead>
                          <tr className="border-b border-[var(--border-light)]">
                            {modulos.map((mod) => (
                              <th
                                key={mod.id}
                                className="text-center px-3 py-3 font-semibold text-[var(--text-secondary)] min-w-[120px] align-top"
                              >
                                <div className="font-medium text-[var(--text-primary)]">
                                  {mod.nome}
                                </div>
                                {(mod.slug === "diario_obra" ||
                                  mod.slug === "folha_pagamento") && (
                                  <p className="text-[var(--font-size-mini)] text-[var(--text-tertiary)] font-normal mt-0.5">
                                    + extras
                                  </p>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[var(--border-light)]/60">
                            {modulos.map((mod) => {
                              const cell = getCell(g.id, mod.id);
                              const edit = editandoMatriz;
                              return (
                                <td
                                  key={mod.id}
                                  className={clsx(
                                    "px-2 py-3 align-top",
                                    "border-r border-[var(--border-light)]/50 last:border-r-0"
                                  )}
                                >
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    <IconToggle
                                      active={cell.ler}
                                      disabled={!edit || !podeEditarMatriz}
                                      onClick={() =>
                                        setCellField(g.id, mod.id, "ler", !cell.ler)
                                      }
                                      title="Ler / visualizar"
                                    >
                                      <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                                    </IconToggle>
                                    {mod.permite_editar && (
                                      <IconToggle
                                        active={cell.editar}
                                        disabled={!edit || !podeEditarMatriz}
                                        onClick={() =>
                                          setCellField(g.id, mod.id, "editar", !cell.editar)
                                        }
                                        title="Editar"
                                      >
                                        <PencilLine className="w-3.5 h-3.5" strokeWidth={2} />
                                      </IconToggle>
                                    )}
                                    {mod.permite_excluir && (
                                      <IconToggle
                                        active={cell.excluir}
                                        disabled={!edit || !podeEditarMatriz}
                                        onClick={() =>
                                          setCellField(g.id, mod.id, "excluir", !cell.excluir)
                                        }
                                        title="Excluir"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                                      </IconToggle>
                                    )}
                                    {mod.tem_aprovar && (
                                      <IconToggle
                                        active={cell.aprovar}
                                        disabled={!edit || !podeEditarMatriz}
                                        onClick={() =>
                                          setCellField(g.id, mod.id, "aprovar", !cell.aprovar)
                                        }
                                        title="Aprovar"
                                      >
                                        <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} />
                                      </IconToggle>
                                    )}
                                  </div>
                                  {mod.slug === "diario_obra" && (
                                    <div className="flex flex-wrap gap-1 justify-center mt-1 pt-1 border-t border-[var(--border-light)]/60">
                                      <span className="text-[10px] text-[var(--text-tertiary)] w-full text-center block">
                                        Reabrir diário
                                      </span>
                                      <IconToggle
                                        active={Boolean(cell.extras.reabrir_diario)}
                                        disabled={!edit || !podeEditarMatriz}
                                        onClick={() =>
                                          toggleExtra(g.id, mod.id, "reabrir_diario")
                                        }
                                        title="Reabrir diário aprovado"
                                      >
                                        <ShieldCheck className="w-3 h-3" strokeWidth={2} />
                                      </IconToggle>
                                    </div>
                                  )}
                                  {mod.slug === "folha_pagamento" && (
                                    <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-[var(--border-light)]/60">
                                      {(
                                        [
                                          ["exportar_uau", "Exportar UAU"],
                                          ["debitar_folha", "Debitar"],
                                          ["alterar_parametros_folha", "Parâmetros"],
                                        ] as const
                                      ).map(([k, label]) => (
                                        <div
                                          key={k}
                                          className="flex items-center justify-center gap-1"
                                        >
                                          <span className="text-[9px] text-[var(--text-tertiary)] truncate max-w-[56px]">
                                            {label}
                                          </span>
                                          <IconToggle
                                            active={Boolean(cell.extras[k])}
                                            disabled={!edit || !podeEditarMatriz}
                                            onClick={() => toggleExtra(g.id, mod.id, k)}
                                            title={label}
                                          >
                                            <Check className="w-3 h-3" strokeWidth={2} />
                                          </IconToggle>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border-light)] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--color-primary)]" />
              <div>
                <h2 className="font-semibold text-[var(--text-primary)] text-[var(--font-size-body)]">
                  Integrantes dos grupos
                </h2>
                <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-0.5">
                  Usuários por grupo; altere o grupo e salve
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Buscar usuário..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
          </div>

          {isLoadingUsuarios ? (
            <div className="flex items-center justify-center py-16 gap-3 text-[var(--text-tertiary)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[var(--font-size-small)]">Carregando usuários...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5">
              {grupos.map((g) => {
                const lista = usuariosPorGrupo.get(g.slug) ?? [];
                return (
                  <div
                    key={g.id}
                    className="rounded-[var(--radius-md)] border border-[var(--border-light)] bg-[var(--surface-card)] p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={PERFIL_BADGE_VARIANT[g.slug] ?? "gray"}>{g.nome}</Badge>
                      <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
                        {lista.length} usuário(s)
                      </span>
                    </div>
                    {lista.length === 0 ? (
                      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)]">
                        Nenhum usuário neste grupo.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {lista.map((u) => {
                          const alterado = temAlteracao(u);
                          const salvando =
                            perfilMutation.isPending && perfilMutation.variables?.id === u.id;
                          return (
                            <li
                              key={u.id}
                              className="flex flex-wrap items-center gap-3 text-[var(--font-size-small)] border-b border-[var(--border-light)]/50 last:border-0 pb-2 last:pb-0"
                            >
                              <span className="font-medium text-[var(--text-primary)] min-w-[120px]">
                                {u.nome}
                                {u.id === user?.id && (
                                  <span className="ml-2 text-[var(--text-tertiary)] font-normal">(você)</span>
                                )}
                              </span>
                              <span className="text-[var(--text-secondary)] flex-1 truncate">{u.email}</span>
                              <Select
                                value={getPerfilAtual(u)}
                                onValueChange={(val) =>
                                  setPerfilEditado((prev) => ({ ...prev, [u.id]: val }))
                                }
                                disabled={u.id === user?.id || salvando || !podeEditarMatriz}
                              >
                                <SelectTrigger className="w-44 h-8 text-[var(--font-size-small)]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {grupos.map((gr) => (
                                    <SelectItem key={gr.slug} value={gr.slug}>
                                      {gr.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {alterado && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSalvarPerfil(u)}
                                  disabled={salvando || u.id === user?.id}
                                  className="gap-1.5"
                                >
                                  {salvando ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  Salvar
                                </Button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ParametrosCalculo userId={user?.id ?? ""} />
    </div>
  );
}

// ─── Parâmetros de cálculo (usa permissão sincronizada) ─────────────────────

type Parametro = {
  campo: string;
  parametro: number;
  descricao: string | null;
  categoria: string | null;
};

async function fetchParametros(): Promise<Parametro[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("d_configuracoes_folha")
    .select("campo, parametro, descricao, categoria")
    .order("categoria")
    .order("campo");
  if (error) throw error;
  return (data ?? []) as Parametro[];
}

function ParametrosCalculo({ userId }: { userId: string }) {
  const { temPermissao } = usePermissoes();
  const isAdmin = temPermissao("alterar_parametros_folha");
  const queryClient = useQueryClient();
  const [editingParam, setEditingParam] = useState<Parametro | null>(null);
  const [novoValor, setNovoValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const { data: parametros = [], isLoading } = useQuery({
    queryKey: ["parametros-folha"],
    queryFn: fetchParametros,
    staleTime: 60_000,
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!editingParam) return;
      const supabase = createClient();

      const { error } = await supabase
        .from("d_configuracoes_folha")
        .update({
          parametro: Number(novoValor),
          updated_at: new Date().toISOString(),
          updated_by: userId || null,
        })
        .eq("campo", editingParam.campo);

      if (error) throw error;

      await supabase.from("f_folha_audit_log").insert({
        folha_id: null,
        acao: "alteracao_parametro",
        usuario_id: userId || null,
        payload: {
          campo: editingParam.campo,
          valor_anterior: editingParam.parametro,
          valor_novo: Number(novoValor),
          motivo: motivo.trim(),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parametros-folha"] });
      setEditingParam(null);
      setNovoValor("");
      setMotivo("");
      setStep(1);
    },
  });

  const handleOpenEdit = (p: Parametro) => {
    setEditingParam(p);
    setNovoValor(String(p.parametro));
    setMotivo("");
    setStep(1);
  };

  const handleCloseModal = () => {
    setEditingParam(null);
    setNovoValor("");
    setMotivo("");
    setStep(1);
  };

  const categorias = [...new Set(parametros.map((p) => p.categoria ?? "Geral"))];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
        <h2 className="font-semibold text-[var(--text-primary)]">
          Parâmetros de Cálculo — Folha de Pagamento
        </h2>
      </div>
      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-4">
        Faixas e alíquotas de INSS, IRRF e benefícios. Alterações não retroagem em folhas fechadas.
        {!isAdmin && (
          <span className="ml-2 text-[var(--color-warning)]">
            Somente quem tem permissão de parâmetros pode editar.
          </span>
        )}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-[var(--text-tertiary)]">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          Carregando parâmetros...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {categorias.map((cat) => (
            <div key={cat}>
              <h3 className="text-[var(--font-size-mini)] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                {cat}
              </h3>
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Campo</th>
                      <th className="text-left">Descrição</th>
                      <th className="text-right">Valor</th>
                      {isAdmin && <th className="text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {parametros
                      .filter((p) => (p.categoria ?? "Geral") === cat)
                      .map((p) => (
                        <tr key={p.campo}>
                          <td className="font-mono text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
                            {p.campo}
                          </td>
                          <td className="text-[var(--text-secondary)]">{p.descricao ?? "—"}</td>
                          <td className="text-right tabular-nums font-semibold text-[var(--text-primary)]">
                            {p.parametro.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          {isAdmin && (
                            <td className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(p)}>
                                <Pencil className="size-4" />
                                Editar
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingParam && (
        <div
          className="modal-overlay fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <Card className="modal-content w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                Editar Parâmetro
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)]"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-base)]">
                <p className="text-[var(--font-size-mini)] font-mono text-[var(--text-tertiary)] mb-0.5">
                  {editingParam.campo}
                </p>
                <p className="text-[var(--font-size-small)] text-[var(--text-primary)] font-medium">
                  {editingParam.descricao}
                </p>
                <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
                  Valor atual:{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {editingParam.parametro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>

              {step === 1 ? (
                <>
                  <div>
                    <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                      Novo valor *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                      Motivo da alteração *
                    </label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      placeholder="Descreva o motivo da alteração..."
                      className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(2)} disabled={!novoValor || !motivo.trim()}>
                      Continuar
                    </Button>
                    <Button variant="secondary" onClick={handleCloseModal}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" strokeWidth={2} />
                    <div>
                      <p className="text-[var(--font-size-small)] font-medium text-amber-800">
                        Tem certeza? Esta alteração afetará cálculos futuros
                      </p>
                      <p className="text-[var(--font-size-mini)] text-amber-700 mt-1">
                        De{" "}
                        <span className="font-semibold">
                          {editingParam.parametro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>{" "}
                        para{" "}
                        <span className="font-semibold">
                          {Number(novoValor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {salvarMutation.isError && (
                    <p className="text-xs text-[var(--color-error)]">Erro ao salvar. Tente novamente.</p>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
                      {salvarMutation.isPending ? "Salvando..." : "Confirmar Alteração"}
                    </Button>
                    <Button variant="secondary" onClick={() => setStep(1)}>
                      Voltar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
