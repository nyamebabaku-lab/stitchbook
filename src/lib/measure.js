// Measurement templates. Keys are stable (saved in the database); labels are what the designer sees.
export const TEMPLATES = {
  female: {
    label: 'Woman',
    fields: [
      ['bust', 'Bust'], ['underbust', 'Under bust'], ['waist', 'Waist'], ['hip', 'Hip'],
      ['shoulder', 'Shoulder'], ['nipple', 'Nipple to nipple'], ['sh_nipple', 'Shoulder to nipple'],
      ['sh_underbust', 'Shoulder to under bust'], ['sh_waist', 'Shoulder to waist'], ['neck', 'Neck'],
      ['armhole', 'Armhole'], ['sleeve', 'Sleeve length'], ['round_sleeve', 'Round sleeve'],
      ['blouse_len', 'Blouse / top length'], ['skirt_len', 'Skirt / slit length'], ['dress_len', 'Dress length'],
      ['knee', 'Waist to knee'], ['thigh', 'Thigh'],
    ],
  },
  male: {
    label: 'Man',
    fields: [
      ['neck', 'Neck'], ['chest', 'Chest'], ['stomach', 'Stomach / waist'], ['seat', 'Seat / hip'],
      ['shoulder', 'Shoulder'], ['sleeve', 'Long sleeve'], ['short_sleeve', 'Short sleeve'], ['round_sleeve', 'Round sleeve'],
      ['cuff', 'Cuff / wrist'], ['top_len', 'Top / shirt length'], ['agbada_len', 'Agbada / kaftan length'],
      ['trouser_len', 'Trouser length'], ['trouser_waist', 'Trouser waist'], ['thigh', 'Thigh'],
      ['knee', 'Knee'], ['bottom', 'Trouser bottom'],
    ],
  },
  child: {
    label: 'Child',
    fields: [
      ['chest', 'Chest'], ['waist', 'Waist'], ['hip', 'Hip'], ['shoulder', 'Shoulder'], ['sleeve', 'Sleeve length'],
      ['round_sleeve', 'Round sleeve'], ['top_len', 'Top length'], ['dress_len', 'Dress length'], ['trouser_len', 'Trouser length'],
    ],
  },
};

export const GENDERS = Object.entries(TEMPLATES).map(([value, t]) => ({ value, label: t.label }));

/** Label for a key, including custom fields the designer added. */
export function labelFor(gender, key) {
  const f = TEMPLATES[gender]?.fields.find(([k]) => k === key);
  if (f) return f[1];
  for (const t of Object.values(TEMPLATES)) { const g = t.fields.find(([k]) => k === key); if (g) return g[1]; }
  return key.replace(/^x_/, '').replace(/_/g, ' ');
}

/** A custom field key from what the designer typed ("Slit opening" → "x_slit_opening"). */
export const customKey = (label) => `x_${String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

/** Ordered [key, label, value] rows for display (template order first, then custom fields). */
export function rows(gender, values = {}) {
  const fields = TEMPLATES[gender]?.fields || [];
  const known = new Set(fields.map(([k]) => k));
  const out = fields.filter(([k]) => values[k] != null && values[k] !== '').map(([k, l]) => [k, l, values[k]]);
  for (const [k, v] of Object.entries(values)) if (!known.has(k) && v != null && v !== '') out.push([k, labelFor(gender, k), v]);
  return out;
}

/** Cleans the form: numbers only, empty fields dropped. */
export function clean(values) {
  const out = {};
  for (const [k, v] of Object.entries(values || {})) {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) out[k] = Math.round(n * 100) / 100;
  }
  return out;
}

export const toCm = (inch) => Math.round(inch * 2.54 * 10) / 10;
export const toIn = (cm) => Math.round((cm / 2.54) * 4) / 4;
export function convert(values, from, to) {
  if (from === to) return { ...values };
  const f = to === 'cm' ? toCm : toIn;
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, f(v)]));
}

/** Latest measurement record for a customer. */
export const latest = (list, customerId) => list.filter((m) => m.customer_id === customerId).sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0] || null;

/** Fields that changed between two records (for the history view). */
export function changes(prev, next) {
  if (!prev) return [];
  const out = [];
  for (const [k, v] of Object.entries(next.values)) {
    const old = prev.values[k];
    if (old != null && old !== v) out.push({ key: k, from: old, to: v, diff: Math.round((v - old) * 100) / 100 });
  }
  return out;
}
