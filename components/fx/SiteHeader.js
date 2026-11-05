import Link from 'next/link';
import FxMark from './FxMark';
import { SITE_URL } from '@/lib/config/site';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-t-[3px] border-b border-t-accent border-b-border bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link href="/" className="flex items-center gap-2 self-center rounded-md" aria-label="FX Tracker home">
            <FxMark className="size-7 text-foreground" />
            <span className="text-lg font-semibold tracking-tight">FX Tracker</span>
          </Link>
          <a href={SITE_URL} className="truncate text-sm text-muted transition-colors hover:text-foreground">
            by Sheet Solved
          </a>
        </div>
        <nav aria-label="Page" className="shrink-0 text-sm">
          <a href="#how-it-works" className="hidden text-muted transition-colors hover:text-foreground sm:inline">
            How it works
          </a>
        </nav>
      </div>
    </header>
  );
}
