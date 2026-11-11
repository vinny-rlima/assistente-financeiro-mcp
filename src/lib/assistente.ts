/**
 * Motor de respostas da Etapa 1.
 *
 * Caminho de uma pergunta: texto → intenção (regras simples em português) →
 * cálculo sobre os dados locais no formato Plaid → blocos (texto, cartões,
 * tabela, barras) → a interface desenha.
 *
 * Na Etapa 2, só a fonte muda: `accounts` e `transactions` passam a vir de um
 * backend que chama `POST /accounts/get` e `POST /transactions/get` na
 * Plaid Sandbox. As regras de cálculo continuam as mesmas.
 */
import {
  accounts as ALL_ACCOUNTS,
  transactions as ALL_TX,
  REFERENCE_DATE,
  type Account,
  type CategoryPrimary,
  type Transaction,
} from "../data/sandbox";
import { formatDate, money, normalize, notaCambio } from "./format";

export type Tone = "ok" | "debt" | "neutral";

export type Block =
  | { kind: "text"; text: string }
  | { kind: "note"; text: string }
  | {
      kind: "cards";
      items: { title: string; subtitle?: string; tag?: string; tone?: Tone; lines: [string, string][] }[];
    }
  | { kind: "table"; title?: string; columns: string[]; rows: string[][]; numeric?: number[] }
  | { kind: "bars"; title: string; items: { label: string; value: number; display: string }[] };

export interface Answer {
  intent: string;
  blocks: Block[];
}

export interface Fonte {
  accounts: Account[];
  transactions: Transaction[];
  referenceDate: string;
}

const FONTE_LOCAL: Fonte = { accounts: ALL_ACCOUNTS, transactions: ALL_TX, referenceDate: REFERENCE_DATE };

export const CATEGORIA_PT: Record<CategoryPrimary, string> = {
  INCOME: "Receitas",
  TRANSFER_IN: "Transferência recebida",
  TRANSFER_OUT: "Transferência enviada",
  LOAN_PAYMENTS: "Pagamento de fatura",
  FOOD_AND_DRINK: "Alimentação",
  TRANSPORTATION: "Transporte",
  TRAVEL: "Viagem",
  GENERAL_MERCHANDISE: "Compras",
  ENTERTAINMENT: "Lazer",
};

const TIPO_PT: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  "credit card": "Cartão de crédito",
};

const NAO_CONSUMO: CategoryPrimary[] = ["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"];

/** Consumo = saída (valor positivo) que não é transferência nem pagamento de fatura. */
export const isConsumo = (t: Transaction) =>
  t.amount > 0 && !NAO_CONSUMO.includes(t.personal_finance_category.primary);
export const isEntrada = (t: Transaction) =>
  t.amount < 0 && !NAO_CONSUMO.includes(t.personal_finance_category.primary);
export const isMovInterna = (t: Transaction) => NAO_CONSUMO.includes(t.personal_finance_category.primary);

const soma = (xs: Transaction[]) => Math.round(xs.reduce((s, t) => s + t.amount, 0) * 100) / 100;

// ---------------------------------------------------------------- período

