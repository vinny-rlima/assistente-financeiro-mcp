# Prompts usados na IA (Codex + MCP)

Sequência para refazer o caminho do Expert. Cada prompt diz qual servidor deve responder. Cole os prints dos resultados em [`evidencias/`](evidencias/), **sem** chaves, tokens ou `access_token` visíveis.

## P01 · Pluggy: o que é um Item

```
Use apenas o servidor MCP pluggy, só documentação.
Explique em português simples o que é um Item na Pluggy, como ele se relaciona
com contas e transações, e cite as páginas da documentação que usou.
Depois, liste os endpoints do grupo Transaction (no singular).
Não consulte contas nem faça operações de escrita.
```

## P05 · Plaid: só documentação

```
Use o servidor MCP plaid, ainda sem criar conexão.
Explique o que é um Item no Sandbox da Plaid e para que servem
POST /accounts/get e POST /transactions/get. Diga que campos de saldo existem
(current, available, limit) e o sinal do campo amount nas transações.
```

## P06 · Plaid: criar o Item de teste e ler contas e saldos

O `mcp-server-plaid` oferece 4 ferramentas: `get_sandbox_access_token`, `search_documentation`, `get_mock_data_prompt` e `simulate_webhook`. Nenhuma lê contas diretamente. Então a IA cria o Item pelo MCP e chama `/accounts/get` com um script, lendo as chaves do `config.toml` só em memória.

```
Use a ferramenta get_sandbox_access_token do servidor MCP plaid para criar um
Item de teste no Sandbox com o produto transactions.

Depois, escreva e rode um script Python que:
- leia PLAID_CLIENT_ID e PLAID_SECRET da seção [mcp_servers.plaid.env] do arquivo
  C:/Users/SEU-USUARIO/.codex/config.toml, só em memória;
- chame POST https://sandbox.plaid.com/accounts/get com o access_token do Item;
- nunca imprima as chaves nem o access_token (nem no comando, nem na saída).

Mostre uma tabela: conta, tipo, subtipo, final, moeda, saldo atual, saldo
disponível, limite. Campo vazio = "Não informado". Valores no formato "US$ 110,00".
Explique que no cartão de crédito o saldo atual é dívida, não dinheiro disponível.
Use apenas https://sandbox.plaid.com.
```

Resultado no Sandbox: 14 contas (depósito, cartão, investimento e empréstimo).

## P07 · Transações e três padrões de gasto em tabelas

Na mesma conversa, para reaproveitar o Item:

```
Com o mesmo Item (não crie outro), rode um script que chame
POST https://sandbox.plaid.com/transactions/get dos últimos 90 dias, percorrendo
todas as páginas, com as chaves lidas do config.toml do mesmo jeito.
Se vier PRODUCT_NOT_READY, espere 10 segundos e tente até 3 vezes. Não invente dados.

Lembre: na Plaid, amount positivo é SAÍDA e negativo é ENTRADA.
Monte três tabelas:
1. Concentração por categoria: categoria, nº de compras, total, % do consumo.
2. Gastos que se repetem: estabelecimento, vezes, total.
3. Tamanho das compras: até US$ 20, US$ 20–99,99 e US$ 100 ou mais.
Só conte como consumo valores positivos que não sejam transferência nem pagamento
de fatura. Deixe pendentes fora dos totais. Informe o período e quantos registros
analisou. Valores no formato "US$ 110,00". Não mostre chaves nem token.
```

Resultado no Sandbox (resumo): Alimentação (US$ 1.548,99) e Transporte (US$ 1.535,19) lideram o consumo, com cerca de 23% cada; os gastos que mais se repetem são Uber (6 vezes), KFC, Madison Bicycle Center, Tectra Inc e United Airlines; e 12 compras de US$ 100 ou mais somam US$ 6.000,00, contra US$ 84,18 em 12 compras pequenas.

## Problemas que resolvi no Windows

| Sintoma no log do Codex | Causa | Correção |
|---|---|---|
| `program not found` | Caminho do `uvx` errado | Usar o resultado de `where.exe uvx` |
| `invalid unicode escape` no `config.toml` | Barras invertidas (`C:\Users\...`) dentro de aspas | Trocar por barras normais: `C:/Users/.../uvx.exe` |
| `handshaking with MCP server failed` | Primeira inicialização baixando 37 pacotes | `startup_timeout_sec = 60` acima de `[mcp_servers.plaid.env]` e reiniciar |

Os logs do app do Codex no Windows ficam em `%LOCALAPPDATA%\Packages\OpenAI.Codex_*\LocalCache\Local\Codex\Logs`.

## P08 · Diagnóstico quando algo falha

```
Identifique qual etapa funcionou e onde parou. Mostre só o erro sanitizado
(sem chaves nem tokens) e retome a etapa que falhou, sem recriar Items.
```

---

## Referência: as três tabelas na amostra local do app (Etapa 1)

O app da Etapa 1 calcula os mesmos padrões sobre a amostra local (19 transações fictícias, 12/09/2026 a 29/10/2026). Pergunte "Quais são meus padrões de gasto?" no chat para ver. Resultado, para comparar com a lógica da IA:

**1. Concentração por categoria** (consumo confirmado: US$ 2.204,62)

| Categoria | Compras | Total | % |
|---|---:|---:|---:|
| Viagem | 2 | US$ 1.000,00 | 45% |
| Compras | 2 | US$ 589,40 | 27% |
| Alimentação | 5 | US$ 524,99 | 24% |
| Lazer | 1 | US$ 78,50 | 4% |
| Transporte | 2 | US$ 11,73 | 1% |

**2. Gastos que se repetem**

| Estabelecimento | Vezes | Total |
|---|---:|---:|
| Starbucks | 3 | US$ 12,99 |
| United Airlines | 2 | US$ 1.000,00 |
| Uber | 2 | US$ 11,73 |

**3. Tamanho das compras**

| Faixa | Compras | Total | % |
|---|---:|---:|---:|
| Pequenos (até US$ 20) | 6 | US$ 36,72 | 2% |
| Médios (US$ 20 a 99,99) | 2 | US$ 167,90 | 8% |
| Grandes (US$ 100 ou mais) | 4 | US$ 2.000,00 | 91% |

Percentuais arredondados, por isso a soma pode dar 101%. Ficaram fora: `CD DEPOSIT .INITIAL.` (transferência), `CREDIT CARD 3333 PAYMENT` e `AUTOMATIC PAYMENT - THANK` (pagamentos de fatura) e um McDonald's pendente.
