import { forwardRef, useState, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { setBrl, useBrl } from "@/lib/chat/store";

export const Composer = forwardRef<
  HTMLTextAreaElement,
  { onSend: (text: string) => void; busy: boolean }
>(function Composer({ onSend, busy }, ref) {
  const [value, setValue] = useState("");
  const brl = useBrl();
  const empty = value.trim().length === 0;

  const submit = () => {
    if (empty || busy) return;
    onSend(value.trim());
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-6 sm:pb-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-2xl border border-input bg-card shadow-composer focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
      >
        <label htmlFor="mia-input" className="sr-only">
          Pergunte à Mia
        </label>
        <textarea
          id="mia-input"
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={500}
          placeholder="Pergunte sobre contas, saldos ou gastos…"
          className="field-sizing-content block max-h-40 min-h-12 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none">
            <Checkbox checked={brl} onCheckedChange={(v) => setBrl(v === true)} aria-label="Valores também em R$" />
            Valores também em R$
          </label>
          <Button type="submit" size="sm" disabled={empty || busy} className="rounded-xl" aria-label="Enviar">
            Enviar <ArrowUp className="size-4" aria-hidden />
          </Button>
        </div>
      </form>
      <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
        Enter envia · Shift+Enter quebra linha · Somente consulta, nenhuma operação é feita
      </p>
    </div>
  );
});
