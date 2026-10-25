import Link from 'next/link';

// Botón "Volver" con icono y área de toque cómoda
export default function BotonVolver({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="presionable group inline-flex items-center gap-2 min-h-11 pl-3 pr-4 rounded-full border border-neutral-700 bg-neutral-900/60 text-sm text-neutral-200 hover:border-amber-400 hover:text-amber-400"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}
