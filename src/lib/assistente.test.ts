import { describe, expect, it } from "vitest";
import { responder, type Block } from "./assistente";
import { formatUSD } from "./format";

const texto = (blocks: Block[]) =>
  blocks
    .map((b) => {
      if (b.kind === "text" || b.kind === "note") return b.text;
      if (b.kind === "table") return [b.title, ...b.rows.flat()].join(" ");
      if (b.kind === "cards") return b.items.map((i) => [i.title, ...i.lines.flat()].join(" ")).join(" ");
      return b.items.map((i) => `${i.label} ${i.display}`).join(" ");
    })
    .join(" ");

describe("formatação", () => {
  it("preserva USD no padrão brasileiro", () => {
    expect(formatUSD(110)).toBe("US$ 110,00");
    expect(formatUSD(5020)).toBe("US$ 5.020,00");
    expect(formatUSD(null)).toBe("Não informado");
  });
});

describe("sugestões da tela inicial", () => {
  it("Mostrar minhas contas → 4 contas", () => {
    const r = responder("Mostrar minhas contas");
    expect(r.intent).toBe("contas");
    expect(texto(r.blocks)).toContain("4 contas");
  });

  it("Consultar meus saldos → separa disponível de dívida", () => {
    const r = responder("Consultar meus saldos");
    expect(r.intent).toBe("saldos");
    const t = texto(r.blocks);
    expect(t).toContain("dinheiro disponível em conta: US$ 300,00"); // 100 + 200
    expect(t).toContain("dívida nos cartões: US$ 5.430,00"); // 410 + 5020
    expect(t).toContain("Não informado"); // disponível do Plaid Credit Card
  });

  it("Últimas transações → 5 linhas, a mais recente primeiro", () => {
    const r = responder("Ver minhas últimas transações");
    const tabela = r.blocks.find((b) => b.kind === "table");
    expect(tabela && tabela.kind === "table" && tabela.rows.length).toBe(5);
    expect(tabela && tabela.kind === "table" && tabela.rows[0][0]).toBe("29/10/2026");
  });

  it("Quanto gastei com alimentação? → separa pendente", () => {
    const r = responder("Quanto gastei com alimentação?");
    const t = texto(r.blocks);
    // 3 × 4,33 + 12 + 500 = 524,99 confirmados; 12 pendente
    expect(t).toContain("US$ 524,99");
    expect(t).toContain("US$ 12,00 pendente");
  });

  it("Resumir movimentações → transferência e fatura não viram consumo", () => {
    const r = responder("Resumir minhas movimentações");
    expect(r.intent).toBe("resumo");
    // consumo confirmado: 500+4,33+500+5,40+12+4,33+89,40+78,50+500+500+6,33+4,33 = 2.204,62
    expect(texto(r.blocks)).toContain("US$ 2.204,62");
  });
});

describe("período, conta e regras", () => {
  it("filtra por mês", () => {
    const r = responder("transações de setembro");
    expect(texto(r.blocks)).toContain("3 transações");
  });

  it("filtra por conta", () => {
    const r = responder("extrato da conta corrente em outubro");
    expect(texto(r.blocks)).toContain("Plaid Checking");
    expect(texto(r.blocks)).not.toContain("Plaid Saving");
  });

  it("mês sem dados não inventa números", () => {
    const r = responder("quanto gastei em março?");
    expect(r.intent).toBe("vazio");
  });

  it("recusa operações de escrita", () => {
    expect(responder("faça um pix de 50 reais").intent).toBe("fora_escopo");
    expect(responder("quero transferir dinheiro").intent).toBe("fora_escopo");
  });

  it("pergunta desconhecida não gera número", () => {
    const r = responder("qual meu score de crédito?");
    expect(r.intent).toBe("nao_entendi");
    expect(texto(r.blocks)).not.toMatch(/US\$/);
  });

  it("três padrões de gasto", () => {
    const r = responder("quais são meus padrões de gasto?");
    expect(r.blocks.filter((b) => b.kind === "table")).toHaveLength(3);
  });
});

describe("melhoria: valores em reais", () => {
  it("converte com a taxa declarada", () => {
    const r = responder("saldos em reais");
    const t = texto(r.blocks);
    expect(t).toContain("US$ 110,00 (≈ R$ 594,00)");
    expect(t).toContain("US$ 1,00 = R$ 5,40");
    expect(t).toContain("não é cotação real");
  });

  it("chave ligada não transforma pergunta desconhecida em resposta de câmbio", () => {
    expect(responder("qual meu score de crédito?", { emReais: true }).intent).toBe("nao_entendi");
  });

  it("chave global liga a conversão", () => {
    const r = responder("Mostrar minhas contas", { emReais: true });
    expect(texto(r.blocks)).toContain("R$ 5,40");
  });
});
