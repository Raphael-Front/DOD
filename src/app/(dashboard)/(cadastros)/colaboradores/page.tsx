"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Search, X, HardHat, AlertTriangle } from "lucide-react";
import { Button, InputField, Badge, Card } from "@/components/ui";
import { clsx } from "clsx";

type Colaborador = {
  id: string;
  nome: string;
  matricula: string;
  codigo_legado: string | null;
  empresa: string | null;
  nome_obra: string | null;
  obra: string | null;
  funcao: string | null;
  num_dependentes: number;
  data_admissao: string;
  status: "ativo" | "ferias" | "afastado" | "demitido";
  adicional_insalubridade: number;
};

type Obra = { id: string; nome: string };
type Funcao = { id: string; nome: string };

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "ferias", label: "Férias" },
  { value: "afastado", label: "Afastado" },
  { value: "demitido", label: "Demitido" },
] as const;

const statusBadge: Record<string, { variant: "green" | "orange" | "gray" | "red"; label: string }> = {
  ativo:    { variant: "green",  label: "Ativo" },
  ferias:   { variant: "orange", label: "Férias" },
  afastado: { variant: "gray",   label: "Afastado" },
  demitido: { variant: "red",    label: "Demitido" },
};

const initialForm = {
  nome: "",
  matricula: "",
  codigo_legado: "",
  obra: "",
  funcao: "",
  num_dependentes: "0",
  data_admissao: "",
  status: "ativo" as "ativo" | "ferias" | "afastado" | "demitido",
  adicional_insalubridade: "",
};

