'use client';

import { useState } from 'react';
import ScrollTable from '@/components/ui/scroll-table';
import { formatIsoDate, formatRate } from '@/lib/format';

// Each table starts at its natural width and grows into spare room; they sit side by side when both fit and
// stack when they don't. Only a screen narrower than one table scrolls it sideways.
const TABLE_FIT = 'min-w-0 flex-auto';

/** The chart's figures as tables, rendered only once opened. */
export default function DataTable({ pair, rows, decimals }) {
  const [open, setOpen] = useState(false);
  const observed = rows.filter((r) => r.close != null).reverse();
  const projected = rows.filter((r) => r.close == null && r.forecast != null);
  const rate = (v) => (v == null ? '' : formatRate(v, decimals));

  return (
    <details
      className="rounded-lg border border-border bg-raised shadow-card"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm text-muted hover:text-foreground sm:px-5">
        Show the chart data as a table
      </summary>
      {open && (
        <div className="flex flex-wrap gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
          <ScrollTable
            className={TABLE_FIT}
            caption={`${pair} daily rates for the selected range, newest first`}
            columns={['Date', 'Rate', '5-day avg', '20-day avg', 'RSI']}
            rows={observed.map((r) => [
              formatIsoDate(r.date),
              rate(r.close),
              rate(r.sma5),
              rate(r.sma20),
              r.rsi == null ? '' : r.rsi.toFixed(1),
            ])}
          />
          {projected.length > 0 && (
            <ScrollTable
              className={TABLE_FIT}
              caption={`${pair} forecast`}
              columns={['Date', 'Forecast', '50% low', '50% high', '95% low', '95% high']}
              rows={projected.map((r) => [
                formatIsoDate(r.date),
                rate(r.forecast),
                rate(r.band50?.[0]),
                rate(r.band50?.[1]),
                rate(r.band[0]),
                rate(r.band[1]),
              ])}
            />
          )}
        </div>
      )}
    </details>
  );
}
