import { formatMoneyWithBrl, NOT_INFORMED } from "@/lib/finance/format";
import type { Block, Cell, Tone } from "@/lib/finance/response-types";
import { cn } from "@/lib/utils";
import { CreditCard, Info, Landmark, PiggyBank, ShieldAlert } from "lucide-react";

const toneText: Record<Tone, string> = {
  in: "text-inflow",
  out: "text-outflow",
  debt: "text-debt",
  neutral: "text-foreground",
  muted: "text-muted-foreground",
};

const toneBadge: Record<Tone, string> = {
  in: "bg-inflow-soft text-inflow",
  out: "bg-muted text-outflow",
  debt: "bg-debt-soft text-debt",
  neutral: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function CellView({ cell, brl }: { cell: Cell; brl: boolean }) {
  if (typeof cell === "string") return <>{cell}</>;
  if ("badge" in cell) {
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
          toneBadge[cell.tone ?? "neutral"],
        )}
      >
        {cell.badge}
      </span>
    );
  }
  const text = formatMoneyWithBrl(cell.money, cell.currency ?? "USD", brl);
  const missing = cell.money === null;
  const sign = !missing && cell.direction ? (cell.direction === "out" ? "− " : "+ ") : "";
  return (
    <span
      className={cn(
        "num font-semibold",
        missing ? "font-normal text-muted-foreground italic" : toneText[cell.tone ?? "neutral"],
      )}
    >
      {sign}
      {text}
    </span>
  );
}

function TextBlock({ block }: { block: Extract<Block, { type: "text" }> }) {
  if (block.tone === "notice") {
    return (
      <p className="flex gap-2 rounded-xl border border-notice-border bg-notice px-3 py-2 text-sm text-notice-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{block.text}</span>
      </p>
    );
  }
  if (block.tone === "refusal") {
    return (
      <p className="flex gap-2.5 rounded-xl border border-border bg-muted px-3.5 py-3 text-[0.95rem] leading-relaxed">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>{block.text}</span>
      </p>
    );
  }
  return <p className="text-[0.95rem] leading-relaxed">{block.text}</p>;
}

function StatsBlock({ block, brl }: { block: Extract<Block, { type: "stats" }>; brl: boolean }) {
  return (
    <div className={cn("grid gap-2", block.items.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
      {block.items.map((it) => (
        <div key={it.label} className="min-w-0 rounded-xl border border-border bg-card px-3.5 py-3 shadow-soft">
          <div className="text-xs font-medium text-muted-foreground">{it.label}</div>
          <div className="mt-1 text-lg break-words">
            <CellView cell={it.cell} brl={brl} />
          </div>
          {it.hint && <div className="mt-1 text-xs text-muted-foreground">{it.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function AccountsBlock({ block, brl }: { block: Extract<Block, { type: "accounts" }>; brl: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {block.items.map((a) => {
        const Icon = a.isCredit ? CreditCard : a.typeLabel === "Poupança" ? PiggyBank : Landmark;
        return (
          <div key={a.name} className="min-w-0 rounded-xl border border-border bg-card p-3.5 shadow-soft">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                  a.isCredit ? "bg-debt-soft text-debt" : "bg-primary-soft text-primary",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{a.name}</div>
                <div className="text-xs text-muted-foreground">
                  {a.typeLabel} · final {a.mask} · {a.currency ?? NOT_INFORMED}
                </div>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <dt className="text-muted-foreground">{a.isCredit ? "Saldo atual (dívida)" : "Saldo atual"}</dt>
                <dd>
                  <CellView cell={{ money: a.current, currency: a.currency, tone: a.isCredit ? "debt" : "neutral" }} brl={brl} />
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <dt className="text-muted-foreground">{a.isCredit ? "Crédito disponível" : "Disponível"}</dt>
                <dd>
                  <CellView cell={{ money: a.available, currency: a.currency, tone: a.isCredit ? "neutral" : "in" }} brl={brl} />
                </dd>
              </div>
              {a.isCredit && (
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <dt className="text-muted-foreground">Limite</dt>
                  <dd>
                    <CellView cell={{ money: a.limit, currency: a.currency }} brl={brl} />
                  </dd>
                </div>
              )}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function TableBlock({ block, brl }: { block: Extract<Block, { type: "table" }>; brl: boolean }) {
  const primary = block.columns.find((c) => c.primary) ?? block.columns[0];
  const rest = block.columns.filter((c) => c.key !== primary.key);
  return (
    <section className="min-w-0">
      {block.title && <h3 className="mb-2 text-sm font-semibold">{block.title}</h3>}

      {/* Desktop: tabela */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-soft md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 text-xs text-muted-foreground">
              <tr>
                {block.columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn("px-3 py-2 font-semibold whitespace-nowrap", c.align === "right" ? "text-right" : "text-left")}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {block.columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-2 align-top",
                        c.align === "right" ? "text-right whitespace-nowrap" : "text-left",
                        c.primary && "font-medium",
                      )}
                    >
                      <CellView cell={row[c.key] ?? "–"} brl={brl} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Celular: cada linha vira um cartão compacto */}
      <ul className="space-y-2 md:hidden">
        {block.rows.map((row, i) => (
          <li key={i} className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft">
            <div className="text-sm font-semibold break-words">
              <CellView cell={row[primary.key] ?? "–"} brl={brl} />
            </div>
            <dl className="mt-1.5 space-y-1 text-xs">
              {rest.map((c) => (
                <div key={c.key} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">{c.label}</dt>
                  <dd className="min-w-0 text-right break-words">
                    <CellView cell={row[c.key] ?? "–"} brl={brl} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {block.footnote && <p className="mt-1.5 text-xs text-muted-foreground">{block.footnote}</p>}
    </section>
  );
}

function BarsBlock({ block, brl }: { block: Extract<Block, { type: "bars" }>; brl: boolean }) {
  const max = Math.max(...block.items.map((i) => i.amount), 0) || 1;
  return (
    <section className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
      {block.title && <h3 className="mb-3 text-sm font-semibold">{block.title}</h3>}
      <ul className="space-y-3">
        {block.items.map((it) => (
          <li key={it.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium">{it.label}</span>
              <CellView cell={{ money: it.amount, currency: block.currency }} brl={brl} />
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((it.amount / max) * 100, 2)}%` }} />
            </div>
            {it.hint && <div className="mt-1 text-xs text-muted-foreground">{it.hint}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BlockView({ block, brl }: { block: Block; brl: boolean }) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "stats":
      return <StatsBlock block={block} brl={brl} />;
    case "accounts":
      return <AccountsBlock block={block} brl={brl} />;
    case "table":
      return <TableBlock block={block} brl={brl} />;
    case "bars":
      return <BarsBlock block={block} brl={brl} />;
  }
}
