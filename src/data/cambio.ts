/**
 * Melhoria escolhida: mostrar os valores também em reais.
 *
 * A taxa abaixo é FIXA e DIDÁTICA. Não é cotação de mercado e não vem de API.
 * Ela é exibida em toda resposta convertida, para que a conversão fique declarada.
 * Para atualizar, troque o valor e a data aqui (um único ponto de verdade).
 */
export const CAMBIO = {
  moedaOrigem: "USD",
  moedaDestino: "BRL",
  taxa: 5.4, // R$ por US$ 1
  dataReferencia: "2026-10-31",
  fonte: "taxa fixa de demonstração (não é cotação real)",
} as const;
