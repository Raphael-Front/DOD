import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-display",
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
    <html lang="pt-BR" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
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
