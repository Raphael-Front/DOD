"use client";

import { useState } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import {
  ArrowLeft,
  Cloud,
  Users,
  UsersRound,
  Wrench,
  ClipboardList,
  MapPin,
  AlertTriangle,
  Camera,
  FileText,
  Copy,
  Check,
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  X,
  Search,
} from "lucide-react";

// Módulos conforme PRD — US-001
const MODULOS = [
  { id: "clima", label: "Clima", icon: Cloud, clonavel: false },
  { id: "mao_obra_propria", label: "Equipe Própria", icon: Users, clonavel: true },
  { id: "mao_obra_terceirizada", label: "Equipe Terceirizada", icon: UsersRound, clonavel: true },
  { id: "equipamentos", label: "Equipamentos", icon: Wrench, clonavel: true },
  { id: "servicos", label: "Serviços Executados", icon: ClipboardList, clonavel: false },
  { id: "visitas", label: "Visitas", icon: MapPin, clonavel: false },
  { id: "ocorrencias", label: "Ocorrências", icon: AlertTriangle, clonavel: false },
  { id: "fotos", label: "Fotos e Anexos", icon: Camera, clonavel: false },
  { id: "observacoes", label: "Observações Gerais", icon: FileText, clonavel: false },
] as const;

const MODULOS_CLONAVEIS = MODULOS.filter((m) => m.clonavel);

// Condições de clima — PRD 3.3
const CONDICOES_CLIMA = [
  "Ensolarado",
  "Parcialmente Nublado",
  "Nublado",
  "Garoa",
  "Chuva Leve",
  "Chuva Forte",
  "Tempestade",
];

// Tipos de visita — PRD 3.3
const TIPOS_VISITA = [
  "Técnica",
  "Diretoria",
  "Projetos",
  "Vistoria de Qualidade",
  "Fiscalização",
  "Cliente",
  "Reunião",
  "Planejamento",
];

// Severidade ocorrência — PRD 3.3
const SEVERIDADES = ["Baixa", "Média", "Alta"];

type ModuloId = (typeof MODULOS)[number]["id"];

async function fetchObras() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_obras")
    .select("id, nome")
    .eq("ativo", true)
    .not("status", "in", '("paralisada","concluida","cancelada")')
    .order("nome");
  if (error) return [];
  return data ?? [];
}

async function checkDiarioExistente(obraId: string, data: string) {
  const supabase = createClient();
  const { data: existente, error } = await supabase
    .from("fato_diarios")
    .select("id")
    .eq("obra_id", obraId)
    .eq("data_diario", data)
    .maybeSingle();
  if (error) return null;
  return existente;
}

async function criarDiario(obraId: string, data: string, retroativo: boolean, justificativa: string) {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) throw new Error("Usuário não autenticado");

  // dim_perfis.id = auth.users.id (referência direta)
  const { data: novo, error } = await supabase
    .from("fato_diarios")
    .insert({
      obra_id: obraId,
      data_diario: data,
      status: "rascunho",
      retroativo: retroativo,
      justificativa_retro: retroativo ? justificativa : null,
      criado_por: user.user.id,
    })
    .select("id")
    .single();

  if (error) throw error;
  return novo.id;
}

