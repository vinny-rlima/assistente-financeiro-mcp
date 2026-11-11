---
name: configurar-mcp-financeiro
description: Configura e testa os servidores MCP da Pluggy (documentação, Streamable HTTP) e da Plaid Sandbox (STDIO via uvx) no Codex, sem expor chaves. Use quando pedirem para preparar o ambiente do assistente financeiro.
---

# Configurar MCP financeiro (Pluggy + Plaid Sandbox)

## Regras
- Nunca peça, mostre, registre ou versione Client ID, secret ou access_token. As chaves ficam só no config.toml local, que a própria pessoa edita.
- Só ambiente Sandbox da Plaid (`https://sandbox.plaid.com`). Nenhuma operação de escrita bancária.
- Faça backup do config.toml antes de qualquer mudança e preserve os servidores existentes.

## Passos
1. Detecte o sistema (macOS/Linux ou Windows) e o caminho do config: `~/.codex/config.toml` ou `%USERPROFILE%\.codex\config.toml`.
2. Pluggy: garanta a seção
   ```toml
   [mcp_servers.pluggy]
   url = "https://mcp.pluggy.ai/mcp"
   ```
3. `uv`: rode `uv --version`. Se faltar, instale (macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`; Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`) e peça para reabrir o terminal.
4. Descubra o caminho absoluto do `uvx` (`command -v uvx` ou `where.exe uvx`).
5. Plaid: se não existir `[mcp_servers.plaid]`, adicione com `command` = caminho do uvx, `args = ["mcp-server-plaid"]`, `startup_timeout_sec = 60` e a subseção `[mcp_servers.plaid.env]` com `PLAID_CLIENT_ID = "COLE_SEU_CLIENT_ID"` e `PLAID_SECRET = "COLE_SEU_SANDBOX_SECRET"`. Peça que a pessoa troque os espaços reservados ela mesma.
6. No macOS/Linux: `chmod 600` no config.
7. Peça para fechar o Codex por completo, reabrir, abrir conversa nova e rodar `/mcp`.
8. Teste: P01 (Item na Pluggy, filtro `Transaction` no singular) e P05 (documentação da Plaid, sem criar Item).

## Erros comuns
- `command not found: uv` → instalar e reabrir terminal.
- Codex não acha o `uvx` → usar caminho absoluto.
- Habilitado sem ferramentas → reiniciar e abrir conversa nova.
- Erro de TOML → aspas, colchetes, seção duplicada.
- `PRODUCT_NOT_READY` → aguardar e tentar até 3 vezes, sem inventar dados.
