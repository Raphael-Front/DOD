import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/folha/:id/debitar
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Verificar permissão (apenas admin e dp)
  const { data: perfil } = await supabase
    .from("dim_perfis")
    .select("perfil")
    .eq("id", user.id)
    .single();

  const perfisPermitidos = ["admin", "dp"];
  if (!perfil || !perfisPermitidos.includes(perfil.perfil)) {
    return NextResponse.json({ error: "Sem permissão para debitar folha em despesas" }, { status: 403 });
  }

  // Verificar folha
  const { data: folha } = await supabase
    .from("f_folhas")
    .select("id, status, debitada")
    .eq("id", id)
    .single();

  if (!folha) return NextResponse.json({ error: "Folha não encontrada" }, { status: 404 });
  if (folha.status !== "fechada") {
    return NextResponse.json({ error: "Folha precisa estar fechada para debitar" }, { status: 400 });
  }

  // Idempotência (regra FP06): se já foi debitada, retornar sucesso sem reprocessar
  if (folha.debitada) {
    return NextResponse.json({ success: true, debitada: true, mensagem: "Folha já havia sido debitada anteriormente" });
  }

  // Marcar como debitada
  const { error: errDebitar } = await supabase
    .from("f_folhas")
    .update({ debitada: true })
    .eq("id", id);

  if (errDebitar) return NextResponse.json({ error: errDebitar.message }, { status: 500 });

  // Gravar audit log imutável
  await supabase.from("f_folha_audit_log").insert({
    folha_id: id,
    acao: "debito_despesas",
    usuario_id: user.id,
    payload: { perfil: perfil.perfil },
  });

  return NextResponse.json({ success: true, debitada: true });
}
