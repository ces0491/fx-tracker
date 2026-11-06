'use client';

import { useState } from 'react';

/** A chart's figures behind a "show as a table" toggle; `children` renders only once opened. */
export default function TableDisclosure({ summary = 'Show the chart data as a table', children }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="mt-4 border-t border-border pt-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm text-muted hover:text-foreground">{summary}</summary>
      {open && <div className="mt-3">{children}</div>}
    </details>
  );
}
