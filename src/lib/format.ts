import { CAMBIO } from "../data/cambio";

const usd = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Normaliza espaços estreitos e inseparáveis que o Intl usa, para leitura e testes estáveis. */
const clean = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

export const NAO_INFORMADO = "Não informado";

export function formatUSD(v: number | null | undefined): string {
  if (v === null || v === undefined) return NAO_INFORMADO;
  return clean(usd.format(v));
}

export function toBRL(v: number): number {
  return Math.round(v * CAMBIO.taxa * 100) / 100;
}

export function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return NAO_INFORMADO;
  return clean(brl.format(toBRL(v)));
}

/** "US$ 110,00" ou "US$ 110,00 (≈ R$ 594,00)" quando a conversão está ligada. */
export function money(v: number | null | undefined, emReais: boolean): string {
  if (v === null || v === undefined) return NAO_INFORMADO;
  return emReais ? `${formatUSD(v)} (≈ ${formatBRL(v)})` : formatUSD(v);
}

export function notaCambio(): string {
  const [a, m, d] = CAMBIO.dataReferencia.split("-");
  const taxa = clean(brl.format(CAMBIO.taxa));
  return `Conversão: US$ 1,00 = ${taxa}, ${CAMBIO.fonte}, referência ${d}/${m}/${a}.`;
}

export function formatDate(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Remove acentos e caixa, para interpretar a pergunta. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
