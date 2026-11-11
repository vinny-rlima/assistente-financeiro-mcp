import { RATE_NOTE } from "@/lib/finance/format";
import type { ChatMessage } from "@/lib/chat/store";
import { AlertCircle, CalendarRange, Database, RotateCcw } from "lucide-react";
import { BlockView } from "./blocks";
import { MiaAvatar } from "./Brand";
import { Button } from "@/components/ui/button";

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="animate-rise flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap text-primary-foreground">
        {message.text}
      </div>
    </div>
  );
}

export function AssistantMessage({
  message,
  onSuggestion,
  onRetry,
  disabled,
}: {
  message: ChatMessage;
  onSuggestion: (text: string) => void;
  onRetry: (message: ChatMessage) => void;
  disabled: boolean;
}) {
  if (message.error) {
    return (
      <div className="animate-rise flex gap-3">
        <MiaAvatar />
        <div className="min-w-0 flex-1 rounded-xl border border-destructive/30 bg-card px-3.5 py-3 text-sm">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{message.error}</span>
          </div>
          {message.retryOf && (
            <Button variant="outline" size="sm" className="mt-2" disabled={disabled} onClick={() => onRetry(message)}>
              <RotateCcw className="size-3.5" aria-hidden /> Tentar novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  const r = message.response;
  if (!r) return null;
  return (
    <div className="animate-rise flex gap-3">
      <MiaAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-3">
        {r.blocks.map((b, i) => (
          <BlockView key={i} block={b} brl={r.brl} />
        ))}

        <div className="flex flex-col gap-1 border-t border-dashed border-border pt-2 text-xs text-muted-foreground">
          <span className="flex items-start gap-1.5">
            <CalendarRange className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>Período: {r.meta.period}</span>
          </span>
          <span className="flex items-start gap-1.5">
            <Database className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>Registros: {r.meta.records}</span>
          </span>
          {r.brl && <span className="pl-5">Conversão: {RATE_NOTE}.</span>}
        </div>

        {r.suggestions && r.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="animate-rise flex items-center gap-3" role="status" aria-live="polite">
      <MiaAvatar />
      <div className="flex items-center gap-1 rounded-2xl bg-card px-3.5 py-3 shadow-soft">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-typing size-1.5 rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
        <span className="sr-only">Mia está consultando os dados…</span>
      </div>
    </div>
  );
}
