# Especificação enviada ao Lovable (formato OpenSpec)

Como usar: no Lovable, mande primeiro no **modo chat** para tirar dúvidas; quando ele confirmar o plano, mande de novo no modo de construção. Revise a prévia com o roteiro de teste do fim deste arquivo e só então publique.

Marca: **Mirante** · Assistente: **Mia** · Cenário: app de banco digital.

---

```markdown
# Proposta: assistente financeiro Mirante (Etapa 1)

## Por quê
O cliente já está no app do banco. Quero que ele pergunte em português sobre
contas, saldos e transações e receba respostas simples, com tabelas e números
coerentes. É uma demonstração educacional de IA, MCP e APIs financeiras: todos
os dados são fictícios, no formato da Plaid Sandbox.

## O que muda
- Nova aplicação web de chat (React + TypeScript + Tailwind), foco na conversa,
  sem landing page.
- Etapa 1: dados locais fictícios, sem pedir credenciais e sem backend.
- Etapa 2 (não fazer agora): backend com as chaves só no servidor.

## Especificação

### Requisito: identidade
- Português do Brasil. Banco digital simples e acolhedor: verde profundo
  (#0f5132), branco e cinza claro. Monograma "M". Layout responsivo.
- Selo permanente no topo: "Demonstração · Dados fictícios".
- Indicador "Modo local · sem integração". A interface NUNCA mostra
  "Conectado" enquanto não houver API integrada.

#### Cenário: primeira visita
- QUANDO a pessoa abre o app
- ENTÃO vê "Olá! Sou a Mia. O que você quer entender sobre suas finanças?"
- E sugestões clicáveis que enviam pedidos reais: Mostrar minhas contas;
  Consultar meus saldos; Ver minhas últimas transações; Quanto gastei com
  alimentação?; Resumir minhas movimentações; Quais são meus padrões de gasto?;
  Saldos em reais.

### Requisito: chat
- Campo fixo embaixo, botão Enviar, Enter envia, Shift+Enter quebra linha,
  mensagem vazia bloqueada, indicador de carregamento, erro compreensível.
- Histórico de conversas na lateral (gaveta no celular) e botão "Nova conversa".
- Respostas com texto, cartões, tabelas e barras simples, legíveis no celular
  (no celular, cada linha de tabela vira um cartão compacto).

### Requisito: o que responde
1. Contas, tipos e moedas.
2. Saldo atual e disponível por conta.
3. Separar dinheiro disponível, dívidas e limites.
4. Transações por período (mês, "mês passado", "últimos N dias") e por conta.
5. As cinco transações mais recentes.
6. Gasto por categoria e resumo das movimentações.
7. Três padrões de gasto em tabelas.
8. Fora do escopo: pagamentos, Pix, transferências, crédito, qualquer escrita.
   Recusar com educação.
9. Pergunta sem dado: dizer que não encontrou e não inventar números.

### Requisito: regras de dados
- Preservar USD, formato "US$ 110,00".
- Na Plaid, amount positivo é SAÍDA e negativo é ENTRADA.
- Em cartão de crédito, saldo atual é DÍVIDA, nunca dinheiro disponível.
- Campo ausente aparece como "Não informado".
- Pendentes separados dos totais confirmados.
- Transferência e pagamento de fatura não são consumo.
- Toda resposta informa período e quantidade de registros analisados.

### Requisito: valores em reais (melhoria)
- Caixa "Valores também em R$" e pedidos como "saldos em reais".
- Mostrar "US$ 110,00 (≈ R$ 594,00)" com a taxa declarada em toda resposta:
  "US$ 1,00 = R$ 5,40, taxa fixa de demonstração (não é cotação real),
  referência 31/10/2026". Taxa num único arquivo de configuração.

### Dados locais (amostra, data de referência 31/10/2026)
Contas (USD):
| Conta | Tipo | Final | Atual | Disponível | Limite |
| Plaid Checking | corrente | 0000 | 110,00 | 100,00 | – |
| Plaid Saving | poupança | 1111 | 210,00 | 200,00 | – |
| Plaid Credit Card | cartão | 3333 | 410,00 (dívida) | Não informado | Não informado |
| Plaid Business Credit Card | cartão | 9999 | 5.020,00 (dívida) | 4.980,00 | 10.000,00 |

Transações: 19 registros entre 12/09/2026 e 29/10/2026, com account_id, date,
name, merchant_name, amount, pending e personal_finance_category.primary
(INCOME, TRANSFER_OUT, LOAN_PAYMENTS, FOOD_AND_DRINK, TRANSPORTATION, TRAVEL,
GENERAL_MERCHANDISE, ENTERTAINMENT). Estabelecimentos do padrão Sandbox:
United Airlines, Uber, McDonald's, Starbucks, SparkFun, Touchstone Climbing,
KFC, Madison Bicycle Shop, Tectra Inc, CD DEPOSIT .INITIAL., pagamentos de
fatura. Uma transação pendente (McDonald's, 29/10). Não apresentar esta amostra
como o resultado real do Codex.

## Critérios de aceite
- Desktop e celular usáveis, sem rolagem horizontal da página.
- Totais coerentes com as regras acima.
- Estados de carregamento, erro e conjunto vazio.
- Nenhuma credencial no navegador. Nenhuma operação de escrita.

## Tarefas
1. Criar dados locais e funções de cálculo separadas da interface.
2. Criar interpretação de perguntas em português (intenção, período, conta,
   categoria).
3. Criar a interface de chat, histórico e sugestões.
4. Ao entregar a prévia, explicar o que funciona e o que falta para a Etapa 2.
```

---

## Roteiro de revisão da prévia (P09)

Teste no desktop e no celular, sem pedir segredos no chat:

1. Clique em cada sugestão.
2. "saldo da poupança" · "extrato da conta corrente em outubro" · "quanto gastei com transporte?"
3. "transações de março" → deve dizer que não há dados, sem números.
4. "faça um pix de 50 reais" → recusa.
5. Marque "Valores também em R$" e repita "Consultar meus saldos".
6. Nova conversa → a anterior aparece no histórico.

## O que ajustei depois da primeira versão

Ajustes feitos depois de testar a primeira versão (todos já estão neste repositório):

| Problema encontrado | Ajuste |
|---|---|
| No celular, a tabela de transações escondia a coluna de valor atrás da rolagem lateral. | No celular, cada linha vira um cartão com descrição e valor lado a lado. |
| Com a conversão ligada, "US$ 4,33 (≈ R$ 23,38)" alargava demais a coluna. | Valor em reais numa segunda linha, menor e cinza. |
| Colunas "Tipo" e "Status" separadas ficavam cortadas no desktop. | Uma coluna só: "Situação" (ex.: "Saída · Pendente"). |
| Com a caixa de reais ligada, uma pergunta desconhecida caía na explicação de câmbio. | A explicação de câmbio só aparece quando a pergunta fala em reais; o resto continua "não encontrei". |
| Texto de ajuda citava a caixa de reais "no topo", mas ela fica embaixo. | Texto corrigido. |
| Os créditos do Lovable acabaram no meio da construção, e o projeto dele usa o modelo TanStack Start (com renderização no servidor). | Adaptei o chat para esse modelo: virou o componente `ChatApp` na rota `/`, o histórico só é lido do navegador depois que a página abre, e a tela cobre o layout padrão. Subi os arquivos pelo GitHub. |
