export type Tone = "in" | "out" | "debt" | "neutral" | "muted";

export type Cell =
  | string
  | {
      money: number | null;
      currency?: string | null;
      /** Mostra sinal: saída (−) ou entrada (+) */
      direction?: "in" | "out";
      tone?: Tone;
    }
  | { badge: string; tone?: Tone };

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Coluna usada como título do cartão no celular */
  primary?: boolean;
}

export type Block =
  | { type: "text"; text: string; tone?: "default" | "refusal" | "notice" }
  | {
      type: "stats";
      items: { label: string; cell: Cell; hint?: string; tone?: Tone }[];
    }
  | {
      type: "accounts";
      items: {
        name: string;
        typeLabel: string;
        mask: string;
        isCredit: boolean;
        currency: string | null;
        current: number | null;
        available: number | null;
        limit: number | null;
      }[];
    }
  | {
      type: "table";
      title?: string;
      columns: TableColumn[];
      rows: Record<string, Cell>[];
      footnote?: string;
    }
  | {
      type: "bars";
      title?: string;
      items: { label: string; amount: number; hint?: string }[];
      currency: string;
    };

export interface AssistantResponse {
  blocks: Block[];
  meta: {
    period: string;
    records: string;
  };
  brl: boolean;
  suggestions?: string[];
}
