import type { Block } from "../lib/assistente";

/** "US$ 4,33 (≈ R$ 23,38)" vira duas linhas: dólar em cima, real embaixo. */
function Valor({ v }: { v: string }) {
  const m = v.match(/^(.*?) \((≈ R\$ .*)\)$/);
  if (!m) return <>{v}</>;
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span>{m[1]}</span>
      <span className="text-xs font-normal text-gray-500">{m[2]}</span>
    </span>
  );
}

const toneClass = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  debt: "bg-rose-50 text-rose-700 ring-rose-200",
  neutral: "bg-gray-100 text-gray-700 ring-gray-200",
};

export function Blocos({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "text":
            return (
              <p key={i} className="leading-relaxed">
                {b.text}
              </p>
            );
          case "note":
            return (
              <p key={i} className="text-xs leading-relaxed text-gray-500">
                {b.text}
              </p>
            );
          case "cards":
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                {b.items.map((c) => (
                  <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{c.title}</p>
                        {c.subtitle && <p className="text-xs text-gray-500">{c.subtitle}</p>}
                      </div>
                      {c.tag && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${toneClass[c.tone ?? "neutral"]}`}>
                          {c.tag}
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 space-y-1 text-sm">
                      {c.lines.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt className="text-gray-500">{k}</dt>
                          <dd className={`text-right font-medium tabular-nums ${v === "Não informado" ? "text-gray-400" : ""}`}><Valor v={v} /></dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            );
          case "table":
            return (
              <div key={i}>
                {b.title && <p className="mb-1 text-sm font-semibold text-gray-800">{b.title}</p>}
                {/* Celular: cada linha vira um cartão compacto, para o valor nunca ficar escondido */}
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white sm:hidden">
                  {b.rows.map((r, ri) => (
                    <li key={ri} className="px-3 py-2 text-sm">
                      <div className="flex justify-between gap-3 font-medium">
                        <span className="min-w-0 break-words">{r.length > 4 ? r[1] : r[0]}</span>
                        <span className="shrink-0 tabular-nums"><Valor v={r.length > 4 ? r[4] : r[r.length - 1]} /></span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {(r.length > 4
                          ? [r[0], r[2], r[3], r[5]]
                          : r.slice(1, -1).map((c, j) => `${b.columns[j + 1]}: ${c}`)
                        ).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        {b.columns.map((c, j) => (
                          <th key={c} className={`whitespace-nowrap px-3 py-2 font-medium ${b.numeric?.includes(j) ? "text-right" : ""}`}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {b.rows.map((r, ri) => (
                        <tr key={ri}>
                          {r.map((cell, j) => (
                            <td
                              key={j}
                              className={`px-3 py-2 ${b.numeric?.includes(j) || j === 0 ? "whitespace-nowrap" : ""} ${b.numeric?.includes(j) ? "text-right tabular-nums" : ""} ${
                                cell.includes("Pendente") ? "text-amber-700" : cell.startsWith("Entrada") ? "text-emerald-800" : ""
                              }`}
                            >
                              <Valor v={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          case "bars": {
            const max = Math.max(...b.items.map((x) => x.value), 1);
            return (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-gray-800">{b.title}</p>
                <ul className="space-y-2">
                  {b.items.map((x) => (
                    <li key={x.label} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span>{x.label}</span>
                        <span className="tabular-nums text-gray-600"><Valor v={x.display} /></span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(2, (x.value / max) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
