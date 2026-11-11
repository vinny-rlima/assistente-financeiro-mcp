import { REFERENCE_DATE } from "./data";
import { MONTHS_PT, formatDate } from "./format";
import type { PfcPrimary, Period } from "./types";

export type IntentKind =
  | "out_of_scope"
  | "greeting"
  | "help"
  | "accounts"
  | "balances"
  | "split"
  | "recent"
  | "transactions"
  | "category_spend"
  | "spend_by_category"
  | "summary"
  | "patterns"
  | "unknown";

export interface CategoryMatch {
  label: string;
  primary: PfcPrimary | null;
}

export interface ParsedQuestion {
  intent: IntentKind;
  period: Period | null;
  accountIds: string[] | null;
  accountLabel: string | null;
  category: CategoryMatch | null;
  wantsBrl: boolean;
  limit: number | null;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const refDate = () => new Date(`${REFERENCE_DATE}T00:00:00Z`);

function monthPeriod(year: number, monthIndex: number, suffix = ""): Period {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return {
    start: `${year}-${pad(monthIndex + 1)}-01`,
    end: `${year}-${pad(monthIndex + 1)}-${pad(last)}`,
    label: `${MONTHS_PT[monthIndex]} de ${year}${suffix}`,
  };
}

function lastNDays(n: number): Period {
  const end = refDate();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (n - 1));
  return {
    start: iso(start),
    end: iso(end),
    label: `últimos ${n} dias (${formatDate(iso(start))} a ${formatDate(iso(end))})`,
  };
}

const NUMBER_WORDS: Record<string, number> = {
  um: 1,
  dois: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  quinze: 15,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  sessenta: 60,
  noventa: 90,
};

function toNumber(token: string): number | null {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return NUMBER_WORDS[token] ?? null;
}

export function parsePeriod(q: string): Period | null {
  const ref = refDate();
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();

  if (/\b(mes passado|mes anterior|ultimo mes fechado)\b/.test(q)) {
    const d = new Date(Date.UTC(y, m - 1, 1));
    return monthPeriod(d.getUTCFullYear(), d.getUTCMonth(), " (mês passado)");
  }
  if (/\b(este|esse|neste|nesse|deste|desse) mes\b|\bmes atual\b/.test(q)) {
    return monthPeriod(y, m, " (mês atual)");
  }

  const days = q.match(/\bultim[oa]s? (\w+) dias?\b/);
  if (days) {
    const n = toNumber(days[1]);
    if (n && n > 0 && n <= 3650) return lastNDays(n);
  }
  if (/\bultima semana\b|\bultimos sete dias\b/.test(q)) return lastNDays(7);
  if (/\bultimo mes\b|\bultimos 30 dias\b/.test(q)) return lastNDays(30);
  if (/\bhoje\b/.test(q)) return { start: REFERENCE_DATE, end: REFERENCE_DATE, label: `hoje (${formatDate(REFERENCE_DATE)})` };
  if (/\bontem\b/.test(q)) {
    const d = new Date(ref);
    d.setUTCDate(d.getUTCDate() - 1);
    return { start: iso(d), end: iso(d), label: `ontem (${formatDate(iso(d))})` };
  }

  const months = MONTHS_PT.map((name) => normalize(name));
  for (let i = 0; i < months.length; i++) {
    const re = new RegExp(`\\b${months[i]}(?: de (\\d{4}))?\\b`);
    const hit = q.match(re);
    if (hit) {
      const year = hit[1] ? parseInt(hit[1], 10) : i > m ? y - 1 : y;
      return monthPeriod(year, i);
    }
  }
  return null;
}

export function parseAccounts(q: string): { ids: string[]; label: string } | null {
  if (/\b(business|empresarial|empresa|pj|9999)\b/.test(q))
    return { ids: ["acc_business_9999"], label: "Plaid Business Credit Card (final 9999)" };
  if (/\b(3333)\b|\bcredit card\b/.test(q))
    return { ids: ["acc_credit_3333"], label: "Plaid Credit Card (final 3333)" };
  if (/\b(poupanca|saving|savings|1111)\b/.test(q))
    return { ids: ["acc_saving_1111"], label: "Plaid Saving (final 1111)" };
  if (/\b(conta corrente|corrente|checking|0000)\b/.test(q))
    return { ids: ["acc_checking_0000"], label: "Plaid Checking (final 0000)" };
  if (/\bcart(ao|oes)\b/.test(q))
    return { ids: ["acc_credit_3333", "acc_business_9999"], label: "cartões de crédito" };
  return null;
}

