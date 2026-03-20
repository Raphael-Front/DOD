import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function padRight(str: string, len: number): string {
  return str.substring(0, len).padEnd(len, " ");
}

function padLeft(str: string, len: number): string {
  return str.substring(0, len).padStart(len, "0");
}

function formatCurrency(value: number, len: number): string {
  const cents = Math.round(Math.abs(value) * 100);
  return cents.toString().padStart(len, "0");
}

// GET /api/folha/:id/exportar-uau
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Verificar permissão
  const { data: perfil } = await supabase
    .from("dim_perfis")
    .select("perfil")
    .eq("id", user.id)
    .single();

  const perfisPermitidos = ["admin", "coordenador", "dp"];
  if (!perfil || !perfisPermitidos.includes(perfil.perfil)) {
    return NextResponse.json({ error: "Sem permissão para exportar" }, { status: 403 });
  }

  // Verificar folha fechada
  const { data: folha } = await supabase
    .from("f_folhas")
    .select("id, status, competencia")
    .eq("id", id)
    .single();

  if (!folha) return NextResponse.json({ error: "Folha não encontrada" }, { status: 404 });
  if (folha.status !== "fechada") {
    return NextResponse.json({ error: "A folha precisa estar fechada para exportar" }, { status: 400 });
  }

  // Buscar lançamentos
  const { data: lancamentosRaw, error } = await supabase
    .from("f_folha_lancamentos")
    .select(`
      tarefa_mensal, liquido,
      d_colaboradores(nome, matricula)
    `)
    .eq("folha_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ordenar por nome do colaborador
  const lancamentos = (lancamentosRaw ?? []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const dA = a.d_colaboradores as { nome?: string } | null;
    const dB = b.d_colaboradores as { nome?: string } | null;
    const nomeA = dA?.nome ?? "";
    const nomeB = dB?.nome ?? "";
    return nomeA.localeCompare(nomeB);
  });

  // Formatar competência: MMAAAA
  const competenciaDate = new Date(folha.competencia + "T00:00:00");
  const mm = String(competenciaDate.getUTCMonth() + 1).padStart(2, "0");
  const aaaa = String(competenciaDate.getUTCFullYear());
  const competenciaFormatada = mm + aaaa;

  // Gerar linhas de posição fixa (Latin-1)
  // Pos 1-10:  Matrícula (esquerda, spaces)
  // Pos 11-50: Nome (esquerda, spaces)
  // Pos 51-60: Competência MMAAAA (esquerda, spaces)
  // Pos 61-75: Tarefa Mensal (direita, zeros, 2 decimais sem separador)
  // Pos 76-90: Líquido (direita, zeros, 2 decimais sem separador)
  const linhas: string[] = [];

  for (const lanc of lancamentos ?? []) {
    const raw = lanc as Record<string, unknown>;
    const colabRaw = raw.d_colaboradores as { nome: string; matricula: string } | { nome: string; matricula: string }[] | null;
    const colab = Array.isArray(colabRaw) ? colabRaw[0] ?? null : colabRaw;
    if (!colab) continue;

    const matricula = padRight(colab.matricula, 10);
    const nome = padRight(colab.nome, 40);
    const competencia = padRight(competenciaFormatada, 10);
    const tarefaMensal = formatCurrency(Number(lanc.tarefa_mensal), 15);
    const liquido = formatCurrency(Number(lanc.liquido), 15);

    linhas.push(matricula + nome + competencia + tarefaMensal + liquido);
  }

  const conteudo = linhas.join("\r\n") + (linhas.length > 0 ? "\r\n" : "");

  // Converter para Latin-1 (ISO-8859-1)
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(conteudo);

  // Substituição manual de caracteres acentuados para Latin-1
  const latin1Bytes = Buffer.from(
    conteudo
      .replace(/[^\x00-\xFF]/g, "?")
      .replace(/ã/g, "\xE3")
      .replace(/Ã/g, "\xC3")
      .replace(/á/g, "\xE1")
      .replace(/Á/g, "\xC1")
      .replace(/â/g, "\xE2")
      .replace(/Â/g, "\xC2")
      .replace(/à/g, "\xE0")
      .replace(/À/g, "\xC0")
      .replace(/é/g, "\xE9")
      .replace(/É/g, "\xC9")
      .replace(/ê/g, "\xEA")
      .replace(/Ê/g, "\xCA")
      .replace(/í/g, "\xED")
      .replace(/Í/g, "\xCD")
      .replace(/ó/g, "\xF3")
      .replace(/Ó/g, "\xD3")
      .replace(/ô/g, "\xF4")
      .replace(/Ô/g, "\xD4")
      .replace(/õ/g, "\xF5")
      .replace(/Õ/g, "\xD5")
      .replace(/ú/g, "\xFA")
      .replace(/Ú/g, "\xDA")
      .replace(/ç/g, "\xE7")
      .replace(/Ç/g, "\xC7")
      .replace(/ñ/g, "\xF1")
      .replace(/Ñ/g, "\xD1"),
    "latin1"
  );

  void utf8Bytes; // suprimir aviso de variável não usada

  const nomeArquivo = `folha_uau_${competenciaFormatada}_${id.substring(0, 8)}.txt`;

  return new NextResponse(latin1Bytes, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=iso-8859-1",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Content-Length": String(latin1Bytes.length),
    },
  });
}
