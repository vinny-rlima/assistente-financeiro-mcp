import { EXCHANGE } from "@/config/exchange";

export const NOT_INFORMED = "Não informado";

const SYMBOLS: Record<string, string> = { USD: "US$", BRL: "R$", EUR: "€" };

const toCents = (value: number) => Math.round(value * 100);

/** Soma em centavos para evitar erros de ponto flutuante. */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + toCents(v), 0) / 100;
}

function formatNumber(value: number): string {
  const cents = Math.abs(toCents(value));
  const intPart = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const dec = (cents % 100).toString().padStart(2, "0");
  return `${intPart},${dec}`;
}

/** "US$ 110,00" — sinal só quando negativo e solicitado. */
export function formatMoney(value: number, currency = "USD", signed = false): string {
  const symbol = SYMBOLS[currency] ?? currency;
  const sign = signed && toCents(value) < 0 ? "− " : "";
  return `${sign}${symbol} ${formatNumber(value)}`;
}

export function usdToBrl(value: number): number {
  return Math.round(toCents(value) * EXCHANGE.usdToBrl) / 100;
}

/** "US$ 110,00 (≈ R$ 594,00)" quando brl=true e a moeda é USD. */
export function formatMoneyWithBrl(
  value: number | null,
  currency: string | null,
  brl: boolean,
): string {
  if (value === null || value === undefined) return NOT_INFORMED;
  const cur = currency ?? "USD";
  const base = formatMoney(value, cur);
  if (!brl || cur !== "USD") return base;
  return `${base} (≈ ${formatMoney(usdToBrl(value), "BRL")})`;
}

export const RATE_NOTE = `US$ 1,00 = R$ ${formatNumber(EXCHANGE.usdToBrl)}, taxa fixa de demonstração (não é cotação real), referência ${EXCHANGE.referenceDate}`;

/** aaaa-mm-dd -> dd/mm/aaaa */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const CATEGORY_LABELS: Record<string, string> = {
  INCOME: "Receitas",
  TRANSFER_IN: "Transferência recebida",
  TRANSFER_OUT: "Transferência enviada",
  LOAN_PAYMENTS: "Pagamento de fatura/empréstimo",
  FOOD_AND_DRINK: "Alimentação",
  TRANSPORTATION: "Transporte",
  TRAVEL: "Viagens",
  GENERAL_MERCHANDISE: "Compras",
  ENTERTAINMENT: "Lazer",
  MEDICAL: "Saúde",
  RENT_AND_UTILITIES: "Moradia e contas",
  PERSONAL_CARE: "Cuidados pessoais",
  GENERAL_SERVICES: "Serviços",
};

export function categoryLabel(primary: string | null | undefined): string {
  if (!primary) return NOT_INFORMED;
  return CATEGORY_LABELS[primary] ?? primary;
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  "credit card": "Cartão de crédito",
};

export function accountTypeLabel(subtype: string | null, type: string): string {
  if (subtype && ACCOUNT_TYPE_LABELS[subtype]) return ACCOUNT_TYPE_LABELS[subtype];
  if (type === "credit") return "Crédito";
  if (type === "depository") return "Depósito";
  return NOT_INFORMED;
}
