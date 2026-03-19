"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  LayoutDashboard,
  Calendar,
  FileText,
  ClipboardList,
  Users,
  LogOut,
  PanelLeftClose,
  Sun,
  Moon,
  Settings,
  User,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AUTH_PATHS = ["/login", "/auth/callback", "/esqueci-senha"];

const principalItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/diarios", label: "Diário da Obra", icon: Calendar },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: FileText },
];

const gestaoItems = [
  { href: "/dashboard/cadastros", label: "Cadastros", icon: ClipboardList },
  { href: "/dashboard/usuarios", label: "Usuários", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isAuthPage = AUTH_PATHS.some((path) => pathname?.startsWith(path));

  const perfil = profile?.perfil ?? "leitura";
  const mostraGestao = perfil === "admin" || perfil === "coordenador";
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [obrasDropdownOpen, setObrasDropdownOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname?.startsWith(href);

  // Rotas de auth: sem sidebar/header
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-[var(--surface-base)]">
      <aside
        className={clsx(
          "fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300",
          "bg-[var(--surface-sidebar)] border-r border-white/[0.06]",
          sidebarOpen ? "w-[220px]" : "w-0 overflow-hidden"
        )}
      >
        {sidebarOpen && (
          <>
            <div
              className="shrink-0 flex items-center min-h-[var(--sidebar-header-height)]"
              style={{
                padding: "24px 16px 16px",
                gap: 10,
                borderBottom: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <button
                onClick={() => setObrasDropdownOpen(!obrasDropdownOpen)}
                className="flex-1 flex items-center min-w-0 bg-[var(--sidebar-overlay)] text-[var(--text-on-primary)] font-semibold text-[var(--font-size-body)]"
                style={{
                  padding: "8px 12px",
                  gap: 10,
                  borderRadius: "var(--radius-md)",
                  transition:
                    "background var(--duration-fast) var(--ease-out-cubic), color var(--duration-fast) var(--ease-out-cubic)",
                }}
              >
                <Building2 className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span className="flex-1 text-left whitespace-nowrap">
                  Todas as obras
                </span>
                <ChevronDown className="w-4 h-4 shrink-0" strokeWidth={2} />
              </button>
            </div>

            <nav
              className="flex-1 overflow-y-auto pb-4 px-4"
              style={{ paddingTop: 24 }}
            >
              <div
                className="uppercase font-semibold px-3 opacity-40 mb-2 mt-5"
                style={{ fontSize: "9px", letterSpacing: "2px" }}
              >
                PRINCIPAL
              </div>
              <div className="flex flex-col gap-0.5">
                {principalItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center font-normal text-[var(--font-size-small)] rounded-[10px] transition-all duration-150",
                        active
                          ? "bg-white/[0.12] text-white font-medium"
                          : "text-[var(--sidebar-nav-text)] hover:bg-[var(--sidebar-nav-hover)] hover:text-white"
                      )}
                      style={{
                        padding: "10px 12px",
                        gap: "var(--space-2)",
                      }}
                    >
                      <item.icon
                        className="w-[18px] h-[18px] shrink-0"
                        strokeWidth={2}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {mostraGestao && (
                <>
                  <div
                    className="uppercase font-semibold px-3 opacity-40 mb-2 mt-5"
                    style={{ fontSize: "9px", letterSpacing: "2px" }}
                  >
                    GESTÃO
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {gestaoItems.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={clsx(
                            "flex items-center font-normal text-[var(--font-size-small)] rounded-[10px] transition-all duration-150",
                            active
                              ? "bg-white/[0.12] text-white font-medium"
                              : "text-[var(--sidebar-nav-text)] hover:bg-[var(--sidebar-nav-hover)] hover:text-white"
                          )}
                          style={{
                            padding: "10px 12px",
                            gap: "var(--space-2)",
                          }}
                        >
                          <item.icon
                            className="w-[18px] h-[18px] shrink-0"
                            strokeWidth={2}
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </nav>
          </>
        )}
      </aside>

      <div
        className="flex flex-col min-h-screen min-w-0 transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? 220 : 0,
          width: sidebarOpen ? "calc(100% - 220px)" : "100%",
        }}
      >
        <header
          className="sticky top-0 z-20 flex items-center justify-between w-full bg-[var(--surface-header)] h-[var(--topbar-height)] px-14 border-b border-black/[0.06] shadow-[var(--sidebar-shadow)]"
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center rounded-md w-10 h-10 text-white transition-colors bg-[var(--sidebar-overlay-light)] hover:bg-white/10"
            aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"}
          >
            <PanelLeftClose
              className={clsx("transition-transform", !sidebarOpen && "rotate-180")}
              size={22}
              strokeWidth={2}
            />
          </button>

          <div className="flex items-center gap-2">
            <span
              className="text-[12px] font-medium text-white/70 hidden md:inline"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full p-0.5 bg-[var(--sidebar-overlay)]">
                <button
                  onClick={() => setTheme("light")}
                  className={clsx(
                    "flex items-center justify-center rounded-full w-9 h-8 transition-all hover:bg-white/10",
                    theme === "light"
                      ? "bg-white text-[var(--color-primary)]"
                      : "text-white/80 hover:text-white"
                  )}
                >
                  <Sun size={22} strokeWidth={2} />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={clsx(
                    "flex items-center justify-center rounded-full w-9 h-8 transition-all hover:bg-white/10",
                    theme === "dark"
                      ? "bg-white text-[var(--color-primary)]"
                      : "text-white/80 hover:text-white"
                  )}
                >
                  <Moon size={22} strokeWidth={2} />
                </button>
              </div>

              <button
                className="flex items-center justify-center rounded-full w-8 h-8 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Configurações"
              >
                <Settings size={20} strokeWidth={2} />
              </button>

              <button
                className="flex items-center justify-center rounded-full w-8 h-8 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Perfil"
                title={profile?.nome ?? "Perfil"}
              >
                <User size={20} strokeWidth={2} />
              </button>

              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 text-[var(--text-on-primary-muted)] hover:text-white px-3 py-2 rounded-md transition-colors text-[var(--font-size-body)] hover:bg-white/5"
              >
                <LogOut size={20} strokeWidth={2} />
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto overflow-x-hidden bg-[var(--surface-base)]">
          <div className="w-full max-w-[1400px] mx-auto px-10 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
