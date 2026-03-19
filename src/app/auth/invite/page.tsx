"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Convite por e-mail no navegador.
 *
 * O fluxo com `?code=` (PKCE) exige `code_verifier` no storage do cliente; o convite é criado
 * no servidor, então esse verificador não existe — a troca falha. Por isso o e-mail no Supabase
 * deve usar `token_hash` apontando para esta rota (`verifyOtp`). Ver `doc/SUPABASE_INVITE_EMAIL_TEMPLATE.md`.
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
          console.error("[auth/invite] verifyOtp:", error.message);
          router.replace("/login?error=invite_otp_failed");
          return;
        }
        router.replace("/definir-senha");
        return;
      }

      if (!code) {
        if (!cancelled) router.replace("/login?error=auth_failed");
        return;
      }

      // `?code=` sem token_hash: só funciona se o navegador já tiver PKCE (ex.: OAuth no mesmo site).
      // E-mail padrão do Supabase (só ConfirmationURL) → falha; use template com token_hash.
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (exchangeError) {
        console.error(
          "[auth/invite] exchangeCodeForSession:",
          exchangeError.message
        );
        router.replace("/login?error=invite_pkce");
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
