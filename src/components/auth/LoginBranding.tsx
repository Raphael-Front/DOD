"use client";

import { Building2, Zap } from "lucide-react";

export function LoginBranding() {
  return (
    <div className="w-full min-h-screen bg-[var(--color-primary)] flex flex-col justify-between p-10">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-[var(--color-accent-orange)] rounded-[var(--radius-lg)] flex items-center justify-center shrink-0">
          <Building2 className="w-10 h-10 text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-white text-[var(--font-size-title2)] font-semibold font-[var(--font-sans)]">
            GPL Incorporadora
          </h1>
          <p className="text-[var(--text-on-primary-muted)] text-[var(--font-size-large)] font-semibold font-[var(--font-sans)]">
            DIÁRIO DE OBRA DIGITAL
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-[var(--color-accent-orange)]/20 rounded-[58px] border border-[var(--color-accent-orange)] inline-flex items-center gap-3 px-5 py-2">
          <Zap className="w-3.5 h-3.5 text-[var(--color-accent-orange)]" strokeWidth={2} />
          <span className="text-[var(--color-accent-orange)] text-[var(--font-size-large)] font-semibold font-[var(--font-sans)]">
            SISTEMA OPERACIONAL
          </span>
        </div>

        <div className="max-w-[571px] space-y-6">
          <h2 className="text-white text-[var(--font-size-display)] font-semibold font-[var(--font-sans)] leading-tight">
            Gestão completa das suas{" "}
            <span className="text-[var(--color-accent-orange)]">obras</span> em um só lugar.
          </h2>
          <p className="text-[var(--text-on-primary-muted)] text-[var(--font-size-title2)] font-semibold font-[var(--font-sans)]">
            Registre, aprove e acompanhe o diário de obra com rastreabilidade
            total - do canteiro à diretoria.
          </p>
        </div>
      </div>

      <div className="flex gap-16">
        <div className="flex items-center gap-4">
          <div className="w-px h-16 bg-white/50" />
          <div>
            <p className="text-white text-[var(--font-size-title1)] font-semibold font-[var(--font-sans)]">
              100%
            </p>
            <p className="text-[var(--text-on-primary-muted)] text-[var(--font-size-body)] font-semibold font-[var(--font-sans)]">
              DIGITAL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-px h-16 bg-white/50" />
          <div>
            <p className="text-white text-[var(--font-size-title1)] font-semibold font-[var(--font-sans)]">
              0
            </p>
            <p className="text-[var(--text-on-primary-muted)] text-[var(--font-size-body)] font-semibold font-[var(--font-sans)]">
              RETRABALHO
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-px h-16 bg-white/50" />
          <div>
            <p className="text-white text-[var(--font-size-title1)] font-semibold font-[var(--font-sans)]">
              24/7
            </p>
            <p className="text-[var(--text-on-primary-muted)] text-[var(--font-size-body)] font-semibold font-[var(--font-sans)]">
              ACESSO
            </p>
          </div>
        </div>
      </div>

      <p className="text-[var(--text-on-primary-muted)] text-[var(--font-size-body)] font-semibold font-[var(--font-sans)]">
        © 2026 GPL Incorporadora - Diário de Obra Digital
      </p>
    </div>
  );
}
