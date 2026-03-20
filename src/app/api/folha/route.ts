import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/folha?obraId=&competencia=&tipo=
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const obraId = searchParams.get("obraId");
  const competencia = searchParams.get("competencia");
  const tipo = searchParams.get("tipo");

  let query = supabase
    .from("f_folhas")
    .select("id, obra_id, competencia, tipo, status, debitada, created_at, dim_obras(nome)")
    .order("competencia", { ascending: false });

  if (obraId) query = query.eq("obra_id", obraId);
  if (competencia) query = query.eq("competencia", competencia);
  if (tipo) query = query.eq("tipo", tipo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/folha — cria ou retorna folha existente (upsert by obra+competencia+tipo)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json();
  const { obra_id, competencia, tipo } = body;

  if (!obra_id || !competencia || !tipo) {
    return NextResponse.json({ error: "obra_id, competencia e tipo são obrigatórios" }, { status: 400 });
  }

  // Tentar buscar folha existente (qualquer usuário autenticado pode obter para visualizar)
  const { data: existente } = await supabase
    .from("f_folhas")
    .select("*")
    .eq("obra_id", obra_id)
    .eq("competencia", competencia)
    .eq("tipo", tipo)
    .single();

  if (existente) {
    return NextResponse.json(existente);
  }

  // Criar nova folha — exige perfil com permissão
  const { data: perfil } = await supabase
    .from("dim_perfis")
    .select("perfil")
    .eq("id", user.id)
    .single();

  const perfisPermitidos = ["admin", "coordenador", "dp", "engenheiro"];
  if (!perfil || !perfisPermitidos.includes(perfil.perfil)) {
    return NextResponse.json(
      { error: "Sem permissão para criar folha. Entre em contato com um usuário com permissão de lançamento." },
      { status: 403 }
    );
  }

  // Criar nova folha
  const { data: nova, error } = await supabase
    .from("f_folhas")
    .insert({ obra_id, competencia, tipo, status: "aberta", debitada: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(nova, { status: 201 });
}
