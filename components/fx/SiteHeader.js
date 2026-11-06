import Link from 'next/link';
import FxMark from './FxMark';
import TrackedLink from '@/components/ui/tracked-link';
import { SITE_URL } from '@/lib/config/site';

/** `links` are the page's own navigation: { href, label, shortLabel? (shown on phones), hideOnPhone? }. */
export default function SiteHeader({ links = [] }) {
  return (
    <header className="sticky top-0 z-40 border-t-[3px] border-b border-t-accent border-b-border bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link href="/" className="flex items-center gap-2 self-center rounded-md" aria-label="FX Tracker home">
            <FxMark className="size-7 text-foreground" />
            <span className="whitespace-nowrap text-lg font-semibold tracking-tight">FX Tracker</span>
          </Link>
          <TrackedLink
            href={SITE_URL}
            event="Sheet Solved link"
            eventData={{ placement: 'header' }}
            className="truncate text-sm text-muted transition-colors hover:text-foreground"
          >
            by Sheet Solved
          </TrackedLink>
        </div>
        <nav aria-label="Site" className="flex shrink-0 items-center gap-5 text-sm">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`whitespace-nowrap text-muted transition-colors hover:text-foreground ${link.hideOnPhone ? 'hidden sm:inline' : ''}`}
            >
              {link.shortLabel ? (
                <>
                  <span className="sm:hidden">{link.shortLabel}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </>
              ) : (
                link.label
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
