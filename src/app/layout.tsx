import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
    <html lang="pt-BR" className={`${sora.variable} ${dmSans.variable}`}>
      <body className="antialiased min-h-screen">
        <Providers>
          <ProtectedRoute>{children}</ProtectedRoute>
        </Providers>
      </body>
    </html>
  );
}
