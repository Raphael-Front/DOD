"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Building2, Briefcase, Truck, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const TABS = [
  { href: "/dashboard/cadastros/obras", label: "Obras", icon: Building2 },
  { href: "/dashboard/cadastros/funcoes", label: "Funções", icon: Briefcase },
  { href: "/dashboard/cadastros/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/dashboard/cadastros/equipamentos", label: "Equipamentos", icon: Wrench },
] as const;

export default function CadastrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const perfil = profile?.perfil ?? "leitura";

  useEffect(() => {
    if (perfil !== "admin" && perfil !== "coordenador") {
      router.replace("/dashboard");
    }
  }, [perfil, router]);

  if (perfil !== "admin" && perfil !== "coordenador") {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div>
        <h1 className="text-[var(--font-size-title2)] font-bold text-[var(--text-primary)]">
          Cadastros
        </h1>
        <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-1">
          Obras, funções, fornecedores e equipamentos
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-light)] pb-3">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
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
