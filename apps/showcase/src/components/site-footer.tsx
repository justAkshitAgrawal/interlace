import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-accent">⌘</span>
          <span className="font-semibold">
            Inter<span className="text-accent">lace</span>
          </span>
          <span className="ml-2 text-faint">Drop-in interactions for real software.</span>
        </div>
        <div className="flex items-center gap-5 text-sm text-muted">
          <Link href="/#studio" className="transition-colors hover:text-ink">
            Studio
          </Link>
          <Link href="/docs" className="transition-colors hover:text-ink">
            Docs
          </Link>
          <a
            href="https://github.com/justAkshitAgrawal/interlace"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ink"
          >
            GitHub
          </a>
          <span className="font-mono text-xs text-faint">MIT · Free</span>
        </div>
      </div>
    </footer>
  );
}
