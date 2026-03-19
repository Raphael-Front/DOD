"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  Check,
  X,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Button, Badge, Card } from "@/components/ui";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function ObservacoesCard({
  diarioId,
  value,
  readOnly,
  onSaved,
}: {
  diarioId: string;
  value: string;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setLocal(value), [value]);
  const supabase = createClient();
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("fato_diarios")
      .update({ observacoes_gerais: local || null, atualizado_em: new Date().toISOString() })
      .eq("id", diarioId);
    setSaving(false);
    if (!error) onSaved();
  };
  return (
    <Card className="lg:col-span-2">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
        <h2 className="font-semibold text-[var(--text-primary)]">Observações gerais</h2>
        {!readOnly && (
          <Button size="sm" variant="secondary" onClick={handleSave} loading={saving} className="ml-auto">
            Salvar
          </Button>
        )}
      </div>
      {readOnly ? (
        <p className="text-[var(--font-size-small)] whitespace-pre-wrap">
          {value || "—"}
        </p>
      ) : (
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          placeholder="Observações gerais..."
        />
      )}
    </Card>
  );
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  devolvido: "Devolvido",
};

type DiarioCompleto = {
  id: string;
  obra_id: string;
  data_diario: string;
  status: string;
  retroativo: boolean;
  justificativa_retro: string | null;
  observacoes_gerais: string | null;
  obra_nome?: string;
  clima?: { condicao: string; impactou_obra: boolean; observacao: string | null } | null;
  mao_obra_propria: Array<{ nome_colaborador: string; funcao_nome?: string }>;
  mao_obra_terceirizada: Array<{ quantidade: number; fornecedor_nome?: string; funcao_nome?: string }>;
  equipamentos: Array<{ equipamento_nome?: string; status: string }>;
  servicos: Array<{ descricao: string; quantidade: number | null; unidade: string | null }>;
  visitas: Array<{ tipo: string; visitantes: string }>;
  ocorrencias: Array<{ tipo: string; descricao: string; severidade: string }>;
  aprobacoes: Array<{ status_de: string; status_para: string; usuario_nome?: string; comentario: string | null; criado_em: string }>;
};

