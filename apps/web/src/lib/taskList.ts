const TASK_PATTERN = /^(\s*[-*]\s+)\[([ xX])\](\s+.*)$/;

export function isTaskListLine(line: string): boolean {
  return TASK_PATTERN.test(line);
}

export function toggleTaskListItem(content: string, lineIndex: number): string {
  const lines = content.split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return content;
  const match = line.match(TASK_PATTERN);
  if (!match) return content;
  const [, prefix, marker, rest] = match;
  const next = marker === " " ? "x" : " ";
  lines[lineIndex] = `${prefix}[${next}]${rest}`;
  return lines.join("\n");
}
