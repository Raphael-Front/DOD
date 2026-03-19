"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import {
  FileText,
  Users,
  AlertTriangle,
  ClipboardList,
  Camera,
  MapPin,
  ChevronDown,
  Download,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui";

type ReporteTipo =
  | "diario_completo"
  | "efetivo"
  | "ocorrencias"
  | "servicos"
  | "registro_fotografico"
  | "visitas";

const REPORTS: Array<{
  id: ReporteTipo;
  label: string;
  desc: string;
  icon: typeof FileText;
  formatos: ("pdf" | "excel")[];
  perfis: string[];
}> = [
  {
    id: "diario_completo",
    label: "Diário Completo",
    desc: "Por data ou período",
    icon: FileText,
    formatos: ["pdf"],
    perfis: ["admin", "coordenador", "operador_obra", "leitura"],
  },
  {
    id: "efetivo",
    label: "Efetivo de Mão de Obra",
    desc: "Resumo de funcionários e terceirizados",
    icon: Users,
    formatos: ["pdf", "excel"],
    perfis: ["admin", "coordenador"],
  },
  {
    id: "ocorrencias",
    label: "Ocorrências do Período",
    desc: "Eventos que impactam a execução",
    icon: AlertTriangle,
    formatos: ["pdf"],
    perfis: ["admin", "coordenador", "operador_obra", "leitura"],
  },
  {
    id: "servicos",
    label: "Serviços Executados",
    desc: "Atividades realizadas no período",
    icon: ClipboardList,
    formatos: ["pdf"],
    perfis: ["admin", "coordenador", "operador_obra", "leitura"],
  },
  {
    id: "registro_fotografico",
    label: "Registro Fotográfico",
    desc: "Fotos e anexos do período",
    icon: Camera,
    formatos: ["pdf"],
    perfis: ["admin", "coordenador", "operador_obra", "leitura"],
  },
  {
    id: "visitas",
    label: "Visitas do Período",
    desc: "Visitas técnicas, vistorias, etc.",
    icon: MapPin,
    formatos: ["pdf"],
    perfis: ["admin", "coordenador"],
  },
];

async function fetchObras() {
  const supabase = createClient();
  const { data } = await supabase
    .from("dim_obras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}

export default function RelatoriosPage() {
  const { profile } = useAuth();
  const [obraId, setObraId] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const periodoRef = useRef<HTMLDivElement>(null);

  const { data: obras = [] } = useQuery({
    queryKey: ["obras"],
    queryFn: fetchObras,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) {
        setPeriodoOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const reportsByProfile = REPORTS.filter((r) =>
    r.perfis.includes(profile?.perfil ?? "leitura")
  );

  const periodoLabel =
    dataInicio && dataFim
      ? `${format(dataInicio, "dd/MM/yyyy", { locale: ptBR })} — ${format(dataFim, "dd/MM/yyyy", { locale: ptBR })}`
      : "Selecione o período";

  const handleExport = async (
    tipo: ReporteTipo,
    formato: "pdf" | "excel"
  ) => {
    const params = new URLSearchParams();
    if (obraId) params.set("obraId", obraId);
    if (dataInicio) params.set("dataInicio", format(dataInicio, "yyyy-MM-dd"));
    if (dataFim) params.set("dataFim", format(dataFim, "yyyy-MM-dd"));
    const res = await fetch(
      `/api/relatorios/${tipo}?${params.toString()}&formato=${formato}`
    );
    if (!res.ok) {
      const err = await res.text();
      alert(err || "Erro ao gerar relatório");
      return;
    }
    const blob = await res.blob();
    const ext = formato === "pdf" ? "pdf" : "xlsx";
    const nome = `relatorio_${tipo}_${format(new Date(), "yyyy-MM-dd")}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-7 min-h-full">
      <div>
        <h1 className="page-title">
          Relatórios
        </h1>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
          Exporte relatórios em PDF e Excel
        </p>
      </div>

      <Card>
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">
          Filtros
        </h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--font-size-mini)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Obra
            </label>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] min-w-[200px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            >
              <option value="">Todas</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
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
              className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] min-w-[240px] flex items-center justify-between gap-2"
            >
              <span>{periodoLabel}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform ${periodoOpen ? "rotate-180" : ""}`}
              />
            </button>
            {periodoOpen && (
              <div className="absolute top-full left-0 mt-1 z-[var(--z-dropdown)] bg-[var(--surface-card)] rounded-xl border border-[var(--border-light)] shadow-lg p-4">
                <DayPicker
                  mode="range"
                  selected={
                    dataInicio && dataFim
                      ? { from: dataInicio, to: dataFim }
                      : dataInicio
                        ? { from: dataInicio, to: undefined }
                        : undefined
                  }
                  onSelect={(range) => {
                    if (range?.from) {
                      setDataInicio(range.from);
                      setDataFim(range.to ?? undefined);
                      if (range.to) setPeriodoOpen(false);
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={1}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportsByProfile.map((r) => {
          const Icon = r.icon;
          return (
            <Card
              key={r.id}
              className="flex flex-col rounded-[14px] border border-[#e2e8f0] p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-[#cbd5e1] transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#f1f5f9] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {r.label}
                  </h3>
                  <p className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
                    {r.desc}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-auto pt-3">
                {r.formatos.map((f) => (
                  <ExportButton
                    key={f}
                    formato={f}
                    onExport={() => handleExport(r.id, f)}
                    disabled={!dataInicio || !dataFim}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ExportButton({
  formato,
  onExport,
  disabled,
}: {
  formato: "pdf" | "excel";
  onExport: () => Promise<void>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  };
  const isPdf = formato === "pdf";
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-2 py-[3px] rounded-[6px] text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${
        isPdf ? "bg-[#fee2e2] text-[#dc2626]" : "bg-[#dcfce7] text-[#16a34a]"
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
      ) : (
        <Download className="w-4 h-4" strokeWidth={2} />
      )}
      {formato === "pdf" ? "PDF" : "Excel"}
    </button>
  );
}
