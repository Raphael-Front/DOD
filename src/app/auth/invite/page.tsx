"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Convite por e-mail: troca do código e sessão rodam **só no navegador**.
 * Assim, scanners de e-mail que só fazem GET (sem JS) tendem a não consumir o código PKCE
 * antes do usuário — problema comum com Route Handlers que trocam o código no servidor.
 */
export default function AuthInvitePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const url = new URL(window.location.href);

      if (url.searchParams.get("error")) {
        router.replace("/login" + url.search + url.hash);
        return;
      }

      const code =
        url.searchParams.get("code") ?? url.searchParams.get("auth_code");
      const tokenHash = url.searchParams.get("token_hash");
      const typeParam = url.searchParams.get("type");

      const supabase = createClient();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (tokenHash) {
        const otpType: EmailOtpType =
          typeParam === "invite" ||
          typeParam === "signup" ||
          typeParam === "recovery" ||
          typeParam === "email_change"
            ? (typeParam as EmailOtpType)
            : "invite";

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (cancelled) return;
        if (error) {
          router.replace("/login?error=auth_failed");
          return;
        }
        router.replace("/definir-senha");
        return;
      }

      if (!code) {
        if (!cancelled) router.replace("/login?error=auth_failed");
        return;
      }

      const tokenJson = await exchangePkceCodeForTokens(
        supabaseUrl,
        anonKey,
        code
      );
      if (cancelled) return;

      if (!tokenJson?.access_token || !tokenJson.refresh_token) {
        router.replace("/login?error=auth_failed");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
      });

      if (cancelled) return;
      if (sessionError) {
        router.replace("/login?error=auth_failed");
        return;
      }

      router.replace("/definir-senha");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--surface-base)] p-6">
      <Loader2
        className="h-10 w-10 animate-spin text-[var(--color-primary)]"
        aria-hidden
      />
      <p
        className="text-center text-[var(--text-secondary)] max-w-md"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Validando o convite…
      </p>
    </div>
  );
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
    if (!res.ok) continue;

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
      /* ignore */
    }
  }

  return null;
}
