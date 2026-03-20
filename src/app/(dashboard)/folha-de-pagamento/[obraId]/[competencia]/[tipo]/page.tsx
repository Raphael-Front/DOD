"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissoes } from "@/hooks/usePermissoes";
import { Card, Badge, Button } from "@/components/ui";
import {
  ChevronLeft, ChevronDown, ChevronRight,
  AlertTriangle, Lock, Download, X,
  FileDown, DollarSign, Plus, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColaboradorInfo = {
  nome: string;
  matricula: string;
  status: "ativo" | "ferias" | "afastado" | "demitido";
  data_admissao: string;
  num_dependentes: number;
  adicional_insalubridade: number;
  funcao?: string; // texto livre desde migração 20260319
  funcao_id?: string; // legado
  dim_funcoes?: { nome: string } | null; // legado
};

type Lancamento = {
  id: string;
  folha_id: string;
  colaborador_id: string;
  servico_etapa: string | null;
  hora_tarefa: number;
  tarefa_mensal: number;
  he_50: number;
  he_100: number;
  faltas: number;
  gratificacao: number;
  adicional: number;
  inss: number;
  irrf: number;
  vt: number;
  refeicao: number;
  total_proventos: number;
  total_descontos: number;
  liquido: number;
  d_colaboradores: ColaboradorInfo | null;
};

type Producao = {
  id: string;
  lancamento_id: string;
  servico_id: string | null;
  classificacao_apoio: string | null;
  quantidade: number;
  percentual_participacao: number | null;
  d_servicos: { nome: string; unidade: string; categoria: string } | null;
};

type FolhaDetalhe = {
  folha: {
    id: string;
    obra_id: string;
    competencia: string;
    tipo: string;
    status: string;
    debitada: boolean;
    dim_obras: { nome: string } | null;
  };
  lancamentos: Lancamento[];
  producao: Producao[];
  totais: { proventos: number; descontos: number; liquido: number };
};

type Servico = { id: string; nome: string; unidade: string; categoria: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function competenciaLabel(iso: string): string {
  try {
    return format(parseISO(iso), "MMMM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchFolhaDetalhe(folhaId: string): Promise<FolhaDetalhe> {
  const res = await fetch(`/api/folha/${folhaId}`);
  if (!res.ok) throw new Error("Erro ao carregar folha");
  return res.json();
}

async function fetchOuCriarFolha(
  obraId: string,
  competencia: string,
  tipo: string
): Promise<{ id: string }> {
  const res = await fetch("/api/folha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ obra_id: obraId, competencia, tipo }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string })?.error ?? "Erro ao buscar/criar folha");
  }
  return res.json();
}

async function fetchServicos(): Promise<Servico[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("d_servicos")
    .select("id, nome, unidade, categoria")
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}

async function fetchColabsDisponiveis(obraId: string): Promise<Array<{ id: string; nome: string; matricula: string; status: string }>> {
  const supabase = createClient();
  // d_colaboradores usa empresa (TEXT) vinculada a dim_obras.numero_empresa desde migração 20260319
  const { data: obra } = await supabase
    .from("dim_obras")
    .select("numero_empresa")
    .eq("id", obraId)
    .single();
  const numeroEmpresa = obra?.numero_empresa != null ? String(obra.numero_empresa) : null;
  if (!numeroEmpresa) return [];
  const { data } = await supabase
    .from("d_colaboradores")
    .select("id, nome, matricula, status")
    .eq("empresa", numeroEmpresa)
    .neq("status", "demitido")
    .is("deleted_at", null)
    .order("nome");
  return data ?? [];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumericCell({
  value,
  folhaClosed,
  onBlur,
  disabled,
}: {
  value: number;
  folhaClosed: boolean;
  onBlur: (val: number) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(String(value || ""));

  if (folhaClosed || disabled) {
    return (
      <span className="tabular-nums text-[var(--font-size-small)]">
        {value ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}
      </span>
    );
  }

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onBlur(parseFloat(local) || 0)}
      className="w-full h-7 px-1.5 text-right tabular-nums rounded border border-transparent bg-transparent hover:border-[var(--border-medium)] focus:border-[var(--color-primary)] focus:outline-none focus:bg-[var(--surface-card)] text-[var(--font-size-small)] transition-all"
    />
  );
}

function PainelProducao({
  lancamento,
  producoes,
  servicos,
  folhaClosed,
  folhaId,
  tipo,
  onRefresh,
}: {
  lancamento: Lancamento;
  producoes: Producao[];
  servicos: Servico[];
  folhaClosed: boolean;
  folhaId: string;
  tipo: string;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const servicosProdutivos = servicos.filter((s) => s.categoria === "produtivo");
  const isTarefado = tipo === "tarefado";

  const APOIO_OPCOES = ["Limpeza", "Apoio", "Retrabalho"];

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = isTarefado
        ? {
            lancamento_id: lancamento.id,
            servico_id: servicosProdutivos[0]?.id ?? null,
            quantidade: 0,
            percentual_participacao: null,
          }
        : {
            lancamento_id: lancamento.id,
            classificacao_apoio: "Apoio",
            quantidade: 0,
            percentual_participacao: null,
          };
      const { error } = await supabase.from("f_producao_lancamentos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folha-detalhe"] });
      onRefresh();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (prodId: string) => {
      const { error } = await supabase.from("f_producao_lancamentos").delete().eq("id", prodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folha-detalhe"] });
      onRefresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      prodId,
      field,
      value,
    }: {
      prodId: string;
      field: string;
      value: unknown;
    }) => {
      const { error } = await supabase
        .from("f_producao_lancamentos")
        .update({ [field]: value })
        .eq("id", prodId);
      if (error) throw error;
    },
    onSuccess: () => onRefresh(),
  });

  return (
    <tr>
      <td colSpan={18} className="px-4 py-0">
        <div className="ml-8 my-2 p-4 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-[var(--surface-base)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[var(--font-size-small)] font-semibold text-[var(--text-primary)]">
              Produção — {lancamento.d_colaboradores?.nome}
            </h4>
            {!folhaClosed && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending}
              >
                <Plus className="size-3" />
                Adicionar registro
              </Button>
            )}
          </div>

          {producoes.length === 0 ? (
            <p className="text-[var(--font-size-mini)] text-[var(--text-tertiary)] py-2">
              Nenhum registro de produção lançado.
            </p>
          ) : (
            <table className="w-full text-[var(--font-size-small)]">
              <thead>
                <tr className="border-b border-[var(--border-light)]">
                  {isTarefado ? (
                    <th className="text-left py-1 pr-3 font-medium text-[var(--text-tertiary)]">Serviço</th>
                  ) : (
                    <th className="text-left py-1 pr-3 font-medium text-[var(--text-tertiary)]">Classificação</th>
                  )}
                  <th className="text-right py-1 pr-3 font-medium text-[var(--text-tertiary)]">Qtd</th>
                  <th className="text-right py-1 pr-3 font-medium text-[var(--text-tertiary)]">% Participação</th>
                  {!folhaClosed && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {producoes.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border-light)]/50">
                    <td className="py-1 pr-3">
                      {folhaClosed ? (
                        <span>{isTarefado ? p.d_servicos?.nome : p.classificacao_apoio}</span>
                      ) : isTarefado ? (
                        <select
                          value={p.servico_id ?? ""}
                          onChange={(e) =>
                            updateMutation.mutate({ prodId: p.id, field: "servico_id", value: e.target.value || null })
                          }
                          className="h-7 px-1.5 rounded border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        >
                          <option value="">— Selecione —</option>
                          {servicosProdutivos.map((s) => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={p.classificacao_apoio ?? ""}
                          onChange={(e) =>
                            updateMutation.mutate({ prodId: p.id, field: "classificacao_apoio", value: e.target.value })
                          }
                          className="h-7 px-1.5 rounded border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        >
                          {APOIO_OPCOES.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-1 pr-3 text-right">
                      {folhaClosed ? (
                        <span className="tabular-nums">{p.quantidade}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={p.quantidade}
                          onBlur={(e) =>
                            updateMutation.mutate({
                              prodId: p.id,
                              field: "quantidade",
                              value: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 h-7 px-1.5 text-right tabular-nums rounded border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                      )}
                    </td>
                    <td className="py-1 pr-3 text-right">
                      {folhaClosed ? (
                        <span className="tabular-nums">{p.percentual_participacao ?? "—"}</span>
                      ) : (
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          defaultValue={p.percentual_participacao ?? ""}
                          onBlur={(e) =>
                            updateMutation.mutate({
                              prodId: p.id,
                              field: "percentual_participacao",
                              value: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          placeholder="—"
                          className="w-16 h-7 px-1.5 text-right tabular-nums rounded border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                      )}
                    </td>
                    {!folhaClosed && (
                      <td className="py-1">
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(p.id)}
                          className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--color-error)] hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FolhaGridPage({
  params,
}: {
  params: Promise<{ obraId: string; competencia: string; tipo: string }>;
}) {
  const { obraId, competencia, tipo } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const { temPermissao } = usePermissoes();
  const queryClient = useQueryClient();

  const perfil = profile?.perfil ?? "leitura";
  const podeLancar = temPermissao("lancar_folha");
  const podeFechar = temPermissao("fechar_folha");
  const podeExportar = temPermissao("exportar_uau");
  const podeDebitar = temPermissao("debitar_folha");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalReabrir, setModalReabrir] = useState(false);
  const [motivoReabrir, setMotivoReabrir] = useState("");
  const [calculando, setCalculando] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  // 1. Buscar ou criar folha
  const { data: folhaRef, isError: erroFolhaRef, error: mensagemErro, isLoading: loadingFolhaRef } = useQuery({
    queryKey: ["folha-ref", obraId, competencia, tipo],
    queryFn: () => fetchOuCriarFolha(obraId, competencia, tipo),
    retry: false,
  });

  const folhaId = folhaRef?.id;

  // 2. Carregar detalhe completo
  const { data: detalhe, isLoading, refetch } = useQuery<FolhaDetalhe>({
    queryKey: ["folha-detalhe", folhaId],
    queryFn: () => fetchFolhaDetalhe(folhaId!),
    enabled: !!folhaId,
  });

  // 3. Serviços e colaboradores disponíveis
  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos-ativos"],
    queryFn: fetchServicos,
    staleTime: 60_000,
  });

  const { data: colabsDisponiveis = [] } = useQuery({
    queryKey: ["colabs-disponiveis", obraId],
    queryFn: () => fetchColabsDisponiveis(obraId),
    enabled: !!obraId,
    staleTime: 30_000,
  });

  const folha = detalhe?.folha;
  const lancamentos = detalhe?.lancamentos ?? [];
  const producaoMap = (detalhe?.producao ?? []).reduce<Record<string, Producao[]>>((acc, p) => {
    acc[p.lancamento_id] = acc[p.lancamento_id] ?? [];
    acc[p.lancamento_id].push(p);
    return acc;
  }, {});

  const folhaClosed = folha?.status === "fechada";

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Calcular onBlur
  const handleCalculo = useCallback(
    async (
      lancamento: Lancamento,
      campo: string,
      valor: number
    ) => {
      if (!folhaId || folhaClosed) return;
      setCalculando(lancamento.id);
      try {
        const body = {
          lancamento_id: lancamento.id,
          colaborador_id: lancamento.colaborador_id,
          hora_tarefa: campo === "hora_tarefa" ? valor : lancamento.hora_tarefa,
          tarefa_mensal: campo === "tarefa_mensal" ? valor : lancamento.tarefa_mensal,
          he_50: campo === "he_50" ? valor : lancamento.he_50,
          he_100: campo === "he_100" ? valor : lancamento.he_100,
          faltas: campo === "faltas" ? valor : lancamento.faltas,
          gratificacao: campo === "gratificacao" ? valor : lancamento.gratificacao,
          adicional: campo === "adicional" ? valor : lancamento.adicional,
          servico_etapa:
            campo === "servico_etapa" ? String(valor) : lancamento.servico_etapa,
        };
        await fetch(`/api/folha/${folhaId}/calcular`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        queryClient.invalidateQueries({ queryKey: ["folha-detalhe", folhaId] });
      } finally {
        setCalculando(null);
      }
    },
    [folhaId, folhaClosed, queryClient]
  );

  // Adicionar colaborador
  const addColaboradorMutation = useMutation({
    mutationFn: async (colaboradorId: string) => {
      if (!folhaId) return;
      const res = await fetch(`/api/folha/${folhaId}/calcular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: colaboradorId,
          hora_tarefa: 0,
          tarefa_mensal: 0,
          he_50: 0,
          he_100: 0,
          faltas: 0,
          gratificacao: 0,
          adicional: 0,
        }),
      });
      if (!res.ok) throw new Error("Erro ao adicionar colaborador");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folha-detalhe", folhaId] }),
  });

  // Fechar folha
  const fecharMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/folha/${folhaId}/fechar`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao fechar folha");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folha-detalhe", folhaId] }),
  });

  // Reabrir folha
  const reabrirMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/folha/${folhaId}/reabrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoReabrir }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao reabrir folha");
      }
    },
    onSuccess: () => {
      setModalReabrir(false);
      setMotivoReabrir("");
      queryClient.invalidateQueries({ queryKey: ["folha-detalhe", folhaId] });
    },
  });

  // Exportar UAU!
  const handleExportarUAU = async () => {
    if (!folhaId) return;
    setExportando(true);
    try {
      const res = await fetch(`/api/folha/${folhaId}/exportar-uau`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Erro ao exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? "folha_uau.txt";
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  };

  // Debitar
  const debitarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/folha/${folhaId}/debitar`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao debitar");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folha-detalhe", folhaId] }),
  });

  // Colaboradores já na folha
  const colabsNaFolha = new Set(lancamentos.map((l) => l.colaborador_id));
  const colabsParaAdicionar = colabsDisponiveis.filter(
    (c) => !colabsNaFolha.has(c.id)
  );

  // Alertas por colaborador
  const isAdmissaoDentroDaCompetencia = (dataAdmissao: string) => {
    try {
      const admissao = parseISO(dataAdmissao);
      const inicio = startOfMonth(parseISO(competencia));
      const fim = endOfMonth(parseISO(competencia));
      return isWithinInterval(admissao, { start: inicio, end: fim });
    } catch {
      return false;
    }
  };

  if (loadingFolhaRef || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-[var(--text-tertiary)]">Carregando folha...</span>
      </div>
    );
  }

  if (!folha) {
    const msgErro = erroFolhaRef && mensagemErro
      ? mensagemErro.message
      : "Folha não encontrada.";
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-[var(--text-tertiary)] text-center max-w-md">{msgErro}</p>
        <Button variant="secondary" onClick={() => router.push("/folha-de-pagamento")}>
          Voltar
        </Button>
      </div>
    );
  }

  const tipoLabel = tipo === "tarefado" ? "Tarefado" : "Não Tarefado";
  const competenciaFormatada = competenciaLabel(competencia);

  return (
    <div className="flex flex-col gap-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => router.push("/folha-de-pagamento")}
          className="flex items-center gap-1 text-[var(--font-size-small)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          Folha de Pagamento
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[var(--font-size-title3)] font-bold text-[var(--text-primary)]">
                {folha.dim_obras?.nome}
              </h1>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--font-size-body)] text-[var(--text-secondary)] capitalize">
                {competenciaFormatada}
              </span>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--font-size-body)] text-[var(--text-secondary)]">
                {tipoLabel}
              </span>
              <Badge variant={folhaClosed ? "gray" : "green"}>
                {folhaClosed ? "FECHADA" : "ABERTA"}
              </Badge>
              {folha.debitada && (
                <Badge variant="blue">DEBITADA</Badge>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap items-center gap-2">
            {!folhaClosed && podeFechar && (
              <Button
                size="sm"
                onClick={() => fecharMutation.mutate()}
                disabled={fecharMutation.isPending}
              >
                <Lock className="size-4" />
                {fecharMutation.isPending ? "Fechando..." : "Fechar Folha"}
              </Button>
            )}
            {folhaClosed && podeFechar && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setModalReabrir(true)}
              >
                Reabrir Folha
              </Button>
            )}
            {folhaClosed && podeExportar && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExportarUAU}
                disabled={exportando}
              >
                <FileDown className="size-4" />
                {exportando ? "Exportando..." : "Exportar UAU!"}
              </Button>
            )}
            {folhaClosed && podeDebitar && !folha.debitada && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => debitarMutation.mutate()}
                disabled={debitarMutation.isPending}
              >
                <DollarSign className="size-4" />
                {debitarMutation.isPending ? "Debitando..." : "Debitar em Despesas"}
              </Button>
            )}
            {podeExportar && (
              <a
                href={`/relatorios`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--font-size-small)] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-colors"
              >
                <Download className="size-4" />
                Relatórios
              </a>
            )}
          </div>
        </div>

        {fecharMutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-700 text-[var(--font-size-small)]">
            <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2} />
            {fecharMutation.error instanceof Error
              ? fecharMutation.error.message
              : "Erro ao fechar folha"}
          </div>
        )}
      </div>

      {/* Adicionar colaboradores (folha aberta) */}
      {!folhaClosed && podeLancar && colabsParaAdicionar.length > 0 && (
        <Card className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[var(--font-size-small)] text-[var(--text-secondary)]">
              Adicionar colaborador:
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addColaboradorMutation.mutate(e.target.value);
                  e.target.value = "";
                }
              }}
              className="h-8 px-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            >
              <option value="">— Selecione —</option>
              {colabsParaAdicionar.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.matricula})
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Grid */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-[var(--font-size-mini)]">
            <thead>
              <tr className="border-b border-[var(--border-light)] bg-[var(--surface-base)]">
                <th className="w-8 px-2 py-2.5" />
                <th className="text-left px-3 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">Colaborador</th>
                <th className="text-left px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap min-w-[100px]">Serviço/Etapa</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">H.Tarefa</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--color-primary)] whitespace-nowrap">T.Mensal</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">HE 50%</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">HE 100%</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">Faltas</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">Gratif.</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">Adicional</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">INSS</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">IRRF</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">VT</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">Refeição</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">Proventos</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--text-tertiary)] whitespace-nowrap">Descontos</th>
                <th className="text-right px-2 py-2.5 font-semibold text-[var(--color-primary)] whitespace-nowrap min-w-[80px]">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-10 text-center text-[var(--text-tertiary)]">
                    Nenhum colaborador na folha. Adicione colaboradores acima.
                  </td>
                </tr>
              ) : (
                lancamentos.map((lanc) => {
                  const colab = lanc.d_colaboradores;
                  const expanded = expandedIds.has(lanc.id);
                  const prodLanc = producaoMap[lanc.id] ?? [];
                  const semProducao = prodLanc.length === 0;
                  const isFerias = colab?.status === "ferias";
                  const isAfastado = colab?.status === "afastado";
                  const admissaoProporcional =
                    colab?.data_admissao
                      ? isAdmissaoDentroDaCompetencia(colab.data_admissao)
                      : false;
                  const isCalculandoLinha = calculando === lanc.id;
                  const linhaEditavel = !folhaClosed && !isAfastado && podeLancar;

                  return (
                    <>
                      <tr
                        key={lanc.id}
                        className={clsx(
                          "border-b border-[var(--border-light)] transition-colors",
                          isAfastado
                            ? "bg-[var(--surface-base)] opacity-60 cursor-not-allowed"
                            : semProducao || isFerias
                            ? "bg-amber-50/50"
                            : "hover:bg-[var(--surface-card-hover)]",
                          isCalculandoLinha && "opacity-70"
                        )}
                      >
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(lanc.id)}
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--surface-card)] text-[var(--text-tertiary)] transition-colors"
                          >
                            {expanded ? (
                              <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[var(--text-primary)] whitespace-nowrap">
                              {colab?.nome}
                            </span>
                            {isFerias && (
                              <span title="Colaborador em Férias" className="text-amber-500">
                                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                              </span>
                            )}
                            {isAfastado && (
                              <span title="Colaborador Afastado — linha bloqueada" className="text-gray-400">
                                <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                              </span>
                            )}
                            {admissaoProporcional && (
                              <span
                                title="Dias proporcionais — verifique a data de admissão nesta competência"
                                className="text-amber-500"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                              </span>
                            )}
                          </div>
                          <span className="text-[var(--text-tertiary)] text-[10px]">
                            {colab?.matricula}
                          </span>
                        </td>

                        {/* Serviço/Etapa */}
                        <td className="px-2 py-2">
                          {linhaEditavel ? (
                            <input
                              type="text"
                              defaultValue={lanc.servico_etapa ?? ""}
                              onBlur={(e) =>
                                handleCalculo(lanc, "servico_etapa", e.target.value as unknown as number)
                              }
                              placeholder="Serviço..."
                              className="w-full h-7 px-1.5 rounded border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--color-primary)] focus:outline-none focus:bg-[var(--surface-card)] text-[var(--font-size-small)] transition-all"
                            />
                          ) : (
                            <span className="text-[var(--text-secondary)]">
                              {lanc.servico_etapa ?? "—"}
                            </span>
                          )}
                        </td>

                        {/* Hora Tarefa */}
                        <td className="px-2 py-2 text-right">
                          <NumericCell
                            value={lanc.hora_tarefa}
                            folhaClosed={!linhaEditavel}
                            onBlur={(v) => handleCalculo(lanc, "hora_tarefa", v)}
                          />
                        </td>

                        {/* Tarefa Mensal */}
                        <td className="px-2 py-2 text-right font-semibold text-[var(--color-primary)]">
                          <NumericCell
                            value={lanc.tarefa_mensal}
                            folhaClosed={!linhaEditavel}
                            onBlur={(v) => handleCalculo(lanc, "tarefa_mensal", v)}
                          />
                        </td>

                        {/* HE 50% */}
                        <td className="px-2 py-2 text-right">
                          <NumericCell
                            value={lanc.he_50}
                            folhaClosed={!linhaEditavel}
                            onBlur={(v) => handleCalculo(lanc, "he_50", v)}
                          />
                        </td>

                        {/* HE 100% */}
                        <td className="px-2 py-2 text-right">
                          <NumericCell
                            value={lanc.he_100}
                            folhaClosed={!linhaEditavel}
                            onBlur={(v) => handleCalculo(lanc, "he_100", v)}
                          />
                        </td>

                        {/* Faltas */}
                        <td className="px-2 py-2 text-right">
                          <NumericCell
                            value={lanc.faltas}
                            folhaClosed={!linhaEditavel}
                            onBlur={(v) => handleCalculo(lanc, "faltas", v)}
                          />
                        </td>

                        {/* Gratificação */}
                        <td className="px-2 py-2 text-right">
                          <NumericCell
                            value={lanc.gratificacao}
                            folhaClosed={!linhaEditavel}
                            onBlur={(v) => handleCalculo(lanc, "gratificacao", v)}
                          />
                        </td>

                        {/* Adicional / Insalubridade */}
                        <td className="px-2 py-2 text-right">
                          <NumericCell
                            value={lanc.adicional}
                            folhaClosed={!linhaEditavel}
                            onBlur={(v) => handleCalculo(lanc, "adicional", v)}
                          />
                        </td>

                        {/* Calculados — somente leitura */}
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {lanc.inss ? lanc.inss.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {lanc.irrf ? lanc.irrf.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {lanc.vt ? lanc.vt.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {lanc.refeicao ? lanc.refeicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {lanc.total_proventos
                            ? lanc.total_proventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {lanc.total_descontos
                            ? lanc.total_descontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                            : "—"}
                        </td>
                        <td
                          className={clsx(
                            "px-2 py-2 text-right tabular-nums font-semibold",
                            (lanc.liquido ?? 0) > 0
                              ? "text-[var(--color-primary)]"
                              : "text-[var(--text-tertiary)]"
                          )}
                        >
                          {lanc.liquido
                            ? lanc.liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                            : "—"}
                        </td>
                      </tr>

                      {/* Painel de produção */}
                      {expanded && (
                        <PainelProducao
                          key={`prod-${lanc.id}`}
                          lancamento={lanc}
                          producoes={prodLanc}
                          servicos={servicos}
                          folhaClosed={folhaClosed}
                          folhaId={folhaId!}
                          tipo={tipo}
                          onRefresh={() => refetch()}
                        />
                      )}
                    </>
                  );
                })
              )}
            </tbody>

            {/* Rodapé de totais */}
            {lancamentos.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[var(--border-medium)] bg-[var(--surface-base)]">
                  <td colSpan={14} className="px-3 py-2.5 text-right font-semibold text-[var(--text-secondary)] text-[var(--font-size-small)]">
                    TOTAL GERAL
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums font-bold text-[var(--text-primary)] text-[var(--font-size-small)]">
                    {fmt(detalhe?.totais.proventos ?? 0)}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums font-bold text-[var(--text-primary)] text-[var(--font-size-small)]">
                    {fmt(detalhe?.totais.descontos ?? 0)}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums font-bold text-[var(--color-primary)] text-[var(--font-size-small)]">
                    {fmt(detalhe?.totais.liquido ?? 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Modal Reabrir */}
      {modalReabrir && (
        <div
          className="modal-overlay fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setModalReabrir(false)}
        >
          <Card className="modal-content w-full max-w-md" padding="lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                Reabrir Folha
              </h2>
              <button
                type="button"
                onClick={() => setModalReabrir(false)}
                className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)]"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-3 rounded-[var(--radius-md)] bg-amber-50 border border-amber-200">
                <p className="text-[var(--font-size-small)] text-amber-800">
                  Esta ação reabrirá a folha para edição. O motivo será registrado no log imutável da folha.
                </p>
              </div>

              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Motivo da reabertura *
                </label>
                <textarea
                  value={motivoReabrir}
                  onChange={(e) => setMotivoReabrir(e.target.value)}
                  rows={3}
                  placeholder="Descreva o motivo da reabertura..."
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none"
                />
              </div>

              {reabrirMutation.isError && (
                <p className="text-xs text-[var(--color-error)]">
                  {reabrirMutation.error instanceof Error
                    ? reabrirMutation.error.message
                    : "Erro ao reabrir folha"}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => reabrirMutation.mutate()}
                  disabled={!motivoReabrir.trim() || reabrirMutation.isPending}
                >
                  {reabrirMutation.isPending ? "Reabrindo..." : "Confirmar Reabertura"}
                </Button>
                <Button variant="secondary" onClick={() => setModalReabrir(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
