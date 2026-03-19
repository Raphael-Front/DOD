"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissoes } from "@/hooks/usePermissoes";
import {
  ArrowLeft,
  Cloud,
  Users,
  UsersRound,
  Wrench,
  ClipboardList,
  MapPin,
  ChevronRight,
  Check,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Search,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const CONDICOES_CLIMA = [
  "ensolarado",
  "parcialmente_nublado",
  "nublado",
  "garoa",
  "chuva_leve",
  "chuva_forte",
  "tempestade",
];

const CONDICOES_LABEL: Record<string, string> = {
  ensolarado: "Ensolarado",
  parcialmente_nublado: "Parcialmente nublado",
  nublado: "Nublado",
  garoa: "Garoa",
  chuva_leve: "Chuva leve",
  chuva_forte: "Chuva forte",
  tempestade: "Tempestade",
};

const MODULOS = [
  { id: "clima", label: "Clima", icon: Cloud },
  { id: "mao_obra_propria", label: "Equipe Própria", icon: Users },
  { id: "mao_obra_terceirizada", label: "Equipe Terceirizada", icon: UsersRound },
  { id: "equipamentos", label: "Equipamentos", icon: Wrench },
  { id: "servicos", label: "Serviços Executados", icon: ClipboardList },
  { id: "visitas", label: "Visitas", icon: MapPin },
  { id: "ocorrencias", label: "Ocorrências", icon: AlertTriangle },
];

type DiarioEdit = {
  id: string;
  obra_id: string;
  obra_nome: string;
  data_diario: string;
  status: string;
  retroativo: boolean;
  observacoes_gerais: string | null;
  clima: { condicao: string; impactou_obra: boolean; observacao: string | null } | null;
  mao_obra_propria: Array<{ row_id: string; nome_colaborador: string; funcao_id?: string; funcao_nome?: string }>;
  mao_obra_terceirizada: Array<{ row_id: string; quantidade: number; fornecedor_id?: string; fornecedor_nome?: string; funcao_id?: string; funcao_nome?: string }>;
  equipamentos: Array<{ equipamento_id: string; equipamento_nome?: string; status: string; tipo?: string }>;
  servicos: Array<{ row_id: string; descricao: string; quantidade: number | null; unidade: string | null; local_id?: string; local_nome?: string; funcao_id?: string; servico_nome?: string }>;
  visitas: Array<{ row_id: string; tipo: string; visitantes: string; departamento_id?: string; departamento_nome?: string; departamento_outro?: string; horario_entrada?: string; horario_saida?: string; empresa_origem?: string; pauta?: string }>;
  ocorrencias: Array<{ row_id: string; categoria_id?: string; categoria_nome?: string; tipo_id?: string; tipo_nome?: string; descricao: string; severidade: string }>;
};

async function fetchDiarioEdit(id: string): Promise<DiarioEdit | null> {
  const supabase = createClient();
  const { data: d, error } = await supabase
    .from("fato_diarios")
    .select("id, obra_id, data_diario, status, retroativo, observacoes_gerais")
    .eq("id", id)
    .single();
  if (error || !d) return null;

  const { data: obra } = await supabase.from("dim_obras").select("nome").eq("id", d.obra_id).single();
  const { data: clima } = await supabase.from("fato_clima").select("condicao, impactou_obra, observacao").eq("diario_id", id).maybeSingle();

  const { data: mop } = await supabase.from("fato_mao_obra_propria").select("id, nome_colaborador, funcao_id").eq("diario_id", id);
  const funcaoIds = [...new Set((mop ?? []).map((r) => r.funcao_id).filter(Boolean))];
  const funcoesData = funcaoIds.length ? (await supabase.from("dim_funcoes").select("id, nome").in("id", funcaoIds)).data ?? [] : [];
  const funcaoMap = Object.fromEntries(funcoesData.map((f) => [f.id, f.nome]));

  const { data: mot } = await supabase.from("fato_mao_obra_terceirizada").select("id, quantidade, fornecedor_id, funcao_id").eq("diario_id", id);
  const fornIds = [...new Set((mot ?? []).map((r) => r.fornecedor_id).filter(Boolean))];
  const funcaoIds2 = [...new Set((mot ?? []).map((r) => r.funcao_id).filter(Boolean))];
  const fornsData = fornIds.length ? (await supabase.from("dim_fornecedores").select("id, razao_social").in("id", fornIds)).data ?? [] : [];
  const funcs2Data = funcaoIds2.length ? (await supabase.from("dim_funcoes").select("id, nome").in("id", funcaoIds2)).data ?? [] : [];
  const fornMap = Object.fromEntries(fornsData.map((f) => [f.id, f.razao_social]));
  const funcMap2 = Object.fromEntries(funcs2Data.map((f) => [f.id, f.nome]));

  const { data: feq } = await supabase.from("fato_equipamentos").select("equipamento_id, status").eq("diario_id", id);
  const eqIds = [...new Set((feq ?? []).map((r) => r.equipamento_id).filter(Boolean))];
  const equipsData = eqIds.length ? (await supabase.from("dim_equipamentos").select("id, nome, tipo").in("id", eqIds)).data ?? [] : [];
  const eqMap = Object.fromEntries(equipsData.map((e: { id: string; nome: string; tipo: string }) => [e.id, { nome: e.nome, tipo: e.tipo }]));

  const { data: serv } = await supabase.from("fato_servicos").select("id, descricao, quantidade, unidade, local_id, funcao_id, servico_nome").eq("diario_id", id);
  const localIdsServ = [...new Set((serv ?? []).map((r: { local_id: string | null }) => r.local_id).filter(Boolean))];
  const locaisServData = localIdsServ.length ? (await supabase.from("dim_locais").select("id, nome").in("id", localIdsServ)).data ?? [] : [];
  const localServMap = Object.fromEntries(locaisServData.map((l: { id: string; nome: string }) => [l.id, l.nome]));

  const { data: vis } = await supabase.from("fato_visitas").select("id, tipo, visitantes, departamento_id, departamento_outro, horario_entrada, horario_saida, empresa_origem, pauta").eq("diario_id", id);
  const deptIds = [...new Set((vis ?? []).map((r: { departamento_id: string | null }) => r.departamento_id).filter(Boolean))];
  const deptsData = deptIds.length ? (await supabase.from("dim_departamentos").select("id, nome").in("id", deptIds)).data ?? [] : [];
  const deptMap = Object.fromEntries(deptsData.map((d: { id: string; nome: string }) => [d.id, d.nome]));

  const { data: ocorr } = await supabase.from("fato_ocorrencias").select("id, descricao, severidade, categoria_id, tipo_id").eq("diario_id", id);
  const catIds = [...new Set((ocorr ?? []).map((r: { categoria_id: string | null }) => r.categoria_id).filter(Boolean))];
  const tipoIds = [...new Set((ocorr ?? []).map((r: { tipo_id: string | null }) => r.tipo_id).filter(Boolean))];
  const catsData = catIds.length ? (await supabase.from("dim_categorias_ocorrencias").select("id, nome").in("id", catIds)).data ?? [] : [];
  const tiposData = tipoIds.length ? (await supabase.from("dim_tipos_ocorrencias").select("id, nome").in("id", tipoIds)).data ?? [] : [];
  const catMap = Object.fromEntries(catsData.map((c: { id: string; nome: string }) => [c.id, c.nome]));
  const tipoMap = Object.fromEntries(tiposData.map((t: { id: string; nome: string }) => [t.id, t.nome]));

  return {
    ...d,
    obra_nome: obra?.nome ?? "Obra",
    clima: clima ?? null,
    mao_obra_propria: (mop ?? []).map((r) => ({ row_id: r.id, nome_colaborador: r.nome_colaborador, funcao_id: r.funcao_id ?? undefined, funcao_nome: r.funcao_id ? funcaoMap[r.funcao_id] : undefined })),
    mao_obra_terceirizada: (mot ?? []).map((r) => ({ row_id: r.id, quantidade: r.quantidade, fornecedor_id: r.fornecedor_id ?? undefined, fornecedor_nome: r.fornecedor_id ? fornMap[r.fornecedor_id] : undefined, funcao_id: r.funcao_id ?? undefined, funcao_nome: r.funcao_id ? funcMap2[r.funcao_id] : undefined })),
    equipamentos: (feq ?? []).map((r) => ({ equipamento_id: r.equipamento_id, equipamento_nome: r.equipamento_id ? (eqMap[r.equipamento_id] as { nome: string; tipo: string })?.nome : undefined, tipo: r.equipamento_id ? (eqMap[r.equipamento_id] as { nome: string; tipo: string })?.tipo : undefined, status: r.status })),
    servicos: (serv ?? []).map((r: { id: string; descricao: string; quantidade: number | null; unidade: string | null; local_id: string | null; funcao_id: string | null; servico_nome: string | null }) => ({ row_id: r.id, descricao: r.descricao, quantidade: r.quantidade, unidade: r.unidade, local_id: r.local_id ?? undefined, local_nome: r.local_id ? localServMap[r.local_id] : undefined, funcao_id: r.funcao_id ?? undefined, servico_nome: r.servico_nome ?? undefined })),
    visitas: (vis ?? []).map((r: { id: string; tipo: string; visitantes: string; departamento_id: string | null; departamento_outro: string | null; horario_entrada: string | null; horario_saida: string | null; empresa_origem: string | null; pauta: string | null }) => ({ row_id: r.id, tipo: r.tipo, visitantes: r.visitantes, departamento_id: r.departamento_id ?? undefined, departamento_nome: r.departamento_id ? deptMap[r.departamento_id] : undefined, departamento_outro: r.departamento_outro ?? undefined, horario_entrada: r.horario_entrada ?? undefined, horario_saida: r.horario_saida ?? undefined, empresa_origem: r.empresa_origem ?? undefined, pauta: r.pauta ?? undefined })),
    ocorrencias: (ocorr ?? []).map((r: { id: string; descricao: string; severidade: string; categoria_id: string | null; tipo_id: string | null }) => ({ row_id: r.id, descricao: r.descricao, severidade: r.severidade, categoria_id: r.categoria_id ?? undefined, categoria_nome: r.categoria_id ? catMap[r.categoria_id] : undefined, tipo_id: r.tipo_id ?? undefined, tipo_nome: r.tipo_id ? tipoMap[r.tipo_id] : undefined })),
  };
}

export default function EditarDiarioPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { temPermissao } = usePermissoes();
  const id = params.id as string;

  const [expandido, setExpandido] = useState<string | null>("clima");
  const [clima, setClima] = useState({ condicao: "", impacto: false, observacao: "" });
  const [observacoes, setObservacoes] = useState("");

  // Equipamentos — dropdown multi-select com checkboxes
  const [addEquipForm, setAddEquipForm] = useState(false);
  const [equipDropdownOpen, setEquipDropdownOpen] = useState(false);
  const [equipBusca, setEquipBusca] = useState("");
  // Record<id, status> para múltiplos selecionados
  const [equipSelecionados, setEquipSelecionados] = useState<Record<string, string>>({});

  // Mão de obra própria — seleção por função
  const [mopFuncDropdownOpen, setMopFuncDropdownOpen] = useState(false);
  const [mopFuncsSelecionadas, setMopFuncsSelecionadas] = useState<Set<string>>(new Set());
  const [mopFuncExpandida, setMopFuncExpandida] = useState<string | null>(null);
  const [mopFuncBusca, setMopFuncBusca] = useState("");

  // Mão de obra terceirizada
  const [addMotForm, setAddMotForm] = useState(false);
  const [motFornecedor, setMotFornecedor] = useState("");
  const [motFuncao, setMotFuncao] = useState("");
  const [motQtd, setMotQtd] = useState("1");

  // Serviços
  const [addServForm, setAddServForm] = useState(false);
  const [servDescricao, setServDescricao] = useState("");
  const [servQtd, setServQtd] = useState("");
  const [servUnidade, setServUnidade] = useState("");

  // Serviços — campos extras
  const [servFuncaoId, setServFuncaoId] = useState("");
  const [servServicoNome, setServServicoNome] = useState("");
  const [servLocalId, setServLocalId] = useState("");

  // Visitas
  const [addVisitaForm, setAddVisitaForm] = useState(false);
  const [visitaTipo, setVisitaTipo] = useState("tecnica");
  const [visitaVisitantes, setVisitaVisitantes] = useState("");
  const [visitaDeptId, setVisitaDeptId] = useState("");
  const [visitaDeptOutro, setVisitaDeptOutro] = useState("");
  const [visitaHorarioEntrada, setVisitaHorarioEntrada] = useState("");
  const [visitaHorarioSaida, setVisitaHorarioSaida] = useState("");
  const [visitaEmpresa, setVisitaEmpresa] = useState("");
  const [visitaPauta, setVisitaPauta] = useState("");
  const [novoDeptModalOpen, setNovoDeptModalOpen] = useState(false);
  const [novoDeptNome, setNovoDeptNome] = useState("");

  // Ocorrências
  const [addOcorrForm, setAddOcorrForm] = useState(false);
  const [ocorrCategoriaId, setOcorrCategoriaId] = useState("");
  const [ocorrTipoId, setOcorrTipoId] = useState("");
  const [ocorrDescricao, setOcorrDescricao] = useState("");

  const { data: equipamentosDisponiveis = [] } = useQuery({
    queryKey: ["dim-equipamentos"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_equipamentos").select("id, nome, identificacao, tipo").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string; identificacao: string | null; tipo: string }>;
    },
  });

  const { data: funcoesDisponiveis = [] } = useQuery({
    queryKey: ["dim-funcoes"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_funcoes").select("id, nome, servicos").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string; servicos: string[] }>;
    },
  });

  const { data: fornecedoresDisponiveis = [] } = useQuery({
    queryKey: ["dim-fornecedores"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_fornecedores").select("id, razao_social").eq("ativo", true).order("razao_social");
      return data ?? [];
    },
  });

  const { data: locaisDisponiveis = [] } = useQuery({
    queryKey: ["dim-locais"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_locais").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  const { data: departamentosDisponiveis = [], refetch: refetchDepartamentos } = useQuery({
    queryKey: ["dim-departamentos"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_departamentos").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  const { data: colaboradoresDaFuncao = [] } = useQuery({
    queryKey: ["colaboradores-por-funcao", mopFuncExpandida],
    queryFn: async () => {
      if (!mopFuncExpandida) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("d_colaboradores")
        .select("id, nome")
        .eq("funcao_id", mopFuncExpandida)
        .eq("status", "ativo")
        .is("deleted_at", null)
        .order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
    enabled: !!mopFuncExpandida,
  });

  const { data: categoriasOcorrencias = [] } = useQuery({
    queryKey: ["dim-categorias-ocorrencias"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_categorias_ocorrencias").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; nome: string }>;
    },
  });

  const { data: tiposOcorrencias = [] } = useQuery({
    queryKey: ["dim-tipos-ocorrencias"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("dim_tipos_ocorrencias").select("id, categoria_id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as Array<{ id: string; categoria_id: string; nome: string }>;
    },
  });

  const tiposFiltradosPorCategoria = ocorrCategoriaId
    ? tiposOcorrencias.filter((t) => t.categoria_id === ocorrCategoriaId)
    : tiposOcorrencias;

  const servicosDaFuncao = servFuncaoId
    ? (funcoesDisponiveis.find((f) => f.id === servFuncaoId)?.servicos ?? [])
    : [];

  const { data: diario, isLoading } = useQuery({
    queryKey: ["diario-edit", id],
    queryFn: () => fetchDiarioEdit(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (diario) {
      setClima({
        condicao: diario.clima?.condicao ?? "",
        impacto: diario.clima?.impactou_obra ?? false,
        observacao: diario.clima?.observacao ?? "",
      });
      setObservacoes(diario.observacoes_gerais ?? "");
      // Mesclar funções com registros existentes sem sobrescrever seleções do usuário
      const idsExistentes = diario.mao_obra_propria
        .map((r) => r.funcao_id)
        .filter((fid): fid is string => !!fid);
      if (idsExistentes.length > 0) {
        setMopFuncsSelecionadas((prev) => new Set([...prev, ...idsExistentes]));
      }
    }
  }, [diario]);

  const podeEditar =
    diario &&
    (diario.status === "rascunho" || diario.status === "devolvido") &&
    temPermissao("criar_diario");

  // ── Mutations Mão de Obra Própria ──
  const mutationAdicionarMop = useMutation({
    mutationFn: async (colaborador: { id: string; nome: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("fato_mao_obra_propria").insert({
        diario_id: id,
        colaborador_id: colaborador.id,
        nome_colaborador: colaborador.nome,
        funcao_id: mopFuncExpandida,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
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
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
      toast.success("Colaborador removido.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Mutations Mão de Obra Terceirizada ──
  const mutationAdicionarMot = useMutation({
    mutationFn: async () => {
      if (!motFornecedor) throw new Error("Selecione o fornecedor.");
      if (!motFuncao) throw new Error("Selecione a função.");
      const qtd = parseInt(motQtd);
      if (!qtd || qtd < 1) throw new Error("A quantidade deve ser maior que zero.");
      const supabase = createClient();
      const { error } = await supabase.from("fato_mao_obra_terceirizada").insert({
        diario_id: id, fornecedor_id: motFornecedor, funcao_id: motFuncao, quantidade: qtd,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["diario-edit", id] }); setAddMotForm(false); setMotFornecedor(""); setMotFuncao(""); setMotQtd("1"); toast.success("Equipe terceirizada adicionada."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationRemoverMot = useMutation({
    mutationFn: async (rowId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("fato_mao_obra_terceirizada").delete().eq("id", rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["diario-edit", id] }); toast.success("Registro removido."); },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Mutations Serviços ──
  const mutationAdicionarServ = useMutation({
    mutationFn: async () => {
      if (!servLocalId) throw new Error("Selecione o local de execução.");
      const descricaoFinal = servServicoNome.trim() || servDescricao.trim();
      if (!descricaoFinal) throw new Error("Informe o serviço ou descrição.");
      const supabase = createClient();
      const { error } = await supabase.from("fato_servicos").insert({
        diario_id: id,
        descricao: descricaoFinal,
        quantidade: servQtd ? parseFloat(servQtd) : null,
        unidade: servUnidade.trim() || null,
        local_id: servLocalId,
        funcao_id: servFuncaoId || null,
        servico_nome: servServicoNome.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
      setAddServForm(false);
      setServDescricao("");
      setServQtd("");
      setServUnidade("");
      setServFuncaoId("");
      setServServicoNome("");
      setServLocalId("");
      toast.success("Serviço adicionado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationRemoverServ = useMutation({
    mutationFn: async (rowId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("fato_servicos").delete().eq("id", rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["diario-edit", id] }); toast.success("Serviço removido."); },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Mutations Visitas ──
  const mutationAdicionarVisita = useMutation({
    mutationFn: async () => {
      if (!visitaVisitantes.trim()) throw new Error("Informe os visitantes.");
      if (visitaDeptId === "outros" && !visitaDeptOutro.trim()) throw new Error("Descreva o departamento.");
      const supabase = createClient();
      const { error } = await supabase.from("fato_visitas").insert({
        diario_id: id,
        tipo: visitaTipo,
        visitantes: visitaVisitantes.trim(),
        departamento_id: visitaDeptId && visitaDeptId !== "outros" ? visitaDeptId : null,
        departamento_outro: visitaDeptId === "outros" ? visitaDeptOutro.trim() : null,
        horario_entrada: visitaHorarioEntrada || null,
        horario_saida: visitaHorarioSaida || null,
        empresa_origem: visitaEmpresa.trim() || null,
        pauta: visitaPauta.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
      setAddVisitaForm(false);
      setVisitaTipo("tecnica");
      setVisitaVisitantes("");
      setVisitaDeptId("");
      setVisitaDeptOutro("");
      setVisitaHorarioEntrada("");
      setVisitaHorarioSaida("");
      setVisitaEmpresa("");
      setVisitaPauta("");
      toast.success("Visita adicionada.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationRemoverVisita = useMutation({
    mutationFn: async (rowId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("fato_visitas").delete().eq("id", rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["diario-edit", id] }); toast.success("Visita removida."); },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Mutation Novo Departamento (inline) ──
  const mutationCriarDepartamento = useMutation({
    mutationFn: async () => {
      if (!novoDeptNome.trim()) throw new Error("Informe o nome do departamento.");
      const supabase = createClient();
      const { data, error } = await supabase.from("dim_departamentos").insert({ nome: novoDeptNome.trim(), ativo: true }).select("id").single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: (data) => {
      refetchDepartamentos();
      setVisitaDeptId(data.id);
      setNovoDeptModalOpen(false);
      setNovoDeptNome("");
      toast.success("Departamento criado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Mutations Ocorrências ──
  const mutationAdicionarOcorrencia = useMutation({
    mutationFn: async () => {
      if (!ocorrCategoriaId) throw new Error("Selecione a categoria.");
      if (!ocorrDescricao.trim()) throw new Error("Descreva o ocorrido.");
      if (ocorrDescricao.trim().length < 20) throw new Error("A descrição deve ter no mínimo 20 caracteres.");
      const supabase = createClient();
      const { error } = await supabase.from("fato_ocorrencias").insert({
        diario_id: id,
        tipo: ocorrTipoId
          ? (tiposOcorrencias.find((t) => t.id === ocorrTipoId)?.nome ?? "Ocorrência")
          : "Ocorrência",
        descricao: ocorrDescricao.trim(),
        categoria_id: ocorrCategoriaId,
        tipo_id: ocorrTipoId || null,
        severidade: "baixa",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
      setAddOcorrForm(false);
      setOcorrCategoriaId("");
      setOcorrTipoId("");
      setOcorrDescricao("");
      toast.success("Ocorrência registrada.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationRemoverOcorrencia = useMutation({
    mutationFn: async (rowId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("fato_ocorrencias").delete().eq("id", rowId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["diario-edit", id] }); toast.success("Ocorrência removida."); },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationAdicionarEquipamento = useMutation({
    mutationFn: async () => {
      const novos = Object.entries(equipSelecionados);
      if (novos.length === 0) throw new Error("Selecione ao menos um equipamento.");
      const supabase = createClient();
      const rows = novos.map(([equipamento_id, status]) => ({
        diario_id: id,
        equipamento_id,
        status,
      }));
      const { error } = await supabase.from("fato_equipamentos").insert(rows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
      setAddEquipForm(false);
      setEquipDropdownOpen(false);
      setEquipSelecionados({});
      setEquipBusca("");
      const qtd = Object.keys(equipSelecionados).length;
      toast.success(`${qtd} equipamento${qtd > 1 ? "s adicionados" : " adicionado"}.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationRemoverEquipamento = useMutation({
    mutationFn: async (equipamentoId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("fato_equipamentos")
        .delete()
        .eq("diario_id", id)
        .eq("equipamento_id", equipamentoId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
      toast.success("Equipamento removido.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutationSalvar = useMutation({
    mutationFn: async () => {
      const supabase = createClient();

      await supabase.from("fato_diarios").update({
        observacoes_gerais: observacoes.trim() || null,
        atualizado_em: new Date().toISOString(),
      }).eq("id", id);

      const climaExistente = !!diario?.clima;
      if (clima.condicao) {
        const climaPayload = {
          diario_id: id,
          condicao: clima.condicao,
          impactou_obra: clima.impacto,
          observacao: clima.impacto ? (clima.observacao.trim() || null) : null,
        };
        if (climaExistente) {
          await supabase.from("fato_clima").update(climaPayload).eq("diario_id", id);
        } else {
          await supabase.from("fato_clima").insert(climaPayload);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario", id] });
      queryClient.invalidateQueries({ queryKey: ["diario-edit", id] });
      toast.success("Diário salvo com sucesso.");
    },
    onError: () => toast.error("Erro ao salvar o diário."),
  });

  const mutationEnviar = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      await mutationSalvar.mutateAsync();
      const { error } = await supabase.from("fato_diarios").update({
        status: "aguardando_aprovacao",
        atualizado_em: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("fato_diarios_aprovacoes").insert({
        diario_id: id,
        status_de: diario!.status,
        status_para: "aguardando_aprovacao",
        usuario_id: user!.id,
        comentario: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario", id] });
      queryClient.invalidateQueries({ queryKey: ["diarios-list"] });
      toast.success("Diário enviado para aprovação.");
      router.push(`/diarios/${id}`);
    },
    onError: () => toast.error("Erro ao enviar para aprovação."),
  });

  if (isLoading || !diario) {
    return (
      <div className="flex flex-col gap-6 min-h-full">
        <Link href="/diarios" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          Voltar
        </Link>
        <p className="text-[var(--text-tertiary)]">{isLoading ? "Carregando..." : "Diário não encontrado."}</p>
      </div>
    );
  }

  if (!podeEditar) {
    router.replace(`/diarios/${id}`);
    return null;
  }

  const dataFormatada = format(parseISO(diario.data_diario), "dd/MM/yyyy", { locale: ptBR });

  const dadosPorModulo: Record<string, boolean> = {
    clima: !!diario.clima,
    mao_obra_propria: diario.mao_obra_propria.length > 0,
    mao_obra_terceirizada: diario.mao_obra_terceirizada.length > 0,
    equipamentos: diario.equipamentos.length > 0,
    servicos: diario.servicos.length > 0,
    visitas: diario.visitas.length > 0,
    ocorrencias: diario.ocorrencias.length > 0,
  };

  return (
    <div className="flex flex-col gap-6 min-h-full">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/diarios/${id}`}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            Voltar
          </Link>
          <span className="text-[var(--text-disabled)]">|</span>
          <div>
            <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">
              Diário · {diario.obra_nome} · {dataFormatada}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={diario.status === "devolvido" ? "orange" : "gray"}>
                {diario.status === "devolvido" ? "Devolvido" : "Rascunho"}
              </Badge>
              {diario.retroativo && <Badge variant="orange">Retroativo</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)] tracking-[var(--letter-spacing-tight)]">
          Preenchimento do Diário
        </h1>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
          Preencha os módulos abaixo. Salve como rascunho para continuar depois.
        </p>
      </div>

      {/* Módulos expansíveis */}
      <div className="flex flex-col gap-4 md:max-w-[720px] md:mx-auto xl:max-w-none xl:mx-0">
        {MODULOS.map((m) => {
          const Icon = m.icon;
          const aberto = expandido === m.id;
          const temDados = dadosPorModulo[m.id];

          return (
            <div key={m.id} className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandido(aberto ? null : m.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--surface-card-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[15px] font-semibold text-[var(--text-primary)]">{m.label}</span>
                    {temDados && (
                      <span className="text-[var(--font-size-mini)] text-[var(--color-success)] font-medium">
                        ✓ Preenchido
                      </span>
                    )}
                  </div>
                </div>
                <span className="transition-transform duration-200" style={{ transform: aberto ? "rotate(-90deg)" : "rotate(0deg)" }}>
                  <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" strokeWidth={2} />
                </span>
              </button>

              {aberto && (
                <div className="px-5 pb-5 pt-2 border-t border-[#f1f5f9]">

                  {/* ── CLIMA ── */}
                  {m.id === "clima" && (
                    <div className="flex flex-col gap-4 pt-4">
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
                            <option key={c} value={c}>{CONDICOES_LABEL[c]}</option>
                          ))}
                        </select>
                      </div>
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
                      {clima.impacto && (
                        <div>
                          <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                            Descreva o impacto (obrigatório)
                          </label>
                          <textarea
                            value={clima.observacao}
                            onChange={(e) => setClima((c) => ({ ...c, observacao: e.target.value }))}
                            placeholder="Descreva o impacto do clima na obra..."
                            rows={3}
                            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                          />
                        </div>
                      )}
                      <Button size="sm" onClick={() => mutationSalvar.mutate()} disabled={mutationSalvar.isPending}>
                        <Save className="size-4" />
                        Salvar clima
                      </Button>
                    </div>
                  )}

                  {/* ── MÃO DE OBRA PRÓPRIA ── */}
                  {m.id === "mao_obra_propria" && (() => {
                    // Derivar funções únicas presentes nos registros
                    const funcoesNosDados = new Set(
                      diario.mao_obra_propria.map((r) => r.funcao_id).filter((fid): fid is string => !!fid)
                    );
                    const todasFuncoesSelecionadas = new Set([...funcoesNosDados, ...mopFuncsSelecionadas]);

                    const funcoesFiltradas = funcoesDisponiveis.filter((f) =>
                      f.nome.toLowerCase().includes(mopFuncBusca.toLowerCase())
                    );

                    return (
                      <div className="pt-4 flex flex-col gap-4">

                        {/* ── Botão abrir modal de funções ── */}
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

                        {/* ── Lista de Funções com Quantidade ── */}
                        {todasFuncoesSelecionadas.size > 0 && (
                          <div className="rounded-[var(--radius-md)] border border-[var(--border-light)] overflow-hidden">
                            <div className="grid grid-cols-[1fr_auto] items-center px-3 py-2 bg-[var(--surface-card-hover)] border-b border-[var(--border-light)]">
                              <span className="text-[var(--font-size-mini)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Função</span>
                              <span className="text-[var(--font-size-mini)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide text-right pr-1">Qtd</span>
                            </div>
                            {funcoesDisponiveis
                              .filter((f) => todasFuncoesSelecionadas.has(f.id))
                              .map((f) => {
                                const registrosDaFuncao = diario.mao_obra_propria.filter((r) => r.funcao_id === f.id);
                                const qtd = registrosDaFuncao.length;
                                const estaExpandida = mopFuncExpandida === f.id;

                                return (
                                  <div key={f.id} className="border-b border-[var(--border-light)] last:border-b-0">
                                    {/* Linha da função */}
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

                                    {/* Painel de colaboradores expandido */}
                                    {estaExpandida && (
                                      <div className="border-t border-[var(--border-light)] bg-[var(--surface-page)] px-3 py-3 flex flex-col gap-2">
                                        {/* Colaboradores já adicionados ao diário */}
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

                                        {/* Lista de colaboradores disponíveis */}
                                        {colaboradoresDaFuncao.length === 0 ? (
                                          <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] text-center py-2">
                                            Nenhum colaborador cadastrado para esta função.{" "}
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
                                                Todos os colaboradores desta função já foram adicionados.
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

                  {/* ── MÃO DE OBRA TERCEIRIZADA ── */}
                  {m.id === "mao_obra_terceirizada" && (
                    <div className="pt-4 flex flex-col gap-3">
                      {diario.mao_obra_terceirizada.length > 0 && (
                        <ul className="divide-y divide-[var(--border-light)] mb-2 rounded-[var(--radius-md)] border border-[var(--border-light)] overflow-hidden">
                          {diario.mao_obra_terceirizada.map((r) => (
                            <li key={r.row_id} className="flex items-center justify-between px-3 py-2 bg-[var(--surface-card)]">
                              <span className="text-[var(--font-size-small)]">
                                <span className="font-medium text-[var(--text-primary)]">{r.fornecedor_nome ?? "Fornecedor"}</span>
                                {r.funcao_nome && <span className="text-[var(--text-tertiary)]"> — {r.funcao_nome}</span>}
                                {r.quantidade && <span className="text-[var(--text-tertiary)]"> ({r.quantidade} pessoas)</span>}
                              </span>
                              <button type="button" onClick={() => mutationRemoverMot.mutate(r.row_id)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {addMotForm ? (
                        <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)]">
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Fornecedor *</label>
                            <select value={motFornecedor} onChange={(e) => setMotFornecedor(e.target.value)} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                              <option value="">— Selecione —</option>
                              {fornecedoresDisponiveis.map((f) => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Função *</label>
                            <select value={motFuncao} onChange={(e) => setMotFuncao(e.target.value)} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                              <option value="">— Selecione —</option>
                              {funcoesDisponiveis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Quantidade de pessoas *</label>
                            <input
                              type="number"
                              min="1"
                              value={motQtd}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (parseInt(v) < 1) return;
                                setMotQtd(v);
                              }}
                              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => mutationAdicionarMot.mutate()} disabled={!motFornecedor || !motFuncao || mutationAdicionarMot.isPending}><Check className="size-4" />{mutationAdicionarMot.isPending ? "Adicionando..." : "Confirmar"}</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setAddMotForm(false); setMotFornecedor(""); setMotFuncao(""); setMotQtd("1"); }}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddMotForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)] w-fit">
                          <Plus className="w-4 h-4" />Adicionar equipe
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── EQUIPAMENTOS ── */}
                  {m.id === "equipamentos" && (
                    <div className="pt-4 flex flex-col gap-3">
                      {/* Lista de equipamentos já adicionados ao diário */}
                      {diario.equipamentos.length > 0 && (
                        <ul className="divide-y divide-[var(--border-light)] mb-2 rounded-[var(--radius-md)] border border-[var(--border-light)] overflow-hidden">
                          {diario.equipamentos.map((r) => (
                            <li key={r.equipamento_id} className="flex items-center justify-between px-3 py-2 bg-[var(--surface-card)]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">
                                  {r.equipamento_nome ?? "Equipamento"}
                                </span>
                                {r.tipo === "locado" && (
                                  <span className="text-[var(--font-size-mini)] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                    LOCADO
                                  </span>
                                )}
                                <span className={`text-[var(--font-size-mini)] font-medium px-2 py-0.5 rounded-full ${
                                  r.status === "operando"
                                    ? "bg-green-100 text-green-700"
                                    : r.status === "parado"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {r.status === "operando" ? "Operando" : r.status === "parado" ? "Parado" : "Em Manutenção"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => mutationRemoverEquipamento.mutate(r.equipamento_id)}
                                className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Painel de seleção múltipla */}
                      {addEquipForm ? (
                        <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)]">
                          <div className="flex items-center justify-between">
                            <label className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">
                              Selecionar equipamentos
                            </label>
                            {Object.keys(equipSelecionados).length > 0 && (
                              <span className="text-[var(--font-size-mini)] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-2 py-0.5 rounded-full">
                                {Object.keys(equipSelecionados).length} selecionado{Object.keys(equipSelecionados).length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Campo de busca */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
                            <input
                              type="text"
                              placeholder="Buscar equipamento..."
                              value={equipBusca}
                              onChange={(e) => setEquipBusca(e.target.value)}
                              className="w-full pl-9 pr-3 h-9 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-white text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            />
                          </div>

                          {/* Lista com checkboxes */}
                          <div className="max-h-64 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-light)] divide-y divide-[var(--border-light)]">
                            {equipamentosDisponiveis
                              .filter((eq) => {
                                // Excluir os já adicionados ao diário
                                const jaAdicionado = diario.equipamentos.some((e) => e.equipamento_id === eq.id);
                                if (jaAdicionado) return false;
                                if (!equipBusca.trim()) return true;
                                return eq.nome.toLowerCase().includes(equipBusca.toLowerCase()) ||
                                  (eq.identificacao ?? "").toLowerCase().includes(equipBusca.toLowerCase());
                              })
                              .map((eq) => {
                                const selecionado = eq.id in equipSelecionados;
                                const statusAtual = equipSelecionados[eq.id] ?? "operando";
                                return (
                                  <div
                                    key={eq.id}
                                    className={`flex flex-col gap-2 px-3 py-2.5 transition-colors ${selecionado ? "bg-[var(--color-primary-subtle)]" : "bg-white hover:bg-[var(--surface-card)]"}`}
                                  >
                                    {/* Linha principal: checkbox + nome + badges */}
                                    <label className="flex items-center gap-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selecionado}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setEquipSelecionados((prev) => ({ ...prev, [eq.id]: "operando" }));
                                          } else {
                                            setEquipSelecionados((prev) => {
                                              const next = { ...prev };
                                              delete next[eq.id];
                                              return next;
                                            });
                                          }
                                        }}
                                        className="w-4 h-4 rounded border-[var(--border-medium)] accent-[var(--color-primary)]"
                                      />
                                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                        <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">
                                          {eq.nome}
                                        </span>
                                        {eq.identificacao && (
                                          <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
                                            {eq.identificacao}
                                          </span>
                                        )}
                                        {eq.tipo === "locado" && (
                                          <span className="text-[var(--font-size-mini)] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                            LOCADO
                                          </span>
                                        )}
                                      </div>
                                    </label>

                                    {/* Status selector — aparece apenas quando selecionado */}
                                    {selecionado && (
                                      <div className="ml-7 flex items-center gap-2">
                                        <span className="text-[var(--font-size-mini)] text-[var(--text-secondary)] font-medium w-14 shrink-0">Status:</span>
                                        <select
                                          value={statusAtual}
                                          onChange={(e) =>
                                            setEquipSelecionados((prev) => ({ ...prev, [eq.id]: e.target.value }))
                                          }
                                          className="flex-1 h-8 px-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-white text-[var(--font-size-mini)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                                        >
                                          <option value="operando">Operando</option>
                                          <option value="parado">Parado</option>
                                          <option value="em_manutencao">Em Manutenção</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            {equipamentosDisponiveis.filter((eq) => {
                              const jaAdicionado = diario.equipamentos.some((e) => e.equipamento_id === eq.id);
                              if (jaAdicionado) return false;
                              if (!equipBusca.trim()) return true;
                              return eq.nome.toLowerCase().includes(equipBusca.toLowerCase()) ||
                                (eq.identificacao ?? "").toLowerCase().includes(equipBusca.toLowerCase());
                            }).length === 0 && (
                              <div className="px-3 py-6 text-center text-[var(--font-size-small)] text-[var(--text-tertiary)]">
                                {equipBusca ? "Nenhum equipamento encontrado." : "Todos os equipamentos já foram adicionados."}
                              </div>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => mutationAdicionarEquipamento.mutate()}
                              disabled={Object.keys(equipSelecionados).length === 0 || mutationAdicionarEquipamento.isPending}
                            >
                              <Check className="size-4" />
                              {mutationAdicionarEquipamento.isPending
                                ? "Adicionando..."
                                : `Confirmar${Object.keys(equipSelecionados).length > 0 ? ` (${Object.keys(equipSelecionados).length})` : ""}`}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setAddEquipForm(false);
                                setEquipSelecionados({});
                                setEquipBusca("");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddEquipForm(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)] w-fit"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar equipamento
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── SERVIÇOS ── */}
                  {m.id === "servicos" && (
                    <div className="pt-4 flex flex-col gap-3">
                      {diario.servicos.length > 0 && (
                        <ul className="divide-y divide-[var(--border-light)] mb-2 rounded-[var(--radius-md)] border border-[var(--border-light)] overflow-hidden">
                          {diario.servicos.map((r) => (
                            <li key={r.row_id} className="flex items-center justify-between px-3 py-2 bg-[var(--surface-card)]">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">{r.descricao}</span>
                                <div className="flex items-center gap-2">
                                  {r.local_nome && (
                                    <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)] flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> {r.local_nome}
                                    </span>
                                  )}
                                  {r.quantidade != null && <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">{r.quantidade} {r.unidade}</span>}
                                </div>
                              </div>
                              <button type="button" onClick={() => mutationRemoverServ.mutate(r.row_id)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {addServForm ? (
                        <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)]">
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Função</label>
                            <select
                              value={servFuncaoId}
                              onChange={(e) => { setServFuncaoId(e.target.value); setServServicoNome(""); }}
                              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            >
                              <option value="">— Selecione (opcional) —</option>
                              {funcoesDisponiveis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                          </div>
                          {servFuncaoId && servicosDaFuncao.length > 0 ? (
                            <div>
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Serviço *</label>
                              <select
                                value={servServicoNome}
                                onChange={(e) => setServServicoNome(e.target.value)}
                                className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                              >
                                <option value="">— Selecione o serviço —</option>
                                {servicosDaFuncao.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Descrição do serviço *</label>
                              <input value={servDescricao} onChange={(e) => setServDescricao(e.target.value)} placeholder="Descreva o serviço executado" className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                            </div>
                          )}
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Local de execução *</label>
                            <select
                              value={servLocalId}
                              onChange={(e) => setServLocalId(e.target.value)}
                              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            >
                              <option value="">— Selecione o local —</option>
                              {locaisDisponiveis.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Quantidade</label>
                              <input type="number" min="0" step="any" value={servQtd} onChange={(e) => setServQtd(e.target.value)} placeholder="Ex: 50" className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Unidade</label>
                              <select value={servUnidade} onChange={(e) => setServUnidade(e.target.value)} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                                <option value="">— Selecione —</option>
                                <option value="m²">m²</option>
                                <option value="m³">m³</option>
                                <option value="m">m (metro linear)</option>
                                <option value="un">un (unidade)</option>
                                <option value="kg">kg</option>
                                <option value="t">t (tonelada)</option>
                                <option value="L">L (litro)</option>
                                <option value="h">h (hora)</option>
                                <option value="vb">vb (verba)</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => mutationAdicionarServ.mutate()}
                              disabled={(!servServicoNome.trim() && !servDescricao.trim()) || !servLocalId || mutationAdicionarServ.isPending}
                            >
                              <Check className="size-4" />{mutationAdicionarServ.isPending ? "Adicionando..." : "Confirmar"}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => { setAddServForm(false); setServDescricao(""); setServQtd(""); setServUnidade(""); setServFuncaoId(""); setServServicoNome(""); setServLocalId(""); }}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddServForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)] w-fit">
                          <Plus className="w-4 h-4" />Adicionar serviço
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── VISITAS ── */}
                  {m.id === "visitas" && (
                    <div className="pt-4 flex flex-col gap-3">
                      {diario.visitas.length > 0 && (
                        <ul className="divide-y divide-[var(--border-light)] mb-2 rounded-[var(--radius-md)] border border-[var(--border-light)] overflow-hidden">
                          {diario.visitas.map((r) => {
                            const encerrada = !!r.horario_saida;
                            return (
                              <li key={r.row_id} className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-card)]">
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)] capitalize">{r.tipo.replace("_", " ")}:</span>
                                    <span className="text-[var(--font-size-small)] text-[var(--text-secondary)]">{r.visitantes}</span>
                                    <span className={`text-[var(--font-size-mini)] font-medium px-2 py-0.5 rounded-full ${encerrada ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>
                                      {encerrada ? "Encerrada" : "Em andamento"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[var(--font-size-mini)] text-[var(--text-tertiary)] flex-wrap">
                                    {(r.departamento_nome || r.departamento_outro) && (
                                      <span>{r.departamento_nome ?? r.departamento_outro}</span>
                                    )}
                                    {r.horario_entrada && <span>Entrada: {r.horario_entrada}</span>}
                                    {r.horario_saida && <span>Saída: {r.horario_saida}</span>}
                                    {r.empresa_origem && <span>{r.empresa_origem}</span>}
                                  </div>
                                </div>
                                <button type="button" onClick={() => mutationRemoverVisita.mutate(r.row_id)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-colors ml-2 shrink-0">
                                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {addVisitaForm ? (
                        <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)]">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Tipo de visita</label>
                              <select value={visitaTipo} onChange={(e) => setVisitaTipo(e.target.value)} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
                                <option value="tecnica">Técnica</option>
                                <option value="diretoria">Diretoria</option>
                                <option value="projetos">Projetos</option>
                                <option value="vistoria_qualidade">Vistoria Qualidade</option>
                                <option value="fiscalizacao">Fiscalização</option>
                                <option value="cliente">Cliente</option>
                                <option value="reuniao">Reunião</option>
                                <option value="planejamento">Planejamento</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Empresa / Origem</label>
                              <input value={visitaEmpresa} onChange={(e) => setVisitaEmpresa(e.target.value)} placeholder="Nome da empresa" className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Visitante(s) *</label>
                            <input value={visitaVisitantes} onChange={(e) => setVisitaVisitantes(e.target.value)} placeholder="Nome(s) dos visitantes" className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">Departamento visitado</label>
                              <button
                                type="button"
                                onClick={() => setNovoDeptModalOpen(true)}
                                className="text-[var(--font-size-mini)] text-[var(--color-primary)] hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Novo departamento
                              </button>
                            </div>
                            <select
                              value={visitaDeptId}
                              onChange={(e) => { setVisitaDeptId(e.target.value); setVisitaDeptOutro(""); }}
                              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            >
                              <option value="">— Selecione (opcional) —</option>
                              {departamentosDisponiveis.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                              <option value="outros">Outros (descrever)</option>
                            </select>
                            {visitaDeptId === "outros" && (
                              <input
                                value={visitaDeptOutro}
                                onChange={(e) => setVisitaDeptOutro(e.target.value)}
                                placeholder="Descreva o departamento"
                                className="w-full h-10 px-3 mt-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                              />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Horário de entrada</label>
                              <input type="time" value={visitaHorarioEntrada} onChange={(e) => setVisitaHorarioEntrada(e.target.value)} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                            </div>
                            <div>
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Horário de saída</label>
                              <input type="time" value={visitaHorarioSaida} onChange={(e) => setVisitaHorarioSaida(e.target.value)} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Pauta / Objetivo</label>
                            <textarea value={visitaPauta} onChange={(e) => setVisitaPauta(e.target.value)} rows={2} placeholder="Descreva a pauta ou objetivo da visita" className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => mutationAdicionarVisita.mutate()} disabled={!visitaVisitantes.trim() || mutationAdicionarVisita.isPending}><Check className="size-4" />{mutationAdicionarVisita.isPending ? "Adicionando..." : "Confirmar"}</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setAddVisitaForm(false); setVisitaVisitantes(""); setVisitaTipo("tecnica"); setVisitaDeptId(""); setVisitaDeptOutro(""); setVisitaHorarioEntrada(""); setVisitaHorarioSaida(""); setVisitaEmpresa(""); setVisitaPauta(""); }}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddVisitaForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)] w-fit">
                          <Plus className="w-4 h-4" />Adicionar visita
                        </button>
                      )}
                    </div>
                  )}
                  {/* ── OCORRÊNCIAS ── */}
                  {m.id === "ocorrencias" && (
                    <div className="pt-4 flex flex-col gap-3">
                      {diario.ocorrencias.length > 0 && (
                        <ul className="divide-y divide-[var(--border-light)] mb-2 rounded-[var(--radius-md)] border border-[var(--border-light)] overflow-hidden">
                          {diario.ocorrencias.map((r) => (
                            <li key={r.row_id} className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-card)]">
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {r.categoria_nome && (
                                    <span className="text-[var(--font-size-mini)] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                      {r.categoria_nome}
                                    </span>
                                  )}
                                  {r.tipo_nome && (
                                    <span className="text-[var(--font-size-small)] font-medium text-[var(--text-primary)]">{r.tipo_nome}</span>
                                  )}
                                </div>
                                <p className="text-[var(--font-size-small)] text-[var(--text-secondary)] truncate">{r.descricao}</p>
                              </div>
                              <button type="button" onClick={() => mutationRemoverOcorrencia.mutate(r.row_id)} className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 transition-colors ml-2 shrink-0">
                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {addOcorrForm ? (
                        <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)]">
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Categoria *</label>
                            <select
                              value={ocorrCategoriaId}
                              onChange={(e) => { setOcorrCategoriaId(e.target.value); setOcorrTipoId(""); }}
                              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            >
                              <option value="">— Selecione —</option>
                              {categoriasOcorrencias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                          </div>
                          {ocorrCategoriaId && (
                            <div>
                              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Tipo de ocorrência</label>
                              <select
                                value={ocorrTipoId}
                                onChange={(e) => setOcorrTipoId(e.target.value)}
                                className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                              >
                                <option value="">— Selecione (opcional) —</option>
                                {tiposFiltradosPorCategoria.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                              Descreva o ocorrido *
                              <span className={`ml-2 text-[var(--font-size-mini)] ${ocorrDescricao.length >= 20 ? "text-green-600" : "text-[var(--text-tertiary)]"}`}>
                                ({ocorrDescricao.length}/20 mín.)
                              </span>
                            </label>
                            <textarea
                              value={ocorrDescricao}
                              onChange={(e) => setOcorrDescricao(e.target.value)}
                              rows={3}
                              placeholder="Descreva detalhadamente o que ocorreu..."
                              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => mutationAdicionarOcorrencia.mutate()}
                              disabled={!ocorrCategoriaId || ocorrDescricao.trim().length < 20 || mutationAdicionarOcorrencia.isPending}
                            >
                              <Check className="size-4" />{mutationAdicionarOcorrencia.isPending ? "Registrando..." : "Confirmar"}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => { setAddOcorrForm(false); setOcorrCategoriaId(""); setOcorrTipoId(""); setOcorrDescricao(""); }}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddOcorrForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-white text-[var(--font-size-small)] bg-[var(--color-primary)] w-fit">
                          <Plus className="w-4 h-4" />Registrar ocorrência
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Observações gerais */}
        <div className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandido(expandido === "observacoes" ? null : "observacoes")}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--surface-card-hover)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[15px] font-semibold text-[var(--text-primary)]">Observações gerais</span>
                {observacoes.trim() && (
                  <span className="text-[var(--font-size-mini)] text-[var(--color-success)] font-medium">✓ Preenchido</span>
                )}
              </div>
            </div>
            <span className="transition-transform duration-200" style={{ transform: expandido === "observacoes" ? "rotate(-90deg)" : "rotate(0deg)" }}>
              <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" strokeWidth={2} />
            </span>
          </button>
          {expandido === "observacoes" && (
            <div className="px-5 pb-5 pt-2 border-t border-[#f1f5f9] flex flex-col gap-3">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações gerais que não se enquadram nos módulos estruturados..."
                rows={5}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
              <Button size="sm" onClick={() => mutationSalvar.mutate()} disabled={mutationSalvar.isPending}>
                <Save className="size-4" />
                Salvar observações
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé de ações */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={() => mutationSalvar.mutate()}
          disabled={mutationSalvar.isPending}
        >
          <Save className="size-4" />
          {mutationSalvar.isPending ? "Salvando..." : "Salvar rascunho"}
        </Button>
        <Button
          variant="success"
          onClick={() => mutationEnviar.mutate()}
          disabled={mutationEnviar.isPending}
        >
          <Check className="size-4" />
          {mutationEnviar.isPending ? "Enviando..." : "Enviar para aprovação"}
        </Button>
        <Link
          href={`/diarios/${id}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] font-medium"
        >
          Cancelar
        </Link>
      </div>

      {/* ── MODAL: Selecionar Funções (Equipe Própria) ── */}
      {mopFuncDropdownOpen && (() => {
        const funcoesNosDadosModal = new Set(
          diario.mao_obra_propria.map((r) => r.funcao_id).filter((fid): fid is string => !!fid)
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
              {/* Cabeçalho */}
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

              {/* Busca */}
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

              {/* Lista de funções */}
              <div className="overflow-y-auto flex-1">
                {/* Selecionar todos */}
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

              {/* Rodapé */}
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

      {/* ── MODAL INLINE: Novo Departamento ── */}
      {novoDeptModalOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setNovoDeptModalOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">Novo departamento</h3>
              <button type="button" onClick={() => setNovoDeptModalOpen(false)} className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)]">
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Nome *</label>
                <input
                  value={novoDeptNome}
                  onChange={(e) => setNovoDeptNome(e.target.value)}
                  placeholder="Ex: Planejamento, Jurídico"
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => mutationCriarDepartamento.mutate()} disabled={!novoDeptNome.trim() || mutationCriarDepartamento.isPending}>
                  <Check className="size-4" />{mutationCriarDepartamento.isPending ? "Criando..." : "Criar"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setNovoDeptModalOpen(false); setNovoDeptNome(""); }}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
