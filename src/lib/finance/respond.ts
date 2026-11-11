import {
  dataRange,
  filterTransactions,
  getAccount,
  getAccounts,
  isConsumption,
  moneySplit,
  mostRecent,
  spendingByCategory,
  spendingByMerchant,
  spendingByMonth,
  summarize,
} from "./calc";
import { REFERENCE_DATE } from "./data";
import {
  MONTHS_PT,
  NOT_INFORMED,
  accountTypeLabel,
  categoryLabel,
  formatDate,
  formatMoneyWithBrl,
  sum,
} from "./format";
import { parseQuestion, type ParsedQuestion } from "./intent";
import type { AssistantResponse, Block, Cell, TableColumn } from "./response-types";
import type { Account, Period, Transaction } from "./types";

export const SUGGESTIONS = [
  "Mostrar minhas contas",
  "Consultar meus saldos",
  "Ver minhas últimas transações",
  "Quanto gastei com alimentação?",
  "Resumir minhas movimentações",
  "Quais são meus padrões de gasto?",
  "Saldos em reais",
];

const REF_LABEL = `posição em ${formatDate(REFERENCE_DATE)}`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const txCount = (n: number) =>
  n === 0 ? "nenhuma transação encontrada" : `${plural(n, "transação analisada", "transações analisadas")}`;
const accCount = (n: number) => plural(n, "conta analisada", "contas analisadas");

function periodText(p: Period): string {
  return `${p.label} — ${formatDate(p.start)} a ${formatDate(p.end)}`.replace(
    /\((\d{2}\/\d{2}\/\d{4}) a (\d{2}\/\d{2}\/\d{4})\) — \1 a \2$/,
    "($1 a $2)",
  );
}

function money(value: number | null, currency: string | null = "USD", brl = false): string {
  return formatMoneyWithBrl(value, currency, brl);
}

function accountShort(id: string): string {
  const a = getAccount(id);
  if (!a) return NOT_INFORMED;
  return `${a.name}${a.mask ? ` ••${a.mask}` : ""}`;
}

function scopeAccounts(p: ParsedQuestion): Account[] {
  const all = getAccounts();
  return p.accountIds ? all.filter((a) => p.accountIds!.includes(a.account_id)) : all;
}

const TX_COLUMNS: TableColumn[] = [
  { key: "date", label: "Data" },
  { key: "merchant", label: "Estabelecimento", primary: true },
  { key: "account", label: "Conta" },
  { key: "category", label: "Categoria" },
  { key: "status", label: "Status" },
  { key: "amount", label: "Valor", align: "right" },
];

function txRow(t: Transaction): Record<string, Cell> {
  const consumption = isConsumption(t);
  const cat = categoryLabel(t.personal_finance_category?.primary);
  return {
    date: formatDate(t.date),
    merchant: t.merchant_name ?? `${NOT_INFORMED} · ${t.name}`,
    account: accountShort(t.account_id),
    category: t.amount > 0 && !consumption ? `${cat} (não é consumo)` : cat,
    status: t.pending
      ? { badge: "Pendente", tone: "muted" }
      : { badge: "Confirmada", tone: "neutral" },
    amount: {
      money: Math.abs(t.amount),
      currency: t.iso_currency_code,
      direction: t.amount > 0 ? "out" : "in",
      tone: t.amount > 0 ? "out" : "in",
    },
  };
}

function txTable(txs: Transaction[], title?: string): Block {
  return {
    type: "table",
    title,
    columns: TX_COLUMNS,
    rows: txs.map(txRow),
    footnote: "Saída (−) e entrada (+) seguem a convenção da Plaid: valor positivo é saída.",
  };
}

function pendingNote(pending: Transaction[], brl: boolean): Block | null {
  if (!pending.length) return null;
  const total = sum(pending.filter((t) => t.amount > 0).map((t) => t.amount));
  return {
    type: "text",
    tone: "notice",
    text: `${plural(pending.length, "transação pendente", "transações pendentes")} (${money(total, "USD", brl)}) ficou fora dos totais confirmados.`,
  };
}

