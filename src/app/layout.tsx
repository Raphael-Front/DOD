import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { DM_Sans, DM_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Diário de Obra Digital - GPL Incorporadora",
  description: "Sistema de gestão de diários de obra da GPL Incorporadora",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning className={`${dmSans.variable} ${dmMono.variable} ${sora.variable}`}>
      <body className="antialiased min-h-screen">
        <Providers>
          <ProtectedRoute>
            <AppShell>{children}</AppShell>
          </ProtectedRoute>
          <Toaster position="top-right" richColors toastOptions={{ style: { borderRadius: 12 } }} />
        </Providers>
      </body>
    </html>
  );
}
