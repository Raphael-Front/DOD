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
import { useState } from "react";
import { clsx } from "clsx";

const principalItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/diarios", label: "Diário da Obra", icon: Calendar },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: FileText },
];

const gestaoItems = [
  { href: "/dashboard/cadastros", label: "Cadastros", icon: ClipboardList },
  { href: "/dashboard/usuarios", label: "Usuários", icon: Users },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [obrasDropdownOpen, setObrasDropdownOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen w-full bg-[#f4f6f8]">
      {/* Sidebar — 260px, #1e3a5f */}
      <aside
        className={clsx(
          "fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-[280px]" : "w-0"
        )}
        style={{
          background: "#1e3a5f",
          borderRight: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {sidebarOpen && (
          <>
            {/* Header — Seletor Todas as obras (alinhado com itens do menu) */}
            <div
              className="shrink-0 flex items-center py-3 min-h-[64px] px-4"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 1px 0 0 rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={() => setObrasDropdownOpen(!obrasDropdownOpen)}
                className="flex-1 flex items-center gap-2 rounded-lg transition-colors min-w-0"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  padding: "10px 12px",
                  margin: "0 12px",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                <Building2 className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span className="flex-1 text-left whitespace-nowrap">Todas as obras</span>
                <ChevronDown className="w-4 h-4 shrink-0" strokeWidth={2} />
              </button>
            </div>

            {/* Navegação */}
            <nav className="flex-1 overflow-y-auto px-4 pb-4">
              <div
                className="uppercase font-semibold"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.4)",
                  padding: "24px 16px 8px 16px",
                }}
              >
                PRINCIPAL
              </div>
              <div className="space-y-0.5">
                {principalItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-md transition-colors min-h-[44px]",
                        active
                          ? "bg-white/12 text-white font-medium"
                          : "text-white/65 hover:bg-white/8 hover:text-white/90"
                      )}
                      style={{
                        padding: "10px 12px",
                        margin: "0 12px",
                        fontSize: 14,
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <item.icon className="w-6 h-6 shrink-0" strokeWidth={2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div
                className="uppercase font-semibold"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.4)",
                  padding: "24px 16px 8px 16px",
                }}
              >
                GESTÃO
              </div>
              <div className="space-y-0.5">
                {gestaoItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-md transition-colors min-h-[44px]",
                        active
                          ? "bg-white/12 text-white font-medium"
                          : "text-white/65 hover:bg-white/8 hover:text-white/90"
                      )}
                      style={{
                        padding: "10px 12px",
                        margin: "0 12px",
                        fontSize: 14,
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <item.icon className="w-6 h-6 shrink-0" strokeWidth={2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </>
        )}
      </aside>

      {/* Topbar — 64px, alinhada com header da sidebar */}
      <header
        className={clsx(
          "fixed top-0 right-0 z-20 flex items-center justify-between transition-all duration-300",
          sidebarOpen ? "left-[280px]" : "left-0"
        )}
        style={{
          background: "#1e3a5f",
          height: 64,
          padding: "0 24px",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 1px 0 0 rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center rounded-md text-white transition-colors hover:bg-white/15"
          style={{
            width: 40,
            height: 40,
            background: "rgba(255,255,255,0.08)",
          }}
          aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"}
        >
          <PanelLeftClose
            className={clsx("transition-transform", !sidebarOpen && "rotate-180")}
            size={22}
            strokeWidth={2}
          />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-full p-0.5"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <button
              onClick={() => setTheme("light")}
              className={clsx(
                "flex items-center justify-center rounded-full transition-all",
                theme === "light" ? "bg-white text-[#1e3a5f]" : "text-white/80 hover:text-white"
              )}
              style={{ width: 36, height: 32 }}
            >
              <Sun size={22} strokeWidth={2} />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={clsx(
                "flex items-center justify-center rounded-full transition-all",
                theme === "dark" ? "bg-white text-[#1e3a5f]" : "text-white/80 hover:text-white"
              )}
              style={{ width: 36, height: 32 }}
            >
              <Moon size={22} strokeWidth={2} />
            </button>
          </div>

          <button
            className="flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            style={{ width: 42, height: 42 }}
            aria-label="Configurações"
          >
            <Settings size={24} strokeWidth={2} />
          </button>

          <button
            className="flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            style={{ width: 42, height: 42 }}
            aria-label="Perfil"
          >
            <User size={24} strokeWidth={2} />
          </button>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1 text-white/70 hover:text-white px-3 py-2 rounded-md transition-colors"
            style={{ fontSize: 15 }}
          >
            <LogOut size={24} strokeWidth={2} />
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <main
        className={clsx(
          "fixed bottom-0 overflow-auto transition-all duration-300 bg-[#f4f6f8]",
          sidebarOpen ? "left-[280px] right-0" : "left-0 right-0"
        )}
        style={{ top: 64 }}
      >
        {children}
      </main>
    </div>
  );
}
