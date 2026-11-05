import BrandMark from './BrandMark';
import { CONTACT_URL, SITE_URL } from '@/lib/config/site';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <a
            href={SITE_URL}
            aria-label="Sheet Solved home"
            className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
          >
            <BrandMark className="size-7 text-accent" />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">Sheet Solved</span>
          </a>
          <span aria-hidden className="text-lg text-border-strong">
            /
          </span>
          <span className="truncate text-lg font-medium tracking-tight">FX Tracker</span>
        </div>
        <nav aria-label="Page" className="flex shrink-0 items-center gap-5 text-sm">
          <a href="#how-it-works" className="underline-grow hidden text-muted hover:text-foreground sm:inline">
            How it works
          </a>
          <a
            href={CONTACT_URL}
            className="rounded-full border border-hairline bg-tint px-3.5 py-1.5 font-medium text-accent transition-colors hover:border-accent hover:bg-accent hover:text-accent-contrast"
          >
            Get in touch
          </a>
        </nav>
      </div>
    </header>
  );
}
