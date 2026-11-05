import BrandMark from './BrandMark';
import { BUILT_URL, CONTACT_URL } from '@/lib/config/site';
import { RATE_SOURCE } from '@/lib/config/source';

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <BrandMark className="size-8 text-accent" />
            <h2 className="mt-4 text-xl font-semibold tracking-tight">Built by Sheet Solved</h2>
            <p className="mt-2 text-muted">
              I build forecasting models, data pipelines and the applications that put them in front of people. If your
              business runs on numbers like these, tell me what&apos;s not working.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href={CONTACT_URL}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
            >
              Start a conversation
            </a>
            <a href={BUILT_URL} className="underline-grow text-sm text-muted hover:text-foreground">
              See what else I&apos;ve built
            </a>
          </div>
        </div>

        <div className="mt-10 space-y-2 border-t border-border pt-6 text-xs leading-relaxed text-muted">
          <p>
            Rates from{' '}
            <a href={RATE_SOURCE.url} className="underline decoration-hairline underline-offset-2 hover:text-foreground">
              {RATE_SOURCE.name}
            </a>
            : blended daily mid-market rates from central banks and official sources. They are daily, not live.
          </p>
          <p>
            Forecasts are statistical projections from past rates and can be wrong. This page is general information, not
            financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
