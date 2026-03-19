import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Verifica autenticação + perfil admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: perfilSolicitante } = await supabase
    .from("dim_perfis")
    .select("perfil")
    .eq("id", user.id)
    .single();

  if (!perfilSolicitante || perfilSolicitante.perfil !== "admin") {
    return NextResponse.json(
      { error: "Apenas administradores podem convidar usuários." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { nome, email, perfil, obra_ids = [] } = body as {
    nome: string;
    email: string;
    perfil: string;
    obra_ids: string[];
  };

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }
  if (!email?.trim()) {
    return NextResponse.json(
      { error: "E-mail é obrigatório." },
      { status: 400 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const admin = createAdminClient();

  // Envia convite por e-mail via SMTP configurado no Supabase
  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email.trim(), {
      data: { nome: nome.trim() },
      redirectTo: `${siteUrl}/auth/invite`,
    });

  if (inviteError) {
    console.error("[POST /api/usuarios] inviteError:", inviteError);
    let errorMsg: string = inviteError.message ?? "";

    if (!errorMsg || errorMsg === "{}") {
      errorMsg = "Erro ao enviar convite. Verifique se o e-mail já está cadastrado ou se o SMTP está configurado corretamente.";
    } else {
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed && typeof parsed === "object") {
          errorMsg = parsed.message || parsed.error || parsed.msg || errorMsg;
        }
      } catch {
        // não é JSON, usa como está
      }
    }

    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const newUserId = inviteData.user.id;

  // Cria ou atualiza registro em dim_perfis (upsert evita conflito se o usuário já existia)
  const { error: errPerfil } = await admin.from("dim_perfis").upsert(
    {
      id: newUserId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil: perfil ?? "operador",
      ativo: true,
    },
    { onConflict: "id" }
  );

  if (errPerfil) {
    console.error("[POST /api/usuarios] errPerfil:", errPerfil);
    return NextResponse.json(
      { error: `Erro ao criar perfil: ${errPerfil.message || errPerfil.details || "erro desconhecido"}` },
      { status: 500 }
    );
  }

  // Vincula obras, se houver (remove os anteriores e reinsere para evitar duplicatas)
  await admin
    .from("dim_usuario_obra")
    .delete()
    .eq("usuario_id", newUserId);

  if (obra_ids.length > 0) {
    const inserts = obra_ids.map((obra_id: string) => ({
      usuario_id: newUserId,
      obra_id,
    }));
    const { error: errUo } = await admin
      .from("dim_usuario_obra")
      .insert(inserts);

    if (errUo) {
      console.error("[POST /api/usuarios] errUo:", errUo);
      return NextResponse.json(
        { error: `Erro ao vincular obras: ${errUo.message || errUo.details || "erro desconhecido"}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, id: newUserId });
}
