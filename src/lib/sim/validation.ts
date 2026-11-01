export type Parsed = { ok: true; refs: number[] } | { ok: false; error: string };

export function parseRefs(input: string): Parsed {
  const tokens = input.split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return { ok: false, error: "Enter at least one page number." };
  const bad = tokens.find((t) => !/^\d+$/.test(t));
  if (bad) return { ok: false, error: `"${bad}" is not a valid page number. Use whole numbers 0 or above.` };
  if (tokens.length > 5000) return { ok: false, error: "Reference strings are limited to 5000 pages." };
  return { ok: true, refs: tokens.map(Number) };
}

export function validateFrames(v: number): string | null {
  if (!Number.isInteger(v) || v < 1) return "Frames must be a whole number of at least 1.";
  if (v > 20) return "Use 20 frames or fewer.";
  return null;
}
