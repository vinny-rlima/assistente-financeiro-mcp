import { ACCOUNTS, REFERENCE_DATE, TRANSACTIONS } from "./data";
import { sum } from "./format";
import type { Account, PfcPrimary, Period, Transaction } from "./types";

/** Categorias que movimentam dinheiro mas NÃO são consumo. */
export const NON_CONSUMPTION: PfcPrimary[] = [
  "INCOME",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "LOAN_PAYMENTS",
];

export const isOutflow = (t: Transaction) => t.amount > 0; // Plaid: positivo = saída
export const isInflow = (t: Transaction) => t.amount < 0; // Plaid: negativo = entrada

export function isConsumption(t: Transaction): boolean {
  const cat = t.personal_finance_category?.primary;
  return isOutflow(t) && !!cat && !NON_CONSUMPTION.includes(cat);
}

export function getAccounts(): Account[] {
  return ACCOUNTS;
}

export function getAccount(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.account_id === id);
}

export function dataRange(): Period {
  const dates = TRANSACTIONS.map((t) => t.date).sort();
  return { start: dates[0], end: dates[dates.length - 1], label: "todo o período disponível" };
}

export interface TxFilter {
  period?: Period;
  accountIds?: string[];
  category?: PfcPrimary;
}

export function filterTransactions(filter: TxFilter = {}): Transaction[] {
  return TRANSACTIONS.filter((t) => {
    if (filter.period && (t.date < filter.period.start || t.date > filter.period.end)) return false;
    if (filter.accountIds && !filter.accountIds.includes(t.account_id)) return false;
    if (filter.category && t.personal_finance_category?.primary !== filter.category) return false;
    return true;
  }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function mostRecent(n: number, accountIds?: string[]): Transaction[] {
  return filterTransactions({ accountIds }).slice(0, n);
}

/** Dinheiro disponível × dívidas × limites. Cartão: saldo atual = DÍVIDA. */
export function moneySplit(accounts: Account[] = ACCOUNTS) {
  const deposit = accounts.filter((a) => a.type === "depository");
  const credit = accounts.filter((a) => a.type === "credit");
  return {
    deposit,
    credit,
    availableMoney: sum(deposit.map((a) => a.balances.available ?? 0)),
    currentDeposit: sum(deposit.map((a) => a.balances.current ?? 0)),
    depositMissing: deposit.filter((a) => a.balances.available === null).length,
    debt: sum(credit.map((a) => a.balances.current ?? 0)),
    debtMissing: credit.filter((a) => a.balances.current === null).length,
    creditAvailable: sum(credit.map((a) => a.balances.available ?? 0)),
    creditAvailableMissing: credit.filter((a) => a.balances.available === null).length,
    creditLimit: sum(credit.map((a) => a.balances.limit ?? 0)),
    creditLimitMissing: credit.filter((a) => a.balances.limit === null).length,
  };
}

export interface MovementSummary {
  total: number;
  confirmed: Transaction[];
  pending: Transaction[];
  inflow: number;
  outflow: number;
  consumption: number;
  transfersAndPayments: number;
  pendingOutflow: number;
}

/** Totais só com confirmadas; pendentes ficam à parte. */
export function summarize(txs: Transaction[]): MovementSummary {
  const confirmed = txs.filter((t) => !t.pending);
  const pending = txs.filter((t) => t.pending);
  return {
    total: txs.length,
    confirmed,
    pending,
    inflow: sum(confirmed.filter(isInflow).map((t) => -t.amount)),
    outflow: sum(confirmed.filter(isOutflow).map((t) => t.amount)),
    consumption: sum(confirmed.filter(isConsumption).map((t) => t.amount)),
    transfersAndPayments: sum(
      confirmed.filter((t) => isOutflow(t) && !isConsumption(t)).map((t) => t.amount),
    ),
    pendingOutflow: sum(pending.filter(isOutflow).map((t) => t.amount)),
  };
}

export interface GroupRow {
  key: string;
  total: number;
  count: number;
}

function groupBy(txs: Transaction[], keyOf: (t: Transaction) => string): GroupRow[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const k = keyOf(t);
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map.entries()]
    .map(([key, list]) => ({ key, total: sum(list.map((t) => t.amount)), count: list.length }))
    .sort((a, b) => b.total - a.total);
}

/** Consumo confirmado agrupado por categoria. */
export function spendingByCategory(txs: Transaction[]): GroupRow[] {
  return groupBy(
    txs.filter((t) => !t.pending && isConsumption(t)),
    (t) => t.personal_finance_category!.primary,
  );
}

export function spendingByMerchant(txs: Transaction[]): GroupRow[] {
  return groupBy(
    txs.filter((t) => !t.pending && isConsumption(t)),
    (t) => t.merchant_name ?? t.name,
  );
}

export function spendingByMonth(txs: Transaction[]): GroupRow[] {
  return groupBy(
    txs.filter((t) => !t.pending && isConsumption(t)),
    (t) => t.date.slice(0, 7),
  ).sort((a, b) => (a.key < b.key ? -1 : 1));
}

export function spendingByAccount(txs: Transaction[]): GroupRow[] {
  return groupBy(
    txs.filter((t) => !t.pending && isConsumption(t)),
    (t) => t.account_id,
  );
}

export { REFERENCE_DATE };
