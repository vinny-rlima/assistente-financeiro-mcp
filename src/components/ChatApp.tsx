import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { responder } from "../lib/assistente";
import { carregar, novaConversa, novoId, salvar, type Conversa, type Mensagem } from "../lib/conversas";
import { formatDate, notaCambio } from "../lib/format";
import { REFERENCE_DATE } from "../data/sandbox";
import { Blocos } from "./Blocos";

const MARCA = "Mirante";
const ASSISTENTE = "Mia";

const SUGESTOES = [
  "Mostrar minhas contas",
  "Consultar meus saldos",
  "Ver minhas últimas transações",
  "Quanto gastei com alimentação?",
  "Resumir minhas movimentações",
  "Quais são meus padrões de gasto?",
  "Saldos em reais",
];

function Monograma({ size = "h-9 w-9 text-lg" }: { size?: string }) {
  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-xl bg-emerald-800 font-bold text-white`} aria-hidden>
      M
    </div>
  );
}

export default function ChatApp() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [historicoCarregado, setHistoricoCarregado] = useState(false);
  const [atual, setAtual] = useState<Conversa>(() => novaConversa());
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [emReais, setEmReais] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // O histórico fica no navegador: só lê depois que a página abre (o servidor não tem localStorage).
  useEffect(() => {
    setConversas(carregar());
    setHistoricoCarregado(true);
  }, []);
  useEffect(() => {
    if (historicoCarregado) salvar(conversas);
  }, [conversas, historicoCarregado]);
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [atual.messages.length, carregando]);

  const historico = useMemo(
    () => [atual, ...conversas.filter((c) => c.id !== atual.id)].filter((c) => c.messages.length > 0),
    [atual, conversas],
  );

  function atualizar(c: Conversa) {
    setAtual(c);
    setConversas((xs) => [c, ...xs.filter((x) => x.id !== c.id)]);
  }

  function enviar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || carregando) return;
    const msg: Mensagem = { id: novoId(), role: "user", text: p, at: Date.now() };
    const base: Conversa = {
      ...atual,
      title: atual.messages.length ? atual.title : p.slice(0, 48),
      messages: [...atual.messages, msg],
    };
    atualizar(base);
    setTexto("");
    setCarregando(true);

    // Pequena espera só para o indicador de carregamento ser visível.
    // Na Etapa 2, aqui entra a chamada ao backend.
    window.setTimeout(() => {
      let resposta: Mensagem;
      try {
        resposta = { id: novoId(), role: "assistant", answer: responder(p, { emReais }), at: Date.now() };
      } catch {
        resposta = {
          id: novoId(),
          role: "assistant",
          error: "Não consegui processar essa pergunta agora. Tente de novo ou reformule.",
          at: Date.now(),
        };
      }
      atualizar({ ...base, messages: [...base.messages, resposta] });
      setCarregando(false);
      inputRef.current?.focus();
    }, 450);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar(texto);
    }
  }

  function iniciarNova() {
    setAtual(novaConversa());
    setMenuAberto(false);
    setTexto("");
    inputRef.current?.focus();
  }

  const Historico = (
    <div className="flex h-full flex-col">
      <button
        onClick={iniciarNova}
        className="m-3 rounded-xl bg-emerald-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        + Nova conversa
      </button>
      <p className="px-4 pb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Histórico</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {historico.length === 0 && <p className="px-2 py-2 text-sm text-gray-400">Suas conversas aparecem aqui.</p>}
        {historico.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setAtual(c);
              setMenuAberto(false);
            }}
            className={`block w-full truncate rounded-lg px-2 py-2 text-left text-sm ${
              c.id === atual.id ? "bg-emerald-50 font-medium text-emerald-900" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {c.title}
          </button>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-4 text-xs leading-relaxed text-gray-500">
        Modo local: dados fictícios no formato da Plaid Sandbox, referência {formatDate(REFERENCE_DATE)}. Sem integração ativa com banco.
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50 text-gray-900 antialiased [overflow-wrap:normal]">
      {/* Topo */}
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir histórico"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Monograma />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{MARCA}</p>
          <p className="truncate text-xs text-gray-500">Assistente {ASSISTENTE} · contas, saldos e transações</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 lg:inline">Modo local · sem integração</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Demonstração · Dados fictícios
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Histórico desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:block">{Historico}</aside>

        {/* Histórico celular */}
        {menuAberto && (
          <div className="fixed inset-0 z-[110] md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMenuAberto(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{Historico}</aside>
          </div>
        )}

        {/* Chat */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-6">
              {atual.messages.length === 0 ? (
                <div className="pt-6 sm:pt-12">
                  <Monograma size="h-12 w-12 text-2xl" />
                  <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                    Olá! Sou a {ASSISTENTE}. O que você quer entender sobre suas finanças?
                  </h1>
                  <p className="mt-2 text-sm text-gray-500">
                    Respondo em português sobre contas, saldos e transações de um banco de teste. Os dados são fictícios e não represento o
                    Open Finance brasileiro.
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {SUGESTOES.map((s) => (
                      <button
                        key={s}
                        onClick={() => enviar(s)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-800 hover:border-emerald-200 hover:bg-emerald-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ul className="space-y-5">
                  {atual.messages.map((m) =>
                    m.role === "user" ? (
                      <li key={m.id} className="flex justify-end">
                        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-emerald-800 px-4 py-2.5 text-white">{m.text}</div>
                      </li>
                    ) : (
                      <li key={m.id} className="flex gap-3">
                        <Monograma size="h-7 w-7 text-sm mt-0.5" />
                        <div className="min-w-0 flex-1">
                          {m.error ? (
                            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">{m.error}</p>
                          ) : (
                            m.answer && <Blocos blocks={m.answer.blocks} />
                          )}
                        </div>
                      </li>
                    ),
                  )}
                  {carregando && (
                    <li className="flex items-center gap-3" aria-live="polite">
                      <Monograma size="h-7 w-7 text-sm" />
                      <span className="flex gap-1" aria-label="Consultando os dados">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-emerald-600" style={{ animationDelay: `${i * 120}ms` }} />
                        ))}
                      </span>
                    </li>
                  )}
                </ul>
              )}
              <div ref={fimRef} />
            </div>
          </div>

          {/* Campo de mensagem */}
          <div className="border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-3xl px-4 pb-4 pt-3">
              {atual.messages.length > 0 && (
                <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      disabled={carregando}
                      className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enviar(texto);
                }}
                className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-2 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100"
              >
                <textarea
                  ref={inputRef}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder="Pergunte sobre saldos e gastos…"
                  className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-gray-400"
                  aria-label="Mensagem"
                />
                <button
                  type="submit"
                  disabled={!texto.trim() || carregando}
                  className="h-10 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Enviar
                </button>
              </form>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>Enter envia · Shift+Enter quebra a linha</span>
                <label className="flex cursor-pointer items-center gap-2" title={notaCambio()}>
                  <input
                    type="checkbox"
                    checked={emReais}
                    onChange={(e) => setEmReais(e.target.checked)}
                    className="h-4 w-4 accent-emerald-800"
                  />
                  Valores também em R$ (US$ 1 = R$ 5,40, taxa fixa)
                </label>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
