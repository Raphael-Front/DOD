"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertTitle, AlertDescription, Button } from "@/components/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("Erro ao iniciar sessão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch {
      setError("Erro ao conectar com Microsoft.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[477px] space-y-8">
      <div>
        <p className="text-[var(--color-accent-blue)] text-[var(--font-size-title3)] font-semibold font-[var(--font-sans)]">
          BEM-VINDO
        </p>
        <h2 className="text-[var(--text-primary)] text-[var(--font-size-display)] font-normal font-[var(--font-sans)] mt-1">
          Acessar o sistema
        </h2>
        <p className="text-[var(--text-tertiary)] text-[var(--font-size-title3)] font-light font-[var(--font-sans)] mt-2">
          Informe suas credenciais para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[var(--text-primary)] text-[var(--font-size-title3)] font-normal font-[var(--font-sans)] mb-2">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[var(--text-tertiary)]" strokeWidth={2} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@gplincorporadora.com.br"
              className="w-full h-16 pl-12 pr-4 bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-medium)] text-[var(--font-size-title3)] font-medium font-[var(--font-sans)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[var(--text-primary)] text-[var(--font-size-title3)] font-normal font-[var(--font-sans)] mb-2">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[var(--text-tertiary)]" strokeWidth={2} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="*************"
              className="w-full h-16 pl-12 pr-4 bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-medium)] text-[var(--font-size-title3)] font-medium font-[var(--font-sans)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-6 h-6 rounded border-[var(--border-medium)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-[var(--text-secondary)] text-[var(--font-size-body)] font-normal font-[var(--font-sans)]">
              Manter conectado
            </span>
          </label>
          <Link
            href="/esqueci-senha"
            className="text-[var(--color-accent-blue)] text-[var(--font-size-body)] font-normal font-[var(--font-sans)] hover:underline"
          >
            Esqueci a senha
          </Link>
        </div>

        {error && (
          <Alert variant="error">
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base"
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" strokeWidth={2} />
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[var(--border-medium)]" />
        <span className="text-[var(--text-tertiary)] text-[var(--font-size-title3)] font-medium font-[var(--font-sans)]">
          ou
        </span>
        <div className="flex-1 h-px bg-[var(--border-medium)]" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleMicrosoftLogin}
        disabled={loading}
        className="w-full h-12"
      >
        <svg
          className="w-6 h-6"
          viewBox="0 0 21 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="10" height="10" fill="#F25022" />
          <rect x="11" width="10" height="10" fill="#7FBA00" />
          <rect y="11" width="10" height="10" fill="#00A4EF" />
          <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
        </svg>
        <span className="text-[var(--text-primary)] text-[var(--font-size-title3)] font-medium font-[var(--font-sans)]">
          Continuar com Microsoft
        </span>
      </Button>
    </div>
  );
}
