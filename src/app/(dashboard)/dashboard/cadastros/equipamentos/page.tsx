"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Search, X } from "lucide-react";
import { Button, Input, Badge, Card } from "@/components/ui";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Equipamento = {
  id: string;
  tipo: "proprio" | "locado";
  nome: string;
  identificacao: string | null;
  fabricante: string | null;
  modelo: string | null;
  obra_alocacao_id: string | null;
  fornecedor_id: string | null;
  contrato_numero: string | null;
  locacao_inicio: string | null;
  locacao_fim: string | null;
  valor_locacao: number | null;
  observacoes: string | null;
  ativo: boolean;
};

const initialForm = {
  tipo: "proprio" as "proprio" | "locado",
  nome: "",
  identificacao: "",
  fabricante: "",
  modelo: "",
  obra_alocacao_id: null as string | null,
  fornecedor_id: null as string | null,
  contrato_numero: "",
  locacao_inicio: null as string | null,
  locacao_fim: null as string | null,
  valor_locacao: null as number | null,
  observacoes: "",
  ativo: true,
};

async function fetchEquipamentos(busca: string): Promise<Equipamento[]> {
  const supabase = createClient();
  let query = supabase
    .from("dim_equipamentos")
    .select("*")
    .order("nome", { ascending: true });
  if (busca.trim()) {
    query = query.or(
      `nome.ilike.%${busca}%,identificacao.ilike.%${busca}%,fabricante.ilike.%${busca}%`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Equipamento[];
}

async function fetchObras() {
  const supabase = createClient();
  const { data } = await supabase
    .from("dim_obras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}

async function fetchFornecedores() {
  const supabase = createClient();
  const { data } = await supabase
    .from("dim_fornecedores")
    .select("id, razao_social")
    .eq("ativo", true)
    .order("razao_social");
  return data ?? [];
}

export default function EquipamentosPage() {
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ["cadastros-equipamentos", busca],
    queryFn: () => fetchEquipamentos(busca),
  });

  const { data: obras = [] } = useQuery({
    queryKey: ["obras-list"],
    queryFn: fetchObras,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-list"],
    queryFn: fetchFornecedores,
  });

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (e: Equipamento) => {
    setEditingId(e.id);
    setForm({
      tipo: e.tipo,
      nome: e.nome,
      identificacao: e.identificacao ?? "",
      fabricante: e.fabricante ?? "",
      modelo: e.modelo ?? "",
      obra_alocacao_id: e.obra_alocacao_id ?? null,
      fornecedor_id: e.fornecedor_id ?? null,
      contrato_numero: e.contrato_numero ?? "",
      locacao_inicio: e.locacao_inicio ?? null,
      locacao_fim: e.locacao_fim ?? null,
      valor_locacao: e.valor_locacao ?? null,
      observacoes: e.observacoes ?? "",
      ativo: e.ativo,
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
    if (form.tipo === "locado" && !form.fornecedor_id) err.fornecedor_id = "Fornecedor obrigatório para equipamento locado";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const payload =
        form.tipo === "proprio"
          ? {
              tipo: "proprio" as const,
              nome: form.nome.trim(),
              identificacao: form.identificacao?.trim() || null,
              fabricante: form.fabricante?.trim() || null,
              modelo: form.modelo?.trim() || null,
              obra_alocacao_id: form.obra_alocacao_id || null,
              fornecedor_id: null,
              contrato_numero: null,
              locacao_inicio: null,
              locacao_fim: null,
              valor_locacao: null,
              observacoes: form.observacoes?.trim() || null,
              ativo: form.ativo,
            }
          : {
              tipo: "locado" as const,
              nome: form.nome.trim(),
              identificacao: form.identificacao?.trim() || null,
              fabricante: form.fabricante?.trim() || null,
              modelo: form.modelo?.trim() || null,
              obra_alocacao_id: form.obra_alocacao_id || null,
              fornecedor_id: form.fornecedor_id || null,
              contrato_numero: form.contrato_numero?.trim() || null,
              locacao_inicio: form.locacao_inicio || null,
              locacao_fim: form.locacao_fim || null,
              valor_locacao: form.valor_locacao || null,
              observacoes: form.observacoes?.trim() || null,
              ativo: form.ativo,
            };
      if (editingId) {
        const { error } = await supabase
          .from("dim_equipamentos")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dim_equipamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-equipamentos"] });
      handleCloseModal();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  const obraMap = Object.fromEntries(obras.map((o) => [o.id, o.nome]));
  const fornMap = Object.fromEntries(fornecedores.map((f) => [f.id, f.razao_social]));

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar equipamentos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenNew}>
          Novo equipamento
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Nome / Patrimônio</th>
                <th className="text-left">Tipo</th>
                <th className="text-left">Obra / Fornecedor</th>
                <th className="text-left">Período locação</th>
                <th className="text-left">Ativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Carregando...</td>
                </tr>
              ) : equipamentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Nenhum equipamento encontrado.</td>
                </tr>
              ) : (
                equipamentos.map((eq) => (
                  <tr key={eq.id}>
                    <td>
                      <span className="font-medium text-[var(--text-primary)]">{eq.nome}</span>
                      {eq.identificacao && (
                        <span className="text-[var(--text-tertiary)] ml-1">({eq.identificacao})</span>
                      )}
                    </td>
                    <td>
                      <Badge variant={eq.tipo === "proprio" ? "blue" : "teal"}>
                        {eq.tipo === "proprio" ? "Próprio" : "Locado"}
                      </Badge>
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {eq.tipo === "proprio"
                        ? (eq.obra_alocacao_id ? obraMap[eq.obra_alocacao_id] : null) || "—"
                        : (eq.fornecedor_id ? fornMap[eq.fornecedor_id] : null) || "—"}
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {eq.tipo === "locado" && eq.locacao_inicio && eq.locacao_fim
                        ? `${format(new Date(eq.locacao_inicio), "dd/MM/yy", { locale: ptBR })} — ${format(new Date(eq.locacao_fim), "dd/MM/yy", { locale: ptBR })}`
                        : "—"}
                    </td>
                    <td>
                      {eq.ativo ? <Badge variant="green">Sim</Badge> : <Badge variant="gray">Não</Badge>}
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => handleOpenEdit(eq)}>
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
                {editingId ? "Editar equipamento" : "Novo equipamento"}
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
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tipo: e.target.value as "proprio" | "locado",
                      fornecedor_id: e.target.value === "proprio" ? null : f.fornecedor_id,
                      contrato_numero: e.target.value === "proprio" ? "" : f.contrato_numero,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  <option value="proprio">Próprio</option>
                  <option value="locado">Locado</option>
                </select>
              </div>
              <Input
                label="Nome *"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                error={formErrors.nome}
                placeholder="Nome do equipamento"
                required
              />
              <Input
                label="Identificação / Patrimônio"
                value={form.identificacao}
                onChange={(e) => setForm((f) => ({ ...f, identificacao: e.target.value }))}
                placeholder="Código patrimonial"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Fabricante"
                  value={form.fabricante}
                  onChange={(e) => setForm((f) => ({ ...f, fabricante: e.target.value }))}
                  placeholder="Fabricante"
                />
                <Input
                  label="Modelo"
                  value={form.modelo}
                  onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                  placeholder="Modelo"
                />
              </div>
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Obra de alocação
                </label>
                <select
                  value={form.obra_alocacao_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, obra_alocacao_id: e.target.value || null }))
                  }
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  <option value="">— Selecione —</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>
              {form.tipo === "locado" && (
                <>
                  <div>
                    <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                      Fornecedor *
                    </label>
                    <select
                      value={form.fornecedor_id ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fornecedor_id: e.target.value || null }))
                      }
                      className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                    >
                      <option value="">— Selecione —</option>
                      {fornecedores.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.razao_social}
                        </option>
                      ))}
                    </select>
                    {formErrors.fornecedor_id && (
                      <span className="text-[var(--font-size-mini)] text-[var(--color-error)]">
                        {formErrors.fornecedor_id}
                      </span>
                    )}
                  </div>
                  <Input
                    label="Nº contrato / OS"
                    value={form.contrato_numero}
                    onChange={(e) => setForm((f) => ({ ...f, contrato_numero: e.target.value }))}
                    placeholder="Número do contrato"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                        Início locação
                      </label>
                      <input
                        type="date"
                        value={form.locacao_inicio ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, locacao_inicio: e.target.value || null }))
                        }
                        className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                        Fim locação
                      </label>
                      <input
                        type="date"
                        value={form.locacao_fim ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, locacao_fim: e.target.value || null }))
                        }
                        className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                      />
                    </div>
                  </div>
                  <Input
                    label="Valor locação (R$)"
                    type="number"
                    step="0.01"
                    value={form.valor_locacao ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        valor_locacao: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    placeholder="0,00"
                  />
                </>
              )}
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
