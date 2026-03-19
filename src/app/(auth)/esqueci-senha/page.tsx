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
    <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)] p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[var(--text-link)] font-[var(--font-sans)] mb-6 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>

        <h1 className="text-[var(--font-size-title2)] font-semibold font-[var(--font-sans)] text-[var(--text-primary)] mb-2">
          Esqueci a senha
        </h1>
        <p className="text-[var(--text-tertiary)] font-[var(--font-sans)] mb-6">
          Informe seu e-mail para receber o link de redefinição.
        </p>

        {sent ? (
          <div className="p-4 bg-[var(--color-success-bg)] text-[var(--alert-success-text)] rounded-[var(--radius-lg)]">
            E-mail enviado! Verifique sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[var(--font-size-small)] font-medium text-[var(--text-secondary)] mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-12 pl-10 pr-4 rounded-[var(--radius-lg)] border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-accent-blue)] focus:shadow-[var(--focus-ring-primary)]"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-error-bg)] text-[var(--alert-error-text)] text-[var(--font-size-small)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-[var(--opacity-disabled)]"
            >
              {loading ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
