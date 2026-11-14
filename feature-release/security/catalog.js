// Cash-out catalog + spin prize table. Keep ids stable: clients reference them.

export const REDEEM_CATALOG = [
  {
    id: "google-play",
    title: "Redeem Coins as Google Play (IN)",
    kind: "google-play",
    options: [
      { id: "gp-1", coinsRequired: 4800, amount: "15", currency: "₹" },
      { id: "gp-2", coinsRequired: 9600, amount: "30", currency: "₹" },
      { id: "gp-3", coinsRequired: 19200, amount: "60", currency: "₹" },
    ],
  },
  {
    id: "amazon",
    title: "Redeem Coins as Amazon (IN)",
    kind: "amazon",
    options: [
      { id: "az-1", coinsRequired: 4800, amount: "15", currency: "₹" },
      { id: "az-2", coinsRequired: 9600, amount: "30", currency: "₹" },
      { id: "az-3", coinsRequired: 19200, amount: "60", currency: "₹" },
    ],
  },
  {
    id: "imps",
    title: "Redeem Coins as IMPS",
    kind: "imps",
    options: [
      { id: "imps-1", coinsRequired: 8000, amount: "25", currency: "₹" },
      { id: "imps-2", coinsRequired: 16000, amount: "50", currency: "₹" },
      { id: "imps-3", coinsRequired: 32000, amount: "100", currency: "₹" },
    ],
  },
  {
    id: "paypal",
    title: "Redeem Coins as Paypal",
    kind: "paypal",
    options: [
      { id: "pp-1", coinsRequired: 128000, amount: "5", currency: "$" },
      { id: "pp-2", coinsRequired: 256000, amount: "10", currency: "$" },
      { id: "pp-3", coinsRequired: 512000, amount: "20", currency: "$" },
    ],
  },
];

export const REDEMPTIONS_PER_DAY = 5;

// Weighted spin wheel: value is coins unless kind === "diamonds".
export const SPIN_PRIZES = [
  { id: "coins-50", kind: "coins", value: 50, weight: 26 },
  { id: "coins-100", kind: "coins", value: 100, weight: 22 },
  { id: "coins-250", kind: "coins", value: 250, weight: 16 },
  { id: "coins-500", kind: "coins", value: 500, weight: 10 },
  { id: "gems-5", kind: "diamonds", value: 5, weight: 14 },
  { id: "gems-10", kind: "diamonds", value: 10, weight: 8 },
  { id: "gems-25", kind: "diamonds", value: 25, weight: 3 },
  { id: "jackpot", kind: "coins", value: 2500, weight: 1 },
];

export function findRedeemOption(optionId) {
  for (const category of REDEEM_CATALOG) {
    const option = category.options.find((item) => item.id === optionId);
    if (option) return { category, option };
  }
  return null;
}

export function pickSpinPrize(rng = () => crypto.getRandomValues(new Uint32Array(1))[0]/4294967296) {
  const total = SPIN_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = rng() * total;
  for (const prize of SPIN_PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return SPIN_PRIZES[0];
}
