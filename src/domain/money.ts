/** How the app writes amounts of money (es-MX pesos). Display only: the server computes totals. */

/** Totals, tickets and charges: always two decimals, "$1,250.00". */
export function formatMoney(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Menu prices: no decimals when they're whole, "$155" or "$42.50". */
export function formatPrice(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
