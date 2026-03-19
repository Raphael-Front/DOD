"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Input, Badge, Card } from "@/components/ui";

const PERFIS: Record<string, string> = {
  admin: "Administrador",
  coordenador: "Coordenador",
  operador_obra: "Operador de Obra",
  leitura: "Leitura",
};

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  obra_ids?: string[];
};

const initialForm = {
  nome: "",
  email: "",
  perfil: "operador_obra" as string,
  ativo: true,
  obra_ids: [] as string[],
};

async function fetchUsuarios(busca: string): Promise<Usuario[]> {
  const supabase = createClient();
  const { data: perfis, error: errPerfis } = await supabase
    .from("dim_perfis")
    .select("id, nome, email, perfil, ativo")
    .order("nome", { ascending: true });
  if (errPerfis) throw errPerfis;
  if (!perfis?.length) return [];

  let filtered = perfis;
  if (busca.trim()) {
    const b = busca.toLowerCase();
    filtered = perfis.filter(
      (p) =>
        p.nome?.toLowerCase().includes(b) || p.email?.toLowerCase().includes(b)
    );
  }

  const { data: uo } = await supabase
    .from("dim_usuario_obra")
    .select("usuario_id, obra_id");
  const obraPorUsuario: Record<string, string[]> = {};
  for (const r of uo ?? []) {
    const uid = r.usuario_id as string;
    if (!obraPorUsuario[uid]) obraPorUsuario[uid] = [];
    obraPorUsuario[uid].push(r.obra_id as string);
  }

  return filtered.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    perfil: p.perfil,
    ativo: p.ativo,
    obra_ids: obraPorUsuario[p.id] ?? [],
  })) as Usuario[];
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

export default function UsuariosPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const perfil = profile?.perfil ?? "leitura";

  useEffect(() => {
    if (perfil !== "admin" && perfil !== "coordenador") {
      router.replace("/dashboard");
    }
  }, [perfil, router]);

  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["cadastros-usuarios", busca],
    queryFn: () => fetchUsuarios(busca),
  });

  const { data: obras = [] } = useQuery({
    queryKey: ["obras-list"],
    queryFn: fetchObras,
  });

  const obraMap = Object.fromEntries(obras.map((o) => [o.id, o.nome]));

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (u: Usuario) => {
    setEditingId(u.id);
    setForm({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      ativo: u.ativo,
      obra_ids: u.obra_ids ?? [],
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const toggleObra = (obraId: string) => {
    setForm((f) => ({
      ...f,
      obra_ids: f.obra_ids.includes(obraId)
        ? f.obra_ids.filter((id) => id !== obraId)
        : [...f.obra_ids, obraId],
    }));
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!form.nome?.trim()) err.nome = "Nome é obrigatório";
    if (!form.email?.trim()) err.email = "E-mail é obrigatório";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!editingId) {
        throw new Error(
          "Crie o usuário no Supabase Auth (Authentication > Users) e depois edite aqui para definir perfil e obras."
        );
      }
      const supabase = createClient();
        const { error: errPerfil } = await supabase
          .from("dim_perfis")
          .update({
            nome: form.nome.trim(),
            email: form.email.trim(),
            perfil: form.perfil,
            ativo: form.ativo,
          })
          .eq("id", editingId);
        if (errPerfil) throw errPerfil;

        await supabase
          .from("dim_usuario_obra")
          .delete()
          .eq("usuario_id", editingId);
        if (form.obra_ids.length > 0) {
          const inserts = form.obra_ids.map((obra_id) => ({
            usuario_id: editingId,
            obra_id,
          }));
          const { error: errUo } = await supabase
            .from("dim_usuario_obra")
            .insert(inserts);
          if (errUo) throw errUo;
        }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-usuarios"] });
      handleCloseModal();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  if (perfil !== "admin" && perfil !== "coordenador") {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div>
        <h1 className="page-title">
          Usuários
        </h1>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
          Gestão de usuários e permissões
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]"
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="Buscar usuários..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
          />
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenNew}>
          Novo usuário
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Nome</th>
                <th className="text-left">E-mail</th>
                <th className="text-left">Perfil</th>
                <th className="text-left">Obras</th>
                <th className="text-left">Ativo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    Carregando...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-[var(--text-primary)]">
                      {u.nome}
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {u.email}
                    </td>
                    <td>
                      <Badge
                        variant={
                          u.perfil === "admin"
                            ? "red"
                            : u.perfil === "coordenador"
                              ? "blue"
                              : "gray"
                        }
                      >
                        {PERFIS[u.perfil] ?? u.perfil}
                      </Badge>
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {(u.obra_ids ?? [])
                        .map((id) => obraMap[id])
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td>
                      {u.ativo ? (
                        <Badge variant="green">Sim</Badge>
                      ) : (
                        <Badge variant="gray">Não</Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil className="w-4 h-4" />}
                        onClick={() => handleOpenEdit(u)}
                      >
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
            <div className="modal-header flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[var(--text-primary)]">
                {editingId ? "Editar usuário" : "Novo usuário"}
              </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {!editingId && (
              <div className="mb-4 px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--color-info-bg)] text-[var(--color-info)] text-[var(--font-size-small)]">
                Criação de usuário: use o painel do Supabase (Authentication) para
                convidar ou criar novos usuários. Depois edite aqui para definir
                perfil e obras vinculadas.
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Nome *"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                error={formErrors.nome}
                placeholder="Nome completo"
                required
                disabled={!editingId}
              />
              <Input
                label="E-mail *"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                error={formErrors.email}
                placeholder="email@exemplo.com"
                required
                disabled={!editingId}
              />
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-1">
                  Perfil
                </label>
                <select
                  value={form.perfil}
                  onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                >
                  {Object.entries(PERFIS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-2">
                  Obras vinculadas
                </label>
                <div className="flex flex-wrap gap-2">
                  {obras.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-light)] hover:bg-[var(--surface-card-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={form.obra_ids.includes(o.id)}
                        onChange={() => toggleObra(o.id)}
                        className="w-4 h-4 rounded border-[var(--border-medium)]"
                      />
                      <span className="text-[var(--font-size-small)]">{o.nome}</span>
                    </label>
                  ))}
                  {obras.length === 0 && (
                    <span className="text-[var(--text-tertiary)] text-[var(--font-size-small)]">
                      Nenhuma obra cadastrada.
                    </span>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border-medium)]"
                />
                <span className="text-[var(--font-size-small)] font-medium text-[var(--text-secondary)]">
                  Ativo
                </span>
              </label>

              <div className="modal-footer flex gap-3">
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  disabled={!editingId}
                >
                  {editingId ? "Salvar" : "Criar"}
                </Button>
                <Button variant="secondary" type="button" onClick={handleCloseModal}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
