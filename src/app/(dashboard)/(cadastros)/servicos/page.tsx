"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Search, X, Layers, ToggleLeft, ToggleRight } from "lucide-react";
import { Button, InputField, Badge, Card } from "@/components/ui";
import { clsx } from "clsx";

type Servico = {
  id: string;
  nome: string;
  unidade: string;
  valor_referencia: number;
  categoria: "produtivo" | "apoio" | "retrabalho";
  descricao: string | null;
  ativo: boolean;
};

const CATEGORIAS = [
  { value: "produtivo", label: "Produtivo" },
  { value: "apoio", label: "Apoio" },
  { value: "retrabalho", label: "Retrabalho" },
] as const;

const UNIDADES = [
  { value: "m²", label: "m²" },
  { value: "m³", label: "m³" },
  { value: "m linear", label: "m linear" },
  { value: "un", label: "un" },
  { value: "h", label: "h" },
  { value: "kg", label: "kg" },
  { value: "verba", label: "verba" },
] as const;

const categoriaBadge: Record<string, { variant: "blue" | "orange" | "red"; label: string }> = {
  produtivo:  { variant: "blue",   label: "Produtivo" },
  apoio:      { variant: "orange", label: "Apoio" },
  retrabalho: { variant: "red",    label: "Retrabalho" },
};

const initialForm = {
  nome: "",
  unidade: "m²",
  valor_referencia: "",
  categoria: "produtivo" as "produtivo" | "apoio" | "retrabalho",
  descricao: "",
  ativo: true,
};

async function fetchServicos(busca: string, categoriaFiltro: string): Promise<Servico[]> {
  const supabase = createClient();
  let query = supabase
    .from("d_servicos")
    .select("id, nome, unidade, valor_referencia, categoria, descricao, ativo")
    .order("nome", { ascending: true });
  if (busca.trim()) {
    query = query.ilike("nome", `%${busca}%`);
  }
  if (categoriaFiltro) {
    query = query.eq("categoria", categoriaFiltro);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Servico[];
}

export default function ServicosPage() {
  const { profile } = useAuth();
  const perfil = profile?.perfil ?? "leitura";
  const podeEditar = ["admin", "coordenador"].includes(perfil);

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ["cadastros-servicos", busca, categoriaFiltro],
    queryFn: () => fetchServicos(busca, categoriaFiltro),
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (s: Servico) => {
    setEditingId(s.id);
    setForm({
      nome: s.nome,
      unidade: s.unidade,
      valor_referencia: String(s.valor_referencia),
      categoria: s.categoria,
      descricao: s.descricao ?? "",
      ativo: s.ativo,
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
    if (!form.unidade) err.unidade = "Unidade é obrigatória";
    if (!form.valor_referencia || isNaN(Number(form.valor_referencia))) {
      err.valor_referencia = "Valor de referência é obrigatório";
    }
    if (!form.categoria) err.categoria = "Categoria é obrigatória";

    // CS01: validar unicidade do nome
    if (form.nome.trim()) {
      const supabase = createClient();
      let q = supabase
        .from("d_servicos")
        .select("id")
        .eq("nome", form.nome.trim());
      if (editingId) q = q.neq("id", editingId);
      const { data } = await q;
      if (data && data.length > 0) {
        err.nome = "Já existe um serviço com este nome";
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
        unidade: form.unidade,
        valor_referencia: Number(form.valor_referencia),
        categoria: form.categoria,
        descricao: form.descricao?.trim() || null,
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase.from("d_servicos").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("d_servicos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-servicos"] });
      handleCloseModal();
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase.from("d_servicos").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-servicos"] });
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
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
            <input
              type="text"
              placeholder="Buscar serviços..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        {podeEditar && (
          <Button onClick={handleOpenNew}>
            <Plus className="size-4" />
            Novo serviço
          </Button>
        )}
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Nome do Serviço</th>
                <th className="text-left">Unidade</th>
                <th className="text-right">Valor Ref. (R$/un)</th>
                <th className="text-left">Categoria</th>
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
              ) : servicos.length === 0 ? (
                <tr>
                  <td colSpan={podeEditar ? 6 : 5} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    {busca || categoriaFiltro ? "Nenhum serviço encontrado." : (
                      <div className="flex flex-col items-center gap-2">
                        <Layers className="w-8 h-8 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                        <span>Nenhum serviço cadastrado. Clique em "Novo serviço" para começar.</span>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                servicos.map((s) => {
                  const badge = categoriaBadge[s.categoria];
                  return (
                    <tr key={s.id} className={clsx(!s.ativo && "opacity-50")}>
                      <td className="font-medium text-[var(--text-primary)]">{s.nome}</td>
                      <td className="text-[var(--text-secondary)]">{s.unidade}</td>
                      <td className="text-right text-[var(--text-secondary)] tabular-nums">
                        {s.valor_referencia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td>
                        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                      </td>
                      <td>
                        {podeEditar ? (
                          <button
                            type="button"
                            onClick={() => toggleAtivoMutation.mutate({ id: s.id, ativo: !s.ativo })}
                            className="flex items-center gap-1.5 text-[var(--font-size-small)] transition-colors"
                            title={s.ativo ? "Clique para desativar" : "Clique para ativar"}
                          >
                            {s.ativo ? (
                              <ToggleRight className="w-5 h-5 text-[var(--color-success)]" strokeWidth={2} />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-[var(--text-tertiary)]" strokeWidth={2} />
                            )}
                            <span className={s.ativo ? "text-[var(--color-success)]" : "text-[var(--text-tertiary)]"}>
                              {s.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </button>
                        ) : (
                          s.ativo ? <Badge variant="green">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>
                        )}
                      </td>
                      {podeEditar && (
                        <td className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(s)}>
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
                {editingId ? "Editar serviço" : "Novo serviço"}
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
                label="Nome do serviço *"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                error={formErrors.nome}
                placeholder="Ex: Concretagem de laje"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Unidade de medida *
                  </label>
                  <select
                    value={form.unidade}
                    onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                    className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  >
                    {UNIDADES.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                  {formErrors.unidade && (
                    <p className="text-xs text-[var(--color-error)] mt-1">{formErrors.unidade}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                    Valor de referência (R$/un) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valor_referencia}
                    onChange={(e) => setForm((f) => ({ ...f, valor_referencia: e.target.value }))}
                    placeholder="0,00"
                    className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                  {formErrors.valor_referencia && (
                    <p className="text-xs text-[var(--color-error)] mt-1">{formErrors.valor_referencia}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Categoria *
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoria: e.target.value as typeof form.categoria }))
                  }
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {formErrors.categoria && (
                  <p className="text-xs text-[var(--color-error)] mt-1">{formErrors.categoria}</p>
                )}
              </div>

              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Descrição / Observações
                </label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  placeholder="Informações adicionais sobre o serviço..."
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border-medium)]"
                />
                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">
                  Serviço ativo
                </span>
              </label>

              {mutation.isError && (
                <p className="text-xs text-[var(--color-error)]">
                  Erro ao salvar serviço. Tente novamente.
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