async function fetchDiario(id: string): Promise<DiarioCompleto | null> {
  const supabase = createClient();
  const { data: d, error } = await supabase
    .from("fato_diarios")
    .select("id, obra_id, data_diario, status, retroativo, justificativa_retro, observacoes_gerais")
    .eq("id", id)
    .single();
  if (error || !d) return null;

  const { data: obra } = await supabase
    .from("dim_obras")
    .select("nome")
    .eq("id", d.obra_id)
    .single();

  const { data: clima } = await supabase
    .from("fato_clima")
    .select("condicao, impactou_obra, observacao")
    .eq("diario_id", id)
    .maybeSingle();

  const { data: mop } = await supabase
    .from("fato_mao_obra_propria")
    .select("nome_colaborador, funcao_id")
    .eq("diario_id", id);
  const funcaoIds = [...new Set((mop ?? []).map((r) => r.funcao_id).filter(Boolean))];
  const funcoesData = funcaoIds.length
    ? (await supabase.from("dim_funcoes").select("id, nome").in("id", funcaoIds)).data ?? []
    : [];
  const funcaoMap = Object.fromEntries(funcoesData.map((f) => [f.id, f.nome]));
  const mao_obra_propria = (mop ?? []).map((r) => ({
    nome_colaborador: r.nome_colaborador,
    funcao_nome: r.funcao_id ? funcaoMap[r.funcao_id] : undefined,
  }));

  const { data: mot } = await supabase
    .from("fato_mao_obra_terceirizada")
    .select("quantidade, fornecedor_id, funcao_id")
    .eq("diario_id", id);
  const fornIds = [...new Set((mot ?? []).map((r) => r.fornecedor_id).filter(Boolean))];
  const funcaoIds2 = [...new Set((mot ?? []).map((r) => r.funcao_id).filter(Boolean))];
  const fornsData = fornIds.length
    ? (await supabase.from("dim_fornecedores").select("id, razao_social").in("id", fornIds)).data ?? []
    : [];
  const funcs2Data = funcaoIds2.length
    ? (await supabase.from("dim_funcoes").select("id, nome").in("id", funcaoIds2)).data ?? []
    : [];
  const fornMap = Object.fromEntries(fornsData.map((f) => [f.id, f.razao_social]));
  const funcMap2 = Object.fromEntries(funcs2Data.map((f) => [f.id, f.nome]));
  const mao_obra_terceirizada = (mot ?? []).map((r) => ({
    quantidade: r.quantidade,
    fornecedor_nome: r.fornecedor_id ? fornMap[r.fornecedor_id] : undefined,
    funcao_nome: r.funcao_id ? funcMap2[r.funcao_id] : undefined,
  }));

  const { data: feq } = await supabase
    .from("fato_equipamentos")
    .select("equipamento_id, status")
    .eq("diario_id", id);
  const eqIds = [...new Set((feq ?? []).map((r) => r.equipamento_id).filter(Boolean))];
  const equipsData = eqIds.length
    ? (await supabase.from("dim_equipamentos").select("id, nome").in("id", eqIds)).data ?? []
    : [];
  const eqMap = Object.fromEntries(equipsData.map((e) => [e.id, e.nome]));
  const equipamentos = (feq ?? []).map((r) => ({
    equipamento_nome: r.equipamento_id ? eqMap[r.equipamento_id] : undefined,
    status: r.status,
  }));

  const { data: serv } = await supabase
    .from("fato_servicos")
    .select("descricao, quantidade, unidade")
    .eq("diario_id", id);

  const { data: vis } = await supabase
    .from("fato_visitas")
    .select("tipo, visitantes")
    .eq("diario_id", id);

  const { data: occ } = await supabase
    .from("fato_ocorrencias")
    .select("tipo, descricao, severidade")
    .eq("diario_id", id);

  const { data: ap } = await supabase
    .from("fato_diarios_aprovacoes")
    .select("status_de, status_para, usuario_id, comentario, criado_em")
    .eq("diario_id", id)
    .order("criado_em", { ascending: true });
  const userIds = [...new Set((ap ?? []).map((r) => r.usuario_id).filter(Boolean))];
  const perfisData = userIds.length
    ? (await supabase.from("dim_perfis").select("id, nome").in("id", userIds)).data ?? []
    : [];
  const userMap = Object.fromEntries(perfisData.map((p) => [p.id, p.nome]));
  const aprobacoes = (ap ?? []).map((r) => ({
    status_de: r.status_de,
    status_para: r.status_para,
    usuario_nome: r.usuario_id ? userMap[r.usuario_id] : undefined,
    comentario: r.comentario,
    criado_em: r.criado_em,
  }));

  return {
    ...d,
    obra_nome: obra?.nome,
    clima: clima ?? null,
    mao_obra_propria,
    mao_obra_terceirizada,
    equipamentos,
    servicos: serv ?? [],
    visitas: vis ?? [],
    ocorrencias: occ ?? [],
    aprobacoes,
  };
}

