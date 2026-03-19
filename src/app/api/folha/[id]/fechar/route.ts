import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/folha/:id/fechar
export async function POST(
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
    return NextResponse.json({ error: "Sem permissão para fechar folha" }, { status: 403 });
  }

  // Verificar folha
  const { data: folha } = await supabase
    .from("f_folhas")
    .select("id, status, obra_id, competencia")
    .eq("id", id)
    .single();

  if (!folha) return NextResponse.json({ error: "Folha não encontrada" }, { status: 404 });
  if (folha.status !== "aberta") {
    return NextResponse.json({ error: "Folha já está fechada" }, { status: 400 });
  }

  // Validar: todos os colaboradores ativos da folha devem ter ao menos 1 registro de produção
  const { data: lancamentos } = await supabase
    .from("f_folha_lancamentos")
    .select("id, colaborador_id, d_colaboradores(status)")
    .eq("folha_id", id);

  const lancIds = (lancamentos ?? []).map((l: Record<string, unknown>) => l.id as string);

  let semProducao: string[] = [];
  if (lancIds.length > 0) {
    const { data: producao } = await supabase
      .from("f_producao_lancamentos")
      .select("lancamento_id")
      .in("lancamento_id", lancIds);

    const lancComProducao = new Set((producao ?? []).map((p: Record<string, unknown>) => p.lancamento_id as string));

    semProducao = (lancamentos ?? [])
      .filter((l: Record<string, unknown>) => {
        const colab = l.d_colaboradores as { status: string } | null;
        return colab?.status === "ativo" && !lancComProducao.has(l.id as string);
      })
      .map((l: Record<string, unknown>) => l.id as string);
  }

  if (semProducao.length > 0) {
    return NextResponse.json(
      { error: `${semProducao.length} colaborador(es) ativo(s) sem produção registrada. Todos devem ter ao menos 1 registro.` },
      { status: 400 }
    );
  }

  // Fechar folha
  const { error: errFechar } = await supabase
    .from("f_folhas")
    .update({ status: "fechada" })
    .eq("id", id);

  if (errFechar) return NextResponse.json({ error: errFechar.message }, { status: 500 });

  // Gravar audit log
  await supabase.from("f_folha_audit_log").insert({
    folha_id: id,
    acao: "fechamento",
    usuario_id: user.id,
    payload: { perfil: perfil.perfil },
  });

  return NextResponse.json({ success: true, status: "fechada" });
}
