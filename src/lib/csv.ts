const escapeField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const toCsv = (rows: (string | number | null)[][]): string =>
  rows.map((row) => row.map((cell) => (cell === null ? "" : escapeField(String(cell)))).join(",")).join("\r\n") + "\r\n";
