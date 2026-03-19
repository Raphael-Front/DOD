import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type LinhaRelatorio = {
  servico: string;
  unidade: string;
  qtd_produzida: number;
  valor_pago: number;
  custo_unitario_real: number;
  valor_orcado: number;
  diferenca_valor: number;
  diferenca_pct: number;
};

// GET /api/relatorios/folha_gerencial?folhaId=&formato=pdf|excel
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("dim_perfis")
    .select("perfil")
    .eq("id", user.id)
    .single();

  const perfisPermitidos = ["admin", "coordenador", "leitura"];
  if (!perfil || !perfisPermitidos.includes(perfil.perfil)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const folhaId = searchParams.get("folhaId");
  const formato = searchParams.get("formato") ?? "pdf";

  if (!folhaId) {
    return NextResponse.json({ error: "folhaId é obrigatório" }, { status: 400 });
  }

  // Verificar folha fechada
  const { data: folha } = await supabase
    .from("f_folhas")
    .select("id, status, competencia, tipo, dim_obras(nome)")
    .eq("id", folhaId)
    .single();

  if (!folha) return NextResponse.json({ error: "Folha não encontrada" }, { status: 404 });
  if (folha.status !== "fechada") {
    return NextResponse.json(
      { error: "Relatório gerencial disponível apenas para folhas fechadas" },
      { status: 400 }
    );
  }

  // Buscar lançamentos com liquidoz
  const { data: lancamentos } = await supabase
    .from("f_folha_lancamentos")
    .select("id, colaborador_id, liquido")
    .eq("folha_id", folhaId);

  const lancIds = (lancamentos ?? []).map((l: Record<string, unknown>) => l.id as string);
  const liquidoPorLanc: Record<string, number> = {};
  for (const l of lancamentos ?? []) {
    const rec = l as Record<string, unknown>;
    liquidoPorLanc[rec.id as string] = Number(rec.liquido) || 0;
  }

  // Buscar produção
  let producao: Record<string, unknown>[] = [];
  if (lancIds.length > 0) {
    const { data: prod } = await supabase
      .from("f_producao_lancamentos")
      .select("lancamento_id, servico_id, quantidade, percentual_participacao, d_servicos(nome, unidade, valor_referencia, categoria)")
      .in("lancamento_id", lancIds);
    producao = prod ?? [];
  }

  // Agrupar por serviço
  const servicoMap: Record<
    string,
    {
      nome: string;
      unidade: string;
      valor_referencia: number;
      qtd_total: number;
      liquido_total: number;
    }
  > = {};

  for (const p of producao) {
    const servico = (p.d_servicos as { nome: string; unidade: string; valor_referencia: number; categoria: string } | null);
    if (!servico) continue;

    const key = p.servico_id as string;
    if (!servicoMap[key]) {
      servicoMap[key] = {
        nome: servico.nome,
        unidade: servico.unidade,
        valor_referencia: Number(servico.valor_referencia),
        qtd_total: 0,
        liquido_total: 0,
      };
    }

    servicoMap[key].qtd_total += Number(p.quantidade) || 0;

    // Rateio do líquido
    const lancId = p.lancamento_id as string;
    const liquidoLanc = liquidoPorLanc[lancId] ?? 0;
    const pct = Number(p.percentual_participacao);
    const fatorRateio = pct > 0 ? pct / 100 : 1;
    servicoMap[key].liquido_total += liquidoLanc * fatorRateio;
  }

  // Montar linhas do relatório
  const linhas: LinhaRelatorio[] = Object.values(servicoMap).map((s) => {
    const custoReal = s.qtd_total > 0 ? s.liquido_total / s.qtd_total : 0;
    const diferenca = custoReal - s.valor_referencia;
    const diferencaPct =
      s.valor_referencia > 0 ? ((custoReal / s.valor_referencia) - 1) * 100 : 0;

    return {
      servico: s.nome,
      unidade: s.unidade,
      qtd_produzida: Math.round(s.qtd_total * 10000) / 10000,
      valor_pago: Math.round(s.liquido_total * 100) / 100,
      custo_unitario_real: Math.round(custoReal * 100) / 100,
      valor_orcado: s.valor_referencia,
      diferenca_valor: Math.round(diferenca * 100) / 100,
      diferenca_pct: Math.round(diferencaPct * 100) / 100,
    };
  });

  const dimObrasRaw = folha.dim_obras as { nome: string } | { nome: string }[] | null;
  const dimObras = Array.isArray(dimObrasRaw) ? dimObrasRaw[0] ?? null : dimObrasRaw;
  const obraNome = dimObras?.nome ?? "—";
  const titulo = `Relatório Gerencial da Folha — ${obraNome} — ${folha.competencia}`;

  if (formato === "excel") {
    const ws = XLSX.utils.json_to_sheet(
      linhas.map((l) => ({
        Serviço: l.servico,
        Unidade: l.unidade,
        "Qtd. Produzida": l.qtd_produzida,
        "Valor Pago (R$)": l.valor_pago,
        "Custo Unit. Real (R$/un)": l.custo_unitario_real,
        "Valor Orçado (R$/un)": l.valor_orcado,
        "Diferença (R$)": l.diferenca_valor,
        "Diferença (%)": l.diferenca_pct,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gerencial");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio_gerencial_folha.xlsx"`,
      },
    });
  }

  // PDF
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(12);
  doc.text(titulo, 14, 14);

  autoTable(doc, {
    startY: 22,
    head: [
      [
        "Serviço",
        "Unidade",
        "Qtd. Prod.",
        "Valor Pago (R$)",
        "C. Unit. Real",
        "Valor Orçado",
        "Diferença (R$)",
        "Diferença (%)",
      ],
    ],
    body: linhas.map((l) => [
      l.servico,
      l.unidade,
      l.qtd_produzida.toLocaleString("pt-BR"),
      l.valor_pago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      l.custo_unitario_real.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      l.valor_orcado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      l.diferenca_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      `${l.diferenca_pct.toFixed(2)}%`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 58, 94] },
    alternateRowStyles: { fillColor: [244, 246, 248] },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio_gerencial_folha.pdf"`,
    },
  });
}
