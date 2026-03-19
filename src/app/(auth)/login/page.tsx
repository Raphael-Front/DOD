"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoginBranding from "./components/LoginBranding";
import LoginForm from "./components/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/dashboard");
      }
    };
    checkAuth();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <LoginBranding />
      <LoginForm />
    </div>
  );
}
