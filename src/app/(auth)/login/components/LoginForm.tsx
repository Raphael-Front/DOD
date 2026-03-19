"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    // Supabase coloca erros no fragmento (#error=...&error_code=...) — não vai ao servidor
    if (url.hash && url.hash.length > 1) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const errorCode = hashParams.get("error_code");
      const errorDesc = hashParams.get("error_description");

      if (errorCode === "otp_expired") {
        setError(
          "Este link de convite expirou ou já foi usado. Peça um novo convite ao administrador."
        );
        window.history.replaceState({}, "", "/login");
        return;
      }

      if (hashParams.get("error") || errorCode) {
        const decoded = errorDesc
          ? decodeURIComponent(errorDesc.replace(/\+/g, " "))
          : "Não foi possível concluir o acesso pelo link. Peça um novo convite ou entre com e-mail e senha.";
        setError(decoded);
        window.history.replaceState({}, "", "/login");
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "auth_failed") {
      setError(
        "Não foi possível validar o link de acesso. Peça um novo convite ao administrador ou entre com e-mail e senha."
      );
      window.history.replaceState({}, "", "/login");
    } else if (err === "invite_pkce") {
      setError(
        "O convite não pôde ser validado: o e-mail ainda usa o link antigo do Supabase (fluxo com código). Peça ao administrador para atualizar o template de convite em Authentication → Email Templates conforme o arquivo doc/SUPABASE_INVITE_EMAIL_TEMPLATE.md e enviar um novo convite."
      );
      window.history.replaceState({}, "", "/login");
    } else if (err === "invite_otp_failed") {
      setError(
        "O link do convite é inválido ou expirou. Peça um novo convite ao administrador ou entre com e-mail e senha."
      );
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError("E-mail ou senha inválidos. Tente novamente.");
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
    <div className="w-full lg:w-1/2 h-screen flex items-center justify-center bg-gray-50 p-6">
      <div
        className="w-full bg-white rounded-2xl shadow-md flex flex-col justify-center"
        style={{ maxWidth: 620, padding: "56px 48px" }}
      >
        {/* Cabeçalho */}
        <p
          className="font-bold mb-1"
          style={{ fontFamily: "var(--font-sora)", fontSize: 20, color: "#2B6CB0" }}
        >
          BEM-VINDO
        </p>
        <h1
          className="font-normal leading-tight mb-2"
          style={{ fontFamily: "var(--font-sora)", fontSize: 32, color: "#111111" }}
        >
          Acessar o sistema
        </h1>
        <p
          className="font-light mb-8"
          style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, color: "#929292" }}
        >
          Informe suas credenciais para continuar
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                placeholder="*************"
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

          {/* Opções */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1A3C5E] cursor-pointer"
              />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#696969" }}>
                Manter conectado
              </span>
            </label>

            <div className="flex items-center gap-3">
              <Link
                href="/cadastro"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#2B6CB0" }}
                className="hover:underline"
              >
                Criar conta
              </Link>

              <div className="h-4 w-px bg-gray-300" />

              <Link
                href="/esqueci-senha"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#2B6CB0" }}
                className="hover:underline"
              >
                Esqueci a senha
              </Link>
            </div>
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

          {/* Botão Entrar */}
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} /> : "Entrar"}
          </button>
        </form>

        {/* Separador */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ backgroundColor: "#929292" }} />
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: 16, color: "#929292" }}>
            ou
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#929292" }} />
        </div>

        {/* Botão Microsoft */}
        <button
          type="button"
          onClick={handleMicrosoftLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl font-medium transition-colors hover:bg-gray-50 disabled:opacity-60"
          style={{
            height: 49,
            backgroundColor: "#ffffff",
            border: "1px solid #929292",
            fontFamily: "var(--font-dm-sans)",
            fontSize: 20,
            color: "#111111",
          }}
        >
          <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="10" height="10" fill="#F25022" />
            <rect x="11" width="10" height="10" fill="#7FBA00" />
            <rect y="11" width="10" height="10" fill="#00A4EF" />
            <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
          </svg>
          Continuar com Microsoft
        </button>
      </div>
    </div>
  );
}