export default function NovoDiarioPage() {
  const queryClient = useQueryClient();

  const [fase, setFase] = useState<"config" | "preenchimento">("config");
  const [obraId, setObraId] = useState<string>("");
  const [retroativo, setRetroativo] = useState(false);
  const [dataRetroativa, setDataRetroativa] = useState<Date | undefined>(subDays(new Date(), 1));
  const [justificativaRetro, setJustificativaRetro] = useState("");
  const [modulosSelecionados, setModulosSelecionados] = useState<Set<ModuloId>>(new Set());
  const [clonarAnterior, setClonarAnterior] = useState(false);
  const [modulosClonar, setModulosClonar] = useState<Set<ModuloId>>(new Set());
  const [diarioId, setDiarioId] = useState<string | null>(null);
  const [erroDuplicata, setErroDuplicata] = useState<string | null>(null);

  // Dados do formulário de preenchimento
  const [clima, setClima] = useState({ condicao: "", impacto: false, observacao: "" });
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [modulosExpandidos, setModulosExpandidos] = useState<Set<ModuloId>>(new Set(["clima"]));

  // Mão de obra própria
  const [mopFuncDropdownOpen, setMopFuncDropdownOpen] = useState(false);
  const [mopFuncsSelecionadas, setMopFuncsSelecionadas] = useState<Set<string>>(new Set());
  const [mopFuncExpandida, setMopFuncExpandida] = useState<string | null>(null);
  const [mopFuncBusca, setMopFuncBusca] = useState("");

  const hoje = new Date();
  const dataDiario = retroativo ? (dataRetroativa ?? subDays(hoje, 1)) : hoje;
  const dataFormatada = dataDiario ? format(dataDiario, "dd/MM/yyyy", { locale: ptBR }) : "";

  const { data: obras = [] } = useQuery({
    queryKey: ["obras"],
    queryFn: fetchObras,
  });

  const { data: funcoesDisponiveis = [] } = useQuery({
    queryKey: ["dim-funcoes"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_funcoes").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  const { data: mopRegistros = [] } = useQuery({
    queryKey: ["mop-novo", diarioId],
    queryFn: async () => {
      if (!diarioId) return [];
      const supabase = createClient();
      const { data: mop } = await supabase
        .from("fato_mao_obra_propria")
        .select("id, nome_colaborador, funcao_id")
        .eq("diario_id", diarioId);
      const funcaoIds = [...new Set((mop ?? []).map((r) => r.funcao_id).filter(Boolean))];
      const funcoesData = funcaoIds.length
        ? (await supabase.from("dim_funcoes").select("id, nome").in("id", funcaoIds)).data ?? []
        : [];
      const funcaoMap = Object.fromEntries(funcoesData.map((f) => [f.id, f.nome]));
      return (mop ?? []).map((r) => ({
        row_id: r.id,
        nome_colaborador: r.nome_colaborador,
        funcao_id: r.funcao_id ?? undefined,
        funcao_nome: r.funcao_id ? funcaoMap[r.funcao_id] : undefined,
      }));
    },
    enabled: !!diarioId,
  });

  const { data: colaboradoresDaFuncao = [] } = useQuery({
    queryKey: ["colaboradores-por-funcao", mopFuncExpandida],
    queryFn: async () => {
      if (!mopFuncExpandida) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("d_colaboradores")
        .select("id, nome")
        .eq("status", "ativo")
        .is("deleted_at", null)
        .order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
    enabled: !!mopFuncExpandida,
  });

  const mutationAdicionarMop = useMutation({
    mutationFn: async (colaborador: { id: string; nome: string }) => {
      if (!diarioId) throw new Error("Diário não encontrado.");
      const supabase = createClient();
      const { error } = await supabase.from("fato_mao_obra_propria").insert({
        diario_id: diarioId,
        colaborador_id: colaborador.id,
        nome_colaborador: colaborador.nome,
        funcao_id: mopFuncExpandida,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mop-novo", diarioId] });
      toast.success("Colaborador adicionado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationRemoverMop = useMutation({
    mutationFn: async (rowId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("fato_mao_obra_propria").delete().eq("id", rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mop-novo", diarioId] });
      toast.success("Colaborador removido.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleModulo = (id: ModuloId) => {
    setModulosSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClonarModulo = (id: ModuloId) => {
    setModulosClonar((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandir = (id: ModuloId) => {
    setModulosExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCriar = async () => {
    setErroDuplicata(null);
    if (!obraId) return;
    const dataStr = format(dataDiario, "yyyy-MM-dd");

    const existente = await checkDiarioExistente(obraId, dataStr);
    if (existente) {
      setErroDuplicata(`Já existe um diário para esta obra nesta data.`);
      return;
    }

    if (retroativo && justificativaRetro.length < 20) return;

    try {
      const id = await criarDiario(obraId, dataStr, retroativo, justificativaRetro);
      setDiarioId(id);
      setFase("preenchimento");
    } catch (e) {
      console.error(e);
      setErroDuplicata("Erro ao criar diário. Tente novamente.");
    }
  };

  const containerClass = "flex flex-col gap-8 min-h-full";

  // ─── FASE 1: Configuração (seleção de módulos) ───
  if (fase === "config") {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-4">
          <Link
            href="/diarios"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            Voltar
          </Link>
        </div>

        <div>
          <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)] tracking-[var(--letter-spacing-tight)]">
            Novo Diário de Obra
          </h1>
          <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
            Selecione os módulos a preencher e, se desejar, clone dados do dia anterior
          </p>
        </div>

        {/* Controle de Data — PRD RN01, RN02 */}
        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-light)] shadow-[var(--shadow-card)] p-6">
          <h2 className="text-[var(--font-size-body)] font-semibold text-[var(--text-primary)] mb-4">Data do diário</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">Data:</span>
              <span className="text-[var(--font-size-body)] font-semibold text-[var(--text-primary)]">{dataFormatada}</span>
              <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">(dia corrente)</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={retroativo}
                onChange={(e) => setRetroativo(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-medium)]"
              />
              <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">Registro Retroativo</span>
            </label>
            {retroativo && (
              <>
                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Data do registro retroativo
                  </label>
                  <DayPicker
                    mode="single"
                    selected={dataRetroativa}
                    onSelect={(d) => setDataRetroativa(d)}
                    locale={ptBR}
                    disabled={{ after: subDays(hoje, 1) }}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-light)] p-4 bg-[var(--surface-card)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Justificativa (mín. 20 caracteres) *
                  </label>
                  <textarea
                  value={justificativaRetro}
                  onChange={(e) => setJustificativaRetro(e.target.value)}
                  placeholder="Informe o motivo do registro retroativo..."
                  className="w-full min-h-[80px] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
                  maxLength={500}
                />
                <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">{justificativaRetro.length}/20</span>
              </div>
              </>
            )}
          </div>
        </div>

        {/* Seletor de Obra */}
        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-light)] shadow-[var(--shadow-card)] p-6">
          <h2 className="text-[var(--font-size-body)] font-semibold text-[var(--text-primary)] mb-4">Obra</h2>
          <select
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
            className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] min-w-[280px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          >
            <option value="">Selecione a obra</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Clonar do dia anterior — PRD US-002 */}
        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-light)] shadow-[var(--shadow-card)] p-6">
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={clonarAnterior}
              onChange={(e) => setClonarAnterior(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-medium)]"
            />
            <Copy className="w-4 h-4 text-[var(--color-accent-blue)]" strokeWidth={2} />
            <span className="text-[var(--font-size-small)] font-semibold text-[var(--text-primary)]">Clonar módulos do dia anterior</span>
          </label>
          {clonarAnterior && (
            <p className="text-[var(--font-size-mini)] text-[var(--text-tertiary)] mb-4">
              Módulos clonáveis: Equipe Própria, Terceirizada, Equipamentos
            </p>
          )}
          {clonarAnterior && (
            <div className="flex flex-wrap gap-2">
              {MODULOS_CLONAVEIS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleClonarModulo(m.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border transition-colors ${
                    modulosClonar.has(m.id)
                      ? "bg-[var(--color-primary-subtle)] border-[var(--color-accent-blue)] text-[var(--color-primary)]"
                      : "bg-[var(--surface-card)] border-[var(--border-light)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {modulosClonar.has(m.id) ? (
                    <Check className="w-4 h-4" strokeWidth={2} />
                  ) : (
                    <div className="w-4 h-4 rounded border border-current" />
                  )}
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de cards — módulos — PRD US-001 */}
        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-light)] shadow-[var(--shadow-card)] p-6">
          <h2 className="text-[var(--font-size-body)] font-semibold text-[var(--text-primary)] mb-4">
            Selecione os módulos a preencher
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {MODULOS.map((m) => {
              const Icon = m.icon;
              const ativo = modulosSelecionados.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModulo(m.id)}
                  className={`relative rounded-[14px] border-2 transition-all overflow-hidden flex flex-col items-center justify-center text-center py-6 px-4 touch-manipulation ${
                    ativo
                      ? "bg-[rgba(46,168,168,0.05)] border-[var(--color-accent-teal)]"
                      : "border-[#e2e8f0] hover:border-[#94a3b8] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  }`}
                >
                  {ativo && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-accent-teal)] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                  <div className="w-7 h-7 flex items-center justify-center mb-2.5">
                    <Icon className={`w-7 h-7 ${ativo ? "text-[var(--color-accent-teal)]" : "text-[#374151]"}`} strokeWidth={2} />
                  </div>
                  <span
                    className={`text-[13px] font-semibold text-[#374151]`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {erroDuplicata && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--color-error-bg)] text-[var(--color-error)] text-[var(--font-size-small)]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {erroDuplicata}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCriar}
            disabled={!obraId || modulosSelecionados.size === 0 || (retroativo && justificativaRetro.length < 20)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity bg-[var(--color-primary)] shadow-[var(--shadow-btn-primary)]"
          >
            Criar e preencher
          </button>
          <Link
            href="/diarios"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] font-medium border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </div>
    );
  }

  // ─── FASE 2: Preenchimento (execução do diário) ───
  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/diarios"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            Voltar
          </Link>
          <span className="text-[var(--text-disabled)]">|</span>
          <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">
            Diário · {dataFormatada} · Rascunho
          </span>
        </div>
      </div>

      <div>
        <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)] tracking-[var(--letter-spacing-tight)]">
          Preenchimento do Diário
        </h1>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
          Preencha os módulos selecionados. Você pode salvar como rascunho e continuar depois.
        </p>
      </div>

      {/* Módulos expansíveis */}
      <div className="flex flex-col gap-3 md:max-w-[720px] md:mx-auto xl:max-w-none xl:mx-0">
        {MODULOS.filter((m) => modulosSelecionados.has(m.id)).map((m) => {
          const Icon = m.icon;
          const expandido = modulosExpandidos.has(m.id);
          return (
            <div
              key={m.id}
              className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleExpandir(m.id)}
                className="w-full flex items-center justify-between px-5 py-[18px] text-left hover:bg-[var(--surface-card-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
                  </div>
                  <span className="text-[15px] font-semibold text-[var(--text-primary)]">{m.label}</span>
                </div>
                <span className="transition-transform duration-200" style={{ transform: expandido ? "rotate(-90deg)" : "rotate(0deg)" }}>
                  <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" strokeWidth={2} />
                </span>
              </button>

              {expandido && (
                <div className="p-5 border-t border-[#f1f5f9]">
                  {m.id === "clima" && (
                    <div className="pt-4 flex flex-col gap-4">
                      <div>
                        <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                          Condição climática
                        </label>
                        <select
                          value={clima.condicao}
                          onChange={(e) => setClima((c) => ({ ...c, condicao: e.target.value }))}
                          className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] w-full max-w-xs"
                        >
                          <option value="">Selecione</option>
                          {CONDICOES_CLIMA.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={clima.impacto}
                            onChange={(e) => setClima((c) => ({ ...c, impacto: e.target.checked }))}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">
                            O clima impactou a execução?
                          </span>
                        </label>
                      </div>
                      {clima.impacto && (
                        <div>
                          <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                            Observação (obrigatório quando Sim)
                          </label>
                          <textarea
                            value={clima.observacao}
                            onChange={(e) => setClima((c) => ({ ...c, observacao: e.target.value }))}
                            placeholder="Descreva o impacto..."
                            className="w-full min-h-[80px] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-[var(--font-size-small)]"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {m.id === "mao_obra_propria" && (() => {
                    const funcoesNosDados = new Set(
                      mopRegistros.map((r) => r.funcao_id).filter((fid): fid is string => !!fid)
                    );
                    const todasFuncoesSelecionadas = new Set([...funcoesNosDados, ...mopFuncsSelecionadas]);

                    return (
                      <div className="pt-4 flex flex-col gap-4">

                        {/* Botão abrir modal de funções */}
                        <div>
                          <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                            Função
                          </label>
                          <button
                            type="button"
                            onClick={() => { setMopFuncDropdownOpen(true); setMopFuncBusca(""); }}
                            className="w-full flex items-center justify-between h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-secondary)] hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                          >
                            <span>
                              {todasFuncoesSelecionadas.size > 0
                                ? `${todasFuncoesSelecionadas.size} função${todasFuncoesSelecionadas.size > 1 ? "ões" : ""} selecionada${todasFuncoesSelecionadas.size > 1 ? "s" : ""}`
                                : "— Selecione as funções —"
                              }
                            </span>
                            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
                          </button>
                        </div>

                        {/* Lista de Funções com Quantidade */}
                        {todasFuncoesSelecionadas.size > 0 && (
                          <div className="rounded-[var(--radius-md)] border border-[var(--border-light)] overflow-hidden">
                            <div className="grid grid-cols-[1fr_auto] items-center px-3 py-2 bg-[var(--surface-card-hover)] border-b border-[var(--border-light)]">
                              <span className="text-[var(--font-size-mini)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Função</span>
                              <span className="text-[var(--font-size-mini)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide text-right pr-1">Qtd</span>
                            </div>
                            {funcoesDisponiveis
                              .filter((f) => todasFuncoesSelecionadas.has(f.id))
                              .map((f) => {
                                const registrosDaFuncao = mopRegistros.filter((r) => r.funcao_id === f.id);
                                const qtd = registrosDaFuncao.length;
                                const estaExpandida = mopFuncExpandida === f.id;

                                return (
                                  <div key={f.id} className="border-b border-[var(--border-light)] last:border-b-0">
                                    <button
                                      type="button"
                                      onClick={() => setMopFuncExpandida(estaExpandida ? null : f.id)}
                                      className="w-full grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface-card-hover)] transition-colors text-left"
                                    >
                                      <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">{f.nome}</span>
                                      <span className={`text-[var(--font-size-small)] font-semibold min-w-[28px] text-center tabular-nums ${qtd > 0 ? "text-[var(--color-primary)]" : "text-[var(--text-tertiary)]"}`}>
                                        {qtd}
                                      </span>
                                      <ChevronRight
                                        className="w-4 h-4 text-[var(--text-tertiary)] transition-transform"
                                        style={{ transform: estaExpandida ? "rotate(90deg)" : "rotate(0deg)" }}
                                        strokeWidth={2}
                                      />
                                    </button>

                                    {estaExpandida && (
                                      <div className="border-t border-[var(--border-light)] bg-[var(--surface-page)] px-3 py-3 flex flex-col gap-2">
                                        {registrosDaFuncao.length > 0 && (
                                          <ul className="flex flex-col gap-1 mb-1">
                                            {registrosDaFuncao.map((r) => (
                                              <li key={r.row_id} className="flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)]">
                                                <div className="flex items-center gap-2">
                                                  <Check className="w-3.5 h-3.5 text-[var(--color-primary)]" strokeWidth={2.5} />
                                                  <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">{r.nome_colaborador}</span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => mutationRemoverMop.mutate(r.row_id)}
                                                  className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                                                </button>
                                              </li>
                                            ))}
                                          </ul>
                                        )}

                                        {colaboradoresDaFuncao.length === 0 ? (
                                          <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] text-center py-2">
                                            Nenhum colaborador cadastrado.{" "}
                                            <a href="/colaboradores" className="text-[var(--color-primary)] hover:underline">Cadastrar</a>
                                          </p>
                                        ) : (
                                          <ul className="flex flex-col gap-1">
                                            {colaboradoresDaFuncao
                                              .filter((c) => !registrosDaFuncao.some((r) => r.nome_colaborador === c.nome))
                                              .map((c) => (
                                                <li key={c.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-card-hover)]">
                                                  <span className="text-[var(--font-size-small)] text-[var(--text-primary)]">{c.nome}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => mutationAdicionarMop.mutate(c)}
                                                    disabled={mutationAdicionarMop.isPending}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-[var(--font-size-mini)] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
                                                  >
                                                    <Plus className="w-3 h-3" strokeWidth={2.5} />
                                                    Adicionar
                                                  </button>
                                                </li>
                                              ))}
                                            {colaboradoresDaFuncao.every((c) => registrosDaFuncao.some((r) => r.nome_colaborador === c.nome)) && colaboradoresDaFuncao.length > 0 && (
                                              <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] text-center py-1">
                                                Todos os colaboradores já foram adicionados.
                                              </p>
                                            )}
                                          </ul>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {m.id === "mao_obra_terceirizada" && (
                    <div className="pt-4">
                      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-4">
                        Lançamento manual por fornecedor: empresa, quantidade e função.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)]"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar fornecedor
                      </button>
                    </div>
                  )}

                  {m.id === "equipamentos" && (
                    <div className="pt-4">
                      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-4">
                        Registro de equipamentos próprios e locados. Status: Operando / Parado / Em Manutenção.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)]"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar equipamento
                      </button>
                    </div>
                  )}

                  {m.id === "servicos" && (
                    <div className="pt-4">
                      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-4">
                        Serviço com local estruturado (Bloco + Pavimento + Área/Apto). Múltiplos locais por serviço.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)]"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar serviço
                      </button>
                    </div>
                  )}

                  {m.id === "visitas" && (
                    <div className="pt-4">
                      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-4">
                        Tipo: Técnica, Diretoria, Projetos, Vistoria, Fiscalização, Cliente, Reunião, Planejamento.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)]"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar visita
                      </button>
                    </div>
                  )}

                  {m.id === "ocorrencias" && (
                    <div className="pt-4">
                      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-4">
                        Tipo, descrição, severidade (Baixa/Média/Alta), impacto, fotos.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)]"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar ocorrência
                      </button>
                    </div>
                  )}

                  {m.id === "fotos" && (
                    <div className="pt-4">
                      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-4">
                        Captura pela câmera ou upload. Legenda obrigatória.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)]"
                      >
                        <Camera className="w-4 h-4" />
                        Capturar foto
                      </button>
                      <button
                        type="button"
                        className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] text-[var(--font-size-small)]"
                      >
                        <Upload className="w-4 h-4" />
                        Upload de arquivo
                      </button>
                    </div>
                  )}

                  {m.id === "observacoes" && (
                    <div className="pt-4">
                      <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                        Observações gerais
                      </label>
                      <textarea
                        value={observacoesGerais}
                        onChange={(e) => setObservacoesGerais(e.target.value)}
                        placeholder="Anotações que não se enquadram nos módulos estruturados..."
                        className="w-full min-h-[120px] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-[var(--font-size-small)]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] font-medium text-white bg-[var(--color-primary)] shadow-[var(--shadow-btn-primary)]"
        >
          Salvar rascunho
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] font-medium text-white bg-[var(--color-success)]"
        >
          Enviar para aprovação
        </button>
        <Link
          href="/diarios"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] font-medium border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]"
        >
          Cancelar
        </Link>
      </div>

      {/* MODAL: Selecionar Funções (Equipe Própria) */}
      {mopFuncDropdownOpen && (() => {
        const funcoesNosDadosModal = new Set(
          mopRegistros.map((r) => r.funcao_id).filter((fid): fid is string => !!fid)
        );
        const todasSelecionadasModal = new Set([...funcoesNosDadosModal, ...mopFuncsSelecionadas]);
        const funcoesFiltradas = funcoesDisponiveis.filter((f) =>
          f.nome.toLowerCase().includes(mopFuncBusca.toLowerCase())
        );
        const todosChecked = funcoesFiltradas.length > 0 && funcoesFiltradas.every((f) => todasSelecionadasModal.has(f.id));

        return (
          <div
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => e.target === e.currentTarget && setMopFuncDropdownOpen(false)}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden max-h-[85vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
                <div>
                  <h3 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">Selecionar funções</h3>
                  <p className="text-[var(--font-size-mini)] text-[var(--text-tertiary)] mt-0.5">
                    {todasSelecionadasModal.size > 0
                      ? `${todasSelecionadasModal.size} selecionada${todasSelecionadasModal.size > 1 ? "s" : ""}`
                      : "Nenhuma selecionada"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMopFuncDropdownOpen(false)}
                  className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)]"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              <div className="px-4 py-3 border-b border-[var(--border-light)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder="Buscar função..."
                    value={mopFuncBusca}
                    onChange={(e) => setMopFuncBusca(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-3 h-9 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                <label className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-card-hover)] cursor-pointer border-b border-[var(--border-light)]">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[var(--color-primary)]"
                    checked={todosChecked}
                    onChange={(e) => {
                      setMopFuncsSelecionadas((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          funcoesFiltradas.forEach((f) => next.add(f.id));
                        } else {
                          funcoesFiltradas.forEach((f) => {
                            if (!funcoesNosDadosModal.has(f.id)) next.delete(f.id);
                          });
                        }
                        return next;
                      });
                    }}
                  />
                  <span className="text-[var(--font-size-small)] font-semibold text-[var(--text-primary)]">Selecionar todos</span>
                </label>

                {funcoesFiltradas.map((f) => (
                  <label key={f.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-card-hover)] cursor-pointer border-b border-[var(--border-light)] last:border-b-0">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-[var(--color-primary)]"
                      checked={todasSelecionadasModal.has(f.id)}
                      onChange={(e) => {
                        setMopFuncsSelecionadas((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            next.add(f.id);
                          } else if (!funcoesNosDadosModal.has(f.id)) {
                            next.delete(f.id);
                          }
                          return next;
                        });
                      }}
                    />
                    <span className="text-[var(--font-size-small)] text-[var(--text-primary)]">{f.nome}</span>
                  </label>
                ))}

                {funcoesFiltradas.length === 0 && (
                  <div className="px-5 py-8 text-center text-[var(--font-size-small)] text-[var(--text-tertiary)]">
                    Nenhuma função encontrada.
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-[var(--border-light)] flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setMopFuncDropdownOpen(false);
                    setMopFuncBusca("");
                  }}
                >
                  <Check className="size-4" />
                  Confirmar seleção
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMopFuncDropdownOpen(false);
                    setMopFuncBusca("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
