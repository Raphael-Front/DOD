"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoginBranding from "../login/components/LoginBranding";

export default function DefinirSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { refresh } = useAuth();

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError("Erro ao definir a senha. O link pode ter expirado.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Erro ao definir a senha. Tente novamente.");
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
            Definir senha
          </h1>
          <p
            className="font-light mb-8"
            style={{ fontFamily: "var(--font-dm-sans)", fontSize: 20, color: "#929292" }}
          >
            Crie uma senha para acessar o sistema
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            {error && (
              <div
                className="rounded-xl px-4 py-3"
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
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
