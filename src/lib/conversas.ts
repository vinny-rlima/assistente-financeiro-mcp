import type { Answer } from "./assistente";

export interface Mensagem {
  id: string;
  role: "user" | "assistant";
  text?: string;
  answer?: Answer;
  error?: string;
  at: number;
}

export interface Conversa {
  id: string;
  title: string;
  createdAt: number;
  messages: Mensagem[];
}

const KEY = "mirante.conversas.v1";

export const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function novaConversa(): Conversa {
  return { id: novoId(), title: "Nova conversa", createdAt: Date.now(), messages: [] };
}

/** O histórico fica só neste navegador. Nada de credenciais é guardado aqui. */
export function carregar(): Conversa[] {
  try {
    const raw = localStorage.getItem(KEY);
    const xs = raw ? (JSON.parse(raw) as Conversa[]) : [];
    return Array.isArray(xs) ? xs : [];
  } catch {
    return [];
  }
}

export function salvar(xs: Conversa[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(xs.filter((c) => c.messages.length > 0).slice(0, 30)));
  } catch {
    /* armazenamento indisponível: segue só em memória */
  }
}
