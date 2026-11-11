export type AccountType = "depository" | "credit";

export interface Balances {
  current: number | null;
  available: number | null;
  limit: number | null;
  iso_currency_code: string | null;
}

export interface Account {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: AccountType;
  subtype: string | null;
  balances: Balances;
}

export type PfcPrimary =
  | "INCOME"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "LOAN_PAYMENTS"
  | "FOOD_AND_DRINK"
  | "TRANSPORTATION"
  | "TRAVEL"
  | "GENERAL_MERCHANDISE"
  | "ENTERTAINMENT"
  | "MEDICAL"
  | "RENT_AND_UTILITIES"
  | "PERSONAL_CARE"
  | "GENERAL_SERVICES";

export interface Transaction {
  transaction_id: string;
  account_id: string;
  /** aaaa-mm-dd */
  date: string;
  name: string;
  merchant_name: string | null;
  /** Convenção Plaid: positivo = SAÍDA, negativo = ENTRADA */
  amount: number;
  iso_currency_code: string | null;
  pending: boolean;
  personal_finance_category: { primary: PfcPrimary } | null;
}

/** Intervalo inclusivo de datas aaaa-mm-dd */
export interface Period {
  start: string;
  end: string;
  label: string;
}
