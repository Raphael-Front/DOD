"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Building2, Briefcase, Truck, Wrench, MapPin, Building, AlertTriangle, HardHat, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissoes } from "@/hooks/usePermissoes";
import { useEffect } from "react";

const TABS = [
  { href: "/obras", label: "Obras", icon: Building2 },
  { href: "/funcoes", label: "Funções", icon: Briefcase },
  { href: "/colaboradores", label: "Colaboradores", icon: HardHat },
  { href: "/servicos", label: "Serviços", icon: Layers },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/equipamentos", label: "Equipamentos", icon: Wrench },
  { href: "/locais", label: "Locais", icon: MapPin },
  { href: "/departamentos", label: "Departamentos", icon: Building },
  { href: "/ocorrencias-config", label: "Ocorrências", icon: AlertTriangle },
] as const;

export default function CadastrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAuth();
  const { temPermissao, isLoading } = usePermissoes();

  const temAcesso = temPermissao("rota_cadastros");

  useEffect(() => {
    if (!isLoading && status === "authenticated" && !temAcesso) {
      router.replace("/dashboard");
    }
  }, [isLoading, status, temAcesso, router]);

  if (isLoading || !temAcesso) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div>
        <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)]">
          Cadastros
        </h1>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
          Obras, funções, fornecedores, equipamentos, locais e configurações
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-light)] pb-3">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] font-medium text-[var(--font-size-small)] transition-colors",
                isActive
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
