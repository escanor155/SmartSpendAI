
export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const currencies: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export const defaultCurrency = currencies[0]; // USD
