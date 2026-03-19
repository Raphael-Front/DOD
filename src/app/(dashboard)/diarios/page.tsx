"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar,
  CalendarDays,
  FileCheck,
  FilterX,
  ChevronDown,
  Plus,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { KpiCard, Badge, Skeleton } from "@/components/ui";

type SituacaoFilter = "em_preenchimento" | "aprovado" | null;

const SITUACAO_OPTIONS: { value: SituacaoFilter; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "em_preenchimento", label: "Em preenchimento" },
  { value: "aprovado", label: "Aprovado" },
];

function formatDateForSupabase(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

async function fetchDiariosCount(
  situacao: SituacaoFilter,
  dataInicio: Date | null,
  dataFim: Date | null,
  onlyAprovados: boolean
): Promise<number> {
  const supabase = createClient();
  let query = supabase
    .from("fato_diarios")
    .select("id", { count: "exact", head: true });

  if (onlyAprovados) {
    query = query.eq("status", "aprovado");
  } else if (situacao === "em_preenchimento") {
    query = query.in("status", [
      "rascunho",
      "aguardando_aprovacao",
      "devolvido",
    ]);
  } else if (situacao === "aprovado") {
    query = query.eq("status", "aprovado");
  }

  if (dataInicio) {
    query = query.gte("data_diario", formatDateForSupabase(dataInicio));
  }
  if (dataFim) {
    query = query.lte("data_diario", formatDateForSupabase(dataFim));
  }

  const { count, error } = await query;

  if (error) {
    console.error("Erro ao buscar diários:", error);
    return 0;
  }
  return count ?? 0;
}

type DiarioRow = {
  id: string;
  obra_id: string;
  data_diario: string;
  status: string;
  retroativo: boolean;
  dim_obras?: { nome: string } | null;
};

async function fetchDiarios(
  situacao: SituacaoFilter,
  dataInicio: Date | null,
  dataFim: Date | null
): Promise<DiarioRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("fato_diarios")
    .select("id, obra_id, data_diario, status, retroativo")
    .order("data_diario", { ascending: false });

  if (situacao === "em_preenchimento") {
    query = query.in("status", ["rascunho", "aguardando_aprovacao", "devolvido"]);
  } else if (situacao === "aprovado") {
    query = query.eq("status", "aprovado");
  }
  if (dataInicio) {
    query = query.gte("data_diario", formatDateForSupabase(dataInicio));
  }
  if (dataFim) {
    query = query.lte("data_diario", formatDateForSupabase(dataFim));
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as DiarioRow[];

  if (rows.length === 0) return [];
  const obraIds = [...new Set(rows.map((r) => r.obra_id))];
  const { data: obras } = await supabase
    .from("dim_obras")
    .select("id, nome")
    .in("id", obraIds);
  const obraMap = Object.fromEntries((obras ?? []).map((o) => [o.id, o.nome]));
  return rows.map((r) => ({
    ...r,
    dim_obras: obraMap[r.obra_id] ? { nome: obraMap[r.obra_id] } : null,
  }));
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  devolvido: "Devolvido",
};

export default function DiariosPage() {
  const [situacao, setSituacao] = useState<SituacaoFilter>(null);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const periodoRef = useRef<HTMLDivElement>(null);

  const dateRange =
    dataInicio && dataFim
      ? { from: dataInicio, to: dataFim }
      : dataInicio
        ? { from: dataInicio, to: undefined }
        : undefined;

  const { data: totalCount = 0, isLoading: loadingTotal } = useQuery({
    queryKey: ["diarios-total", situacao, dataInicio, dataFim],
    queryFn: () => fetchDiariosCount(situacao, dataInicio, dataFim, false),
  });

  const { data: aprovadosCount = 0, isLoading: loadingAprovados } = useQuery({
    queryKey: ["diarios-aprovados", situacao, dataInicio, dataFim],
    queryFn: () => fetchDiariosCount(situacao, dataInicio, dataFim, true),
  });

  const { data: diarios = [], isLoading: loadingList } = useQuery({
    queryKey: ["diarios-list", situacao, dataInicio, dataFim],
    queryFn: () => fetchDiarios(situacao, dataInicio, dataFim),
  });

  const limparFiltros = () => {
    setSituacao(null);
    setDataInicio(null);
    setDataFim(null);
    setPeriodoOpen(false);
  };

  const temFiltrosAtivos =
    situacao !== null || dataInicio !== null || dataFim !== null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        periodoRef.current &&
        !periodoRef.current.contains(event.target as Node)
      ) {
        setPeriodoOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const periodoLabel =
    dataInicio && dataFim
      ? `${format(dataInicio, "dd/MM/yyyy", { locale: ptBR })} — ${format(dataFim, "dd/MM/yyyy", { locale: ptBR })}`
      : dataInicio
        ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR })
        : "Selecione o período";

  return (
    <div className="flex flex-col gap-7 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">
            Diários de Obra
          </h1>
          <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
            Listagem e gestão de diários
          </p>
        </div>
        <Link
          href="/diarios/novo"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] font-medium text-white transition-all bg-[var(--color-primary)] shadow-[var(--shadow-btn-primary)] hover:opacity-90"
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
          Novo
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--font-size-mini)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Situação
            </label>
            <select
              value={situacao ?? ""}
              onChange={(e) =>
                setSituacao((e.target.value || null) as SituacaoFilter)
              }
              className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
            >
              {SITUACAO_OPTIONS.map((opt) => (
                <option key={opt.value ?? "todos"} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 relative" ref={periodoRef}>
            <label className="text-[var(--font-size-mini)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Período
            </label>
            <button
              type="button"
              onClick={() => setPeriodoOpen(!periodoOpen)}
              className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] min-w-[220px] flex items-center justify-between gap-2 hover:bg-[var(--surface-card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
            >
              <span className="flex items-center gap-2 truncate">
                <Calendar className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" strokeWidth={2} />
                {periodoLabel}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-tertiary)] shrink-0 transition-transform ${periodoOpen ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>
            {periodoOpen && (
              <div className="absolute top-full left-0 mt-1 z-[var(--z-dropdown)] bg-[var(--surface-card)] rounded-xl border border-[var(--border-light)] shadow-lg p-4">
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range?.from) {
                      setDataInicio(range.from);
                      setDataFim(range.to ?? null);
                      if (range.from && range.to) {
                        setPeriodoOpen(false);
                      }
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={1}
                  disabled={{ before: new Date(2000, 0, 1) }}
                />
              </div>
            )}
          </div>
        </div>

        {temFiltrosAtivos && (
          <button
            type="button"
            onClick={limparFiltros}
            className="flex items-center gap-2 text-[var(--font-size-small)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors w-fit"
          >
            <FilterX className="w-4 h-4" strokeWidth={2} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          variant="dark"
          label="Diários totais"
          value={loadingTotal ? "—" : totalCount}
          sub="com filtros aplicados"
          icon={<CalendarDays className="w-4 h-4" strokeWidth={2} />}
        />

        <KpiCard
          variant="green"
          label="Diários aprovados"
          value={loadingAprovados ? "—" : aprovadosCount}
          sub="com filtros aplicados"
          icon={<FileCheck className="w-4 h-4" strokeWidth={2} />}
        />
      </div>

      <div className="flex-1 min-h-[200px] rounded-xl border border-[var(--border-light)] bg-[var(--surface-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Obra</th>
                <th className="text-left">Data</th>
                <th className="text-left">Status</th>
                <th className="text-left retroativo-col">Retroativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton className="h-4 w-32" /></td>
                    <td><Skeleton className="h-4 w-24" /></td>
                    <td><Skeleton className="h-5 w-20 rounded-[20px]" /></td>
                    <td className="retroativo-col"><Skeleton className="h-5 w-12 rounded-[20px]" /></td>
                    <td><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))
              ) : diarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Nenhum diário encontrado.</td>
                </tr>
              ) : (
                diarios.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium text-[var(--text-primary)]">
                      {d.dim_obras?.nome ?? "—"}
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {format(parseISO(d.data_diario), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td>
                      <Badge
                        variant={
                          d.status === "aprovado"
                            ? "green"
                            : d.status === "devolvido"
                              ? "orange"
                              : d.status === "aguardando_aprovacao"
                                ? "blue"
                                : "gray"
                        }
                      >
                        {STATUS_LABEL[d.status] ?? d.status}
                      </Badge>
                    </td>
                    <td className="retroativo-col">
                      {d.retroativo ? <Badge variant="orange">Sim</Badge> : <Badge variant="gray">Não</Badge>}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {(d.status === "rascunho" || d.status === "devolvido") && (
                          <Link
                            href={`/diarios/${d.id}/editar`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white text-[var(--font-size-small)] font-medium hover:opacity-90 transition-opacity"
                          >
                            <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                            Editar
                          </Link>
                        )}
                        <Link
                          href={`/diarios/${d.id}`}
                          className="action-link"
                        >
                          Abrir <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
