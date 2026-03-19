"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * A raiz não pode usar redirect() no servidor: o Supabase às vezes redireciona para
 * Site URL com erros só no hash (#error_code=otp_expired). O hash não existe no request
 * do servidor e era perdido ao mandar para /login.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function run() {
      const url = new URL(window.location.href);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/dashboard");
        return;
      }

      if (url.hash && url.hash.length > 1) {
        router.replace("/login" + url.search + url.hash);
        return;
      }

      const code = url.searchParams.get("code");
      const oauthError = url.searchParams.get("error");
      if (code || oauthError) {
        router.replace("/auth/invite" + url.search + url.hash);
        return;
      }

      router.replace("/login");
    }

    void run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]" />
    </div>
  );
}
