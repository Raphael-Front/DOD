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

// Dados mockados — integrar com Supabase quando disponível (fato_mao_obra_propria, fato_mao_obra_terceirizada)
const FUNCIONARIOS_MOCK = { total: 48, maoObraPropria: 32 }; // 32/48 ≈ 67%
// Dados mockados — integrar com Supabase quando disponível (fato_equipamentos + dim_equipamentos.tipo)
const EQUIPAMENTOS_MOCK = { emUso: 12, locados: 5 }; // 5/12 ≈ 42%

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
    // Localização padrão — futuramente virá da obra selecionada (dim_obras.cidade, dim_obras.estado)
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
    ? format(new Date(data.tomorrow.date + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })
    : "";

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden min-h-[110px]"
      style={{ borderTop: "3px solid #22a04b", padding: "20px 22px" }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">Previsão Amanhã</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#e6f7ed]">
          <Cloud className="w-4 h-4 text-[#22a04b]" strokeWidth={2} />
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-gray-400">Carregando...</div>
      ) : error ? (
        <div className="text-sm text-amber-600">Previsão indisponível</div>
      ) : data ? (
        <>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {data.tomorrow.tempMin}° — {data.tomorrow.tempMax}°C
          </div>
          <div className="text-sm text-gray-600 truncate">{data.tomorrow.description}</div>
          <div className="text-xs text-gray-400 mt-1 truncate">
            {amanhaFormatada} · {data.location.city}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const dataAtualFormatada = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const userEmail = user?.email ?? "usuário";

  return (
    <div
      className="flex flex-col gap-7 min-h-full"
      style={{ background: "#f4f6f8", padding: "32px 40px" }}
    >
      {/* SEÇÃO 1 — Header da página */}
      <div className="flex items-start justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Bem-vindo, {userEmail}</p>
        </div>
        <span className="text-sm text-gray-400 capitalize">{dataAtualFormatada}</span>
      </div>

      {/* SEÇÃO 2 — Grid de 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total de Funcionários + % mão de obra própria */}
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden min-h-[110px]"
          style={{ borderTop: "3px solid #1e3a5f", padding: "20px 22px" }}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Total de Funcionários</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#e8eef5]">
              <Users className="w-4 h-4 text-[#1e3a5f]" strokeWidth={2} />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{FUNCIONARIOS_MOCK.total}</div>
          <div className="flex items-center gap-1 text-sm mt-2">
            <span className="text-blue-600 font-medium">
              {Math.round((FUNCIONARIOS_MOCK.maoObraPropria / FUNCIONARIOS_MOCK.total) * 100)}%
            </span>
            <span className="text-gray-400">mão de obra própria</span>
          </div>
        </div>

        {/* Card 2: Diários Registrados */}
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden min-h-[110px]"
          style={{ borderTop: "3px solid #2ea8a8", padding: "20px 22px" }}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Diários Registrados</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#e0f5f5]">
              <CalendarDays className="w-4 h-4 text-[#2ea8a8]" strokeWidth={2} />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">156</div>
          <div className="flex items-center gap-1 text-sm mt-2">
            <span className="text-green-600">↑ 12%</span>
            <span className="text-gray-400">este mês</span>
          </div>
        </div>

        {/* Card 3: Equipamentos em Uso + % equipamentos locados */}
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden min-h-[110px]"
          style={{ borderTop: "3px solid #e8820c", padding: "20px 22px" }}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Equipamentos em Uso</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#fff0e0]">
              <Wrench className="w-4 h-4 text-[#e8820c]" strokeWidth={2} />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{EQUIPAMENTOS_MOCK.emUso}</div>
          <div className="flex items-center gap-1 text-sm mt-2">
            <span className="text-amber-600 font-medium">
              {Math.round((EQUIPAMENTOS_MOCK.locados / EQUIPAMENTOS_MOCK.emUso) * 100)}%
            </span>
            <span className="text-gray-400">equipamentos locados</span>
          </div>
        </div>

        {/* Card 4: Previsão do tempo do dia seguinte */}
        <PrevisaoTempoCard />
      </div>
    </div>
  );
}
