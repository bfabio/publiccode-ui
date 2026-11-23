export interface Diagnostic {
  line: number | null;
  column: number | null;
  level: "error" | "warning";
  message: string;
}

export interface ParsedLog {
  repoUrl: string | null;
  repoName: string | null;
  diagnostics: Diagnostic[];
}

const LINE_RE = /^publiccode\.yml:(\d+):(\d+): (error|warning): (.+)$/;
const BAD_RE = /\[.+\] BAD publiccode\.yml: (.+)/;

const parseLine = (line: string): Diagnostic | null => {
  const m = line.match(LINE_RE);
  if (!m) return null;
  return { line: parseInt(m[1], 10), column: parseInt(m[2], 10), level: m[3] as Diagnostic["level"], message: m[4] };
};

// The crawler puts the first diagnostic on the BAD line itself, in the same
// form as the lines after it. Only a reason without a location is a bare error.
export const parseLogMessage = (message: string): ParsedLog => {
  const repoUrl = message.match(/^\[([^\]]+)\]/)?.[1]?.replace(/\.git$/, "") ?? null;
  const repoName = message.match(/\[([^\]]+)\] BAD /)?.[1] ?? null;

  const diagnostics: Diagnostic[] = [];
  for (const line of message.split("\n")) {
    const located = parseLine(line);
    if (located) {
      diagnostics.push(located);
      continue;
    }
    const bad = line.match(BAD_RE);
    if (bad) diagnostics.push(parseLine(bad[1]) ?? { line: null, column: null, level: "error", message: bad[1] });
  }

  return { repoUrl, repoName, diagnostics };
};
