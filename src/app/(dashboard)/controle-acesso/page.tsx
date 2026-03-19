"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, Check, Minus, Search, Save, Loader2, Pencil, X, SlidersHorizontal, AlertTriangle } from "lucide-react";
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
import type { PermissaoRow } from "@/hooks/usePermissoes";

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

type PermissaoCell = true | false | string;

interface MatrizRow {
  acao: string;
  acaoSlug: string;
  admin: PermissaoCell;
  engenheiro: PermissaoCell;
  operador: PermissaoCell;
  leitura: PermissaoCell;
}

const ACAO_ORDER = [
  "rota_dashboard",
  "criar_diario",
  "aprovar_diario",
  "rota_relatorios",
  "rota_cadastros",
  "rota_usuarios",
  "excluir_diario",
  "reabrir_diario",
  "seletor_obras",
  "dark_mode",
];

function permissoesToMatriz(permissoes: PermissaoRow[]): MatrizRow[] {
  return ACAO_ORDER
    .map((acaoSlug) => {
      const rows = permissoes.filter((p) => p.acao === acaoSlug);
      if (!rows.length) return null;

      const getCell = (p: string): PermissaoCell => {
        const row = rows.find((r) => r.perfil === p);
        if (!row) return false;
        return row.valor !== null ? row.valor : row.permitido;
      };

      return {
        acao: rows[0].acao_label,
        acaoSlug,
        admin: getCell("admin"),
        engenheiro: getCell("engenheiro"),
        operador: getCell("operador"),
        leitura: getCell("leitura"),
      };
    })
    .filter(Boolean) as MatrizRow[];
}

function matrizToUpsert(
  editada: MatrizRow[],
  original: PermissaoRow[]
): PermissaoRow[] {
  const changed: PermissaoRow[] = [];
  const perfis = ["admin", "engenheiro", "operador", "leitura"] as const;

  for (const row of editada) {
    for (const p of perfis) {
      const cellValue = row[p];
      const orig = original.find((r) => r.acao === row.acaoSlug && r.perfil === p);
      const newPermitido = typeof cellValue === "boolean" ? cellValue : true;
      const newValor = typeof cellValue === "string" ? cellValue : null;

      if (orig?.permitido !== newPermitido || orig?.valor !== newValor) {
        changed.push({
          acao: row.acaoSlug,
          acao_label: row.acao,
          perfil: p,
          permitido: newPermitido,
          valor: newValor,
        });
      }
    }
  }
  return changed;
}

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
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

