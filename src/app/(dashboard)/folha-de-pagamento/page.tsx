"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissoes } from "@/hooks/usePermissoes";
import { useObra } from "@/contexts/ObraContext";
import { Card, Badge, Button } from "@/components/ui";
import { Receipt, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

type Obra = { id: string; nome: string };

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const TIPOS = [
  { value: "tarefado", label: "Tarefado" },
  { value: "nao_tarefado", label: "Não Tarefado" },
];

function gerarAnos(): string[] {
  const anoAtual = new Date().getFullYear();
  const anos: string[] = [];
  for (let a = anoAtual + 1; a >= anoAtual - 3; a--) {
    anos.push(String(a));
  }
  return anos;
}

async function fetchObras(): Promise<Obra[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("dim_obras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}

async function fetchFolhaStatus(
  obraId: string,
  competencia: string,
  tipo: string
): Promise<{ id: string; status: string } | null> {
  const res = await fetch(
    `/api/folha?obraId=${obraId}&competencia=${competencia}&tipo=${tipo}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] ?? null;
}

export default function FolhaDePagamentoPage() {
  const router = useRouter();
  const { profile, status: authStatus } = useAuth();
  const { temPermissao, isLoading: loadingPerms } = usePermissoes();
  const { obraId: obraIdGlobal, setObraId: setObraIdGlobal } = useObra();

  const perfil = profile?.perfil ?? "leitura";
  const podeLancar = temPermissao("lancar_folha");

  const obraId = obraIdGlobal ?? "";
  const setObraId = (id: string) => setObraIdGlobal(id || null);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, "0");
  });
  const [ano, setAno] = useState(() => String(new Date().getFullYear()));
  const [tipo, setTipo] = useState("tarefado");

  const competencia = `${ano}-${mes}-01`;
  const seletorCompleto = obraId && mes && ano && tipo;

  const { data: obras = [] } = useQuery({
    queryKey: ["obras"],
    queryFn: fetchObras,
    enabled: authStatus === "authenticated",
    staleTime: 30_000,
  });

  const { data: folhaExistente, isLoading: loadingFolha } = useQuery({
    queryKey: ["folha-status", obraId, competencia, tipo],
    queryFn: () => fetchFolhaStatus(obraId, competencia, tipo),
    enabled: !!seletorCompleto,
  });

  useEffect(() => {
    if (!loadingPerms && authStatus === "authenticated" && !temPermissao("rota_folha")) {
      router.replace("/dashboard");
    }
  }, [loadingPerms, authStatus, temPermissao, router]);

  if (loadingPerms || authStatus === "loading") return null;

  const handleAbrirFolha = () => {
    if (!seletorCompleto) return;
    router.push(`/folha-de-pagamento/${obraId}/${ano}-${mes}-01/${tipo}`);
  };

  const statusBadge = folhaExistente?.status === "fechada"
    ? { label: "FECHADA", variant: "gray" as const }
    : { label: "ABERTA", variant: "green" as const };

  return (
    <div className="flex flex-col gap-8 min-h-full">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Receipt className="w-7 h-7 text-[var(--color-primary)]" strokeWidth={1.5} />
          <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)]">
            Folha de Pagamento
          </h1>
        </div>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
          Selecione a obra, competência e tipo para abrir ou criar uma folha de pagamento.
        </p>
      </div>

      <Card>
        <h2 className="font-semibold text-[var(--text-primary)] mb-5">
          Seletor de contexto
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--font-size-mini)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Obra
            </label>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            >
              <option value="">— Selecione a obra —</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[var(--font-size-mini)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Mês
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[var(--font-size-mini)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Ano
              </label>
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="h-10 px-3 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] text-[var(--font-size-small)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              >
                {gerarAnos().map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--font-size-mini)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Tipo
            </label>
            <div className="flex gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={clsx(
                    "flex-1 h-10 rounded-[var(--radius-lg)] font-medium text-[var(--font-size-small)] border transition-colors",
                    tipo === t.value
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-medium)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {seletorCompleto && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)]">
              <div className="flex items-center gap-2">
                <span className="text-[var(--font-size-small)] text-[var(--text-secondary)]">
                  Status:
                </span>
                {loadingFolha ? (
                  <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
                    Verificando...
                  </span>
                ) : folhaExistente ? (
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                ) : (
                  <span className="text-[var(--font-size-mini)] text-[var(--text-tertiary)]">
                    Nova folha será criada
                  </span>
                )}
              </div>

              {podeLancar ? (
                <Button onClick={handleAbrirFolha} disabled={loadingFolha}>
                  Abrir folha
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleAbrirFolha}
                  disabled={!folhaExistente || loadingFolha}
                >
                  Visualizar folha
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Informação sobre perfil */}
      {!podeLancar && perfil !== "leitura" && (
        <p className="text-[var(--font-size-mini)] text-[var(--text-tertiary)] max-w-2xl">
          Seu perfil ({perfil}) permite visualizar folhas existentes. Para criar ou editar, entre em contato com um usuário com permissão de lançamento.
        </p>
      )}
    </div>
  );
}
