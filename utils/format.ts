export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatPeriodo(inicio: string, fim: string): string {
  return `${formatDate(inicio)} – ${formatDate(fim)}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatMinutos(min: number): string {
  const horas = Math.floor(min / 60);
  const minutosRestantes = Math.round(min % 60);
  if (horas <= 0) return `${minutosRestantes} min`;
  if (minutosRestantes === 0) return `${horas} h`;
  return `${horas} h ${minutosRestantes} min`;
}

export function pct(atual: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.min(100, Math.round((atual / meta) * 100));
}
