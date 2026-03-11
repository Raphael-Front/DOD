"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/login`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Erro ao enviar e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-[20px] shadow-lg p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sky-700 font-[var(--font-dm-sans)] mb-6 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>

        <h1 className="text-2xl font-semibold font-[var(--font-sora)] text-zinc-900 mb-2">
          Esqueci a senha
        </h1>
        <p className="text-neutral-500 font-[var(--font-dm-sans)] mb-6">
          Informe seu e-mail para receber o link de redefinição.
        </p>

        {sent ? (
          <div className="p-4 bg-green-50 text-green-800 rounded-lg">
            E-mail enviado! Verifique sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-12 pl-10 pr-4 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-cyan-900/30"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-cyan-900 text-white rounded-lg font-semibold hover:bg-cyan-800 disabled:opacity-70"
            >
              {loading ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
