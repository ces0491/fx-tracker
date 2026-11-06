/** Download rows (arrays of cells) as a CSV file. */
export function downloadCsv(filename, header, rows) {
  const escape = (cell) => {
    if (cell == null) return '';
    const text = String(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking the URL in the same task as the click can cancel the download in some browsers, Safari among the
  // ones reported, so the file stays available for a minute.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