const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface Periodo {
  inicio: string;
  fim: string;
  rotulo: string;
  explicito: boolean;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ultimoDia = (ano: number, mes1: number) => new Date(Date.UTC(ano, mes1, 0)).getUTCDate();

function mesPeriodo(ano: number, mes1: number): Periodo {
  const mm = String(mes1).padStart(2, "0");
  return {
    inicio: `${ano}-${mm}-01`,
    fim: `${ano}-${mm}-${String(ultimoDia(ano, mes1)).padStart(2, "0")}`,
    rotulo: `${MESES[mes1 - 1].replace("marco", "março")} de ${ano}`,
    explicito: true,
  };
}

export function lerPeriodo(q: string, fonte: Fonte): Periodo {
  const ref = new Date(`${fonte.referenceDate}T00:00:00Z`);
  const refAno = ref.getUTCFullYear();
  const refMes = ref.getUTCMonth() + 1;

  const dias = q.match(/ultim[oa]s?\s+(\d{1,3})\s+dias?/);
  if (dias) {
    const n = Number(dias[1]);
    const ini = new Date(ref);
    ini.setUTCDate(ini.getUTCDate() - (n - 1));
    return { inicio: iso(ini), fim: fonte.referenceDate, rotulo: `últimos ${n} dias`, explicito: true };
  }
  if (/\b(ultima|essa|esta|nesta|nessa)\s+semana\b/.test(q)) {
    const ini = new Date(ref);
    ini.setUTCDate(ini.getUTCDate() - 6);
    return { inicio: iso(ini), fim: fonte.referenceDate, rotulo: "últimos 7 dias", explicito: true };
  }
  if (/\bmes passado\b|\bultimo mes\b|\bmes anterior\b/.test(q)) {
    return refMes === 1 ? mesPeriodo(refAno - 1, 12) : mesPeriodo(refAno, refMes - 1);
  }
  if (/\b(este|esse|neste|nesse)\s+mes\b|\bmes atual\b/.test(q)) return mesPeriodo(refAno, refMes);

  for (let i = 0; i < 12; i++) {
    if (new RegExp(`\\b${MESES[i]}\\b`).test(q)) {
      const anoMatch = q.match(/\b(20\d{2})\b/);
      return mesPeriodo(anoMatch ? Number(anoMatch[1]) : refAno, i + 1);
    }
  }

  const datas = fonte.transactions.map((t) => t.date).sort();
  return {
    inicio: datas[0] ?? fonte.referenceDate,
    fim: datas[datas.length - 1] ?? fonte.referenceDate,
    rotulo: "todo o período disponível",
    explicito: false,
  };
}

// ---------------------------------------------------------------- contas

export function lerContas(q: string, fonte: Fonte): { ids: string[] | null; rotulo: string } {
  const by = (pred: (a: Account) => boolean, rotulo: string) => ({
    ids: fonte.accounts.filter(pred).map((a) => a.account_id),
    rotulo,
  });
  if (/\b(business|empresarial|empresa|pj)\b/.test(q)) return by((a) => /business/i.test(a.name), "Plaid Business Credit Card");
  if (/\b(corrente|checking)\b/.test(q)) return by((a) => a.subtype === "checking", "Plaid Checking");
  if (/\b(poupanca|saving|savings)\b/.test(q)) return by((a) => a.subtype === "savings", "Plaid Saving");
  if (/\bcartao pessoal\b|\bcredit card\b/.test(q)) return by((a) => a.name === "Plaid Credit Card", "Plaid Credit Card");
  if (/\bcart(ao|oes)\b/.test(q)) return by((a) => a.type === "credit", "cartões de crédito");
  return { ids: null, rotulo: "todas as contas" };
}

// ---------------------------------------------------------------- categoria

const CATEGORIA_PALAVRAS: [CategoryPrimary, RegExp][] = [
  ["FOOD_AND_DRINK", /\b(alimentacao|comida|restaurantes?|lanches?|cafes?|comer|refeic\w*|fast ?food)\b/],
  ["TRANSPORTATION", /\b(transportes?|uber|corridas?|mobilidade|taxi)\b/],
  ["TRAVEL", /\b(viage(m|ns)|passage(m|ns)|aere\w*|voos?)\b/],
  ["GENERAL_MERCHANDISE", /\b(compras|lojas?|mercadorias?)\b/],
  ["ENTERTAINMENT", /\b(lazer|entretenimento|diversao)\b/],
];

const lerCategoria = (q: string) => CATEGORIA_PALAVRAS.find(([, re]) => re.test(q))?.[0] ?? null;

// ---------------------------------------------------------------- utilidades de resposta

const nomeConta = (fonte: Fonte, id: string) => {
  const a = fonte.accounts.find((x) => x.account_id === id);
  return a ? `${a.name} ••${a.mask}` : "Não informado";
};

function filtrar(fonte: Fonte, p: Periodo, ids: string[] | null) {
  return fonte.transactions
    .filter((t) => t.date >= p.inicio && t.date <= p.fim)
    .filter((t) => !ids || ids.includes(t.account_id))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function meta(p: Periodo, n: number, emReais: boolean): Block {
  const base = `Período analisado: ${formatDate(p.inicio)} a ${formatDate(p.fim)} (${p.rotulo}) · ${n} ${
    n === 1 ? "transação" : "transações"
  } · dados fictícios.`;
  return { kind: "note", text: emReais ? `${base} ${notaCambio()}` : base };
}

function tabelaTransacoes(fonte: Fonte, txs: Transaction[], emReais: boolean, title?: string): Block {
  return {
    kind: "table",
    title,
    columns: ["Data", "Descrição", "Conta", "Categoria", "Valor", "Situação"],
    numeric: [4],
    rows: txs.map((t) => [
      formatDate(t.date),
      t.merchant_name ?? t.name,
      nomeConta(fonte, t.account_id),
      CATEGORIA_PT[t.personal_finance_category.primary],
      money(Math.abs(t.amount), emReais),
      `${t.amount > 0 ? "Saída" : "Entrada"} · ${t.pending ? "Pendente" : "Confirmada"}`,
    ]),
  };
}

const SEM_DADOS = (p: Periodo, emReais: boolean): Answer => ({
  intent: "vazio",
  blocks: [
    { kind: "text", text: `Não encontrei transações para esse filtro (${p.rotulo}). Não vou estimar valores que não estão nos dados.` },
    meta(p, 0, emReais),
  ],
});

// ---------------------------------------------------------------- intenções

function contas(fonte: Fonte, emReais: boolean): Answer {
  return {
    intent: "contas",
    blocks: [
      { kind: "text", text: `Você tem ${fonte.accounts.length} contas nesta demonstração. Todas em dólar (USD).` },
      {
        kind: "table",
        columns: ["Conta", "Tipo", "Final", "Moeda"],
        rows: fonte.accounts.map((a) => [a.name, TIPO_PT[a.subtype] ?? a.subtype, a.mask, a.balances.iso_currency_code]),
      },
      { kind: "note", text: `Dados fictícios, amostra local com data de referência ${formatDate(fonte.referenceDate)}.${emReais ? " " + notaCambio() : ""}` },
    ],
  };
}

function saldos(fonte: Fonte, emReais: boolean, ids: string[] | null): Answer {
  const lista = fonte.accounts.filter((a) => !ids || ids.includes(a.account_id));
  const dep = lista.filter((a) => a.type === "depository");
  const cred = lista.filter((a) => a.type === "credit");
  const disponivel = dep.reduce((s, a) => s + (a.balances.available ?? 0), 0);
  const divida = cred.reduce((s, a) => s + (a.balances.current ?? 0), 0);

  const cards: Block = {
    kind: "cards",
    items: lista.map((a) =>
      a.type === "credit"
        ? {
            title: a.name,
            subtitle: `${TIPO_PT[a.subtype] ?? a.subtype} ••${a.mask}`,
            tag: "Dívida",
            tone: "debt" as Tone,
            lines: [
              ["Saldo devedor", money(a.balances.current, emReais)],
              ["Crédito disponível", money(a.balances.available, emReais)],
              ["Limite", money(a.balances.limit, emReais)],
            ],
          }
        : {
            title: a.name,
            subtitle: `${TIPO_PT[a.subtype] ?? a.subtype} ••${a.mask}`,
            tag: "Disponível",
            tone: "ok" as Tone,
            lines: [
              ["Saldo atual", money(a.balances.current, emReais)],
              ["Saldo disponível", money(a.balances.available, emReais)],
            ],
          },
    ),
  };

  const partes: string[] = [];
  if (dep.length) partes.push(`dinheiro disponível em conta: ${money(disponivel, emReais)}`);
  if (cred.length) partes.push(`dívida nos cartões: ${money(divida, emReais)}`);

  return {
    intent: "saldos",
    blocks: [
      { kind: "text", text: `Resumo: ${partes.join("; ")}.` },
      cards,
      {
        kind: "note",
        text:
          "No cartão de crédito, o saldo atual é o quanto você deve, por isso não entra como dinheiro disponível. " +
          `Dados fictícios, referência ${formatDate(fonte.referenceDate)}.` +
          (emReais ? " " + notaCambio() : ""),
      },
    ],
  };
}

function ultimas(fonte: Fonte, emReais: boolean, ids: string[] | null): Answer {
  const p = lerPeriodo("", fonte);
  const txs = filtrar(fonte, p, ids).slice(0, 5);
  if (!txs.length) return SEM_DADOS(p, emReais);
  return {
    intent: "ultimas",
    blocks: [
      { kind: "text", text: "Estas são as cinco transações mais recentes. Valor positivo na Plaid é saída; aqui mostro o tipo por extenso." },
      tabelaTransacoes(fonte, txs, emReais),
      meta(p, txs.length, emReais),
    ],
  };
}

function listar(fonte: Fonte, emReais: boolean, p: Periodo, contasSel: { ids: string[] | null; rotulo: string }): Answer {
  const txs = filtrar(fonte, p, contasSel.ids);
  if (!txs.length) return SEM_DADOS(p, emReais);
  const saidas = soma(txs.filter((t) => t.amount > 0 && !t.pending));
  const entradas = -soma(txs.filter((t) => t.amount < 0 && !t.pending));
  const pend = txs.filter((t) => t.pending);
  return {
    intent: "listar",
    blocks: [
      {
        kind: "text",
        text:
          `Transações de ${contasSel.rotulo} em ${p.rotulo}: saídas confirmadas ${money(saidas, emReais)}, entradas confirmadas ${money(entradas, emReais)}` +
          (pend.length ? `, e ${pend.length} pendente(s) somando ${money(soma(pend), emReais)} fora dos totais.` : "."),
      },
      tabelaTransacoes(fonte, txs, emReais),
      meta(p, txs.length, emReais),
    ],
  };
}

function porCategoria(fonte: Fonte, emReais: boolean, p: Periodo, ids: string[] | null): Answer {
  const txs = filtrar(fonte, p, ids);
  const consumo = txs.filter((t) => isConsumo(t) && !t.pending);
  if (!consumo.length) return SEM_DADOS(p, emReais);
  const mapa = new Map<CategoryPrimary, number>();
  consumo.forEach((t) => mapa.set(t.personal_finance_category.primary, (mapa.get(t.personal_finance_category.primary) ?? 0) + t.amount));
  const itens = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  const total = soma(consumo);
  return {
    intent: "categorias",
    blocks: [
      { kind: "text", text: `Seu consumo confirmado em ${p.rotulo} foi de ${money(total, emReais)}. Transferências e pagamentos de fatura ficaram de fora, porque não são gasto novo.` },
      {
        kind: "bars",
        title: "Consumo por categoria",
        items: itens.map(([c, v]) => ({ label: CATEGORIA_PT[c], value: v, display: money(Math.round(v * 100) / 100, emReais) })),
      },
      meta(p, txs.length, emReais),
    ],
  };
}

function categoria(fonte: Fonte, emReais: boolean, cat: CategoryPrimary, p: Periodo, ids: string[] | null): Answer {
  const txs = filtrar(fonte, p, ids);
  const daCat = txs.filter((t) => t.personal_finance_category.primary === cat && t.amount > 0);
  const nome = CATEGORIA_PT[cat].toLowerCase();
  if (!daCat.length)
    return {
      intent: "categoria",
      blocks: [{ kind: "text", text: `Não há gastos com ${nome} em ${p.rotulo} nos dados disponíveis.` }, meta(p, txs.length, emReais)],
    };
  const conf = daCat.filter((t) => !t.pending);
  const pend = daCat.filter((t) => t.pending);
  return {
    intent: "categoria",
    blocks: [
      {
        kind: "text",
        text:
          `Você gastou ${money(soma(conf), emReais)} com ${nome} em ${p.rotulo}, em ${conf.length} compra(s) confirmada(s).` +
          (pend.length ? ` Há também ${money(soma(pend), emReais)} pendente(s), que ainda não entram no total.` : ""),
      },
      tabelaTransacoes(fonte, daCat, emReais),
      meta(p, txs.length, emReais),
    ],
  };
}

function resumo(fonte: Fonte, emReais: boolean, p: Periodo, ids: string[] | null): Answer {
  const txs = filtrar(fonte, p, ids);
  if (!txs.length) return SEM_DADOS(p, emReais);
  const conf = txs.filter((t) => !t.pending);
  const entradas = -soma(conf.filter(isEntrada));
  const consumo = soma(conf.filter(isConsumo));
  const internas = conf.filter(isMovInterna);
  const pend = txs.filter((t) => t.pending);
  return {
    intent: "resumo",
    blocks: [
      { kind: "text", text: `Resumo das movimentações em ${p.rotulo}:` },
      {
        kind: "table",
        columns: ["Grupo", "Qtde.", "Total"],
        numeric: [1, 2],
        rows: [
          ["Entradas (receitas e juros)", String(conf.filter(isEntrada).length), money(entradas, emReais)],
          ["Consumo (compras e serviços)", String(conf.filter(isConsumo).length), money(consumo, emReais)],
          ["Transferências e pagamentos de fatura", String(internas.length), money(Math.abs(soma(internas.filter((t) => t.amount > 0))), emReais) + " saíram"],
          ["Pendentes (fora dos totais)", String(pend.length), money(soma(pend), emReais)],
        ],
      },
      { kind: "text", text: "Pagamento de fatura e transferência entre suas contas não são consumo: o dinheiro só muda de lugar." },
      meta(p, txs.length, emReais),
    ],
  };
}

function padroes(fonte: Fonte, emReais: boolean, p: Periodo, ids: string[] | null): Answer {
  const txs = filtrar(fonte, p, ids);
  const consumo = txs.filter((t) => isConsumo(t) && !t.pending);
  if (!consumo.length) return SEM_DADOS(p, emReais);

  // 1. Onde o dinheiro vai: categorias
  const porCat = new Map<string, { n: number; v: number }>();
  consumo.forEach((t) => {
    const k = CATEGORIA_PT[t.personal_finance_category.primary];
    const cur = porCat.get(k) ?? { n: 0, v: 0 };
    porCat.set(k, { n: cur.n + 1, v: cur.v + t.amount });
  });
  const total = soma(consumo);
  const cat = [...porCat.entries()].sort((a, b) => b[1].v - a[1].v);

  // 2. Recorrência: estabelecimentos que aparecem mais de uma vez
  const porLoja = new Map<string, { n: number; v: number }>();
  consumo.forEach((t) => {
    const k = t.merchant_name ?? t.name;
    const cur = porLoja.get(k) ?? { n: 0, v: 0 };
    porLoja.set(k, { n: cur.n + 1, v: cur.v + t.amount });
  });
  const recorrentes = [...porLoja.entries()].filter(([, x]) => x.n > 1).sort((a, b) => b[1].n - a[1].n || b[1].v - a[1].v);

  // 3. Tamanho do gasto: pequenos (< US$ 20) x grandes (>= US$ 100)
  const faixas = [
    { nome: "Pequenos (até US$ 20)", f: (v: number) => v < 20 },
    { nome: "Médios (US$ 20 a US$ 99,99)", f: (v: number) => v >= 20 && v < 100 },
    { nome: "Grandes (US$ 100 ou mais)", f: (v: number) => v >= 100 },
  ].map((fx) => {
    const xs = consumo.filter((t) => fx.f(t.amount));
    return [fx.nome, String(xs.length), money(soma(xs), emReais), total ? `${Math.round((soma(xs) / total) * 100)}%` : "0%"];
  });

  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;
  return {
    intent: "padroes",
    blocks: [
      { kind: "text", text: `Encontrei três padrões no seu consumo confirmado de ${p.rotulo} (${money(total, emReais)} no total):` },
      {
        kind: "table",
        title: "1. Concentração por categoria",
        columns: ["Categoria", "Compras", "Total", "% do consumo"],
        numeric: [1, 2, 3],
        rows: cat.map(([k, x]) => [k, String(x.n), money(Math.round(x.v * 100) / 100, emReais), pct(x.v)]),
      },
      {
        kind: "table",
        title: "2. Gastos que se repetem",
        columns: ["Estabelecimento", "Vezes", "Total"],
        numeric: [1, 2],
        rows: recorrentes.length
          ? recorrentes.map(([k, x]) => [k, String(x.n), money(Math.round(x.v * 100) / 100, emReais)])
          : [["Nenhum estabelecimento repetido", "0", money(0, emReais)]],
      },
      {
        kind: "table",
        title: "3. Tamanho das compras",
        columns: ["Faixa", "Compras", "Total", "% do consumo"],
        numeric: [1, 2, 3],
        rows: faixas,
      },
      meta(p, txs.length, emReais),
    ],
  };
}

function maior(fonte: Fonte, emReais: boolean, p: Periodo, ids: string[] | null): Answer {
  const txs = filtrar(fonte, p, ids);
  const consumo = txs.filter((t) => isConsumo(t) && !t.pending).sort((a, b) => b.amount - a.amount);
  if (!consumo.length) return SEM_DADOS(p, emReais);
  const top = consumo[0];
  const empates = consumo.filter((t) => t.amount === top.amount);
  return {
    intent: "maior",
    blocks: [
      {
        kind: "text",
        text:
          empates.length > 1
            ? `Seu maior gasto em ${p.rotulo} foi de ${money(top.amount, emReais)}, valor que aparece em ${empates.length} compras:`
            : `Seu maior gasto em ${p.rotulo} foi ${top.merchant_name ?? top.name}, ${money(top.amount, emReais)}.`,
      },
      tabelaTransacoes(fonte, empates, emReais),
      meta(p, txs.length, emReais),
    ],
  };
}

function totalGasto(fonte: Fonte, emReais: boolean, p: Periodo, ids: string[] | null): Answer {
  const txs = filtrar(fonte, p, ids);
  if (!txs.length) return SEM_DADOS(p, emReais);
  const conf = txs.filter((t) => isConsumo(t) && !t.pending);
  return {
    intent: "total",
    blocks: [
      {
        kind: "text",
        text: `Seu consumo confirmado em ${p.rotulo} foi de ${money(soma(conf), emReais)}, em ${conf.length} compra(s). Não contei transferências, pagamento de fatura nem pendentes.`,
      },
      meta(p, txs.length, emReais),
    ],
  };
}

const AJUDA: Answer = {
  intent: "ajuda",
  blocks: [
    {
      kind: "text",
      text:
        "Posso responder, com base nos dados fictícios desta demonstração: suas contas; saldos (separando dinheiro disponível, dívidas e limites); " +
        "últimas transações; transações por mês, período ou conta; gasto por categoria (alimentação, transporte, viagem, compras, lazer); " +
        "três padrões de gasto; e mostrar tudo também em reais. Não faço pagamentos, transferências nem contratação de crédito.",
    },
  ],
};

const FORA_ESCOPO: Answer = {
  intent: "fora_escopo",
  blocks: [
    {
      kind: "text",
      text: "Não consigo fazer operações bancárias: pagamentos, Pix, transferências, investimentos ou contratação de crédito estão fora desta demonstração. Posso mostrar saldos, transações e gastos.",
    },
  ],
};

const NAO_ENTENDI: Answer = {
  intent: "nao_entendi",
  blocks: [
    {
      kind: "text",
      text: "Não encontrei essa informação nos dados disponíveis, e prefiro não inventar números. Tente, por exemplo: \"saldo da poupança\", \"transações de outubro\", \"quanto gastei com transporte?\" ou \"padrões de gasto\".",
    },
  ],
};

// ---------------------------------------------------------------- roteador

export function responder(pergunta: string, opts: { emReais?: boolean; fonte?: Fonte } = {}): Answer {
  const fonte = opts.fonte ?? FONTE_LOCAL;
  const q = normalize(pergunta);
  if (!q) return NAO_ENTENDI;

  const pediuReais = /\b(em reais|reais|real|brl)\b|r\$/.test(q);
  const emReais = Boolean(opts.emReais) || pediuReais;
  const p = lerPeriodo(q, fonte);
  const c = lerContas(q, fonte);
  const cat = lerCategoria(q);

  if (/\b(pague|pagar|transfira|transferir|fazer (um )?pix|faca (um )?pix|mande (um )?pix|enviar (um )?pix|contratar|emprestimo|investir|aplicar|sacar)\b/.test(q))
    return FORA_ESCOPO;
  if (/\b(ajuda|o que (voce )?(sabe|pode|consegue)|como funciona)\b/.test(q)) return AJUDA;
  if (/\bpadr(ao|oes)\b|\bhabitos?\b/.test(q)) return padroes(fonte, emReais, p, c.ids);
  if (/\bresum\w*\b/.test(q)) return resumo(fonte, emReais, p, c.ids);
  if (/\bsaldos?\b|\bdivida|\bdevo\b|\blimites?\b|\bdisponive(l|is)\b|\bfatura\b/.test(q)) return saldos(fonte, emReais, c.ids);
  if (cat) return categoria(fonte, emReais, cat, p, c.ids);
  if (/\bcategorias?\b/.test(q)) return porCategoria(fonte, emReais, p, c.ids);
  if (/\bmaior(es)?\b|\bmais caro\b/.test(q)) return maior(fonte, emReais, p, c.ids);
  if (/\b(ultim[ao]s|recentes?)\b/.test(q) && !p.explicito) return ultimas(fonte, emReais, c.ids);
  if (/\btransac\w*|\bextrato\b|\bmoviment\w*|\blancament\w*/.test(q)) return listar(fonte, emReais, p, c);
  if (/\bcontas?\b/.test(q) && !p.explicito) return contas(fonte, emReais);
  if (/\bgast\w*\b|\bconsum\w*/.test(q)) return totalGasto(fonte, emReais, p, c.ids);
  if (pediuReais)
    return {
      intent: "cambio",
      blocks: [{ kind: "text", text: `Posso mostrar qualquer resposta também em reais. ${notaCambio()} Marque "Valores também em R$", abaixo do campo de mensagem, ou peça, por exemplo, "saldos em reais".` }],
    };
  return NAO_ENTENDI;
}
