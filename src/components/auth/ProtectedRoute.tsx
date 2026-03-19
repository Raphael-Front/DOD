"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/invite",
  "/esqueci-senha",
  "/cadastro",
  "/redefinir-senha",
  "/definir-senha",
];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath =
    pathname === "/" ||
    PUBLIC_PATHS.some((path) => pathname?.startsWith(path));

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" && !isPublicPath) {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [status, isPublicPath, pathname, router]);

  if (status === "loading" && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return <>{children}</>;
}
