"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LoginBranding from "../login/components/LoginBranding";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      <LoginBranding />

      <div className="w-full lg:w-1/2 h-screen flex items-center justify-center bg-gray-50 p-6">
        <div
          className="w-full bg-white rounded-2xl shadow-md flex flex-col justify-center"
          style={{ maxWidth: 620, padding: "56px 48px" }}
        >
          {sent ? (
            <div className="flex flex-col items-center gap-6 text-center">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 72, height: 72, backgroundColor: "#f0fdf4" }}
              >
                <CheckCircle className="w-10 h-10" style={{ color: "#16a34a" }} strokeWidth={1.5} />
              </div>
              <div>
                <h2
                  className="font-bold mb-2"
                  style={{ fontFamily: "var(--font-sora)", fontSize: 28, color: "#111111" }}
                >
                  Cadastro realizado!
                </h2>
                <p
                  className="font-light"
                  style={{ fontFamily: "var(--font-dm-sans)", fontSize: 18, color: "#929292" }}
                >
                  Enviamos um link de confirmação para{" "}
                  <span style={{ color: "#1A3C5E", fontWeight: 500 }}>{email}</span>.
                  <br />
                  Verifique sua caixa de entrada para ativar o acesso.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full flex items-center justify-center rounded-xl font-bold transition-opacity"
                style={{
                  height: 49,
                  backgroundColor: "#1A3C5E",
                  color: "#ffffff",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: 20,
                }}
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              <p
                className="font-bold mb-1"
                style={{ fontFamily: "var(--font-sora)", fontSize: 20, color: "#2B6CB0" }}
              >
                NOVO ACESSO
              </p>
              <h1
                className="font-normal leading-tight mb-2"
                style={{ fontFamily: "var(--font-sora)", fontSize: 32, color: "#111111" }}
              >
                Criar conta
              </h1>
              <p
                className="font-light mb-8"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, color: "#929292" }}
              >
                Preencha os dados para solicitar seu acesso
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Campo Nome */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-normal"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, color: "#111111" }}
                  >
                    Nome completo
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: "#929292" }}
                      strokeWidth={2}
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      className="w-full pl-12 pr-4 bg-white rounded-xl outline-none transition-colors"
                      style={{
                        height: 64,
                        border: "1px solid #929292",
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: 16,
                        color: "#111111",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#1A3C5E")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#929292")}
                    />
                  </div>
                </div>

                {/* Campo E-mail */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-normal"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, color: "#111111" }}
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: "#929292" }}
                      strokeWidth={2}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@gplincorporadora.com.br"
                      required
                      className="w-full pl-12 pr-4 bg-white rounded-xl outline-none transition-colors"
                      style={{
                        height: 64,
                        border: "1px solid #929292",
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: 16,
                        color: "#111111",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#1A3C5E")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#929292")}
                    />
                  </div>
                </div>

                {/* Campo Senha */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-normal"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, color: "#111111" }}
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: "#929292" }}
                      strokeWidth={2}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full pl-12 pr-4 bg-white rounded-xl outline-none transition-colors"
                      style={{
                        height: 64,
                        border: "1px solid #929292",
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: 16,
                        color: "#111111",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#1A3C5E")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#929292")}
                    />
                  </div>
                </div>

                {/* Campo Confirmar Senha */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-normal"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, color: "#111111" }}
                  >
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: "#929292" }}
                      strokeWidth={2}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className="w-full pl-12 pr-4 bg-white rounded-xl outline-none transition-colors"
                      style={{
                        height: 64,
                        border: "1px solid #929292",
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: 16,
                        color: "#111111",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#1A3C5E")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#929292")}
                    />
                  </div>
                </div>

                {/* Link Já tenho conta */}
                <div className="flex items-center justify-end">
                  <Link
                    href="/login"
                    style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#2B6CB0" }}
                    className="hover:underline"
                  >
                    Já tenho conta
                  </Link>
                </div>

                {/* Erro */}
                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fca5a5",
                      color: "#b91c1c",
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Botão Criar conta */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center rounded-xl font-bold transition-opacity disabled:opacity-60"
                  style={{
                    height: 49,
                    backgroundColor: "#1A3C5E",
                    color: "#ffffff",
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: 20,
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
                  ) : (
                    "Criar conta"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
