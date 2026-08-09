export function formatMoney(value: number | bigint | string) {
  return `${new Intl.NumberFormat("uz-UZ").format(Number(value))} so‘m`;
}
export function suggestedPrice(cost: number, percent: 30 | 40) {
  return Math.round((cost * (100 + percent)) / 100 / 1000) * 1000;
}
