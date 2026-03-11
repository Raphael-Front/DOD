"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  LayoutDashboard,
  FileText,
  Building,
  BarChart3,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/diarios", label: "Diários", icon: FileText },
  { href: "/dashboard/obras", label: "Obras", icon: Building },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-100 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-700 text-white shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-400 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold font-[var(--font-sora)]">
              GPL Incorporadora
            </p>
            <p className="text-xs text-neutral-400 font-[var(--font-sora)]">
              Diário de Obra
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-[var(--font-dm-sans)] transition-colors ${
                  isActive
                    ? "bg-cyan-900 text-white"
                    : "text-neutral-300 hover:bg-slate-600 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-600">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-neutral-300 hover:bg-slate-600 hover:text-white transition-colors font-[var(--font-dm-sans)]"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-slate-700 text-white">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-600"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-orange-400" />
          <span className="font-semibold font-[var(--font-sora)]">
            Diário de Obra
          </span>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 w-64 h-full bg-slate-700 text-white transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 flex items-center gap-3">
          <Building2 className="w-10 h-10 text-orange-400" />
          <span className="font-semibold font-[var(--font-sora)]">
            GPL Incorporadora
          </span>
        </div>
        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                pathname === item.href
                  ? "bg-cyan-900"
                  : "text-neutral-300 hover:bg-slate-600"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-600">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-neutral-300 hover:bg-slate-600"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