async function fetchUsuarios(): Promise<Usuario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_perfis")
    .select("id, nome, email, perfil")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function CellIcon({ value }: { value: PermissaoCell }) {
  if (value === true) {
    return (
      <span className="flex items-center justify-center">
        <Check className="w-4 h-4 text-[var(--color-success,#22c55e)]" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="flex items-center justify-center">
        <Minus className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center text-[var(--font-size-small)] font-medium text-[var(--color-primary)]">
      {value}
    </span>
  );
}

export default function ControleAcessoPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const perfil = profile?.perfil ?? "leitura";
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [perfilEditado, setPerfilEditado] = useState<Record<string, string>>({});
  const [editandoMatriz, setEditandoMatriz] = useState(false);
  const [matrizEditada, setMatrizEditada] = useState<MatrizRow[]>([]);

  useEffect(() => {
    if (perfil !== "admin") {
      router.replace("/dashboard");
    }
  }, [perfil, router]);

  const { data: permissoes = [], isLoading: isLoadingPermissoes } = useQuery({
    queryKey: ["dim_permissoes"],
    queryFn: fetchPermissoes,
    enabled: perfil === "admin",
  });

  const matrizAtual = useMemo(() => permissoesToMatriz(permissoes), [permissoes]);

  const { data: usuarios = [], isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ["controle-acesso-usuarios"],
    queryFn: fetchUsuarios,
    enabled: perfil === "admin",
  });

  const salvarMatrizMutation = useMutation({
    mutationFn: async (rows: PermissaoRow[]) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("dim_permissoes")
        .upsert(rows, { onConflict: "acao,perfil" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dim_permissoes"] });
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
      const { error } = await supabase
        .from("dim_perfis")
        .update({ perfil: novoPerfil })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, novoPerfil }) => {
      queryClient.invalidateQueries({ queryKey: ["controle-acesso-usuarios"] });
      setPerfilEditado((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      toast.success(`Perfil atualizado para ${PERFIS[novoPerfil] ?? novoPerfil}`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar perfil: ${err.message}`);
    },
  });

  if (perfil !== "admin") return null;

  const handleEditarMatriz = () => {
    setMatrizEditada(matrizAtual.map((r) => ({ ...r })));
    setEditandoMatriz(true);
  };

  const handleCancelarMatriz = () => setEditandoMatriz(false);

  const handleSalvarMatriz = () => {
    const changed = matrizToUpsert(matrizEditada, permissoes);
    if (changed.length === 0) {
      setEditandoMatriz(false);
      return;
    }
    salvarMatrizMutation.mutate(changed);
  };

  const handleCellChange = (
    rowIdx: number,
    p: "admin" | "engenheiro" | "operador" | "leitura",
    value: PermissaoCell
  ) => {
    setMatrizEditada((prev) =>
      prev.map((row, i) => (i === rowIdx ? { ...row, [p]: value } : row))
    );
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return u.nome?.toLowerCase().includes(b) || u.email?.toLowerCase().includes(b);
  });

  const getPerfilAtual = (u: Usuario) => perfilEditado[u.id] ?? u.perfil;
  const temAlteracao = (u: Usuario) =>
    perfilEditado[u.id] !== undefined && perfilEditado[u.id] !== u.perfil;

  const handleSalvarPerfil = (u: Usuario) => {
    const novo = perfilEditado[u.id];
    if (!novo || novo === u.perfil) return;
    perfilMutation.mutate({ id: u.id, novoPerfil: novo });
  };

  const linhasMatriz = editandoMatriz ? matrizEditada : matrizAtual;

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
          Gerencie as permissões de cada tipo de usuário no sistema
        </p>
      </div>

      {/* Matriz de Permissões */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border-light)] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-[var(--font-size-body)]">
                Matriz de Permissões
              </h2>
              <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-0.5">
                Visão geral do que cada perfil pode fazer no sistema
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editandoMatriz ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelarMatriz}
                    disabled={salvarMatrizMutation.isPending}
                    className="gap-1.5 text-[var(--text-secondary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvarMatriz}
                    disabled={salvarMatrizMutation.isPending}
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
                  disabled={isLoadingPermissoes}
                  className="gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>

          {isLoadingPermissoes ? (
            <div className="flex items-center justify-center py-16 gap-3 text-[var(--text-tertiary)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[var(--font-size-small)]">Carregando permissões...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--font-size-small)]">
                <thead>
                  <tr className="border-b border-[var(--border-light)]">
                    <th className="text-left px-5 py-3 font-semibold text-[var(--text-secondary)] w-1/3">
                      Rota / Ação
                    </th>
                    {(["admin", "engenheiro", "operador", "leitura"] as const).map((p) => (
                      <th key={p} className="text-center px-4 py-3 font-semibold text-[var(--text-secondary)]">
                        <Badge variant={PERFIL_BADGE_VARIANT[p]}>
                          {PERFIS[p]}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhasMatriz.map((row, idx) => (
                    <tr
                      key={row.acaoSlug}
                      className={clsx(
                        "border-b border-[var(--border-light)] last:border-0",
                        idx % 2 === 0
                          ? "bg-[var(--surface-base)]"
                          : "bg-[var(--surface-card)]"
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-[var(--text-primary)]">
                        {row.acao}
                      </td>
                      {(["admin", "engenheiro", "operador", "leitura"] as const).map((p) => (
                        <td key={p} className="px-4 py-3 text-center">
                          {editandoMatriz ? (
                            typeof row[p] === "boolean" ? (
                              <button
                                type="button"
                                onClick={() => handleCellChange(idx, p, !row[p])}
                                className={clsx(
                                  "w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-colors",
                                  row[p]
                                    ? "bg-[var(--color-success,#22c55e)]/15 hover:bg-[var(--color-success,#22c55e)]/25"
                                    : "bg-[var(--surface-hover)] hover:bg-[var(--border-light)]"
                                )}
                                title={row[p] ? "Clique para remover permissão" : "Clique para conceder permissão"}
                              >
                                {row[p] ? (
                                  <Check className="w-4 h-4 text-[var(--color-success,#22c55e)]" strokeWidth={2.5} />
                                ) : (
                                  <Minus className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
                                )}
                              </button>
                            ) : (
                              <input
                                type="text"
                                value={row[p] as string}
                                onChange={(e) => handleCellChange(idx, p, e.target.value)}
                                className="w-28 text-center text-[var(--font-size-small)] font-medium bg-[var(--surface-hover)] border border-[var(--border-light)] rounded px-2 py-1 text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] mx-auto block"
                              />
                            )
                          ) : (
                            <CellIcon value={row[p]} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gerenciar Usuários */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border-light)] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-[var(--font-size-body)]">
                Gerenciar Usuários
              </h2>
              <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-0.5">
                Altere o perfil de acesso de cada usuário
              </p>
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
          ) : usuariosFiltrados.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)] text-[var(--font-size-small)]">
              {busca ? "Nenhum usuário encontrado para essa busca." : "Nenhum usuário cadastrado."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--font-size-small)]">
                <thead>
                  <tr className="border-b border-[var(--border-light)]">
                    <th className="text-left px-5 py-3 font-semibold text-[var(--text-secondary)]">
                      Usuário
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">
                      E-mail
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">
                      Perfil Atual
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">
                      Alterar Para
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u, idx) => {
                    const perfilAtual = getPerfilAtual(u);
                    const alterado = temAlteracao(u);
                    const salvando = perfilMutation.isPending && perfilMutation.variables?.id === u.id;

                    return (
                      <tr
                        key={u.id}
                        className={clsx(
                          "border-b border-[var(--border-light)] last:border-0",
                          idx % 2 === 0
                            ? "bg-[var(--surface-base)]"
                            : "bg-[var(--surface-card)]",
                          alterado && "ring-1 ring-inset ring-[var(--color-primary)]/20"
                        )}
                      >
                        <td className="px-5 py-3 font-medium text-[var(--text-primary)]">
                          {u.nome}
                          {u.id === user?.id && (
                            <span className="ml-2 text-[var(--text-tertiary)] font-normal">(você)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={PERFIL_BADGE_VARIANT[u.perfil] ?? "gray"}>
                            {PERFIS[u.perfil] ?? u.perfil}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={perfilAtual}
                            onValueChange={(val) =>
                              setPerfilEditado((prev) => ({ ...prev, [u.id]: val }))
                            }
                            disabled={u.id === user?.id || salvando}
                          >
                            <SelectTrigger className="w-44 h-8 text-[var(--font-size-small)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PERFIS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ParametrosCalculo isAdmin={profile?.perfil === "admin"} userId={user?.id ?? ""} />
    </div>
  );
}

// ─── Seção de Parâmetros de Cálculo da Folha ─────────────────────────────────

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

function ParametrosCalculo({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
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

      // Gravar audit log
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
            Somente administradores podem editar.
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
                          <td className="text-[var(--text-secondary)]">
                            {p.descricao ?? "—"}
                          </td>
                          <td className="text-right tabular-nums font-semibold text-[var(--text-primary)]">
                            {p.parametro.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </td>
                          {isAdmin && (
                            <td className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(p)}
                              >
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

      {/* Modal de edição com confirmação dupla */}
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
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!novoValor || !motivo.trim()}
                    >
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
                    <p className="text-xs text-[var(--color-error)]">
                      Erro ao salvar. Tente novamente.
                    </p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={() => salvarMutation.mutate()}
                      disabled={salvarMutation.isPending}
                    >
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
