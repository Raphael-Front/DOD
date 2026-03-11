"use client";

import { Building2, Zap } from "lucide-react";

export function LoginBranding() {
  return (
    <div className="w-full min-h-screen bg-slate-700 flex flex-col justify-between p-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gradient-to-b from-orange-400/90 to-orange-400 rounded-lg flex items-center justify-center shrink-0">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-white text-3xl font-semibold font-[var(--font-sora)]">
            GPL Incorporadora
          </h1>
          <p className="text-neutral-400 text-lg font-semibold font-[var(--font-sora)]">
            DIÁRIO DE OBRA DIGITAL
          </p>
        </div>
      </div>

      {/* Conteúdo central */}
      <div className="space-y-8">
        <div className="bg-orange-400/20 rounded-[58px] border border-orange-400 inline-flex items-center gap-3 px-5 py-2">
          <Zap className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-orange-400 text-lg font-semibold font-[var(--font-sora)]">
            SISTEMA OPERACIONAL
          </span>
        </div>

        <div className="max-w-[571px] space-y-6">
          <h2 className="text-white text-6xl font-semibold font-[var(--font-sora)] leading-tight">
            Gestão completa das suas{" "}
            <span className="text-orange-400">obras</span> em um só lugar.
          </h2>
          <p className="text-neutral-400 text-2xl font-semibold font-[var(--font-sora)]">
            Registre, aprove e acompanhe o diário de obra com rastreabilidade
            total - do canteiro à diretoria.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="flex gap-16">
        <div className="flex items-center gap-4">
          <div className="w-px h-16 bg-white/50" />
          <div>
            <p className="text-white text-4xl font-semibold font-[var(--font-sora)]">
              100%
            </p>
            <p className="text-neutral-400 text-base font-semibold font-[var(--font-sora)]">
              DIGITAL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-px h-16 bg-white/50" />
          <div>
            <p className="text-white text-4xl font-semibold font-[var(--font-sora)]">
              0
            </p>
            <p className="text-neutral-400 text-base font-semibold font-[var(--font-sora)]">
              RETRABALHO
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-px h-16 bg-white/50" />
          <div>
            <p className="text-white text-4xl font-semibold font-[var(--font-sora)]">
              24/7
            </p>
            <p className="text-neutral-400 text-base font-semibold font-[var(--font-sora)]">
              ACESSO
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-neutral-400 text-base font-semibold font-[var(--font-sora)]">
        © 2026 GPL Incorporadora - Diário de Obra Digital
      </p>
    </div>
  );
}
