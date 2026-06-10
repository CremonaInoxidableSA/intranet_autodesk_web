export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function exportToExcelMultiSheet(
  sheets: { name: string; rows: Record<string, unknown>[] }[],
  filename: string,
) {
  import("xlsx").then(({ utils, writeFile }) => {
    const wb = utils.book_new();
    for (const { name, rows } of sheets) {
      const ws = utils.json_to_sheet(rows);
      utils.book_append_sheet(wb, ws, name);
    }
    writeFile(wb, `${filename}.xlsx`);
  });
}
