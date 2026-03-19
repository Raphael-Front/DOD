import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Parametros = Record<string, number>;

function calcularINSS(salario: number, params: Parametros): number {
  const faixas = [
    { ate: params.inss_faixa1_ate ?? 1412.0,  aliq: (params.inss_faixa1_aliq ?? 7.5) / 100 },
    { ate: params.inss_faixa2_ate ?? 2666.68, aliq: (params.inss_faixa2_aliq ?? 9.0) / 100 },
    { ate: params.inss_faixa3_ate ?? 4000.03, aliq: (params.inss_faixa3_aliq ?? 12.0) / 100 },
    { ate: params.inss_faixa4_ate ?? 7786.02, aliq: (params.inss_faixa4_aliq ?? 14.0) / 100 },
  ];

  let inss = 0;
  let anterior = 0;

  for (const faixa of faixas) {
    if (salario <= anterior) break;
    const base = Math.min(salario, faixa.ate) - anterior;
    inss += base * faixa.aliq;
    anterior = faixa.ate;
    if (salario <= faixa.ate) break;
  }

  return Math.round(inss * 100) / 100;
}

function calcularIRRF(
  totalProventos: number,
  inss: number,
  numDependentes: number,
  params: Parametros
): number {
  const deducaoDependente = params.irrf_deducao_dependente ?? 189.59;
  const baseCalculo = totalProventos - inss - numDependentes * deducaoDependente;

  if (baseCalculo <= (params.irrf_isento_ate ?? 2259.2)) return 0;

  const faixas = [
    { ate: params.irrf_faixa1_ate ?? 2826.65, aliq: (params.irrf_faixa1_aliq ?? 7.5) / 100,  deducao: params.irrf_faixa1_deducao ?? 169.44 },
    { ate: params.irrf_faixa2_ate ?? 3751.05, aliq: (params.irrf_faixa2_aliq ?? 15.0) / 100, deducao: params.irrf_faixa2_deducao ?? 381.44 },
    { ate: params.irrf_faixa3_ate ?? 4664.68, aliq: (params.irrf_faixa3_aliq ?? 22.5) / 100, deducao: params.irrf_faixa3_deducao ?? 662.77 },
    { ate: Infinity,                           aliq: (params.irrf_faixa4_aliq ?? 27.5) / 100, deducao: params.irrf_faixa4_deducao ?? 896.00 },
  ];

  for (const faixa of faixas) {
    if (baseCalculo <= faixa.ate) {
      const irrf = baseCalculo * faixa.aliq - faixa.deducao;
      return Math.max(0, Math.round(irrf * 100) / 100);
    }
  }

  return 0;
}

// POST /api/folha/:id/calcular
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json();
  const {
    lancamento_id,
    colaborador_id,
    servico_etapa,
    hora_tarefa = 0,
    tarefa_mensal = 0,
    he_50 = 0,
    he_100 = 0,
    faltas = 0,
    gratificacao = 0,
    adicional,
  } = body;

  // Verificar folha aberta
  const { data: folha } = await supabase
    .from("f_folhas")
    .select("status")
    .eq("id", id)
    .single();

  if (!folha || folha.status !== "aberta") {
    return NextResponse.json({ error: "Folha não está aberta" }, { status: 400 });
  }

  // Buscar parâmetros de cálculo
  const { data: configRows } = await supabase
    .from("d_configuracoes_folha")
    .select("campo, parametro");

  const cfgParams: Parametros = {};
  for (const row of configRows ?? []) {
    cfgParams[row.campo] = Number(row.parametro);
  }

  // Buscar dados do colaborador
  const { data: colaborador } = await supabase
    .from("d_colaboradores")
    .select("num_dependentes, adicional_insalubridade")
    .eq("id", colaborador_id)
    .single();

  const numDependentes = Number(colaborador?.num_dependentes ?? 0);
  const adicionalColab = Number(colaborador?.adicional_insalubridade ?? 0);

  const horaTarefaVal = Number(hora_tarefa);
  const tarefaMensalVal = Number(tarefa_mensal);
  const he50Horas = Number(he_50);
  const he100Horas = Number(he_100);
  const faltasDias = Number(faltas);
  const gratificacaoVal = Number(gratificacao);
  const adicionalVal = adicional !== undefined ? Number(adicional) : adicionalColab;

  // Calcular horas extras em valor
  const he50Valor = horaTarefaVal * 1.5 * he50Horas;
  const he100Valor = horaTarefaVal * 2.0 * he100Horas;

  // Desconto de faltas proporcionais
  const descontoFalta = tarefaMensalVal > 0 ? (tarefaMensalVal / 30) * faltasDias : 0;
  const tarefaLiquida = Math.max(0, tarefaMensalVal - descontoFalta);

  // Total proventos
  const totalProventos = tarefaLiquida + he50Valor + he100Valor + gratificacaoVal + adicionalVal;

  // Cálculos fiscais — server-side
  const inss = calcularINSS(totalProventos, cfgParams);
  const irrf = calcularIRRF(totalProventos, inss, numDependentes, cfgParams);

  const vtTeto = cfgParams.vt_teto ?? 350;
  const refeicaoValor = cfgParams.refeicao_valor ?? 150;
  const vt = vtTeto;
  const refeicao = refeicaoValor;

  const totalDescontos = inss + irrf + vt + refeicao;
  const liquido = Math.max(0, totalProventos - totalDescontos);

  const payload = {
    hora_tarefa: Math.round(horaTarefaVal * 100) / 100,
    tarefa_mensal: Math.round(tarefaLiquida * 100) / 100,
    he_50: Math.round(he50Valor * 100) / 100,
    he_100: Math.round(he100Valor * 100) / 100,
    faltas: faltasDias,
    gratificacao: Math.round(gratificacaoVal * 100) / 100,
    adicional: Math.round(adicionalVal * 100) / 100,
    inss: Math.round(inss * 100) / 100,
    irrf: Math.round(irrf * 100) / 100,
    vt: Math.round(vt * 100) / 100,
    refeicao: Math.round(refeicao * 100) / 100,
    total_proventos: Math.round(totalProventos * 100) / 100,
    total_descontos: Math.round(totalDescontos * 100) / 100,
    liquido: Math.round(liquido * 100) / 100,
  };

  // Persistir lançamento
  if (lancamento_id) {
    const updatePayload = servico_etapa !== undefined
      ? { ...payload, servico_etapa }
      : payload;
    const { error } = await supabase
      .from("f_folha_lancamentos")
      .update(updatePayload)
      .eq("id", lancamento_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("f_folha_lancamentos")
      .upsert(
        { folha_id: id, colaborador_id, servico_etapa: servico_etapa ?? null, ...payload },
        { onConflict: "folha_id,colaborador_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(payload);
}