export default function DiarioDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const id = params.id as string;

  const [showDevolver, setShowDevolver] = useState(false);
  const [comentarioDevolver, setComentarioDevolver] = useState("");

  const { data: diario, isLoading } = useQuery({
    queryKey: ["diario", id],
    queryFn: () => fetchDiario(id),
    enabled: !!id,
  });

  const podeEditar =
    diario &&
    (diario.status === "rascunho" || diario.status === "devolvido") &&
    (profile?.perfil === "admin" || profile?.perfil === "coordenador" || profile?.perfil === "operador_obra");

  const podeAprovar =
    diario &&
    diario.status === "aguardando_aprovacao" &&
    (profile?.perfil === "admin" || profile?.perfil === "coordenador");

  const podeExcluir = diario && profile?.perfil === "admin";

  const mutationAprovar = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("fato_diarios")
        .update({ status: "aprovado", atualizado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("fato_diarios_aprovacoes").insert({
        diario_id: id,
        status_de: "aguardando_aprovacao",
        status_para: "aprovado",
        usuario_id: user!.id,
        comentario: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario", id] });
      queryClient.invalidateQueries({ queryKey: ["diarios-list"] });
      queryClient.invalidateQueries({ queryKey: ["diarios-total"] });
      queryClient.invalidateQueries({ queryKey: ["diarios-aprovados"] });
    },
  });

  const mutationDevolver = useMutation({
    mutationFn: async () => {
      if (!comentarioDevolver.trim() || comentarioDevolver.length < 5) {
        throw new Error("Comentário obrigatório (mín. 5 caracteres) para devolução.");
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("fato_diarios")
        .update({ status: "devolvido", atualizado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("fato_diarios_aprovacoes").insert({
        diario_id: id,
        status_de: "aguardando_aprovacao",
        status_para: "devolvido",
        usuario_id: user!.id,
        comentario: comentarioDevolver.trim(),
      });
      setShowDevolver(false);
      setComentarioDevolver("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diario", id] });
      queryClient.invalidateQueries({ queryKey: ["diarios-list"] });
      queryClient.invalidateQueries({ queryKey: ["diarios-total"] });
    },
  });

  const mutationEnviar = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("fato_diarios")
        .update({ status: "aguardando_aprovacao", atualizado_em: new Date().toISOString() })
        .eq("id", id);
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
      queryClient.invalidateQueries({ queryKey: ["diarios-total"] });
    },
  });

  const mutationExcluir = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.from("fato_diarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      router.push("/dashboard/diarios");
      queryClient.invalidateQueries({ queryKey: ["diarios-list"] });
      queryClient.invalidateQueries({ queryKey: ["diarios-total"] });
    },
  });

  if (isLoading || !diario) {
    return (
      <div className="flex flex-col gap-6 min-h-full">
        <Link href="/dashboard/diarios" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          Voltar
        </Link>
        <p className="text-[var(--text-tertiary)]">
          {isLoading ? "Carregando..." : "Diário não encontrado."}
        </p>
      </div>
    );
  }

  const dataFormatada = format(new Date(diario.data_diario), "dd/MM/yyyy", {
    locale: ptBR,
  });
  const condicoesClima: Record<string, string> = {
    ensolarado: "Ensolarado",
    parcialmente_nublado: "Parcialmente nublado",
    nublado: "Nublado",
    garoa: "Garoa",
    chuva_leve: "Chuva leve",
    chuva_forte: "Chuva forte",
    tempestade: "Tempestade",
  };

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/diarios"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            Voltar
          </Link>
          <span className="text-[var(--text-disabled)]">|</span>
          <div>
            <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)]">
              Diário · {diario.obra_nome ?? "Obra"} · {dataFormatada}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  diario.status === "aprovado"
                    ? "green"
                    : diario.status === "devolvido"
                      ? "orange"
                      : diario.status === "aguardando_aprovacao"
                        ? "blue"
                        : "gray"
                }
              >
                {STATUS_LABEL[diario.status] ?? diario.status}
              </Badge>
              {diario.retroativo && (
                <Badge variant="orange">Registro retroativo</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeEditar && (diario.status === "rascunho" || diario.status === "devolvido") && (
            <Button
              variant="success"
              leftIcon={<Check className="w-4 h-4" />}
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => mutationEnviar.mutate()}
              loading={mutationEnviar.isPending}
            >
              Enviar para aprovação
            </Button>
          )}
          {podeAprovar && !showDevolver && (
            <>
              <Button
                variant="success"
                leftIcon={<Check className="w-4 h-4" />}
                onClick={() => mutationAprovar.mutate()}
                loading={mutationAprovar.isPending}
              >
                Aprovar
              </Button>
              <Button
                variant="warning"
                leftIcon={<X className="w-4 h-4" />}
                onClick={() => setShowDevolver(true)}
              >
                Devolver
              </Button>
            </>
          )}
          {podeExcluir && (
            <Button
              variant="danger"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => window.confirm("Excluir este diário permanentemente?") && mutationExcluir.mutate()}
              loading={mutationExcluir.isPending}
            >
              Excluir
            </Button>
          )}
        </div>
      </div>

      {showDevolver && podeAprovar && (
        <Card className="border-[var(--color-warning)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">Devolver diário</h3>
          <p className="text-[var(--font-size-small)] text-[var(--text-secondary)] mb-3">
            Informe o motivo da devolução (obrigatório):
          </p>
          <textarea
            value={comentarioDevolver}
            onChange={(e) => setComentarioDevolver(e.target.value)}
            placeholder="Comentário para o engenheiro..."
            rows={3}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
          <div className="flex gap-2">
            <Button
              variant="warning"
              onClick={() => mutationDevolver.mutate()}
              loading={mutationDevolver.isPending}
              disabled={comentarioDevolver.trim().length < 5}
            >
              Confirmar devolução
            </Button>
            <Button variant="secondary" onClick={() => setShowDevolver(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {diario.clima && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
              <h2 className="font-semibold text-[var(--text-primary)]">Clima</h2>
            </div>
            <p className="text-[var(--font-size-small)]">
              {condicoesClima[diario.clima.condicao] ?? diario.clima.condicao}
              {diario.clima.impactou_obra && (
                <span className="text-[var(--color-warning)] ml-2">· Impactou a execução</span>
              )}
            </p>
            {diario.clima.observacao && (
              <p className="text-[var(--text-tertiary)] text-[var(--font-size-small)] mt-1">
                {diario.clima.observacao}
              </p>
            )}
          </Card>
        )}

        {diario.mao_obra_propria.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
              <h2 className="font-semibold text-[var(--text-primary)]">Equipe própria</h2>
            </div>
            <ul className="space-y-1 text-[var(--font-size-small)]">
              {diario.mao_obra_propria.map((r, i) => (
                <li key={i}>
                  {r.nome_colaborador}
                  {r.funcao_nome && (
                    <span className="text-[var(--text-tertiary)] ml-1">({r.funcao_nome})</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {diario.mao_obra_terceirizada.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <UsersRound className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
              <h2 className="font-semibold text-[var(--text-primary)]">Equipe terceirizada</h2>
            </div>
            <ul className="space-y-1 text-[var(--font-size-small)]">
              {diario.mao_obra_terceirizada.map((r, i) => (
                <li key={i}>
                  {r.fornecedor_nome ?? "—"}: {r.quantidade} {r.funcao_nome ?? ""}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {diario.equipamentos.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
              <h2 className="font-semibold text-[var(--text-primary)]">Equipamentos</h2>
            </div>
            <ul className="space-y-1 text-[var(--font-size-small)]">
              {diario.equipamentos.map((r, i) => (
                <li key={i}>
                  {r.equipamento_nome ?? "—"} · {r.status}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {diario.servicos.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
              <h2 className="font-semibold text-[var(--text-primary)]">Serviços executados</h2>
            </div>
            <ul className="space-y-1 text-[var(--font-size-small)]">
              {diario.servicos.map((r, i) => (
                <li key={i}>
                  {r.descricao}
                  {(r.quantidade != null || r.unidade) && (
                    <span className="text-[var(--text-tertiary)] ml-1">
                      {r.quantidade} {r.unidade}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {diario.visitas.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2} />
              <h2 className="font-semibold text-[var(--text-primary)]">Visitas</h2>
            </div>
            <ul className="space-y-1 text-[var(--font-size-small)]">
              {diario.visitas.map((r, i) => (
                <li key={i}>
                  {r.tipo}: {r.visitantes}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {diario.ocorrencias.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" strokeWidth={2} />
              <h2 className="font-semibold text-[var(--text-primary)]">Ocorrências</h2>
            </div>
            <ul className="space-y-1 text-[var(--font-size-small)]">
              {diario.ocorrencias.map((r, i) => (
                <li key={i}>
                  <Badge variant={r.severidade === "alta" ? "red" : r.severidade === "media" ? "orange" : "gray"} className="mr-2">
                    {r.severidade}
                  </Badge>
                  {r.tipo}: {r.descricao}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(diario.observacoes_gerais || podeEditar) && (
          <ObservacoesCard
            diarioId={id}
            value={diario.observacoes_gerais ?? ""}
            readOnly={!podeEditar}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["diario", id] })}
          />
        )}
      </div>

      {diario.aprobacoes.length > 0 && (
        <Card>
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">Histórico de aprovações</h2>
          <ul className="space-y-2 text-[var(--font-size-small)]">
            {diario.aprobacoes.map((a, i) => (
              <li key={i} className="flex flex-wrap gap-2 items-baseline">
                <span className="font-medium">{a.usuario_nome ?? "—"}</span>
                <span className="text-[var(--text-tertiary)]">
                  {a.status_de} → {a.status_para}
                </span>
                <span className="text-[var(--text-tertiary)]">
                  {format(new Date(a.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
                {a.comentario && (
                  <span className="text-[var(--color-warning)] block mt-1">
                    {a.comentario}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!diario.clima &&
        diario.mao_obra_propria.length === 0 &&
        diario.mao_obra_terceirizada.length === 0 &&
        diario.equipamentos.length === 0 &&
        diario.servicos.length === 0 &&
        diario.visitas.length === 0 &&
        diario.ocorrencias.length === 0 &&
        !diario.observacoes_gerais && (
          <Card className="border-dashed">
            <p className="text-[var(--text-tertiary)] text-[var(--font-size-small)]">
              Nenhum módulo preenchido. Edite o diário para adicionar informações.
            </p>
          </Card>
        )}
    </div>
  );
}