const CATEGORY_RULES: { re: RegExp; label: string; primary: PfcPrimary | null }[] = [
  { re: /aliment|comida|restaurante|lanche|cafe\b|cafeteria|\bmercado\b|supermercado|refeic|delivery/, label: "Alimentação", primary: "FOOD_AND_DRINK" },
  { re: /transporte|uber|taxi|corrida|combustivel|gasolina/, label: "Transporte", primary: "TRANSPORTATION" },
  { re: /viage|passage|aere|\bvoo|hotel|hospedage/, label: "Viagens", primary: "TRAVEL" },
  { re: /lazer|entretenimento|diversao|escalada|cinema|show/, label: "Lazer", primary: "ENTERTAINMENT" },
  { re: /\bcompras\b|mercadoria|\bloja|eletronic|bicicleta/, label: "Compras", primary: "GENERAL_MERCHANDISE" },
  { re: /saude|farmacia|medic|hospital|consulta/, label: "Saúde", primary: "MEDICAL" },
  { re: /aluguel|moradia|\bluz\b|\bagua\b|energia|internet|condominio/, label: "Moradia e contas", primary: "RENT_AND_UTILITIES" },
  { re: /beleza|cabelo|cuidados pessoais|academia/, label: "Cuidados pessoais", primary: "PERSONAL_CARE" },
  { re: /educac|curso|escola|faculdade/, label: "Educação", primary: null },
  { re: /investiment/, label: "Investimentos", primary: null },
  { re: /assinatura|streaming|netflix|spotify/, label: "Assinaturas", primary: null },
];

export function parseCategory(q: string): CategoryMatch | null {
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(q)) return { label: rule.label, primary: rule.primary };
  }
  return null;
}

const OUT_OF_SCOPE = [
  /\bpix\b/,
  /\b(pagar|pague|quitar|quite)\b/,
  /\b(transferir|transfira|transfere|mandar dinheiro|enviar dinheiro|envie dinheiro)\b/,
  /\b(faca|fazer|faz|realize|realizar|agende|agendar|programe)\b.*\b(transferencia|pagamento|ted|doc|boleto|deposito)\b/,
  /\bboleto\b/,
  /\b(emprestimo|financiamento|credito pessoal|consignado)\b/,
  /\b(pedir|solicitar|contratar|liberar)\b.*\b(credito|cartao|limite)\b/,
  /\b(aumentar|aumente|reduzir|reduza|alterar|altere)\b.*\blimite\b/,
  /\b(antecipar|antecipe|parcelar|parcele)\b/,
  /\b(investir|invista|aplicar|aplique|resgatar|resgate)\b/,
  /\b(cancelar|cancele|bloquear|bloqueie|desbloquear|abrir conta|encerrar|excluir|apagar|editar|alterar)\b/,
];

export function parseQuestion(raw: string): ParsedQuestion {
  const q = normalize(raw);
  const period = parsePeriod(q);
  const acc = parseAccounts(q);
  const category = parseCategory(q);
  const wantsBrl = /\breais\b|\bem real\b|r\$|\bbrl\b|\bconvert/.test(q);
  const limitMatch = q.match(/\b(\d+|um|dois|tres|quatro|cinco|seis|sete|oito|nove|dez) (ultim|transac|lancament)/);
  const limit = limitMatch ? toNumber(limitMatch[1]) : null;

  const base = {
    period,
    accountIds: acc?.ids ?? null,
    accountLabel: acc?.label ?? null,
    category,
    wantsBrl,
    limit,
  };
  const make = (intent: IntentKind): ParsedQuestion => ({ intent, ...base });

  if (OUT_OF_SCOPE.some((re) => re.test(q))) return make("out_of_scope");
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|hey|opa)\b/.test(q) && q.length < 25)
    return make("greeting");
  if (/o que (voce )?(pode|sabe|consegue)|\bajuda\b|como funciona|o que eu posso/.test(q))
    return make("help");
  if (/padr|habito|comportamento|onde (eu )?mais gasto|perfil de gasto|tendencia/.test(q))
    return make("patterns");

  const txWord = /transac|lancament|movimentac|compras|gastos|extrato/.test(q);
  if (!period && /\b(ultim|recent|mais nov)/.test(q) && txWord) return make("recent");
  if (!period && /\brecentes?\b/.test(q)) return make("recent");

  const spendWord = /gast|despes|consum|quanto (eu )?(paguei|usei)/.test(q);
  if (category && (spendWord || /categoria|quanto/.test(q))) return make("category_spend");
  if (/categori/.test(q) || (spendWord && /quanto|total|meus gastos|minhas despesas|por onde/.test(q)))
    return make("spend_by_category");

  if (/resum|balanco|fluxo|entradas|saidas|entrou|saiu/.test(q) || (/movimentac/.test(q) && !/ultim/.test(q)))
    return make("summary");

  if (/divid|\bdevo\b|limite|separ|patrimonio/.test(q)) return make("split");
  if (/saldo/.test(q)) return make("balances");
  if (/disponivel|quanto (eu )?tenho|dinheiro/.test(q)) return make("split");

  if (txWord || /\bgastei\b|\bgastos?\b/.test(q) || (period && !category)) return make("transactions");
  if (/\bconta|moeda|tipo/.test(q)) return make("accounts");
  if (wantsBrl) return make("balances");
  if (acc) return make("balances");
  return make("unknown");
}