async function fetchColaboradores(busca: string): Promise<Colaborador[]> {
  const supabase = createClient();
  let query = supabase
    .from("v_colaboradores")
    .select("id, nome, matricula, codigo_legado, empresa, nome_obra, obra, funcao, num_dependentes, data_admissao, status, adicional_insalubridade")
    .is("deleted_at", null)
    .order("nome", { ascending: true });
  if (busca.trim()) {
    query = query.ilike("nome", `%${busca}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    nome: d.nome as string,
    matricula: d.matricula as string,
    codigo_legado: d.codigo_legado as string | null,
    empresa: (d.empresa as string | null) ?? null,
    nome_obra: (d.nome_obra as string | null) ?? null,
    obra: (d.obra as string | null) ?? null,
    funcao: (d.funcao as string | null) ?? null,
    num_dependentes: (d.num_dependentes as number) ?? 0,
    data_admissao: d.data_admissao as string,
    status: d.status as Colaborador["status"],
    adicional_insalubridade: (d.adicional_insalubridade as number) ?? 0,
  }));
}

async function fetchObras(): Promise<Obra[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_obras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Obra[];
}

async function fetchFuncoes(): Promise<Funcao[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_funcoes")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Funcao[];
}

export default function ColaboradoresPage() {
  const { profile } = useAuth();
  const perfil = profile?.perfil ?? "leitura";
  const podeEditar = ["admin", "coordenador"].includes(perfil);

  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ["cadastros-colaboradores-v2", busca],
    queryFn: () => fetchColaboradores(busca),
  });

  const { data: obras = [] } = useQuery({
    queryKey: ["obras-select"],
    queryFn: fetchObras,
  });

  const { data: funcoes = [] } = useQuery({
    queryKey: ["cadastros-funcoes-select"],
    queryFn: fetchFuncoes,
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Colaborador) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      matricula: c.matricula,
      codigo_legado: c.codigo_legado ?? "",
      obra: c.obra ?? "",
      funcao: c.funcao ?? "",
      num_dependentes: String(c.num_dependentes),
      data_admissao: c.data_admissao,
      status: c.status,
      adicional_insalubridade: c.adicional_insalubridade ? String(c.adicional_insalubridade) : "",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
  };

  const validate = async (): Promise<boolean> => {
    const err: Record<string, string> = {};
    if (!form.nome.trim()) err.nome = "Nome é obrigatório";
    if (!form.matricula.trim()) err.matricula = "Matrícula é obrigatória";
    if (!form.obra.trim()) err.obra = "Obra é obrigatória";
    if (!form.funcao.trim()) err.funcao = "Função é obrigatória";
    if (!form.data_admissao) err.data_admissao = "Data de admissão é obrigatória";

    // Validar unicidade da matrícula
    if (form.matricula.trim()) {
      const supabase = createClient();
      let q = supabase
        .from("d_colaboradores")
        .select("id")
        .eq("matricula", form.matricula.trim())
        .is("deleted_at", null);
      if (editingId) q = q.neq("id", editingId);
      const { data } = await q;
      if (data && data.length > 0) {
        err.matricula = "Já existe um colaborador com esta matrícula";
      }
    }

    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const payload = {
        nome: form.nome.trim(),
        matricula: form.matricula.trim(),
        codigo_legado: form.codigo_legado?.trim() || null,
        obra: form.obra.trim() || null,
        funcao: form.funcao.trim() || null,
        num_dependentes: parseInt(form.num_dependentes) || 0,
        data_admissao: form.data_admissao,
        status: form.status,
        adicional_insalubridade: form.adicional_insalubridade
          ? Number(form.adicional_insalubridade)
          : 0,
      };
      if (editingId) {
        const { error } = await supabase
          .from("d_colaboradores")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("d_colaboradores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-colaboradores-v2"] });
      handleCloseModal();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await validate();
    if (!ok) return;
    mutation.mutate();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]"
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="Buscar colaboradores..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        {podeEditar && (
          <Button onClick={handleOpenNew}>
            <Plus className="size-4" />
            Novo colaborador
          </Button>
        )}
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Nome completo</th>
                <th className="text-left">Matrícula</th>
                <th className="text-left">Obra vinculada</th>
                <th className="text-left">Função</th>
                <th className="text-left">Status</th>
                {podeEditar && <th className="text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={podeEditar ? 6 : 5} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    Carregando...
                  </td>
                </tr>
              ) : colaboradores.length === 0 ? (
                <tr>
                  <td colSpan={podeEditar ? 6 : 5} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    {busca ? "Nenhum colaborador encontrado." : (
                      <div className="flex flex-col items-center gap-2">
                        <HardHat className="w-8 h-8 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                        <span>Nenhum colaborador cadastrado. Clique em "Novo colaborador" para começar.</span>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                colaboradores.map((c) => {
                  const badge = statusBadge[c.status];
                  return (
                    <tr key={c.id} className={clsx(c.status === "demitido" && "opacity-50")}>
                      <td className="font-medium text-[var(--text-primary)]">{c.nome}</td>
                      <td className="text-[var(--text-secondary)] font-mono text-[var(--font-size-small)]">
                        {c.matricula}
                      </td>
                      <td className="text-[var(--text-secondary)]">
                        {c.nome_obra ?? c.obra ?? "—"}
                      </td>
                      <td className="text-[var(--text-secondary)]">
                        {c.funcao ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                            {c.funcao}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                      </td>
                      {podeEditar && (
                        <td className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(c)}>
                            <Pencil className="size-4" />
                            Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && (
        <div
          className="modal-overlay fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 overflow-y-auto py-8"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <Card className="modal-content w-full max-w-lg max-h-[90vh] overflow-y-auto" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                {editingId ? "Editar colaborador" : "Novo colaborador"}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <InputField
                label="Nome completo *"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                error={formErrors.nome}
                placeholder="Nome do colaborador"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Matrícula *"
                  value={form.matricula}
                  onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
                  error={formErrors.matricula}
                  placeholder="MAT-001"
                  required
                />
                <InputField
                  label="Código legado (UAU!)"
                  value={form.codigo_legado}
                  onChange={(e) => setForm((f) => ({ ...f, codigo_legado: e.target.value }))}
                  placeholder="Código no sistema UAU!"
                />
              </div>

              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Obra vinculada *
                </label>
                <select
                  value={form.obra}
                  onChange={(e) => setForm((f) => ({ ...f, obra: e.target.value }))}
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  <option value="">— Selecione a obra —</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.nome}>{o.nome}</option>
                  ))}
                </select>
                {formErrors.obra && (
                  <p className="text-xs text-[var(--color-error)] mt-1">{formErrors.obra}</p>
                )}
              </div>

              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Função *
                </label>
                <select
                  value={form.funcao}
                  onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value }))}
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  <option value="">— Selecione a função —</option>
                  {funcoes.map((fn) => (
                    <option key={fn.id} value={fn.nome}>{fn.nome}</option>
                  ))}
                </select>
                {formErrors.funcao && (
                  <p className="text-xs text-[var(--color-error)] mt-1">{formErrors.funcao}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Data de admissão *
                  </label>
                  <input
                    type="date"
                    value={form.data_admissao}
                    onChange={(e) => setForm((f) => ({ ...f, data_admissao: e.target.value }))}
                    className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                  {formErrors.data_admissao && (
                    <p className="text-xs text-[var(--color-error)] mt-1">{formErrors.data_admissao}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Nº dependentes (IRRF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.num_dependentes}
                    onChange={(e) => setForm((f) => ({ ...f, num_dependentes: e.target.value }))}
                    className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Status *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))
                    }
                    className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Adicional / Insalubridade (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.adicional_insalubridade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, adicional_insalubridade: e.target.value }))
                    }
                    placeholder="0,00"
                    className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                </div>
              </div>

              {form.status === "demitido" && (
                <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-warning)]" strokeWidth={2} />
                  <p className="text-[var(--font-size-mini)] text-[var(--color-warning-dark)]">
                    Colaboradores demitidos não aparecem nos seletores da folha de pagamento, mas o histórico é preservado.
                  </p>
                </div>
              )}

              {mutation.isError && (
                <p className="text-xs text-[var(--color-error)]">
                  Erro ao salvar colaborador. Tente novamente.
                </p>
              )}

              <div className="modal-footer flex items-center gap-3">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
                </Button>
                <Button variant="secondary" type="button" onClick={handleCloseModal}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
