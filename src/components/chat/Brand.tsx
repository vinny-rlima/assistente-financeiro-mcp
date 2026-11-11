import { cn } from "@/lib/utils";

export function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-brand inline-flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-lg font-semibold text-primary-foreground shadow-soft",
        className,
      )}
    >
      M
    </span>
  );
}

export function MiaAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary-soft font-display text-sm font-semibold text-primary-soft-foreground",
        className,
      )}
    >
      Mi
    </span>
  );
}

/** Selo permanente: a demonstração usa apenas dados fictícios. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-notice-border bg-notice px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-notice-foreground",
        className,
      )}
    >
      Demonstração · Dados fictícios
    </span>
  );
}

/** Nunca mostrar "Conectado" enquanto não houver API integrada. */
export function LocalModeIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/60" />
      Modo local · sem integração
    </span>
  );
}
