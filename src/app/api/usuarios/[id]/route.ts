import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID não informado." }, { status: 400 });
  }

  // Verifica se o solicitante é admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("dim_perfis")
    .select("perfil")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.perfil !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem excluir usuários." }, { status: 403 });
  }

  // Impede auto-exclusão
  if (id === user.id) {
    return NextResponse.json({ error: "Você não pode excluir sua própria conta." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Remove vínculos de obras
  const { error: errUo } = await admin
    .from("dim_usuario_obra")
    .delete()
    .eq("usuario_id", id);

  if (errUo) {
    return NextResponse.json({ error: `Erro ao remover vínculos: ${errUo.message}` }, { status: 500 });
  }

  // Remove perfil
  const { error: errPerfil } = await admin
    .from("dim_perfis")
    .delete()
    .eq("id", id);

  if (errPerfil) {
    return NextResponse.json({ error: `Erro ao excluir perfil: ${errPerfil.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
