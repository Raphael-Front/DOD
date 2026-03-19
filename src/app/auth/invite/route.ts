import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Callback do convite por e-mail (inviteUserByEmail).
 *
 * **Por que não usar `exchangeCodeForSession` aqui?** O cliente `@supabase/ssr` usa PKCE
 * e exige `code_verifier` no armazenamento — ele não existe quando o usuário abre o
 * link do e-mail (o fluxo não foi iniciado nesse navegador). O método aborta antes do HTTP.
 * O GoTrue aceita a troca do `auth_code` do e-mail via POST `/auth/v1/token?grant_type=pkce`
 * com `code_verifier` vazio para códigos emitidos no servidor; em seguida persistimos
 * a sessão com `setSession` nos cookies da resposta.
 *
 * Redirect URLs (Supabase): `https://<domínio>/auth/invite`
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDesc = requestUrl.searchParams.get("error_description");
  if (oauthError) {
    console.error(
      "[auth/invite] redirect com erro do Auth:",
      oauthError,
      oauthErrorDesc ?? ""
    );
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", requestUrl.origin)
    );
  }

  const code =
    requestUrl.searchParams.get("code") ??
    requestUrl.searchParams.get("auth_code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const typeParam = requestUrl.searchParams.get("type");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const redirectSuccess = new URL("/definir-senha", requestUrl.origin);
  let response = NextResponse.redirect(redirectSuccess);

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Alguns redirects trazem token_hash (fluxo verify) em vez de code
  if (tokenHash) {
    const otpType =
      typeParam === "invite" ||
      typeParam === "signup" ||
      typeParam === "recovery" ||
      typeParam === "email_change"
        ? typeParam
        : "invite";

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      console.error("[auth/invite] verifyOtp:", error.message);
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", requestUrl.origin)
      );
    }

    return response;
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", requestUrl.origin)
    );
  }

  const tokenJson = await exchangePkceCodeForTokens(supabaseUrl, anonKey, code);

  if (!tokenJson?.access_token || !tokenJson.refresh_token) {
    console.error("[auth/invite] troca do código falhou (token vazio ou API rejeitou)");
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", requestUrl.origin)
    );
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token,
  });

  if (sessionError) {
    console.error("[auth/invite] setSession:", sessionError.message);
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", requestUrl.origin)
    );
  }

  return response;
}

async function exchangePkceCodeForTokens(
  supabaseUrl: string,
  anonKey: string,
  authCode: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const url = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=pkce`;

  const attempts = [
    { auth_code: authCode, code_verifier: "" },
    { auth_code: authCode },
  ];

  for (const body of attempts) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[auth/invite] token HTTP", res.status, text);
      continue;
    }

    try {
      const data = JSON.parse(text) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (data.access_token && data.refresh_token) {
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        };
      }
    } catch {
      console.error("[auth/invite] JSON inválido na resposta do token");
    }
  }

  return null;
}
