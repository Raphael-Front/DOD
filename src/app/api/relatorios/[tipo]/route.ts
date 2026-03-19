import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS = [
  "diario_completo",
  "efetivo",
  "ocorrencias",
  "servicos",
  "registro_fotografico",
  "visitas",
] as const;

function addHeader(doc: jsPDF, titulo: string, obraNome?: string) {
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 95);
  doc.text("GPL INCORPORADORA", 20, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Diário de Obra Digital", 20, 27);
  if (obraNome) doc.text(`Obra: ${obraNome}`, 20, 33);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(titulo, 20, 43);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  try {
    const { tipo } = await params;
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get("obraId") ?? "";
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const formato = searchParams.get("formato") ?? "pdf";

    if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
      return NextResponse.json(
        { error: "Tipo de relatório inválido" },
        { status: 400 }
      );
    }

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        { error: "Período (dataInicio e dataFim) obrigatório" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let obraNome = "Todas as obras";
    if (obraId) {
      const { data: obra } = await supabase
        .from("dim_obras")
        .select("nome")
        .eq("id", obraId)
        .single();
      obraNome = obra?.nome ?? obraNome;
    }

    const titulo = getTitulo(tipo);
    const doc = new jsPDF();

    if (formato === "pdf") {
      addHeader(doc, titulo, obraNome);

      let query = supabase
        .from("fato_diarios")
        .select("id, obra_id, data_diario, status, retroativo")
        .gte("data_diario", dataInicio)
        .lte("data_diario", dataFim)
        .order("data_diario", { ascending: false });

      if (obraId) query = query.eq("obra_id", obraId);
      const { data: diarios } = await query;

      const obraIds = [...new Set((diarios ?? []).map((d) => d.obra_id))];
      const { data: obras } = obraIds.length
        ? await supabase.from("dim_obras").select("id, nome").in("id", obraIds)
        : { data: [] };
      const obraMap = Object.fromEntries((obras ?? []).map((o) => [o.id, o.nome]));

      let y = 55;

      if (tipo === "diario_completo") {
        for (const d of diarios ?? []) {
          if (y > 270) {
            doc.addPage();
            addHeader(doc, titulo, obraNome);
            y = 55;
          }
          doc.setFontSize(11);
          doc.text(
            `${obraMap[d.obra_id] ?? "—"} · ${format(new Date(d.data_diario), "dd/MM/yyyy", { locale: ptBR })}${d.retroativo ? " [RETROATIVO]" : ""}`,
            20,
            y
          );
          y += 8;
        }
      }

      if (tipo === "efetivo") {
        const rows: string[][] = [["Obra", "Data", "Próprios", "Terceirizados", "Total"]];
        for (const d of diarios ?? []) {
          const { count: cp } = await supabase
            .from("fato_mao_obra_propria")
            .select("id", { count: "exact", head: true })
            .eq("diario_id", d.id);
          const { count: ct } = await supabase
            .from("fato_mao_obra_terceirizada")
            .select("id", { count: "exact", head: true })
            .eq("diario_id", d.id);
          const mot = await supabase
            .from("fato_mao_obra_terceirizada")
            .select("quantidade")
            .eq("diario_id", d.id);
          const totalTerc = (mot.data ?? []).reduce((s, r) => s + (r.quantidade ?? 0), 0);
          const totalProp = cp ?? 0;
          rows.push([
            obraMap[d.obra_id] ?? "—",
            format(new Date(d.data_diario), "dd/MM/yyyy", { locale: ptBR }),
            String(totalProp),
            String(totalTerc),
            String(totalProp + totalTerc),
          ]);
        }
        autoTable(doc, {
          startY: 55,
          head: [rows[0]],
          body: rows.slice(1),
        });
      }

      if (tipo === "ocorrencias") {
        const diarioIds = (diarios ?? []).map((d) => d.id);
        const { data: occ } = diarioIds.length
          ? await supabase
              .from("fato_ocorrencias")
              .select("diario_id, tipo, descricao, severidade")
              .in("diario_id", diarioIds)
          : { data: [] };
        const rows: string[][] = [["Obra", "Data", "Tipo", "Descrição", "Severidade"]];
        for (const o of occ ?? []) {
          const diario = (diarios ?? []).find((d) => d.id === o.diario_id);
          rows.push([
            diario ? obraMap[diario.obra_id] ?? "—" : "—",
            diario ? format(new Date(diario.data_diario), "dd/MM/yyyy", { locale: ptBR }) : "—",
            o.tipo,
            o.descricao,
            o.severidade,
          ]);
        }
        autoTable(doc, {
          startY: 55,
          head: [rows[0]],
          body: rows.slice(1),
        });
      }

      if (tipo === "servicos") {
        const diarioIds = (diarios ?? []).map((d) => d.id);
        const { data: serv } = diarioIds.length
          ? await supabase
              .from("fato_servicos")
              .select("diario_id, descricao, quantidade, unidade")
              .in("diario_id", diarioIds)
          : { data: [] };
        const rows: string[][] = [["Obra", "Data", "Serviço", "Quantidade", "Unidade"]];
        for (const s of serv ?? []) {
          const diario = (diarios ?? []).find((d) => d.id === s.diario_id);
          rows.push([
            diario ? obraMap[diario.obra_id] ?? "—" : "—",
            diario ? format(new Date(diario.data_diario), "dd/MM/yyyy", { locale: ptBR }) : "—",
            s.descricao,
            s.quantidade != null ? String(s.quantidade) : "—",
            s.unidade ?? "—",
          ]);
        }
        autoTable(doc, {
          startY: 55,
          head: [rows[0]],
          body: rows.slice(1),
        });
      }

      if (tipo === "registro_fotografico") {
        const diarioIds = (diarios ?? []).map((d) => d.id);
        const { data: anexos } = diarioIds.length
          ? await supabase
              .from("fato_anexos")
              .select("diario_id, legenda, modulo")
              .in("diario_id", diarioIds)
          : { data: [] };
        const rows: string[][] = [["Obra", "Data", "Legenda", "Módulo"]];
        for (const a of anexos ?? []) {
          const diario = (diarios ?? []).find((d) => d.id === a.diario_id);
          rows.push([
            diario ? obraMap[diario.obra_id] ?? "—" : "—",
            diario ? format(new Date(diario.data_diario), "dd/MM/yyyy", { locale: ptBR }) : "—",
            a.legenda ?? "—",
            a.modulo ?? "—",
          ]);
        }
        autoTable(doc, {
          startY: 55,
          head: [rows[0]],
          body: rows.slice(1),
        });
      }

      if (tipo === "visitas") {
        const diarioIds = (diarios ?? []).map((d) => d.id);
        const { data: vis } = diarioIds.length
          ? await supabase
              .from("fato_visitas")
              .select("diario_id, tipo, visitantes")
              .in("diario_id", diarioIds)
          : { data: [] };
        const rows: string[][] = [["Obra", "Data", "Tipo", "Visitantes"]];
        for (const v of vis ?? []) {
          const diario = (diarios ?? []).find((d) => d.id === v.diario_id);
          rows.push([
            diario ? obraMap[diario.obra_id] ?? "—" : "—",
            diario ? format(new Date(diario.data_diario), "dd/MM/yyyy", { locale: ptBR }) : "—",
            v.tipo,
            v.visitantes,
          ]);
        }
        autoTable(doc, {
          startY: 55,
          head: [rows[0]],
          body: rows.slice(1),
        });
      }

      const buf = doc.output("arraybuffer");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="relatorio_${tipo}.pdf"`,
        },
      });
    }

    if (formato === "excel" && tipo === "efetivo") {
      let query = supabase
        .from("fato_diarios")
        .select("id, obra_id, data_diario")
        .gte("data_diario", dataInicio)
        .lte("data_diario", dataFim)
        .order("data_diario", { ascending: false });
      if (obraId) query = query.eq("obra_id", obraId);
      const { data: diarios } = await query;

      const obraIds = [...new Set((diarios ?? []).map((d) => d.obra_id))];
      const { data: obras } = obraIds.length
        ? await supabase.from("dim_obras").select("id, nome").in("id", obraIds)
        : { data: [] };
      const obraMap = Object.fromEntries((obras ?? []).map((o) => [o.id, o.nome]));

      const rows: (string | number)[][] = [
        ["Obra", "Data", "Próprios", "Terceirizados", "Total"],
      ];
      for (const d of diarios ?? []) {
        const { count: cp } = await supabase
          .from("fato_mao_obra_propria")
          .select("id", { count: "exact", head: true })
          .eq("diario_id", d.id);
        const mot = await supabase
          .from("fato_mao_obra_terceirizada")
          .select("quantidade")
          .eq("diario_id", d.id);
        const totalTerc = (mot.data ?? []).reduce((s, r) => s + (r.quantidade ?? 0), 0);
        const totalProp = cp ?? 0;
        rows.push([
          obraMap[d.obra_id] ?? "—",
          format(new Date(d.data_diario), "dd/MM/yyyy", { locale: ptBR }),
          totalProp,
          totalTerc,
          totalProp + totalTerc,
        ]);
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Efetivo");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="relatorio_efetivo.xlsx"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Formato não suportado para este relatório" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[API Relatórios]", err);
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}

function getTitulo(tipo: string): string {
  const map: Record<string, string> = {
    diario_completo: "Diário Completo",
    efetivo: "Efetivo de Mão de Obra",
    ocorrencias: "Ocorrências do Período",
    servicos: "Serviços Executados",
    registro_fotografico: "Registro Fotográfico",
    visitas: "Visitas do Período",
  };
  return map[tipo] ?? "Relatório";
}
