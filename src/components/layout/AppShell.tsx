"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissoes } from "@/hooks/usePermissoes";
import { useObra } from "@/contexts/ObraContext";
import {
  Building2,
  LayoutDashboard,
  Calendar,
  FileText,
  ClipboardList,
  Users,
  ShieldCheck,
  LogOut,
  PanelLeftClose,
  Sun,
  Moon,
  Settings,
  User,
  ChevronDown,
  Receipt,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { useTheme } from "@/hooks/useTheme";

const AUTH_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/invite",
  "/esqueci-senha",
  "/cadastro",
  "/redefinir-senha",
  "/definir-senha",
];

async function fetchObras() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dim_obras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

const ALL_PRINCIPAL_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permissao: null },
  { href: "/diarios", label: "Diário da Obra", icon: Calendar, permissao: null },
  { href: "/folha-de-pagamento", label: "Folha de Pagamento", icon: Receipt, permissao: "rota_folha" },
  { href: "/relatorios", label: "Relatórios", icon: FileText, permissao: "rota_relatorios" },
];

const gestaoItems = [
  { href: "/obras", label: "Cadastros", icon: ClipboardList },
  { href: "/usuarios", label: "Usuários", icon: Users },
];

const gestaoAdminItems = [
  { href: "/controle-acesso", label: "Controle de Acesso", icon: ShieldCheck },
];

const CADASTROS_PATHS = ["/obras", "/funcoes", "/fornecedores", "/equipamentos"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut, profile, status } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isAuthPage =
    pathname === "/" ||
    AUTH_PATHS.some((path) => pathname?.startsWith(path));

  const perfil = profile?.perfil ?? "leitura";
  const { temPermissao } = usePermissoes();
  const mostraGestao = temPermissao("rota_cadastros");
  const mostraControleAcesso = perfil === "admin";
  const principalItems = ALL_PRINCIPAL_ITEMS.filter(
    (item) => item.permissao === null || temPermissao(item.permissao)
  );
  const { theme, setTheme } = useTheme();
  const [obrasDropdownOpen, setObrasDropdownOpen] = useState(false);
  const obrasDropdownRef = useRef<HTMLDivElement>(null);

  const { obraId, setObraId } = useObra();
  const { data: obras = [] } = useQuery({
    queryKey: ["obras"],
    queryFn: fetchObras,
    enabled: status === "authenticated",
    staleTime: 30_000,
  });

  const obraSelecionada = obraId ? obras.find((o) => o.id === obraId) : null;
  const obraLabel = obraSelecionada?.nome ?? "Todas as obras";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        obrasDropdownOpen &&
        obrasDropdownRef.current &&
        !obrasDropdownRef.current.contains(e.target as Node)
      ) {
        setObrasDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [obrasDropdownOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    if (href === "/obras") return CADASTROS_PATHS.some((p) => pathname === p);
    if (href === "/folha-de-pagamento") return pathname?.startsWith("/folha-de-pagamento") ?? false;
    return pathname?.startsWith(href) ?? false;
  };

  // Rotas de auth: sem sidebar/header
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-[var(--surface-base)]">
      <aside
        className={clsx(
          "fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300",
          "bg-[var(--surface-sidebar)] border-r border-white/[0.1]",
          sidebarOpen ? "w-[var(--sidebar-width)]" : "w-0 overflow-hidden"
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
              <div ref={obrasDropdownRef} className="flex-1 min-w-0 relative">
                <button
                  type="button"
                  onClick={() => setObrasDropdownOpen(!obrasDropdownOpen)}
                  className="w-full flex items-center min-w-0 bg-[var(--sidebar-overlay)] text-[var(--text-on-primary)] font-semibold text-[var(--font-size-body)] hover:bg-white/10"
                  style={{
                    padding: "8px 12px",
                    gap: 10,
                    borderRadius: "var(--radius-md)",
                    transition:
                      "background var(--duration-fast) var(--ease-out-cubic), color var(--duration-fast) var(--ease-out-cubic)",
                  }}
                >
                  <Building2 className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span className="flex-1 text-left whitespace-nowrap truncate text-[10px]">
                    {obraLabel}
                  </span>
                  <ChevronDown
                    className={clsx(
                      "w-4 h-4 shrink-0 overflow-visible transition-transform",
                      obrasDropdownOpen && "rotate-180"
                    )}
                    strokeWidth={2}
                  />
                </button>
                {obrasDropdownOpen && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 z-[var(--z-dropdown)] bg-[var(--surface-sidebar)] border border-white/20 rounded-[var(--radius-lg)] shadow-xl py-1 max-h-[280px] overflow-y-auto"
                    style={{ minWidth: "100%" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setObraId(null);
                        setObrasDropdownOpen(false);
                      }}
                      className={clsx(
                        "w-full px-3 py-2.5 text-left text-[10px] transition-colors flex items-center gap-2",
                        !obraId
                          ? "bg-white/12 text-white font-medium"
                          : "text-white/90 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Building2 className="w-4 h-4 shrink-0 opacity-70" strokeWidth={2} />
                      Todas as obras
                    </button>
                    {obras.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setObraId(o.id);
                          setObrasDropdownOpen(false);
                        }}
                        className={clsx(
                          "w-full px-3 py-2.5 text-left text-[10px] transition-colors flex items-center gap-2 truncate",
                          obraId === o.id
                            ? "bg-white/12 text-white font-medium"
                            : "text-white/90 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Building2 className="w-4 h-4 shrink-0 opacity-70" strokeWidth={2} />
                        {o.nome}
                      </button>
                    ))}
                    {obras.length === 0 && (
                      <div className="px-3 py-4 text-[var(--font-size-mini)] text-white/60">
                        Nenhuma obra cadastrada
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <nav
              className="flex-1 overflow-y-auto pb-4 px-4"
              style={{ paddingTop: 24 }}
            >
              <div
                className="uppercase font-semibold px-3 mb-2 mt-2 text-white"
                style={{ fontSize: "10px", letterSpacing: "2px" }}
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
                    className="uppercase font-semibold px-3 mb-2 mt-2 text-white"
                    style={{ fontSize: "10px", letterSpacing: "2px" }}
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
                    {mostraControleAcesso && gestaoAdminItems.map((item) => {
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
          marginLeft: sidebarOpen ? "var(--sidebar-width)" : 0,
          width: sidebarOpen ? "calc(100% - var(--sidebar-width))" : "100%",
        }}
      >
        <header
          className="sticky top-0 z-20 flex items-center justify-between w-full bg-[var(--surface-header)] border-b border-black/[0.06] shadow-[var(--sidebar-shadow)]"
          style={{ height: 73, paddingLeft: 18, paddingRight: 18 }}
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
          <div className="w-full mx-auto px-14 py-12" style={{ maxWidth: "var(--content-max)" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
