import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--surface-base)]">
      <h1 className="page-title">Página não encontrada</h1>
      <p className="text-[var(--font-size-small)] text-[var(--text-tertiary)]">
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-[10px] font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
