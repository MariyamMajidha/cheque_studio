// path: renderer/src/lib/amountToWords.ts
// English words tailored for MVR (Rufiyaa/Laari)
const small = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function toWords(n: number): string {
  if (n < 20) return small[n];
  if (n < 100)
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + small[n % 10] : "");
  if (n < 1000)
    return (
      small[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " " + toWords(n % 100) : "")
    );
  if (n < 1_000_000)
    return (
      toWords(Math.floor(n / 1000)) +
      " Thousand" +
      (n % 1000 ? " " + toWords(n % 1000) : "")
    );
  if (n < 1_000_000_000)
    return (
      toWords(Math.floor(n / 1_000_000)) +
      " Million" +
      (n % 1_000_000 ? " " + toWords(n % 1_000_000) : "")
    );
  return (
    toWords(Math.floor(n / 1_000_000_000)) +
    " Billion" +
    (n % 1_000_000_000 ? " " + toWords(n % 1_000_000_000) : "")
  );
}

export function amountToWords(
  amount: number,
  currency = "Rufiyaa",
  subunit = "Laari"
) {
  const whole = Math.floor(amount);
  const frac = Math.round((amount - whole) * 100);
  const main = `${toWords(whole)} ${currency}`;
  const sub = frac ? ` and ${toWords(frac)} ${subunit}` : "";
  // Ensure trailing "Only"
  return `${main}${sub} Only`.trim();
}
