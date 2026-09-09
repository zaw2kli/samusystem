/**
 * Normaliza um nickname para comparação/pesquisa:
 * remove espaços nas pontas, colapsa espaços internos, minúsculas,
 * remove acentos/diacríticos.
 */
export function normalizeNick(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Verifica se `needle` é uma busca parcial válida dentro de `haystackNormalized`. */
export function matchesSearch(haystackNormalized: string, needleRaw: string): boolean {
  const needle = normalizeNick(needleRaw);
  if (!needle) return false;
  return haystackNormalized.includes(needle);
}
