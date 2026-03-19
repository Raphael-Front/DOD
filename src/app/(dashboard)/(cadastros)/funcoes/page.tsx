"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, X, Tag, Info } from "lucide-react";
import { Button, Card } from "@/components/ui";

type FuncaoItem = {
  nome: string;
  servicos: string[];
};

async function fetchFuncoesDoUAU(busca: string): Promise<FuncaoItem[]> {
  const supabase = createClient();

  const { data: colabs, error: eColabs } = await supabase
    .from("d_colaboradores")
    .select("funcao")
    .not("funcao", "is", null);

  if (eColabs) throw eColabs;

  const nomesUnicos = Array.from(
    new Set((colabs ?? []).map((c) => (c.funcao as string).trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const { data: dimFuncoes, error: eDim } = await supabase
    .from("dim_funcoes")
    .select("nome, servicos");

  if (eDim) throw eDim;

  const servicosPorNome: Record<string, string[]> = {};
  for (const row of dimFuncoes ?? []) {
    servicosPorNome[row.nome] = (row.servicos as string[] | null) ?? [];
  }

  const lista = nomesUnicos.map((nome) => ({
    nome,
    servicos: servicosPorNome[nome] ?? [],
  }));

  if (busca.trim()) {
    const term = busca.trim().toLowerCase();
    return lista.filter((f) => f.nome.toLowerCase().includes(term));
  }

  return lista;
}

async function fetchServicosDisponiveis(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("d_servicos")
    .select("nome")
    .eq("ativo", true)
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((s) => s.nome as string);
}

export default function FuncoesPage() {
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [funcaoSelecionada, setFuncaoSelecionada] = useState<FuncaoItem | null>(null);
  const [servicos, setServicos] = useState<string[]>([]);
  const [servicoInput, setServicoInput] = useState("");
  const [showSugestoes, setShowSugestoes] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: servicosDisponiveis = [] } = useQuery({
    queryKey: ["servicos-disponiveis"],
    queryFn: fetchServicosDisponiveis,
    enabled: modalOpen,
  });

  const sugestoes = servicosDisponiveis.filter(
    (s) =>
      !servicos.includes(s) &&
      s.toLowerCase().includes(servicoInput.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSugestoes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: funcoes = [], isLoading } = useQuery({
    queryKey: ["cadastros-funcoes", busca],
    queryFn: () => fetchFuncoesDoUAU(busca),
  });

  const handleOpenModal = (f: FuncaoItem) => {
    setFuncaoSelecionada(f);
    setServicos(f.servicos ?? []);
    setServicoInput("");
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFuncaoSelecionada(null);
    setServicos([]);
    setServicoInput("");
    setShowSugestoes(false);
  };

  const addServico = (nome?: string) => {
    const s = (nome ?? servicoInput).trim();
    if (!s || servicos.includes(s)) {
      setServicoInput("");
      setShowSugestoes(false);
      return;
    }
    setServicos((prev) => [...prev, s]);
    setServicoInput("");
    setShowSugestoes(false);
  };

  const removeServico = (idx: number) => {
    setServicos((prev) => prev.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!funcaoSelecionada) return;
      const supabase = createClient();
      const { error } = await supabase.from("dim_funcoes").upsert(
        { nome: funcaoSelecionada.nome, servicos },
        { onConflict: "nome" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastros-funcoes"] });
      handleCloseModal();
    },
  });

  return (
    <>
      {/* Banner informativo */}
      <div className="flex items-start gap-3 mb-5 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)]">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-primary)]" strokeWidth={2} />
        <p className="text-[var(--font-size-small)] text-[var(--color-primary)]">
          As funções são importadas automaticamente do UAU e não podem ser criadas, editadas ou excluídas aqui.
          Utilize esta tela apenas para vincular os serviços permitidos a cada função.
        </p>
      </div>

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
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Função</th>
                <th className="text-left">Serviços vinculados</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Carregando...</td>
                </tr>
              ) : funcoes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    {busca ? "Nenhuma função encontrada para a busca." : "Nenhum colaborador cadastrado ainda."}
                  </td>
                </tr>
              ) : (
                funcoes.map((f) => (
                  <tr key={f.nome}>
                    <td className="font-medium text-[var(--text-primary)]">{f.nome}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {f.servicos.length > 0
                          ? f.servicos.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                              >
                                {s}
                              </span>
                            ))
                          : <span className="text-[var(--text-tertiary)] text-[var(--font-size-small)]">Nenhum serviço vinculado</span>
                        }
                      </div>
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(f)}>
                        <Tag className="size-4" />
                        Vincular serviços
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && funcaoSelecionada && (
        <div
          className="modal-overlay fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 overflow-y-auto py-8"
          onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
        >
          <Card className="modal-content w-full max-w-md max-h-[90vh] overflow-y-auto" padding="lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[var(--font-size-title3)] font-semibold text-[var(--text-primary)]">
                Serviços de {funcaoSelecionada.nome}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mb-5">
              Defina quais serviços colaboradores com esta função podem registrar no diário de obra.
            </p>

            <div className="relative mb-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={servicoInput}
                  onChange={(e) => {
                    setServicoInput(e.target.value);
                    setShowSugestoes(true);
                  }}
                  onFocus={() => setShowSugestoes(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addServico();
                    }
                    if (e.key === "Escape") {
                      setShowSugestoes(false);
                    }
                  }}
                  placeholder="Digite e pressione Enter ou clique em +"
                  className="flex-1 h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (servicoInput.trim()) {
                      addServico();
                    } else {
                      setShowSugestoes(true);
                      inputRef.current?.focus();
                    }
                  }}
                  className="h-9 px-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white text-[var(--font-size-small)] font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showSugestoes && sugestoes.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 left-0 right-10 mt-1 max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-medium)] bg-[var(--surface-card)] shadow-lg"
                >
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addServico(s);
                      }}
                      className="w-full text-left px-3 py-2 text-[var(--font-size-small)] text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {servicos.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {servicos.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeServico(i)}
                      className="ml-0.5 text-[var(--color-primary)] hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[var(--font-size-mini)] text-[var(--text-tertiary)] mb-6">
                Nenhum serviço vinculado. Adicione ao menos um para filtrar serviços no diário.
              </p>
            )}

            <div className="flex gap-3">
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="secondary" type="button" onClick={handleCloseModal}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
