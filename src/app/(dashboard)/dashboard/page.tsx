"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  CalendarDays,
  Wrench,
  Cloud,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { KpiCard, Skeleton } from "@/components/ui";

const FUNCIONARIOS_MOCK = { total: 48, maoObraPropria: 32 };
const EQUIPAMENTOS_MOCK = { emUso: 12, locados: 5 };

interface PrevisaoTempoData {
  location: { city: string; state?: string };
  tomorrow: {
    date: string;
    tempMax: number;
    tempMin: number;
    description: string;
  };
}

function PrevisaoTempoCard() {
  const [data, setData] = useState<PrevisaoTempoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ city: "São Paulo", state: "SP" });
    fetch(`/api/weather?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar previsão");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const amanhaFormatada = data?.tomorrow?.date
    ? format(new Date(data.tomorrow.date + "T12:00:00"), "EEEE, d 'de' MMMM", {
        locale: ptBR,
      })
    : "";

  return (
    <KpiCard
      variant="green"
      label="Previsão Amanhã"
      value={
        loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <span
            style={{
              fontSize: "var(--font-size-small)",
              color: "var(--color-warning)",
            }}
          >
            Previsão indisponível
          </span>
        ) : data ? (
          <>
            {data.tomorrow.tempMin}° — {data.tomorrow.tempMax}°C
          </>
        ) : null
      }
      sub={
        data
          ? `${amanhaFormatada} · ${data.location.city}`
          : loading
            ? ""
            : ""
      }
      icon={<Cloud className="w-4 h-4" strokeWidth={2} />}
    />
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const dataAtualFormatada = format(
    new Date(),
    "EEEE, d 'de' MMMM 'de' yyyy",
    { locale: ptBR }
  );
  const nomeUsuario = profile?.nome ?? "usuário";

  return (
    <div className="flex flex-col gap-7 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">
            Dashboard
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-1 font-normal">
            Bem-vindo, {nomeUsuario}
          </p>
        </div>
        <span className="text-[var(--font-size-small)] text-[var(--text-tertiary)] capitalize font-[var(--font-sans)]">
          {dataAtualFormatada}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          variant="dark"
          label="Total de Funcionários"
          value={FUNCIONARIOS_MOCK.total}
          sub={`${Math.round((FUNCIONARIOS_MOCK.maoObraPropria / FUNCIONARIOS_MOCK.total) * 100)}% mão de obra própria`}
          icon={<Users className="w-4 h-4" strokeWidth={2} />}
        />

        <KpiCard
          variant="teal"
          label="Diários Registrados"
          value="156"
          sub="↑ 12% este mês"
          icon={<CalendarDays className="w-4 h-4" strokeWidth={2} />}
        />

        <KpiCard
          variant="orange"
          label="Equipamentos em Uso"
          value={EQUIPAMENTOS_MOCK.emUso}
          sub={`${Math.round((EQUIPAMENTOS_MOCK.locados / EQUIPAMENTOS_MOCK.emUso) * 100)}% equipamentos locados`}
          icon={<Wrench className="w-4 h-4" strokeWidth={2} />}
        />

        <PrevisaoTempoCard />
      </div>
    </div>
  );
}
