# Configuração dos servidores MCP

Dois servidores, dois papéis:

| Servidor | Tipo | Para que serve | Precisa de chave? |
|---|---|---|---|
| `pluggy` | Streamable HTTP | Consultar a **documentação** da Pluggy (integração brasileira): o que é um Item, quais endpoints existem. | Não |
| `plaid` | STDIO (`uvx mcp-server-plaid`) | Ler **dados fictícios** da Plaid Sandbox: criar Item de teste, contas, saldos e transações. | Sim: Client ID e Secret de Sandbox |

> A Plaid aqui é só laboratório. Ela não representa o Open Finance brasileiro, que em produção exige consentimento do cliente e requisitos de segurança.

Um modelo pronto do arquivo de configuração do Codex está em [`mcp/codex-config.example.toml`](mcp/codex-config.example.toml), só com espaços reservados.

---

## 1. Pluggy (sem chave)

**Pelo app do Codex:** Configurações → Plug-ins → MCPs → Adicionar (em algumas versões, "MCP servers").

1. Troque o tipo para **Streamable HTTP** antes de preencher. STDIO não serve para a Pluggy.
2. Nome: `pluggy`
3. URL: `https://mcp.pluggy.ai/mcp`
4. Autenticação, token e cabeçalhos: **vazios** (a consulta usa só a documentação).
5. Salve, reinicie se pedir e **abra uma conversa nova**.

**Conferir:** digite `/mcp` e veja `pluggy` na lista. Estar habilitado não garante que as ferramentas carregaram na conversa atual: se não aparecerem, reinicie e abra outra conversa.

**Primeiro teste:** peça "Explique o que é um Item na Pluggy, com as fontes". Para listar endpoints de transações, filtre por `Transaction` (singular); com `Transactions` o retorno vem vazio.

---

## 2. Plaid (Sandbox)

### 2.1 Credenciais

Em [dashboard.plaid.com](https://dashboard.plaid.com) → **Developers → Keys**, copie o **Client ID** e o **Sandbox secret**. Não são as mesmas da Pluggy.

> Nunca cole essas chaves em README, print, commit ou mensagem de chat. Elas ficam só no arquivo local de configuração do Codex.

### 2.2 Instalar o `uv`

| Sistema | Instalar | Conferir | Caminho do `uvx` |
|---|---|---|---|
| macOS / Linux | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `uv --version` | `command -v uvx` (ex.: `/Users/seu-usuario/.local/bin/uvx`) |
| Windows (PowerShell) | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` | `uv --version` | `where.exe uvx` (ex.: `C:\Users\seu-usuario\.local\bin\uvx.exe`) |

Depois de instalar, **feche e reabra o terminal**.

### 2.3 Adicionar o servidor

**Pelo formulário (modo STDIO):**

| Campo | Valor |
|---|---|
| Nome | `plaid` |
| Tipo | STDIO |
| Comando | caminho **absoluto** do `uvx` (do passo acima) |
| Argumentos | `mcp-server-plaid` (sem aspas) |
| Variáveis de ambiente | `PLAID_CLIENT_ID` e `PLAID_SECRET` |
| Encaminhamento de variáveis | vazio |
| Diretório de trabalho | vazio |

**Ou editando o `config.toml`** (`~/.codex/config.toml` no Mac/Linux, `%USERPROFILE%\.codex\config.toml` no Windows):

1. Faça backup do arquivo.
2. Adicione as seções do [modelo](mcp/codex-config.example.toml), trocando os `COLE_SEU_...`.
3. Não crie uma segunda seção `[mcp_servers.plaid]` e preserve os outros servidores.
4. No Mac/Linux, proteja o arquivo: `chmod 600 ~/.codex/config.toml`.

O servidor roda na sua máquina, mas fala com a Plaid pela internet. A primeira inicialização baixa dependências e pode demorar (por isso `startup_timeout_sec = 60`).

**Conferir:** feche o Codex por completo, reabra, rode `/mcp` e peça uma consulta só de documentação sobre Item de Sandbox, `/accounts/get` e `/transactions/get`, ainda sem criar conexão.

---

## 3. Erros comuns

| Sintoma | O que fazer |
|---|---|
| `command not found: uv` | Instale o `uv`, reabra o terminal e teste de novo. |
| Codex não encontra o `uvx` | Use o caminho absoluto (`command -v uvx` / `where.exe uvx`). |
| Servidor habilitado, sem ferramentas | Salve, reinicie o Codex e abra conversa nova. |
| Nenhum endpoint no filtro da Pluggy | Use `Transaction`, no singular. |
| Erro de TOML | Confira aspas, colchetes e seção `plaid` duplicada. No Windows, use barras `/` ou `\\` duplas no caminho. |
| Erro de autenticação Plaid | Confira Client ID e **Sandbox** secret (não o de Production). |
| `PRODUCT_NOT_READY` | As transações ainda estão sendo geradas. Aguarde e tente até três vezes. Não invente extrato. |
| Falha de rede | Confira internet e permissão de rede do Codex. |
| Token anterior indisponível | Diga à IA que o contexto se perdeu e crie outro Item de Sandbox por escolha explícita. |
