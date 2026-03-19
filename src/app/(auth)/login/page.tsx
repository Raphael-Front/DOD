"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginBranding } from "@/components/auth/LoginBranding";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/dashboard");
      }
    };
    checkAuth();
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex overflow-hidden">
      <div className="hidden lg:block lg:w-[960px] shrink-0">
        <LoginBranding />
      </div>

      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[620px] bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)] p-8 lg:p-12 flex justify-center">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
