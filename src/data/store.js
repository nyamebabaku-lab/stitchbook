// App state, saved on the phone (IndexedDB) so everything works offline.
// Every change is applied here first, queued in `outbox`, and sent to the server when there's internet.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import { DEMO, STORE_KEY } from '../config';
import { live } from './live';
import { demo } from './demo';
import { isNetwork, friendly } from '../lib/supabase';
import { uid } from '../lib/format';
import { tagCode, token, ymd, nextStage, STAGE } from '../lib/orders';

export const api = DEMO ? demo : live;
export const TABLES = ['customers', 'measurements', 'orders', 'payments', 'tasks', 'events', 'aiJobs', 'requests', 'products', 'sales'];

const empty = () => ({
  session: null, me: null, shop: null, inviteCode: '', members: [], platformAdmin: false,
  customers: [], measurements: [], orders: [], payments: [], tasks: [], events: [], aiJobs: [], requests: [], products: [], sales: [],
  outbox: [], lastSync: null,
});

export const useStore = create(
  persist(
    () => ({ ...empty(), hydrated: false, online: typeof navigator === 'undefined' ? true : navigator.onLine, syncing: false, syncError: '', prefs: { dark: null } }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => { const o = {}; for (const k of Object.keys(empty())) o[k] = s[k]; o.prefs = s.prefs; return o; },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);
const set = (p) => useStore.setState(p);
const get = () => useStore.getState();

// ------------------------------------------------------------------ sync
let flushing = null;
/** Sends queued changes in order. Stops at the first "no internet". */
export async function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    while (get().outbox.length) {
      const op = get().outbox[0];
      try {
        const saved = await api.push(op);
        // Photos were uploaded: swap the local copies for the web addresses.
        if (saved?.row && op.table) set({ [op.table]: get()[op.table].map((r) => (r.id === saved.row.id ? { ...r, ...saved.row } : r)) });
        set({ outbox: get().outbox.slice(1), syncError: '' });
      } catch (e) {
        if (isNetwork(e)) { set({ online: false }); break; }
        // The server refused it: drop it so the queue doesn't jam, and say why.
        set({ outbox: get().outbox.slice(1), syncError: friendly(e) });
      }
    }
  })();
  try { await flushing; } finally { flushing = null; }
}

/** Push queued changes, then pull the latest from the server (only when nothing is left to send). */
export async function sync() {
  const s = get();
  if (!s.session || s.syncing) return;
  set({ syncing: true });
  try {
    await flush();
    if (get().outbox.length) return;
    const data = await api.fetch(s.session.userId);
    set({ online: true });
    if (get().outbox.length) return; // a change was made while fetching; next sync picks it up
    set({ ...data, lastSync: new Date().toISOString(), syncError: '' });
  } catch (e) {
    if (isNetwork(e)) set({ online: false }); else set({ syncError: friendly(e) });
  } finally {
    set({ syncing: false });
  }
}

function queue(op) {
  set({ outbox: [...get().outbox, op] });
  flush();
}

// ------------------------------------------------------------------ generic save / delete
/** Saves a row locally and queues it for the server. Returns the saved row. */
export function save(table, row) {
  const now = new Date().toISOString();
  const list = get()[table];
  const old = list.find((r) => r.id === row.id);
  const full = old ? { ...old, ...row, updated_at: now } : { id: uid(), created_at: now, updated_at: now, ...row };
  set({ [table]: old ? list.map((r) => (r.id === full.id ? full : r)) : [...list, full] });
  queue({ t: 'up', table, row: full });
  return full;
}
export function remove(table, id) {
  set({ [table]: get()[table].filter((r) => r.id !== id) });
  queue({ t: 'del', table, id });
}

// ------------------------------------------------------------------ domain actions
export function saveShop(patch) {
  set({ shop: { ...get().shop, ...patch } });
  queue({ t: 'shop', patch });
}

/** Next fabric tag code (made on the phone so it can be printed offline). */
function takeCode() {
  const shop = get().shop;
  const used = new Set(get().orders.map((o) => o.code));
  let n = shop.next_tag || 1;
  while (used.has(tagCode(shop.tag_prefix, n))) n++;
  set({ shop: { ...shop, next_tag: n + 1 } });
  return tagCode(shop.tag_prefix, n);
}

export function createOrder(fields) {
  return save('orders', { stage: 'received', style_photos: [], fabric_note: '', notes: '', cancelled: false, ready_on: null, collected_on: null, event_id: null, ...fields, code: takeCode(), track_token: token(12) });
}

/** Moves an order to a stage, keeping the ready / collected dates right. */
export function setStage(order, stage) {
  const patch = { id: order.id, stage };
  if (stage === 'ready' && !order.ready_on) patch.ready_on = ymd();
  if (STAGE[stage].i < STAGE.ready.i) patch.ready_on = null;
  patch.collected_on = stage === 'collected' ? (order.collected_on || ymd()) : null;
  return save('orders', patch);
}
export const advance = (order) => setStage(order, nextStage(order.stage));

export const addPayment = ({ order_id, amount, method = 'cash', note = '' }) => save('payments', { order_id, amount: Number(amount), method, note, at: new Date().toISOString(), voided: false });

export function addMeasurement(customer_id, unit, values, note = '') {
  return save('measurements', { customer_id, unit, values, note, source: 'shop', taken_at: new Date().toISOString() });
}

/** Sells ready-made pieces: records the sale and takes them out of stock. */
export function sellProduct(product, { size = '', qty = 1, amount, method = 'cash', customer_name = '', customer_phone = '', note = '' }) {
  const sizes = { ...(product.sizes || {}) };
  if (size in sizes) sizes[size] = Math.max(0, Number(sizes[size]) - qty);
  save('products', { id: product.id, sizes });
  return save('sales', { product_id: product.id, product_name: product.name, size, qty, amount: Number(amount), method, customer_name, customer_phone, note, at: new Date().toISOString() });
}
export const stockCount = (p) => Object.values(p?.sizes || {}).reduce((s, n) => s + (Number(n) || 0), 0);

// Staff
export function staffDone(task, done = true) {
  const at = done ? new Date().toISOString() : null;
  set({ tasks: get().tasks.map((t) => (t.id === task.id ? { ...t, done_at: at } : t)) });
  if (done) {
    const o = get().orders.find((x) => x.id === task.order_id);
    if (o && STAGE[o.stage].i <= STAGE[task.stage].i) {
      const nxt = nextStage(task.stage);
      set({ orders: get().orders.map((x) => (x.id === o.id ? { ...x, stage: nxt, ready_on: nxt === 'ready' ? ymd() : x.ready_on } : x)) });
    }
  }
  queue({ t: 'staffDone', id: task.id, done });
}
export function updateMember(id, patch) {
  set({ members: get().members.map((m) => (m.user_id === id ? { ...m, ...patch } : m)) });
  queue({ t: 'member', id, patch });
}
export function removeMember(id) {
  set({ members: get().members.filter((m) => m.user_id !== id), tasks: get().tasks.filter((t) => t.staff_id !== id) });
  queue({ t: 'memberDel', id });
}
export function newInviteCode() {
  const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  set({ inviteCode: code });
  queue({ t: 'invite', code });
}

export const setPrefs = (p) => set({ prefs: { ...get().prefs, ...p } });

// ------------------------------------------------------------------ account
export async function signedIn(session) {
  set({ ...empty(), session });
  await sync();
}
export async function signOut() {
  if (get().outbox.length) await flush();
  try { await api.signOut(); } catch { /* offline: still sign out here */ }
  set({ ...empty() });
}
