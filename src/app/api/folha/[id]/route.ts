import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/folha/:id — retorna folha com lançamentos e colaboradores
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { data: folha, error: errFolha } = await supabase
      .from("f_folhas")
      .select("id, obra_id, competencia, tipo, status, debitada, created_at, dim_obras(nome)")
      .eq("id", id)
      .single();

    if (errFolha || !folha) {
      return NextResponse.json({ error: "Folha não encontrada" }, { status: 404 });
    }

    // Carregar lançamentos com colaborador
    // Nota: d_colaboradores usa obra/funcao (TEXT) desde migração 20260319, não mais obra_id/funcao_id
    const { data: lancamentosRaw, error: errLanc } = await supabase
      .from("f_folha_lancamentos")
      .select(`
        id, folha_id, colaborador_id, servico_etapa,
        hora_tarefa, tarefa_mensal, he_50, he_100, faltas,
        gratificacao, adicional, inss, irrf, vt, refeicao,
        total_proventos, total_descontos, liquido,
        d_colaboradores(nome, matricula, status, data_admissao, num_dependentes, adicional_insalubridade, funcao)
      `)
      .eq("folha_id", id);

    if (errLanc) {
      console.error("[api/folha/[id]] errLanc:", errLanc);
      return NextResponse.json(
        { error: "Erro ao carregar lançamentos", detail: errLanc.message },
        { status: 500 }
      );
    }

  // Ordenar por nome do colaborador (Supabase não suporta order por coluna de FK)
  const lancamentos = (lancamentosRaw ?? []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const dA = a.d_colaboradores as { nome?: string } | null;
    const dB = b.d_colaboradores as { nome?: string } | null;
    const nomeA = dA?.nome ?? "";
    const nomeB = dB?.nome ?? "";
    return nomeA.localeCompare(nomeB);
  });

  // Carregar produção por lançamento
  const lancIds = (lancamentos ?? []).map((l: Record<string, unknown>) => l.id as string);
  let producao: Record<string, unknown>[] = [];
  if (lancIds.length > 0) {
    const { data: prod } = await supabase
      .from("f_producao_lancamentos")
      .select("id, lancamento_id, servico_id, classificacao_apoio, quantidade, percentual_participacao, d_servicos(nome, unidade, categoria)")
      .in("lancamento_id", lancIds);
    producao = prod ?? [];
  }

  // Totais da folha
  const totais = (lancamentos ?? []).reduce(
    (acc: { proventos: number; descontos: number; liquido: number }, l: Record<string, unknown>) => {
      acc.proventos += Number(l.total_proventos) || 0;
      acc.descontos += Number(l.total_descontos) || 0;
      acc.liquido += Number(l.liquido) || 0;
      return acc;
    },
    { proventos: 0, descontos: 0, liquido: 0 }
  );

    return NextResponse.json({ folha, lancamentos, producao, totais });
  } catch (err) {
    console.error("[api/folha/[id]] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Erro interno", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
