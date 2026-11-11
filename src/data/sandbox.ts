/**
 * Amostra LOCAL e FICTÍCIA, no formato das respostas da Plaid Sandbox
 * (`POST /accounts/get` e `POST /transactions/get`).
 *
 * - Os nomes de contas e estabelecimentos seguem o padrão do Sandbox da Plaid
 *   (usuário de teste `user_good`), mas os registros foram montados à mão para
 *   a Etapa 1 do guia: nenhum dado aqui veio de um banco real.
 * - Na Plaid, `amount` POSITIVO é SAÍDA de dinheiro e NEGATIVO é ENTRADA.
 * - Em contas de crédito, `balances.current` é a DÍVIDA, não dinheiro disponível.
 */

export type AccountType = "depository" | "credit";

export interface Account {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string;
  type: AccountType;
  subtype: string;
  balances: {
    current: number | null;
    available: number | null;
    limit: number | null;
    iso_currency_code: string;
  };
}

export type CategoryPrimary =
  | "INCOME"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "LOAN_PAYMENTS"
  | "FOOD_AND_DRINK"
  | "TRANSPORTATION"
  | "TRAVEL"
  | "GENERAL_MERCHANDISE"
  | "ENTERTAINMENT";

export interface Transaction {
  transaction_id: string;
  account_id: string;
  date: string; // AAAA-MM-DD
  name: string;
  merchant_name: string | null;
  amount: number; // positivo = saída, negativo = entrada
  iso_currency_code: string;
  pending: boolean;
  personal_finance_category: { primary: CategoryPrimary };
}

/** Data de referência da amostra (exibida na interface). */
export const REFERENCE_DATE = "2026-10-31";

export const accounts: Account[] = [
  {
    account_id: "acc_checking",
    name: "Plaid Checking",
    official_name: "Plaid Gold Standard 0% Interest Checking",
    mask: "0000",
    type: "depository",
    subtype: "checking",
    balances: { current: 110, available: 100, limit: null, iso_currency_code: "USD" },
  },
  {
    account_id: "acc_saving",
    name: "Plaid Saving",
    official_name: "Plaid Silver Standard 0.1% Interest Saving",
    mask: "1111",
    type: "depository",
    subtype: "savings",
    balances: { current: 210, available: 200, limit: null, iso_currency_code: "USD" },
  },
  {
    account_id: "acc_credit",
    name: "Plaid Credit Card",
    official_name: "Plaid Diamond 12.5% APR Interest Credit Card",
    mask: "3333",
    type: "credit",
    subtype: "credit card",
    balances: { current: 410, available: null, limit: null, iso_currency_code: "USD" },
  },
  {
    account_id: "acc_business",
    name: "Plaid Business Credit Card",
    official_name: null,
    mask: "9999",
    type: "credit",
    subtype: "credit card",
    balances: { current: 5020, available: 4980, limit: 10000, iso_currency_code: "USD" },
  },
];

const t = (
  id: number,
  account_id: string,
  date: string,
  name: string,
  merchant_name: string | null,
  amount: number,
  primary: CategoryPrimary,
  pending = false,
): Transaction => ({
  transaction_id: `tx_${String(id).padStart(3, "0")}`,
  account_id,
  date,
  name,
  merchant_name,
  amount,
  iso_currency_code: "USD",
  pending,
  personal_finance_category: { primary },
});

export const transactions: Transaction[] = [
  t(1, "acc_credit", "2026-09-12", "United Airlines", "United Airlines", 500, "TRAVEL"),
  t(2, "acc_checking", "2026-09-20", "Tectra Inc", "Tectra Inc", -500, "INCOME"),
  t(3, "acc_credit", "2026-09-25", "Starbucks", "Starbucks", 4.33, "FOOD_AND_DRINK"),
  t(4, "acc_checking", "2026-10-02", "Tectra Inc", "Tectra Inc", -500, "INCOME"),
  t(5, "acc_credit", "2026-10-03", "United Airlines", "United Airlines", 500, "TRAVEL"),
  t(6, "acc_credit", "2026-10-05", "Uber 063015 SF**POOL**", "Uber", 5.4, "TRANSPORTATION"),
  t(7, "acc_credit", "2026-10-06", "McDonald's", "McDonald's", 12, "FOOD_AND_DRINK"),
  t(8, "acc_credit", "2026-10-08", "Starbucks", "Starbucks", 4.33, "FOOD_AND_DRINK"),
  t(9, "acc_checking", "2026-10-10", "SparkFun", "SparkFun", 89.4, "GENERAL_MERCHANDISE"),
  t(10, "acc_checking", "2026-10-12", "INTRST PYMNT", null, -4.22, "INCOME"),
  t(11, "acc_credit", "2026-10-14", "Touchstone Climbing", "Touchstone", 78.5, "ENTERTAINMENT"),
  t(12, "acc_checking", "2026-10-15", "CREDIT CARD 3333 PAYMENT *//", null, 25, "LOAN_PAYMENTS"),
  t(13, "acc_business", "2026-10-17", "KFC", "KFC", 500, "FOOD_AND_DRINK"),
  t(14, "acc_business", "2026-10-18", "Madison Bicycle Shop", "Madison Bicycle Shop", 500, "GENERAL_MERCHANDISE"),
  t(15, "acc_saving", "2026-10-20", "CD DEPOSIT .INITIAL.", null, 1000, "TRANSFER_OUT"),
  t(16, "acc_credit", "2026-10-22", "Uber 072515 SF**POOL**", "Uber", 6.33, "TRANSPORTATION"),
  t(17, "acc_credit", "2026-10-24", "Starbucks", "Starbucks", 4.33, "FOOD_AND_DRINK"),
  t(18, "acc_business", "2026-10-27", "AUTOMATIC PAYMENT - THANK", null, -2078.5, "LOAN_PAYMENTS"),
  t(19, "acc_credit", "2026-10-29", "McDonald's", "McDonald's", 12, "FOOD_AND_DRINK", true),
];
