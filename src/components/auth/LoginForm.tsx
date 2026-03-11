"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
        <p className="text-sky-700 text-xl font-semibold font-[var(--font-sora)]">
          BEM-VINDO
        </p>
        <h2 className="text-black text-3xl font-normal font-[var(--font-sora)] mt-1">
          Acessar o sistema
        </h2>
        <p className="text-neutral-400 text-xl font-extralight font-[var(--font-dm-sans)] mt-2">
          Informe suas credenciais para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-black text-xl font-normal font-[var(--font-dm-sans)] mb-2">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@gplincorporadora.com.br"
              className="w-full h-16 pl-12 pr-4 bg-white rounded-[10px] border border-neutral-400/50 text-xl font-medium font-[var(--font-dm-sans)] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-cyan-900/30 focus:border-cyan-900"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-black text-xl font-normal font-[var(--font-dm-sans)] mb-2">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="*************"
              className="w-full h-16 pl-12 pr-4 bg-white rounded-[10px] border border-neutral-400/50 text-xl font-medium font-[var(--font-dm-sans)] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-cyan-900/30 focus:border-cyan-900"
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
              className="w-6 h-6 rounded border-neutral-400 text-cyan-900 focus:ring-cyan-900"
            />
            <span className="text-neutral-500 text-base font-normal font-[var(--font-dm-sans)]">
              Manter conectado
            </span>
          </label>
          <Link
            href="/esqueci-senha"
            className="text-sky-700 text-base font-normal font-[var(--font-dm-sans)] hover:underline"
          >
            Esqueci a senha
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-cyan-900 rounded-[10px] border border-neutral-400/50 text-white text-xl font-semibold font-[var(--font-dm-sans)] flex items-center justify-center gap-2 hover:bg-cyan-800 disabled:opacity-70 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Entrar"
          )}
        </button>
      </form>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-400/50" />
        <span className="text-neutral-400 text-xl font-medium font-[var(--font-dm-sans)]">
          ou
        </span>
        <div className="flex-1 h-px bg-neutral-400/50" />
      </div>

      <button
        type="button"
        onClick={handleMicrosoftLogin}
        disabled={loading}
        className="w-full h-12 bg-white rounded-[10px] border border-neutral-400/50 flex items-center justify-center gap-3 hover:bg-neutral-50 disabled:opacity-70 transition-colors"
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
        <span className="text-black text-xl font-medium font-[var(--font-dm-sans)]">
          Continuar com Microsoft
        </span>
      </button>
    </div>
  );
}
