"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Search, X, Trash2, AlertTriangle } from "lucide-react";
import { Button, InputField, Badge, Card } from "@/components/ui";

type Departamento = {
  id: string;
  nome: string;
  ativo: boolean;
};

const initialForm = {
  nome: "",
  ativo: true,
};

async function fetchDepartamentos(busca: string) {
  const supabase = createClient();
  let query = supabase
    .from("dim_departamentos")
    .select("*")
    .order("nome", { ascending: true });
  if (busca.trim()) {
    query = query.ilike("nome", `%${busca}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Departamento[];
}

export default function DepartamentosPage() {
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const { data: departamentos = [], isLoading } = useQuery({
    queryKey: ["cadastros-departamentos", busca],
    queryFn: () => fetchDepartamentos(busca),
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (d: Departamento) => {
    setEditingId(d.id);
    setForm({ nome: d.nome, ativo: d.ativo });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setConfirmDelete(false);
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!form.nome?.trim()) err.nome = "Nome é obrigatório";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const payload = { nome: form.nome.trim(), ativo: form.ativo };
      if (editingId) {
        const { error } = await supabase
          .from("dim_departamentos")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dim_departamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-departamentos"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const supabase = createClient();
      const { error } = await supabase.from("dim_departamentos").delete().eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-departamentos"] });
      handleCloseModal();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar departamentos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="size-4" />
          Novo departamento
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Nome</th>
                <th className="text-left">Ativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Carregando...</td>
                </tr>
              ) : departamentos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Nenhum departamento encontrado.</td>
                </tr>
              ) : (
                departamentos.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium text-[var(--text-primary)]">{d.nome}</td>
                    <td>
                      {d.ativo ? <Badge variant="green">Sim</Badge> : <Badge variant="gray">Não</Badge>}
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(d)}>
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
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
          <Card className="modal-content w-full max-w-sm" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                {editingId ? "Editar departamento" : "Novo departamento"}
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
                label="Nome *"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                error={formErrors.nome}
                placeholder="Ex: Engenharia, Diretoria"
                required
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border-medium)]"
                />
                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">Ativo</span>
              </label>
              {confirmDelete ? (
                <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[var(--font-size-small)] font-medium">
                      Tem certeza que deseja excluir este departamento? Esta ação não pode ser desfeita.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate()}
                    >
                      <Trash2 className="size-4" />
                      {deleteMutation.isPending ? "Excluindo..." : "Confirmar exclusão"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="modal-footer flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
                    </Button>
                    <Button variant="secondary" type="button" onClick={handleCloseModal}>Cancelar</Button>
                  </div>
                  {editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