const compact = (blocks: (Block | null)[]): Block[] => blocks.filter((b): b is Block => !!b);

function scopeLabel(p: ParsedQuestion): string {
  return p.accountLabel ? ` · conta: ${p.accountLabel}` : "";
}

function noData(p: ParsedQuestion, what: string, period: Period, brl: boolean): AssistantResponse {
  const range = dataRange();
  return {
    brl,
    blocks: [
      {
        type: "text",
        text: `Não encontrei ${what} em ${period.label}${p.accountLabel ? ` na ${p.accountLabel}` : ""}. Não vou estimar valores sem dados. Os registros disponíveis vão de ${formatDate(range.start)} a ${formatDate(range.end)}.`,
      },
    ],
    meta: { period: periodText(period) + scopeLabel(p), records: txCount(0) },
    suggestions: ["Ver minhas últimas transações", "Resumir minhas movimentações"],
  };
}

// ---------- intents ----------

function accountsAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const accounts = scopeAccounts(p);
  const currencies = [...new Set(accounts.map((a) => a.balances.iso_currency_code ?? NOT_INFORMED))];
  const credit = accounts.filter((a) => a.type === "credit").length;
  return {
    brl,
    blocks: [
      {
        type: "text",
        text: `Você tem ${plural(accounts.length, "conta", "contas")}: ${plural(accounts.length - credit, "de depósito", "de depósito")} e ${plural(credit, "cartão de crédito", "cartões de crédito")}. Moeda: ${currencies.join(", ")} (dólar americano).`,
      },
      {
        type: "table",
        columns: [
          { key: "name", label: "Conta", primary: true },
          { key: "type", label: "Tipo" },
          { key: "mask", label: "Final" },
          { key: "currency", label: "Moeda" },
          { key: "official", label: "Nome oficial" },
        ],
        rows: accounts.map((a) => ({
          name: a.name,
          type: accountTypeLabel(a.subtype, a.type),
          mask: a.mask ?? NOT_INFORMED,
          currency: a.balances.iso_currency_code ?? NOT_INFORMED,
          official: a.official_name ?? NOT_INFORMED,
        })),
      },
    ],
    meta: { period: REF_LABEL, records: accCount(accounts.length) },
    suggestions: ["Consultar meus saldos", "Separar disponível, dívidas e limites"],
  };
}

function accountCards(accounts: Account[]): Block {
  return {
    type: "accounts",
    items: accounts.map((a) => ({
      name: a.name,
      typeLabel: accountTypeLabel(a.subtype, a.type),
      mask: a.mask ?? NOT_INFORMED,
      isCredit: a.type === "credit",
      currency: a.balances.iso_currency_code,
      current: a.balances.current,
      available: a.balances.available,
      limit: a.balances.limit,
    })),
  };
}

function balancesAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const accounts = scopeAccounts(p);
  const hasCredit = accounts.some((a) => a.type === "credit");
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: `Aqui estão o saldo atual e o disponível de ${accounts.length === 1 ? "sua conta" : `suas ${accounts.length} contas`}.`,
      },
      accountCards(accounts),
      hasCredit
        ? {
            type: "text",
            tone: "notice",
            text: "Nos cartões de crédito, o saldo atual é dívida (o que você deve), não dinheiro disponível.",
          }
        : null,
    ]),
    meta: { period: REF_LABEL + scopeLabel(p), records: accCount(accounts.length) },
    suggestions: ["Separar disponível, dívidas e limites", "Saldos em reais"],
  };
}

function splitAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const accounts = scopeAccounts(p);
  const s = moneySplit(accounts);
  const missing = (n: number) => (n ? `${plural(n, "conta", "contas")} sem valor: ${NOT_INFORMED}` : undefined);
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: "Separei o que é seu, o que você deve e o crédito que ainda pode usar. Limite de cartão não é dinheiro seu.",
      },
      {
        type: "stats",
        items: [
          ...(s.deposit.length
            ? [
                {
                  label: "Dinheiro disponível",
                  cell: { money: s.availableMoney, tone: "in" as const },
                  hint: `Conta corrente e poupança. Saldo atual somado: ${money(s.currentDeposit, "USD", brl)}`,
                  tone: "in" as const,
                },
              ]
            : []),
          ...(s.credit.length
            ? [
                {
                  label: "Dívidas nos cartões",
                  cell: { money: s.debt, tone: "debt" as const },
                  hint: missing(s.debtMissing) ?? "Saldo atual dos cartões",
                  tone: "debt" as const,
                },
                {
                  label: "Crédito ainda disponível",
                  cell: { money: s.creditAvailable, tone: "neutral" as const },
                  hint: missing(s.creditAvailableMissing),
                },
                {
                  label: "Limites informados",
                  cell: { money: s.creditLimit, tone: "neutral" as const },
                  hint: missing(s.creditLimitMissing),
                },
              ]
            : []),
        ],
      },
      {
        type: "table",
        columns: [
          { key: "name", label: "Conta", primary: true },
          { key: "role", label: "Classificação" },
          { key: "current", label: "Saldo atual", align: "right" },
          { key: "available", label: "Disponível", align: "right" },
          { key: "limit", label: "Limite", align: "right" },
        ],
        rows: accounts.map((a) => ({
          name: `${a.name} ••${a.mask ?? "?"}`,
          role:
            a.type === "credit"
              ? { badge: "Dívida", tone: "debt" }
              : { badge: "Dinheiro seu", tone: "in" },
          current: { money: a.balances.current, currency: a.balances.iso_currency_code, tone: a.type === "credit" ? "debt" : "neutral" },
          available: { money: a.balances.available, currency: a.balances.iso_currency_code },
          limit: a.type === "credit" ? { money: a.balances.limit, currency: a.balances.iso_currency_code } : "–",
        })),
      },
    ]),
    meta: { period: REF_LABEL + scopeLabel(p), records: accCount(accounts.length) },
    suggestions: ["Saldos em reais", "Resumir minhas movimentações"],
  };
}

function recentAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const n = Math.min(Math.max(p.limit ?? 5, 1), 50);
  const pool = filterTransactions({ accountIds: p.accountIds ?? undefined });
  const range = dataRange();
  if (!pool.length) return noData(p, "transações", range, brl);
  const shown = mostRecent(n, p.accountIds ?? undefined);
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: `Estas são as ${plural(shown.length, "transação mais recente", "transações mais recentes")}${p.accountLabel ? ` da ${p.accountLabel}` : ""}.`,
      },
      txTable(shown),
      pendingNote(shown.filter((t) => t.pending), brl),
    ]),
    meta: {
      period: `${formatDate(shown[shown.length - 1].date)} a ${formatDate(shown[0].date)}${scopeLabel(p)}`,
      records: `${txCount(pool.length)}, ${shown.length} exibidas`,
    },
    suggestions: ["Resumir minhas movimentações", "Transações do mês passado"],
  };
}

function transactionsAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const period = p.period ?? dataRange();
  const txs = filterTransactions({ period, accountIds: p.accountIds ?? undefined });
  if (!txs.length) return noData(p, "transações", period, brl);
  const s = summarize(txs);
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: `Encontrei ${plural(txs.length, "transação", "transações")} em ${period.label}${p.accountLabel ? ` na ${p.accountLabel}` : ""}.`,
      },
      {
        type: "stats",
        items: [
          { label: "Entradas confirmadas", cell: { money: s.inflow, tone: "in" }, tone: "in" },
          { label: "Saídas confirmadas", cell: { money: s.outflow, tone: "out" }, tone: "out" },
          { label: "Consumo", cell: { money: s.consumption }, hint: "Sem transferências e faturas" },
        ],
      },
      txTable(txs),
      pendingNote(s.pending, brl),
    ]),
    meta: { period: periodText(period) + scopeLabel(p), records: txCount(txs.length) },
    suggestions: ["Quanto gastei por categoria?", "Quais são meus padrões de gasto?"],
  };
}

function categorySpendAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const period = p.period ?? dataRange();
  const cat = p.category!;
  const scoped = filterTransactions({ period, accountIds: p.accountIds ?? undefined });
  if (!cat.primary) return noData(p, `gastos com ${cat.label.toLowerCase()}`, period, brl);
  const txs = scoped.filter((t) => t.personal_finance_category?.primary === cat.primary);
  if (!txs.length) return noData(p, `gastos com ${cat.label.toLowerCase()}`, period, brl);
  const s = summarize(txs);
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: `Você gastou ${money(s.consumption, "USD", brl)} com ${cat.label.toLowerCase()} em ${period.label}, em ${plural(s.confirmed.filter(isConsumption).length, "compra confirmada", "compras confirmadas")}.`,
      },
      {
        type: "stats",
        items: compact2([
          { label: `${cat.label} · confirmado`, cell: { money: s.consumption, tone: "out" }, tone: "out" },
          s.pending.length
            ? { label: "Pendente (fora do total)", cell: { money: s.pendingOutflow, tone: "muted" }, tone: "muted" }
            : null,
          {
            label: "Participação no consumo",
            cell: pct(s.consumption, summarize(scoped).consumption),
            hint: `Consumo total do período: ${money(summarize(scoped).consumption, "USD", brl)}`,
          },
        ]),
      },
      txTable(txs),
      pendingNote(s.pending, brl),
    ]),
    meta: {
      period: periodText(period) + scopeLabel(p),
      records: `${txCount(scoped.length)}, ${txs.length} de ${cat.label.toLowerCase()}`,
    },
    suggestions: ["Quanto gastei por categoria?", "Quais são meus padrões de gasto?"],
  };
}

function compact2<T>(xs: (T | null)[]): T[] {
  return xs.filter((x): x is T => x !== null);
}

function pct(part: number, total: number): string {
  if (!total) return NOT_INFORMED;
  return `${((part / total) * 100).toFixed(1).replace(".", ",")}%`;
}

function spendByCategoryAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const period = p.period ?? dataRange();
  const txs = filterTransactions({ period, accountIds: p.accountIds ?? undefined });
  const groups = spendingByCategory(txs);
  if (!groups.length) return noData(p, "gastos de consumo", period, brl);
  const s = summarize(txs);
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: `Seu consumo confirmado em ${period.label} foi de ${money(s.consumption, "USD", brl)}. Transferências e pagamentos de fatura (${money(s.transfersAndPayments, "USD", brl)}) não entram como consumo.`,
      },
      {
        type: "bars",
        title: "Consumo por categoria",
        currency: "USD",
        items: groups.map((g) => ({
          label: categoryLabel(g.key),
          amount: g.total,
          hint: `${plural(g.count, "compra", "compras")} · ${pct(g.total, s.consumption)}`,
        })),
      },
      pendingNote(s.pending, brl),
    ]),
    meta: { period: periodText(period) + scopeLabel(p), records: txCount(txs.length) },
    suggestions: ["Quanto gastei com alimentação?", "Quais são meus padrões de gasto?"],
  };
}

function summaryAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const period = p.period ?? dataRange();
  const txs = filterTransactions({ period, accountIds: p.accountIds ?? undefined });
  if (!txs.length) return noData(p, "movimentações", period, brl);
  const s = summarize(txs);
  const accounts = scopeAccounts(p).filter((a) => txs.some((t) => t.account_id === a.account_id));
  const top = spendingByCategory(txs)[0];
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: `Em ${period.label}: entraram ${money(s.inflow, "USD", brl)} e saíram ${money(s.outflow, "USD", brl)} (confirmados). Desse total de saídas, ${money(s.consumption, "USD", brl)} foi consumo${top ? `, com destaque para ${categoryLabel(top.key).toLowerCase()} (${money(top.total, "USD", brl)})` : ""}.`,
      },
      {
        type: "stats",
        items: [
          { label: "Entradas", cell: { money: s.inflow, tone: "in" }, tone: "in" },
          { label: "Saídas", cell: { money: s.outflow, tone: "out" }, tone: "out" },
          { label: "Consumo", cell: { money: s.consumption } },
          {
            label: "Transferências e faturas",
            cell: { money: s.transfersAndPayments },
            hint: "Não é consumo",
          },
        ],
      },
      {
        type: "table",
        title: "Por conta",
        columns: [
          { key: "account", label: "Conta", primary: true },
          { key: "count", label: "Registros", align: "right" },
          { key: "in", label: "Entradas", align: "right" },
          { key: "out", label: "Saídas", align: "right" },
        ],
        rows: accounts.map((a) => {
          const sub = summarize(txs.filter((t) => t.account_id === a.account_id));
          return {
            account: accountShort(a.account_id),
            count: String(sub.total),
            in: { money: sub.inflow, tone: "in" },
            out: { money: sub.outflow, tone: "out" },
          };
        }),
      },
      pendingNote(s.pending, brl),
    ]),
    meta: { period: periodText(period) + scopeLabel(p), records: txCount(txs.length) },
    suggestions: ["Quais são meus padrões de gasto?", "Quanto gastei por categoria?"],
  };
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const name = MONTHS_PT[parseInt(m, 10) - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}/${y}`;
}

function patternsAnswer(p: ParsedQuestion, brl: boolean): AssistantResponse {
  const period = p.period ?? dataRange();
  const txs = filterTransactions({ period, accountIds: p.accountIds ?? undefined });
  const byCat = spendingByCategory(txs);
  if (!byCat.length) return noData(p, "gastos de consumo", period, brl);
  const s = summarize(txs);
  const byMerchant = spendingByMerchant(txs).sort((a, b) => b.count - a.count || b.total - a.total);
  const byMonth = spendingByMonth(txs);
  const recurring = byMerchant.filter((m) => m.count > 1);
  return {
    brl,
    blocks: compact([
      {
        type: "text",
        text: `Analisei seu consumo confirmado (${money(s.consumption, "USD", brl)}). Três padrões aparecem: onde vai a maior parte do dinheiro, quais lugares se repetem e como o gasto variou mês a mês.`,
      },
      {
        type: "table",
        title: "1. Para onde vai o dinheiro (categorias)",
        columns: [
          { key: "cat", label: "Categoria", primary: true },
          { key: "count", label: "Compras", align: "right" },
          { key: "share", label: "% do consumo", align: "right" },
          { key: "total", label: "Total", align: "right" },
        ],
        rows: byCat.map((g) => ({
          cat: categoryLabel(g.key),
          count: String(g.count),
          share: pct(g.total, s.consumption),
          total: { money: g.total, tone: "out" },
        })),
      },
      {
        type: "table",
        title: "2. Lugares que se repetem",
        columns: [
          { key: "merchant", label: "Estabelecimento", primary: true },
          { key: "count", label: "Vezes", align: "right" },
          { key: "avg", label: "Ticket médio", align: "right" },
          { key: "total", label: "Total", align: "right" },
        ],
        rows: (recurring.length ? recurring : byMerchant.slice(0, 5)).map((g) => ({
          merchant: g.key,
          count: String(g.count),
          avg: { money: Math.round((g.total / g.count) * 100) / 100 },
          total: { money: g.total, tone: "out" },
        })),
        footnote: recurring.length ? undefined : "Nenhum estabelecimento se repetiu; mostrando os maiores.",
      },
      {
        type: "table",
        title: "3. Consumo mês a mês",
        columns: [
          { key: "month", label: "Mês", primary: true },
          { key: "count", label: "Compras", align: "right" },
          { key: "total", label: "Total", align: "right" },
          { key: "diff", label: "Variação", align: "right" },
        ],
        rows: byMonth.map((g, i) => {
          const prev = byMonth[i - 1];
          return {
            month: monthLabel(g.key),
            count: String(g.count),
            total: { money: g.total, tone: "out" },
            diff: prev
              ? `${g.total >= prev.total ? "+" : "−"}${pct(Math.abs(g.total - prev.total), prev.total)}`
              : "–",
          };
        }),
        footnote: "Meses parciais: os dados começam em 12/09/2026 e terminam em 29/10/2026.",
      },
      pendingNote(s.pending, brl),
    ]),
    meta: { period: periodText(period) + scopeLabel(p), records: txCount(txs.length) },
    suggestions: ["Quanto gastei com alimentação?", "Resumir minhas movimentações"],
  };
}

function outOfScopeAnswer(brl: boolean): AssistantResponse {
  return {
    brl,
    blocks: [
      {
        type: "text",
        tone: "refusal",
        text: "Desculpe, não consigo fazer pagamentos, Pix, transferências, pedidos de crédito ou qualquer alteração na sua conta. Esta demonstração apenas consulta dados fictícios, sem executar operações. Posso ajudar a entender seus saldos e gastos.",
      },
    ],
    meta: { period: "não se aplica", records: "nenhum registro analisado" },
    suggestions: ["Consultar meus saldos", "Ver minhas últimas transações"],
  };
}

function helpAnswer(brl: boolean, greeting: boolean): AssistantResponse {
  return {
    brl,
    blocks: [
      {
        type: "text",
        text: `${greeting ? "Olá! " : ""}Posso mostrar suas contas e saldos, separar dinheiro disponível de dívidas, listar transações por período ou conta, somar gastos por categoria, resumir movimentações e apontar padrões de gasto. Também mostro valores em reais com uma taxa fixa de demonstração.`,
      },
    ],
    meta: { period: "não se aplica", records: "nenhum registro analisado" },
    suggestions: SUGGESTIONS.slice(0, 4),
  };
}

function unknownAnswer(brl: boolean): AssistantResponse {
  return {
    brl,
    blocks: [
      {
        type: "text",
        text: "Não encontrei essa informação nos dados disponíveis e prefiro não inventar números. Tente perguntar sobre contas, saldos, transações, gastos por categoria ou padrões de gasto.",
      },
    ],
    meta: { period: "não se aplica", records: "nenhum registro analisado" },
    suggestions: SUGGESTIONS.slice(0, 4),
  };
}

export interface AnswerOptions {
  /** Caixa "Valores também em R$" marcada */
  brlToggle: boolean;
}

export function answer(question: string, opts: AnswerOptions): AssistantResponse {
  const p = parseQuestion(question);
  const brl = opts.brlToggle || p.wantsBrl;
  switch (p.intent) {
    case "out_of_scope":
      return outOfScopeAnswer(brl);
    case "greeting":
      return helpAnswer(brl, true);
    case "help":
      return helpAnswer(brl, false);
    case "accounts":
      return accountsAnswer(p, brl);
    case "balances":
      return balancesAnswer(p, brl);
    case "split":
      return splitAnswer(p, brl);
    case "recent":
      return recentAnswer(p, brl);
    case "transactions":
      return transactionsAnswer(p, brl);
    case "category_spend":
      return categorySpendAnswer(p, brl);
    case "spend_by_category":
      return spendByCategoryAnswer(p, brl);
    case "summary":
      return summaryAnswer(p, brl);
    case "patterns":
      return patternsAnswer(p, brl);
    default:
      return unknownAnswer(brl);
  }
}
