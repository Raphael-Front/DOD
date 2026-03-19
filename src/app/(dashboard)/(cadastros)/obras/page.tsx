"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Pencil,
  Search,
  X,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button, InputField, Badge, Card, DatePickerField } from "@/components/ui";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_OBRA: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  paralisada: "Paralisada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

type Obra = {
  id: string;
  nome: string;
  numero_empresa: number | null;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  responsavel_tecnico: string | null;
  data_inicio: string | null;
  data_prevista_fim: string | null;
  data_real_fim: string | null;
  status: string;
  observacoes: string | null;
  ativo: boolean;
};

const initialForm: Partial<Obra> & { nome: string } = {
  nome: "",
  numero_empresa: null,
  cnpj: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  responsavel_tecnico: "",
  data_inicio: null,
  data_prevista_fim: null,
  data_real_fim: null,
  status: "em_andamento",
  observacoes: "",
  ativo: true,
};

async function fetchObras(busca: string): Promise<Obra[]> {
  const supabase = createClient();
  let query = supabase
    .from("dim_obras")
    .select("*")
    .order("nome", { ascending: true });

  if (busca.trim()) {
    query = query.or(
      `nome.ilike.%${busca}%,endereco.ilike.%${busca}%,responsavel_tecnico.ilike.%${busca}%,cidade.ilike.%${busca}%,cnpj.ilike.%${busca}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Obra[];
}

export default function ObrasPage() {
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof initialForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const { data: obras = [], isLoading } = useQuery({
    queryKey: ["cadastros-obras", busca],
    queryFn: () => fetchObras(busca),
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (o: Obra) => {
    setEditingId(o.id);
    setForm({
      nome: o.nome,
      numero_empresa: o.numero_empresa ?? null,
      cnpj: o.cnpj ?? "",
      endereco: o.endereco ?? "",
      cidade: o.cidade ?? "",
      estado: o.estado ?? "",
      cep: o.cep ?? "",
      responsavel_tecnico: o.responsavel_tecnico ?? "",
      data_inicio: o.data_inicio ?? null,
      data_prevista_fim: o.data_prevista_fim ?? null,
      data_real_fim: o.data_real_fim ?? null,
      status: o.status,
      observacoes: o.observacoes ?? "",
      ativo: o.ativo,
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

  const validate = (): boolean => {
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
        numero_empresa: form.numero_empresa ?? null,
        cnpj: form.cnpj?.trim() || null,
        endereco: form.endereco?.trim() || null,
        cidade: form.cidade?.trim() || null,
        estado: form.estado?.trim() || null,
        cep: form.cep?.trim() || null,
        responsavel_tecnico: form.responsavel_tecnico?.trim() || null,
        data_inicio: form.data_inicio || null,
        data_prevista_fim: form.data_prevista_fim || null,
        data_real_fim: form.data_real_fim || null,
        status: form.status,
        observacoes: form.observacoes?.trim() || null,
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase
          .from("dim_obras")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dim_obras").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-obras"] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("dim_obras")
        .delete()
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-obras"] });
      handleCloseModal();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  const statusVariant = (s: string) => {
    if (s === "em_andamento") return "green";
    if (s === "concluida") return "teal";
    if (s === "paralisada" || s === "cancelada") return "red";
    return "gray";
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
            placeholder="Buscar obras..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="size-4" />
          Nova obra
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Empresa</th>
                <th className="text-left">Nome</th>
                <th className="text-left">CNPJ</th>
                <th className="text-left">Responsável</th>
                <th className="text-left">Status</th>
                <th className="text-left">Início / Fim previsto</th>
                <th className="text-left">Ativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    Carregando...
                  </td>
                </tr>
              ) : obras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    Nenhuma obra encontrada.
                  </td>
                </tr>
              ) : (
                obras.map((o) => (
                  <tr key={o.id}>
                    <td className="text-[var(--text-secondary)] font-mono text-center">
                      {o.numero_empresa ?? "—"}
                    </td>
                    <td className="font-medium text-[var(--text-primary)]">
                      {o.nome}
                    </td>
                    <td className="text-[var(--text-secondary)] font-mono text-sm">
                      {o.cnpj || "—"}
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {o.responsavel_tecnico || "—"}
                    </td>
                    <td>
                      <Badge variant={statusVariant(o.status) as "green" | "teal" | "red" | "gray"}>
                        {STATUS_OBRA[o.status] ?? o.status}
                      </Badge>
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {o.data_inicio
                        ? format(new Date(o.data_inicio), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}{" "}
                      /{" "}
                      {o.data_prevista_fim
                        ? format(new Date(o.data_prevista_fim), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "—"}
                    </td>
                    <td>
                      {o.ativo ? (
                        <Badge variant="green">Sim</Badge>
                      ) : (
                        <Badge variant="gray">Não</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(o)}
                      >
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
          <Card className="modal-content w-full max-w-lg max-h-[90vh] overflow-y-auto" padding="lg">
            <div className="modal-header flex items-center justify-between mb-6">
              <h2 className="text-[var(--text-primary)]">
                {editingId ? "Editar obra" : "Nova obra"}
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
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Número da Empresa"
                  type="number"
                  value={form.numero_empresa?.toString() ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      numero_empresa: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  error={formErrors.numero_empresa}
                  placeholder="Ex: 42"
                />
                <InputField
                  label="CNPJ"
                  value={form.cnpj ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <InputField
                label="Nome *"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                error={formErrors.nome}
                placeholder="Nome da obra"
                required
              />
              <InputField
                label="Endereço"
                value={form.endereco ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                placeholder="Endereço completo"
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Cidade"
                  value={form.cidade ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  placeholder="Cidade"
                />
                <InputField
                  label="Estado"
                  value={form.estado ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
              <InputField
                label="CEP"
                value={form.cep ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                placeholder="00000-000"
              />
              <InputField
                label="Responsável técnico"
                value={form.responsavel_tecnico ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, responsavel_tecnico: e.target.value }))
                }
                placeholder="Nome do responsável"
              />
              <div className="grid grid-cols-2 gap-4">
                <DatePickerField
                  label="Data início"
                  value={form.data_inicio ?? null}
                  onChange={(v) => setForm((f) => ({ ...f, data_inicio: v }))}
                />
                <DatePickerField
                  label="Data prevista fim"
                  value={form.data_prevista_fim ?? null}
                  onChange={(v) => setForm((f) => ({ ...f, data_prevista_fim: v }))}
                />
              </div>
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  {Object.entries(STATUS_OBRA).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Observações
                </label>
                <textarea
                  value={form.observacoes ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observacoes: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  placeholder="Observações"
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
                  Obra ativa
                </span>
              </label>

              {confirmDelete ? (
                <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[var(--font-size-small)] font-medium">
                      Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita.
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
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setConfirmDelete(false)}
                    >
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
                    <Button variant="secondary" type="button" onClick={handleCloseModal}>
                      Cancelar
                    </Button>
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
