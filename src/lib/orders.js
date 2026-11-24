// Order rules: stages, money, deadlines, capacity, tag codes and the WhatsApp messages.
export const STAGES = [
  { key: 'received', label: 'Received', short: 'New', cls: 'bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200' },
  { key: 'cutting', label: 'Cutting', short: 'Cut', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300' },
  { key: 'sewing', label: 'Sewing', short: 'Sew', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
  { key: 'fitting', label: 'Fitting', short: 'Fit', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  { key: 'finishing', label: 'Finishing', short: 'Finish', cls: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300' },
  { key: 'ready', label: 'Ready', short: 'Ready', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { key: 'collected', label: 'Collected', short: 'Done', cls: 'bg-stone-200 text-stone-600 dark:bg-white/5 dark:text-stone-400' },
];
export const STAGE = Object.fromEntries(STAGES.map((s, i) => [s.key, { ...s, i }]));
/** The stages a worker can be given (the sewing steps). */
export const WORK_STAGES = ['cutting', 'sewing', 'finishing'];
export const nextStage = (k) => STAGES[Math.min(STAGE[k].i + 1, STAGES.length - 1)].key;
export const isOpen = (o) => o.stage !== 'collected' && !o.cancelled;

export const GARMENTS = ['Kaba & slit', 'Dress', 'Skirt & blouse', 'Jumpsuit', 'Shirt', 'Trousers', 'Shirt & trousers', 'Smock (fugu)', 'Agbada', 'Kaftan', 'Suit', 'Bridal gown', 'Kente outfit', 'School uniform', 'Alteration', 'Other'];

const r2 = (n) => Math.round(n * 100) / 100;
export const paidFor = (payments, orderId) => r2(payments.filter((p) => p.order_id === orderId && !p.voided).reduce((s, p) => s + Number(p.amount), 0));
export const balanceOf = (o, payments) => r2(Math.max(0, Number(o.price || 0) - paidFor(payments, o.id)));

/** YYYY-MM-DD in local time. */
export const ymd = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return ymd(new Date(y, m - 1, d + n)); };
export const daysBetween = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 86400000); };

/** "overdue" | "today" | "soon" (≤3 days) | "ok" | "none" for an open order. */
export function urgency(o, today = ymd()) {
  if (!o.due_date || !isOpen(o) || o.stage === 'ready') return 'none';
  const d = daysBetween(today, o.due_date);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 3) return 'soon';
  return 'ok';
}

/** Open orders due on a day (pieces, so group members count one each). */
export const loadOn = (orders, day) => orders.filter((o) => isOpen(o) && o.stage !== 'ready' && o.due_date === day).length;

/** Warning text if adding one more on `day` goes over the shop's daily limit, else ''. */
export function capacityWarning(orders, day, perDay, ignoreId = null) {
  if (!day || !perDay) return '';
  const n = orders.filter((o) => o.id !== ignoreId && isOpen(o) && o.stage !== 'ready' && o.due_date === day).length;
  if (n + 1 > perDay) return `You already have ${n} piece${n === 1 ? '' : 's'} due that day (your limit is ${perDay}). Consider a later date.`;
  return '';
}

/** First day from `from` with room for one more piece. */
export function nextFreeDay(orders, from, perDay, maxLook = 120) {
  for (let i = 0; i < maxLook; i++) { const d = addDays(from, i); if (loadOn(orders, d) < perDay) return d; }
  return addDays(from, maxLook);
}

/** Fabric tag code: prefix + zero-padded number, e.g. SB-0142. */
export const tagCode = (prefix, n) => `${(prefix || 'SB').toUpperCase()}-${String(n).padStart(4, '0')}`;
/** Pulls a tag code out of whatever a QR / search holds (a link or plain text). */
export function parseTag(text) {
  const m = String(text || '').toUpperCase().match(/([A-Z]{1,5})-(\d{1,6})/);
  return m ? `${m[1]}-${m[2].padStart(4, '0')}` : null;
}
/** Random token for public links (tracking, group sign-up). */
export const token = (n = 10) => Array.from({ length: n }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');

/** Ghana numbers → international for wa.me (0244… → 233244…). */
export function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('233')) return d;
  if (d.startsWith('0')) return `233${d.slice(1)}`;
  if (d.length === 9) return `233${d}`;
  return d;
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

const money = (n, cur) => `${cur} ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nice = (s) => { if (!s) return ''; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
const first = (n) => String(n || '').trim().split(/\s+/)[0] || 'there';

/** WhatsApp message texts. `kind`: received | ready | fitting | balance | receipt | collected */
export function message(kind, { order, customer, shop, paid = 0, balance = 0, link = '', amount = 0 }) {
  const cur = shop?.currency || 'GH₵';
  const hi = `Hello ${first(customer?.name)},`;
  const sign = `\n\n— ${shop?.name || 'Your designer'}${shop?.phone ? ` (${shop.phone})` : ''}`;
  const track = link ? `\nTrack your order: ${link}` : '';
  const what = `${order.title || order.garment}${order.code ? ` (${order.code})` : ''}`;
  switch (kind) {
    case 'received':
      return `${hi} we have received your order: ${what}.\nPrice: ${money(order.price, cur)} · Paid: ${money(paid, cur)} · Balance: ${money(balance, cur)}${order.fitting_date ? `\nFitting: ${nice(order.fitting_date)}` : ''}${order.due_date ? `\nReady by: ${nice(order.due_date)}` : ''}${track}${sign}`;
    case 'ready':
      return `${hi} good news! Your ${what} is ready for collection.${balance > 0 ? `\nBalance to pay: ${money(balance, cur)}` : ''}${track}${sign}`;
    case 'fitting':
      return `${hi} a reminder that your fitting for ${what} is on ${nice(order.fitting_date)}. Please come by.${track}${sign}`;
    case 'balance':
      return `${hi} a gentle reminder: the balance on your ${what} is ${money(balance, cur)}. You can pay by MoMo${shop?.momo ? ` to ${shop.momo}` : ''}.${track}${sign}`;
    case 'receipt':
      return `${hi} thank you! We received ${money(amount, cur)} for ${what}.\nTotal paid: ${money(paid, cur)} · Balance: ${money(balance, cur)}${track}${sign}`;
    case 'uncollected':
      return `${hi} your ${what} has been ready since ${nice(order.ready_on)} and is still waiting for you. Please come for it soon.${balance > 0 ? `\nBalance: ${money(balance, cur)}` : ''}${sign}`;
    default:
      return `${hi}${track}${sign}`;
  }
}

/** Ready orders not collected for at least `days` days. */
export const uncollected = (orders, days = 7, today = ymd()) => orders.filter((o) => o.stage === 'ready' && o.ready_on && daysBetween(o.ready_on, today) >= days);

/** Pay owed to a worker: finished tasks not yet paid. */
export const owedTo = (tasks, staffId) => r2(tasks.filter((t) => t.staff_id === staffId && t.done_at && !t.paid).reduce((s, t) => s + Number(t.rate || 0), 0));
