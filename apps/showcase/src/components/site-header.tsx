import Link from "next/link";

const NAV = [
  { href: "/#studio", label: "Studio" },
  { href: "/#states", label: "States" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2 text-sm font-semibold tracking-tight"
          aria-label="Interlace home"
        >
          <span className="font-mono text-accent transition-transform group-hover:-translate-y-px">
            ⌘
          </span>
          <span>
            Inter<span className="text-accent">lace</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://github.com/akshitagrawal/interlace"
            target="_blank"
            rel="noreferrer"
            className="ml-1 rounded-md border border-line px-3 py-1.5 text-ink transition-colors hover:border-line-strong hover:bg-surface"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
