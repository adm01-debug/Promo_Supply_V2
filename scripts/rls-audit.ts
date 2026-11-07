function isAllowed(p: PolicyRow): boolean {
  const lower = p.policyname.toLowerCase();
  if (ALLOWED_POLICY_PREFIXES.some((pre) => lower.startsWith(pre))) return true;
  // Policies de leitura para authenticated (SELECT com qual=true) são legítimas.
  // Cobre os dois padrões de nomenclatura vistos em produção:
  //   *_authenticated_read  (ex.: currencies_authenticated_read)
  //   *_read_authenticated  (ex.: xbz_cores_read_authenticated)
  if (p.cmd === "SELECT" && (lower.endsWith("_authenticated_read") || lower.endsWith("_read_authenticated"))) return true;
  return false;
}