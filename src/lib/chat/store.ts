import { useSyncExternalStore } from "react";
import type { AssistantResponse } from "@/lib/finance/response-types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  response?: AssistantResponse;
  error?: string;
  /** Pergunta original, para tentar novamente após erro */
  retryOf?: string;
  createdAt: number;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const KEY = "mirante.threads.v1";
const BRL_KEY = "mirante.brl.v1";
const EMPTY: Thread[] = [];

let cache: Thread[] | null = null;
const listeners = new Set<() => void>();

const isBrowser = () => typeof window !== "undefined";

export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function read(): Thread[] {
  if (!isBrowser()) return EMPTY;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Thread[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Thread[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* armazenamento cheio ou bloqueado: mantém em memória */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useThreads(): Thread[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function getThreads(): Thread[] {
  return read();
}

export function getThread(id: string): Thread | undefined {
  return read().find((t) => t.id === id);
}

export function createThread(): Thread {
  const now = Date.now();
  const thread: Thread = { id: newId("c"), title: "Nova conversa", createdAt: now, updatedAt: now, messages: [] };
  write([thread, ...read()]);
  return thread;
}

/** Reaproveita a conversa vazia mais recente ou cria uma nova (idempotente). */
export function ensureStartThread(): Thread {
  const threads = read();
  const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  return sorted[0] ?? createThread();
}

export function getOrCreateEmptyThread(): Thread {
  const empty = read().find((t) => t.messages.length === 0);
  return empty ?? createThread();
}

export function appendMessage(threadId: string, message: ChatMessage) {
  write(
    read().map((t) => {
      if (t.id !== threadId) return t;
      const firstUser = t.messages.length === 0 && message.role === "user";
      return {
        ...t,
        title: firstUser && message.text ? message.text.slice(0, 60) : t.title,
        updatedAt: Date.now(),
        messages: [...t.messages, message],
      };
    }),
  );
}

export function removeMessage(threadId: string, messageId: string) {
  write(
    read().map((t) =>
      t.id === threadId ? { ...t, messages: t.messages.filter((m) => m.id !== messageId) } : t,
    ),
  );
}

export function deleteThread(threadId: string) {
  write(read().filter((t) => t.id !== threadId));
}

// ---- preferência "Valores também em R$" ----
let brlCache: boolean | null = null;
const brlListeners = new Set<() => void>();

function readBrl(): boolean {
  if (!isBrowser()) return false;
  if (brlCache === null) brlCache = window.localStorage.getItem(BRL_KEY) === "1";
  return brlCache;
}

export function setBrl(value: boolean) {
  brlCache = value;
  try {
    window.localStorage.setItem(BRL_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  brlListeners.forEach((l) => l());
}

export function useBrl(): boolean {
  return useSyncExternalStore(
    (l) => {
      brlListeners.add(l);
      return () => brlListeners.delete(l);
    },
    readBrl,
    () => false,
  );
}
