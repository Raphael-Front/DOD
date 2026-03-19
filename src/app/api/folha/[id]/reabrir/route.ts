import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/folha/:id/reabrir
export async function POST(
  request: NextRequest,
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
    return NextResponse.json({ error: "Sem permissão para reabrir folha" }, { status: 403 });
  }

  const body = await request.json();
  const { motivo } = body;

  if (!motivo?.trim()) {
    return NextResponse.json({ error: "Motivo da reabertura é obrigatório" }, { status: 400 });
  }

  // Verificar folha
  const { data: folha } = await supabase
    .from("f_folhas")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!folha) return NextResponse.json({ error: "Folha não encontrada" }, { status: 404 });
  if (folha.status !== "fechada") {
    return NextResponse.json({ error: "Folha não está fechada" }, { status: 400 });
  }

  // Reabrir folha
  const { error: errReabrir } = await supabase
    .from("f_folhas")
    .update({ status: "aberta" })
    .eq("id", id);

  if (errReabrir) return NextResponse.json({ error: errReabrir.message }, { status: 500 });

  // Gravar audit log imutável
  await supabase.from("f_folha_audit_log").insert({
    folha_id: id,
    acao: "reabertura",
    usuario_id: user.id,
    payload: { motivo: motivo.trim(), perfil: perfil.perfil },
  });

  return NextResponse.json({ success: true, status: "aberta" });
}
