"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, X, ChevronDown, Trash2, AlertTriangle } from "lucide-react";
import { Button, InputField, Badge, Card } from "@/components/ui";

type Categoria = {
  id: string;
  nome: string;
  ativo: boolean;
};

type TipoOcorrencia = {
  id: string;
  categoria_id: string;
  categoria_nome?: string;
  nome: string;
  ativo: boolean;
};

const initialCatForm = { nome: "", ativo: true };
const initialTipoForm = { categoria_id: "", nome: "", ativo: true };

async function fetchCategorias() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_categorias_ocorrencias")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Categoria[];
}

async function fetchTipos() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_tipos_ocorrencias")
    .select("id, categoria_id, nome, ativo, dim_categorias_ocorrencias(nome)")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((d: Record<string, unknown>) => ({
    id: d.id,
    categoria_id: d.categoria_id,
    nome: d.nome,
    ativo: d.ativo,
    categoria_nome: (d.dim_categorias_ocorrencias as { nome: string } | null)?.nome ?? "",
  })) as TipoOcorrencia[];
}

export default function OcorrenciasConfigPage() {
  const queryClient = useQueryClient();

  // Categorias
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState(initialCatForm);
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(false);

  // Tipos
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [tipoForm, setTipoForm] = useState(initialTipoForm);
  const [tipoErrors, setTipoErrors] = useState<Record<string, string>>({});
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [confirmDeleteTipo, setConfirmDeleteTipo] = useState(false);

  const { data: categorias = [], isLoading: loadingCat } = useQuery({
    queryKey: ["cadastros-categorias-ocorrencias"],
    queryFn: fetchCategorias,
  });

  const { data: tipos = [], isLoading: loadingTipos } = useQuery({
    queryKey: ["cadastros-tipos-ocorrencias"],
    queryFn: fetchTipos,
  });

  // ── Categorias ──────────────────────────────────────────

  const handleCloseCatModal = () => {
    setCatModalOpen(false);
    setEditingCatId(null);
    setCatForm(initialCatForm);
    setConfirmDeleteCat(false);
  };

  const handleOpenNewCat = () => {
    setEditingCatId(null);
    setCatForm(initialCatForm);
    setCatErrors({});
    setCatModalOpen(true);
  };

  const handleOpenEditCat = (c: Categoria) => {
    setEditingCatId(c.id);
    setCatForm({ nome: c.nome, ativo: c.ativo });
    setCatErrors({});
    setCatModalOpen(true);
  };

  const mutationCat = useMutation({
    mutationFn: async () => {
      if (!catForm.nome.trim()) {
        setCatErrors({ nome: "Nome é obrigatório" });
        throw new Error("validation");
      }
      const supabase = createClient();
      const payload = { nome: catForm.nome.trim(), ativo: catForm.ativo };
      if (editingCatId) {
        const { error } = await supabase.from("dim_categorias_ocorrencias").update(payload).eq("id", editingCatId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dim_categorias_ocorrencias").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-categorias-ocorrencias"] });
      queryClient.invalidateQueries({ queryKey: ["cadastros-tipos-ocorrencias"] });
      setCatModalOpen(false);
    },
  });

  const mutationDeleteCat = useMutation({
    mutationFn: async () => {
      if (!editingCatId) return;
      const supabase = createClient();
      const { error } = await supabase.from("dim_categorias_ocorrencias").delete().eq("id", editingCatId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-categorias-ocorrencias"] });
      queryClient.invalidateQueries({ queryKey: ["cadastros-tipos-ocorrencias"] });
      handleCloseCatModal();
    },
  });

  // ── Tipos ────────────────────────────────────────────────

  const handleCloseTipoModal = () => {
    setTipoModalOpen(false);
    setEditingTipoId(null);
    setTipoForm(initialTipoForm);
    setConfirmDeleteTipo(false);
  };

  const handleOpenNewTipo = (categoriaIdPre?: string) => {
    setEditingTipoId(null);
    setTipoForm({ ...initialTipoForm, categoria_id: categoriaIdPre ?? "" });
    setTipoErrors({});
    setTipoModalOpen(true);
  };

  const handleOpenEditTipo = (t: TipoOcorrencia) => {
    setEditingTipoId(t.id);
    setTipoForm({ categoria_id: t.categoria_id, nome: t.nome, ativo: t.ativo });
    setTipoErrors({});
    setTipoModalOpen(true);
  };

  const mutationTipo = useMutation({
    mutationFn: async () => {
      const errs: Record<string, string> = {};
      if (!tipoForm.categoria_id) errs.categoria_id = "Categoria é obrigatória";
      if (!tipoForm.nome.trim()) errs.nome = "Nome é obrigatório";
      if (Object.keys(errs).length > 0) {
        setTipoErrors(errs);
        throw new Error("validation");
      }
      const supabase = createClient();
      const payload = { categoria_id: tipoForm.categoria_id, nome: tipoForm.nome.trim(), ativo: tipoForm.ativo };
      if (editingTipoId) {
        const { error } = await supabase.from("dim_tipos_ocorrencias").update(payload).eq("id", editingTipoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dim_tipos_ocorrencias").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-tipos-ocorrencias"] });
      setTipoModalOpen(false);
    },
  });

  const mutationDeleteTipo = useMutation({
    mutationFn: async () => {
      if (!editingTipoId) return;
      const supabase = createClient();
      const { error } = await supabase.from("dim_tipos_ocorrencias").delete().eq("id", editingTipoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-tipos-ocorrencias"] });
      handleCloseTipoModal();
    },
  });

  const tiposFiltrados = filtroCategoria
    ? tipos.filter((t) => t.categoria_id === filtroCategoria)
    : tipos;

  return (
    <div className="flex flex-col gap-8">

      {/* ── CATEGORIAS ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">Categorias</h2>
            <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-0.5">
              Grupos principais de ocorrências (ex: Segurança do Trabalho, Qualidade)
            </p>
          </div>
          <Button onClick={handleOpenNewCat} size="sm">
            <Plus className="size-4" />
            Nova categoria
          </Button>
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Nome</th>
                  <th className="text-left">Tipos cadastrados</th>
                  <th className="text-left">Ativo</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingCat ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Carregando...</td></tr>
                ) : categorias.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Nenhuma categoria cadastrada.</td></tr>
                ) : (
                  categorias.map((c) => {
                    const qtdTipos = tipos.filter((t) => t.categoria_id === c.id).length;
                    return (
                      <tr key={c.id}>
                        <td className="font-medium text-[var(--text-primary)]">{c.nome}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setFiltroCategoria(filtroCategoria === c.id ? "" : c.id)}
                            className="inline-flex items-center gap-1 text-[var(--font-size-small)] text-[var(--color-primary)] hover:underline"
                          >
                            {qtdTipos} tipo{qtdTipos !== 1 ? "s" : ""}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </td>
                        <td>
                          {c.ativo ? <Badge variant="green">Sim</Badge> : <Badge variant="gray">Não</Badge>}
                        </td>
                        <td className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditCat(c)}>
                            <Pencil className="size-4" />
                            Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* ── TIPOS DE OCORRÊNCIA ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">Tipos de Ocorrência</h2>
            <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-0.5">
              Subcategorias vinculadas às categorias acima
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filtroCategoria && (
              <button
                type="button"
                onClick={() => setFiltroCategoria("")}
                className="text-[var(--font-size-small)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Limpar filtro
              </button>
            )}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="h-9 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <Button onClick={() => handleOpenNewTipo(filtroCategoria || undefined)} size="sm">
              <Plus className="size-4" />
              Novo tipo
            </Button>
          </div>
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Tipo / Ocorrência</th>
                  <th className="text-left">Categoria</th>
                  <th className="text-left">Ativo</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingTipos ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Carregando...</td></tr>
                ) : tiposFiltrados.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Nenhum tipo encontrado.</td></tr>
                ) : (
                  tiposFiltrados.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium text-[var(--text-primary)]">{t.nome}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                          {t.categoria_nome}
                        </span>
                      </td>
                      <td>
                        {t.ativo ? <Badge variant="green">Sim</Badge> : <Badge variant="gray">Não</Badge>}
                      </td>
                      <td className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditTipo(t)}>
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
      </section>

      {/* ── MODAL CATEGORIA ── */}
      {catModalOpen && (
        <div
          className="modal-overlay fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && handleCloseCatModal()}
        >
          <Card className="modal-content w-full max-w-sm" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                {editingCatId ? "Editar categoria" : "Nova categoria"}
              </h2>
              <button type="button" onClick={handleCloseCatModal} className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)]">
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); mutationCat.mutate(); }} className="flex flex-col gap-4">
              <InputField
                label="Nome *"
                value={catForm.nome}
                onChange={(e) => setCatForm((f) => ({ ...f, nome: e.target.value }))}
                error={catErrors.nome}
                placeholder="Ex: Segurança do Trabalho"
                required
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={catForm.ativo} onChange={(e) => setCatForm((f) => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 rounded border-[var(--border-medium)]" />
                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">Ativo</span>
              </label>
              {confirmDeleteCat ? (
                <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[var(--font-size-small)] font-medium">
                      Tem certeza? Isso removerá todos os tipos vinculados a esta categoria. Esta ação não pode ser desfeita.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={mutationDeleteCat.isPending}
                      onClick={() => mutationDeleteCat.mutate()}
                    >
                      <Trash2 className="size-4" />
                      {mutationDeleteCat.isPending ? "Excluindo..." : "Confirmar exclusão"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirmDeleteCat(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="modal-footer flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <Button type="submit" disabled={mutationCat.isPending}>
                      {mutationCat.isPending ? "Salvando..." : editingCatId ? "Salvar" : "Criar"}
                    </Button>
                    <Button variant="secondary" type="button" onClick={handleCloseCatModal}>Cancelar</Button>
                  </div>
                  {editingCatId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteCat(true)}
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

      {/* ── MODAL TIPO ── */}
      {tipoModalOpen && (
        <div
          className="modal-overlay fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && handleCloseTipoModal()}
        >
          <Card className="modal-content w-full max-w-sm" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                {editingTipoId ? "Editar tipo" : "Novo tipo de ocorrência"}
              </h2>
              <button type="button" onClick={handleCloseTipoModal} className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)]">
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); mutationTipo.mutate(); }} className="flex flex-col gap-4">
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Categoria *
                </label>
                <select
                  value={tipoForm.categoria_id}
                  onChange={(e) => setTipoForm((f) => ({ ...f, categoria_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  <option value="">— Selecione —</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                {tipoErrors.categoria_id && (
                  <p className="text-red-500 text-[var(--font-size-mini)] mt-1">{tipoErrors.categoria_id}</p>
                )}
              </div>
              <InputField
                label="Nome do tipo *"
                value={tipoForm.nome}
                onChange={(e) => setTipoForm((f) => ({ ...f, nome: e.target.value }))}
                error={tipoErrors.nome}
                placeholder="Ex: Acidente de Trabalho"
                required
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={tipoForm.ativo} onChange={(e) => setTipoForm((f) => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 rounded border-[var(--border-medium)]" />
                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">Ativo</span>
              </label>
              {confirmDeleteTipo ? (
                <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[var(--font-size-small)] font-medium">
                      Tem certeza que deseja excluir este tipo de ocorrência? Esta ação não pode ser desfeita.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={mutationDeleteTipo.isPending}
                      onClick={() => mutationDeleteTipo.mutate()}
                    >
                      <Trash2 className="size-4" />
                      {mutationDeleteTipo.isPending ? "Excluindo..." : "Confirmar exclusão"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirmDeleteTipo(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="modal-footer flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <Button type="submit" disabled={mutationTipo.isPending}>
                      {mutationTipo.isPending ? "Salvando..." : editingTipoId ? "Salvar" : "Criar"}
                    </Button>
                    <Button variant="secondary" type="button" onClick={handleCloseTipoModal}>Cancelar</Button>
                  </div>
                  {editingTipoId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteTipo(true)}
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
    </div>
  );
}
