import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/folha/:id — retorna folha com lançamentos e colaboradores
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { data: lancamentos, error: errLanc } = await supabase
    .from("f_folha_lancamentos")
    .select(`
      id, folha_id, colaborador_id, servico_etapa,
      hora_tarefa, tarefa_mensal, he_50, he_100, faltas,
      gratificacao, adicional, inss, irrf, vt, refeicao,
      total_proventos, total_descontos, liquido,
      d_colaboradores(nome, matricula, status, data_admissao, num_dependentes, adicional_insalubridade, funcao_id, dim_funcoes(nome))
    `)
    .eq("folha_id", id)
    .order("d_colaboradores(nome)", { ascending: true });

  if (errLanc) return NextResponse.json({ error: errLanc.message }, { status: 500 });

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

  return NextResponse.json({ folha, lancamentos: lancamentos ?? [], producao, totais });
}
