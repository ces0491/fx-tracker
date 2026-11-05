'use client';

import { useState } from 'react';
import { formatIsoDate, formatRate } from '@/lib/format';

function Table({ caption, columns, rows }) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border border-border">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
          <tr>
            {columns.map((column, i) => (
              <th key={column} scope="col" className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-border">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key="date" scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="px-3 py-1.5 text-right">
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The chart's figures as tables, rendered only once opened. */
export default function DataTable({ pair, rows, decimals }) {
  const [open, setOpen] = useState(false);
  const observed = rows.filter((r) => r.close != null).reverse();
  const projected = rows.filter((r) => r.close == null && r.forecast != null);
  const rate = (v) => (v == null ? '' : formatRate(v, decimals));

  return (
    <details className="mt-4 border-t border-border pt-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm text-muted hover:text-foreground">Show the chart data as a table</summary>
      {open && (
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          <Table
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
            <Table
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
