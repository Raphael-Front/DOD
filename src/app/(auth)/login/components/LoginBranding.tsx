"use client";

import { Building2 } from "lucide-react";

export default function LoginBranding() {
  return (
    <div
      className="hidden lg:flex w-1/2 h-screen flex-col justify-between"
      style={{ backgroundColor: "#243F5F", padding: "80px" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center shrink-0 rounded-xl"
          style={{
            width: 56,
            height: 56,
            background: "linear-gradient(135deg, #E07B39 0%, #c9632a 100%)",
          }}
        >
          <Building2 className="w-8 h-8 text-white" strokeWidth={2} />
        </div>
        <div>
          <p
            className="text-white font-bold leading-tight"
            style={{ fontFamily: "var(--font-sora)", fontSize: 28 }}
          >
            GPL Incorporadora
          </p>
          <p
            className="font-semibold leading-tight"
            style={{ fontFamily: "var(--font-sora)", fontSize: 18, color: "#929292" }}
          >
            DIÁRIO DE OBRA DIGITAL
          </p>
        </div>
      </div>

      {/* Headline + badge */}
      <div className="flex flex-col gap-8">
        {/* Badge operacional */}
        <div
          className="inline-flex items-center gap-3 rounded-full w-fit"
          style={{
            border: "1px solid #E07B39",
            backgroundColor: "rgba(224, 123, 57, 0.15)",
            padding: "8px 20px",
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: "#E07B39" }}
          />
          <span
            className="font-semibold"
            style={{ fontFamily: "var(--font-sora)", fontSize: 18, color: "#E07B39" }}
          >
            SISTEMA OPERACIONAL
          </span>
        </div>

        {/* Headline principal */}
        <h2
          className="font-bold leading-tight"
          style={{ fontFamily: "var(--font-sora)", fontSize: 64, color: "#ffffff", maxWidth: 580 }}
        >
          Gestão completa das suas{" "}
          <span style={{ color: "#E07B39" }}>obras</span>{" "}
          em um só lugar.
        </h2>

        {/* Subtítulo */}
        <p
          className="font-bold"
          style={{ fontFamily: "var(--font-sora)", fontSize: 24, color: "#929292", maxWidth: 540 }}
        >
          Registre, aprove e acompanhe o diário de obra com rastreabilidade
          total — do canteiro à diretoria.
        </p>
      </div>

      {/* Métricas */}
      <div className="flex items-center gap-12">
        {[
          { value: "100%", label: "DIGITAL" },
          { value: "0", label: "RETRABALHO" },
          { value: "24/7", label: "ACESSO" },
        ].map((item, i) => (
          <div key={item.label} className="flex items-center gap-6">
            {i !== 0 && (
              <div className="h-16 bg-white/30" style={{ width: "0.5px" }} />
            )}
            <div>
              <p
                className="font-bold leading-none"
                style={{ fontFamily: "var(--font-sora)", fontSize: 40, color: "#ffffff" }}
              >
                {item.value}
              </p>
              <p
                className="font-bold mt-1"
                style={{ fontFamily: "var(--font-sora)", fontSize: 16, color: "#929292" }}
              >
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <p
        className="font-bold"
        style={{ fontFamily: "var(--font-sora)", fontSize: 16, color: "#929292" }}
      >
        © 2026 GPL Incorporadora — Diário de Obra Digital
      </p>
    </div>
  );
}
