'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">The page hit an error</h1>
      <p className="text-muted">
        Something in the page failed while drawing the rates. Reloading usually fixes it. If it keeps happening, the
        rate data may be in a shape the page doesn&apos;t expect.
      </p>
      <div>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
        >
          Reload the tracker
        </button>
      </div>
    </main>
  );
}
