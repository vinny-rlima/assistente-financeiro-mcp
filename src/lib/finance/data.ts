import type { Account, Transaction } from "./types";

/**
 * Dados FICTÍCIOS no formato da Plaid Sandbox, apenas para demonstração.
 * Não representam nenhum cliente real nem resultado de integração.
 */
export const REFERENCE_DATE = "2026-10-31";

export const ACCOUNTS: Account[] = [
  {
    account_id: "acc_checking_0000",
    name: "Plaid Checking",
    official_name: "Plaid Gold Standard 0% Interest Checking",
    mask: "0000",
    type: "depository",
    subtype: "checking",
    balances: { current: 110, available: 100, limit: null, iso_currency_code: "USD" },
  },
  {
    account_id: "acc_saving_1111",
    name: "Plaid Saving",
    official_name: "Plaid Silver Standard 0.1% Interest Saving",
    mask: "1111",
    type: "depository",
    subtype: "savings",
    balances: { current: 210, available: 200, limit: null, iso_currency_code: "USD" },
  },
  {
    account_id: "acc_credit_3333",
    name: "Plaid Credit Card",
    official_name: "Plaid Diamond 12.5% APR Interest Credit Card",
    mask: "3333",
    type: "credit",
    subtype: "credit card",
    balances: { current: 410, available: null, limit: null, iso_currency_code: "USD" },
  },
  {
    account_id: "acc_business_9999",
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
  primary: NonNullable<Transaction["personal_finance_category"]>["primary"],
  pending = false,
): Transaction => ({
  transaction_id: `txn_${String(id).padStart(3, "0")}`,
  account_id,
  date,
  name,
  merchant_name,
  amount,
  iso_currency_code: "USD",
  pending,
  personal_finance_category: { primary },
});

const CHK = "acc_checking_0000";
const SAV = "acc_saving_1111";
const CC = "acc_credit_3333";
const BIZ = "acc_business_9999";

export const TRANSACTIONS: Transaction[] = [
  t(1, SAV, "2026-09-12", "CD DEPOSIT .INITIAL.", null, -1000, "INCOME"),
  t(2, CHK, "2026-09-14", "United Airlines", "United Airlines", 500, "TRAVEL"),
  t(3, CC, "2026-09-15", "Uber 063015 SF**POOL**", "Uber", 5.4, "TRANSPORTATION"),
  t(4, CC, "2026-09-18", "McDonald's", "McDonald's", 12, "FOOD_AND_DRINK"),
  t(5, CC, "2026-09-20", "Starbucks", "Starbucks", 4.33, "FOOD_AND_DRINK"),
  t(6, BIZ, "2026-09-22", "SparkFun", "SparkFun", 89.4, "GENERAL_MERCHANDISE"),
  t(7, CHK, "2026-09-25", "Tectra Inc", "Tectra Inc", -500, "INCOME"),
  t(8, CHK, "2026-09-28", "CREDIT CARD 3333 PAYMENT *//", null, 25, "LOAN_PAYMENTS"),
  t(9, CHK, "2026-09-30", "Transfer to Plaid Saving", null, 50, "TRANSFER_OUT"),
  t(10, CC, "2026-10-02", "Touchstone Climbing", "Touchstone Climbing", 78.5, "ENTERTAINMENT"),
  t(11, CC, "2026-10-05", "KFC", "KFC", 9.8, "FOOD_AND_DRINK"),
  t(12, BIZ, "2026-10-08", "Madison Bicycle Shop", "Madison Bicycle Shop", 500, "GENERAL_MERCHANDISE"),
  t(13, CC, "2026-10-10", "Uber 072515 SF**POOL**", "Uber", 6.33, "TRANSPORTATION"),
  t(14, BIZ, "2026-10-12", "United Airlines", "United Airlines", 120, "TRAVEL"),
  t(15, CHK, "2026-10-15", "Tectra Inc", "Tectra Inc", -500, "INCOME"),
  t(16, CC, "2026-10-18", "Starbucks", "Starbucks", 4.33, "FOOD_AND_DRINK"),
  t(17, CHK, "2026-10-20", "CREDIT CARD 3333 PAYMENT *//", null, 25, "LOAN_PAYMENTS"),
  t(18, BIZ, "2026-10-25", "SparkFun", "SparkFun", 89.4, "GENERAL_MERCHANDISE"),
  t(19, CC, "2026-10-29", "McDonald's", "McDonald's", 12, "FOOD_AND_DRINK", true),
];
