// Costing helper (what a piece really costs → a fair price) and the fabric yards estimate.
const r2 = (n) => Math.round(n * 100) / 100;

export const COST_ITEMS = ['Fabric', 'Lining', 'Zip', 'Thread', 'Buttons', 'Interfacing', 'Beads / stones', 'Lace', 'Labour', 'Transport'];
export const costTotal = (items = []) => r2(items.reduce((s, i) => s + (Number(i.amount) || 0), 0));
/** Cost plus markup %, rounded up to the next GH₵ 5. */
export const suggestPrice = (cost, markup = 50) => (cost > 0 ? Math.ceil((cost * (1 + Number(markup || 0) / 100)) / 5) * 5 : 0);
export function profit(price, cost) {
  const p = r2((Number(price) || 0) - cost);
  return { profit: p, margin: price > 0 ? Math.round((p / price) * 100) : 0 };
}

/** Yards of 45-inch fabric for a medium adult (bust/hip ≈ 40 in, average height). */
export const BASE_YARDS = {
  'Kaba & slit': 5, Dress: 3.5, 'Skirt & blouse': 4, Jumpsuit: 4, Shirt: 2.5, Trousers: 2.5, 'Shirt & trousers': 5,
  'Smock (fugu)': 3, Agbada: 8, Kaftan: 4, Suit: 4.5, 'Bridal gown': 8, 'Kente outfit': 5, 'School uniform': 3, Alteration: 0, Other: 4,
};
export const WIDTHS = [{ value: 45, label: '45″ (wax print, most Ankara)' }, { value: 60, label: '60″ (lace, suiting, chiffon)' }, { value: 36, label: '36″ (narrow / some kente)' }];

const girthOf = (v = {}) => Math.max(0, ...['bust', 'hip', 'chest', 'seat', 'stomach'].map((k) => Number(v[k]) || 0));
const lengthOf = (v = {}) => Math.max(0, ...['dress_len', 'agbada_len', 'top_len', 'trouser_len', 'skirt_len'].map((k) => Number(v[k]) || 0));
const REF_LEN = { 'Kaba & slit': 42, Dress: 42, 'Bridal gown': 60, Agbada: 54, Kaftan: 54, Shirt: 30, 'Smock (fugu)': 30, Trousers: 41, 'Shirt & trousers': 41, Jumpsuit: 58, 'Skirt & blouse': 42, Suit: 41 };

/**
 * Estimated yards to buy. `values` are measurements (inches); `child` makes it smaller.
 * Returns { yards, low, high, notes } — always round up to the next half yard.
 */
export function estimateYards({ garment, values = {}, unit = 'in', width = 45, child = false, bigPrint = false, longSleeves = false }) {
  const base = BASE_YARDS[garment] ?? 4;
  if (!base) return { yards: 0, low: 0, high: 0, notes: ['Alterations usually need no new fabric.'] };
  const inch = (n) => (unit === 'cm' ? n / 2.54 : n);
  const notes = [];
  let f = 1;
  const g = inch(girthOf(values));
  if (g) { f *= Math.min(1.7, Math.max(0.55, g / 40)) ** 0.8; if (g > 46) notes.push('Fuller figure: extra width added.'); } else if (child) f *= 0.55;
  const len = inch(lengthOf(values));
  if (len && REF_LEN[garment]) f *= Math.min(1.4, Math.max(0.6, len / REF_LEN[garment])) ** 0.5;
  f *= 45 / width;
  if (bigPrint) { f *= 1.12; notes.push('Big print: extra to match the pattern.'); }
  let y = base * f + (longSleeves ? 0.5 : 0);
  if (garment === 'Bridal gown') notes.push('Add more for a long train or extra layers.');
  const up = (n) => Math.ceil(n * 2 - 0.05) / 2; // tiny rounding slack so 3.501 stays 3.5
  y = up(y);
  return { yards: y, low: up(y * 0.9), high: up(y * 1.1), notes };
}
