import { cn } from '@/lib/cn';

/**
 * A compact numeric table that scrolls within a fixed height, with a sticky header. The first cell of each row
 * is its header; the rest are right-aligned. `rows` are arrays of cell contents.
 */
export default function ScrollTable({ caption, columns, rows, className }) {
  return (
    <div className={cn('max-h-80 overflow-auto rounded-md border border-border', className)}>
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
                  <th key="row" scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="whitespace-nowrap px-3 py-1.5 text-right">
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
