/**
 * Escape a user-supplied string for safe use inside a PostgREST `.ilike` filter
 * passed via `.or()`. Escapes the SQL LIKE wildcards (`%`, `_`) and the PostgREST
 * `.or()` separator/grouping characters (`,`, `(`, `)`, `*`). Also trims and caps
 * length to prevent overly broad scans.
 *
 * Without this, a search term containing a comma breaks the `.or()` parser, and
 * `%`/`_` allow the user to match unintended rows.
 */
export function escapeIlike(input: string, maxLength = 100): string {
  if (!input) return "";
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed.replace(/[\\%_,()*]/g, (m) => `\\${m}`);
}
