"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Search, X, Trash2, AlertTriangle } from "lucide-react";
import { Button, InputField, Badge, Card, DatePickerField } from "@/components/ui";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Fornecedor = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  responsavel: string | null;
  telefone: string | null;
  email: string | null;
  tipo_servico: string | null;
  contrato_numero: string | null;
  contrato_inicio: string | null;
  contrato_fim: string | null;
  observacoes: string | null;
  ativo: boolean;
};

const initialForm = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  responsavel: "",
  telefone: "",
  email: "",
  tipo_servico: "",
  contrato_numero: "",
  contrato_inicio: null as string | null,
  contrato_fim: null as string | null,
  observacoes: "",
  ativo: true,
};

async function fetchFornecedores(busca: string) {
  const supabase = createClient();
  let query = supabase
    .from("dim_fornecedores")
    .select("*")
    .order("razao_social", { ascending: true });
  if (busca.trim()) {
    query = query.or(
      `razao_social.ilike.%${busca}%,nome_fantasia.ilike.%${busca}%,cnpj.ilike.%${busca}%,responsavel.ilike.%${busca}%`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Fornecedor[];
}

export default function FornecedoresPage() {
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["cadastros-fornecedores", busca],
    queryFn: () => fetchFornecedores(busca),
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (f: Fornecedor) => {
    setEditingId(f.id);
    setForm({
      razao_social: f.razao_social,
      nome_fantasia: f.nome_fantasia ?? "",
      cnpj: f.cnpj ?? "",
      responsavel: f.responsavel ?? "",
      telefone: f.telefone ?? "",
      email: f.email ?? "",
      tipo_servico: f.tipo_servico ?? "",
      contrato_numero: f.contrato_numero ?? "",
      contrato_inicio: f.contrato_inicio ?? null,
      contrato_fim: f.contrato_fim ?? null,
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
    setConfirmDelete(false);
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!form.razao_social?.trim()) err.razao_social = "Razão social é obrigatória";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const payload = {
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia?.trim() || null,
        cnpj: form.cnpj?.trim() || null,
        responsavel: form.responsavel?.trim() || null,
        telefone: form.telefone?.trim() || null,
        email: form.email?.trim() || null,
        tipo_servico: form.tipo_servico?.trim() || null,
        contrato_numero: form.contrato_numero?.trim() || null,
        contrato_inicio: form.contrato_inicio || null,
        contrato_fim: form.contrato_fim || null,
        observacoes: form.observacoes?.trim() || null,
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase
          .from("dim_fornecedores")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dim_fornecedores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-fornecedores"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("dim_fornecedores")
        .delete()
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-fornecedores"] });
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
            placeholder="Buscar fornecedores..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="size-4" />
          Novo fornecedor
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Razão social</th>
                <th className="text-left">CNPJ</th>
                <th className="text-left">Responsável</th>
                <th className="text-left">Contrato</th>
                <th className="text-left">Ativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Carregando...</td>
                </tr>
              ) : fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Nenhum fornecedor encontrado.</td>
                </tr>
              ) : (
                fornecedores.map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium text-[var(--text-primary)]">{f.razao_social}</td>
                    <td className="text-[var(--text-secondary)]">{f.cnpj || "—"}</td>
                    <td className="text-[var(--text-secondary)]">{f.responsavel || "—"}</td>
                    <td className="text-[var(--text-secondary)]">
                      {f.contrato_inicio && f.contrato_fim
                        ? `${format(new Date(f.contrato_inicio), "dd/MM/yy", { locale: ptBR })} — ${format(new Date(f.contrato_fim), "dd/MM/yy", { locale: ptBR })}`
                        : f.contrato_numero || "—"}
                    </td>
                    <td>
                      {f.ativo ? <Badge variant="green">Sim</Badge> : <Badge variant="gray">Não</Badge>}
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(f)}>
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
          <Card className="modal-content w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                {editingId ? "Editar fornecedor" : "Novo fornecedor"}
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
                label="Razão social *"
                value={form.razao_social}
                onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
                error={formErrors.razao_social}
                placeholder="Razão social"
                required
              />
              <InputField
                label="Nome fantasia"
                value={form.nome_fantasia}
                onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
                placeholder="Nome fantasia"
              />
              <InputField
                label="CNPJ"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
              />
              <InputField
                label="Responsável"
                value={form.responsavel}
                onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                placeholder="Nome do responsável"
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Telefone"
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="Telefone"
                />
                <InputField
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="E-mail"
                />
              </div>
              <InputField
                label="Tipo de serviço"
                value={form.tipo_servico}
                onChange={(e) => setForm((f) => ({ ...f, tipo_servico: e.target.value }))}
                placeholder="Tipo de serviço prestado"
              />
              <InputField
                label="Número do contrato"
                value={form.contrato_numero}
                onChange={(e) => setForm((f) => ({ ...f, contrato_numero: e.target.value }))}
                placeholder="Nº contrato"
              />
              <div className="grid grid-cols-2 gap-4">
                <DatePickerField
                  label="Início contrato"
                  value={form.contrato_inicio}
                  onChange={(v) => setForm((f) => ({ ...f, contrato_inicio: v }))}
                />
                <DatePickerField
                  label="Fim contrato"
                  value={form.contrato_fim}
                  onChange={(v) => setForm((f) => ({ ...f, contrato_fim: v }))}
                />
              </div>
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
              {confirmDelete ? (
                <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[var(--font-size-small)] font-medium">
                      Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
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
