"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Search, X } from "lucide-react";
import { Button, Input, Badge, Card } from "@/components/ui";

type Funcao = {
  id: string;
  nome: string;
  categoria: string | null;
  observacoes: string | null;
  ativo: boolean;
};

const initialForm = {
  nome: "",
  categoria: "",
  observacoes: "",
  ativo: true,
};

async function fetchFuncoes(busca: string) {
  const supabase = createClient();
  let query = supabase
    .from("dim_funcoes")
    .select("*")
    .order("nome", { ascending: true });
  if (busca.trim()) {
    query = query.or(`nome.ilike.%${busca}%,categoria.ilike.%${busca}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Funcao[];
}

export default function FuncoesPage() {
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: funcoes = [], isLoading } = useQuery({
    queryKey: ["cadastros-funcoes", busca],
    queryFn: () => fetchFuncoes(busca),
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (f: Funcao) => {
    setEditingId(f.id);
    setForm({
      nome: f.nome,
      categoria: f.categoria ?? "",
      observacoes: f.observacoes ?? "",
      ativo: f.ativo,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
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
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria?.trim() || null,
        observacoes: form.observacoes?.trim() || null,
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase
          .from("dim_funcoes")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dim_funcoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-funcoes"] });
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
            placeholder="Buscar funções..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenNew}>
          Nova função
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Nome</th>
                <th className="text-left">Categoria</th>
                <th className="text-left">Ativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Carregando...</td>
                </tr>
              ) : funcoes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Nenhuma função encontrada.</td>
                </tr>
              ) : (
                funcoes.map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium text-[var(--text-primary)]">{f.nome}</td>
                    <td className="text-[var(--text-secondary)]">{f.categoria || "—"}</td>
                    <td>
                      {f.ativo ? <Badge variant="green">Sim</Badge> : <Badge variant="gray">Não</Badge>}
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => handleOpenEdit(f)}>
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
          <Card className="modal-content w-full max-w-md max-h-[90vh] overflow-y-auto" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                {editingId ? "Editar função" : "Nova função"}
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
              <Input
                label="Nome *"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                error={formErrors.nome}
                placeholder="Ex: Pedreiro, Armador"
                required
              />
              <Input
                label="Categoria"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                placeholder="Categoria"
              />
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  placeholder="Observações"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 rounded border-[var(--border-medium)]" />
                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">Ativo</span>
              </label>
              <div className="modal-footer flex gap-3">
                <Button type="submit" loading={mutation.isPending}>{editingId ? "Salvar" : "Criar"}</Button>
                <Button variant="secondary" type="button" onClick={handleCloseModal}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
