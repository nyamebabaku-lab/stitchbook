// Demo backend: a pretend server kept in this browser, filled with a sample fashion shop.
import { idbStorage } from '../lib/idbStorage';
import { addDays, ymd, tagCode, token, nextStage, STAGE } from '../lib/orders';
import { blendPreview } from '../lib/image';

const KEY = 'stitchbook-demodb-v2'; // v2: real photos, trial, stock
export const DEMO_USERS = { owner: 'demo-owner', staff: 'demo-s1', admin: 'demo-admin' };
const SHOP = 'demo-shop';

let db = null;
let rnd = 11;
const rand = () => { rnd = (rnd * 16807) % 2147483647; return (rnd - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const iso = (d) => new Date(d).toISOString();
// Real sample photos (Pexels, free licence) shipped in public/samples/.
const pic = (n) => `samples/${n}.jpg`;
const FABRICS = ['f-kente', 'f-wax-yellow', 'f-ankara-green', 'f-stack', 'f-hanging', 'f-print-bw', 'f-wax-blue'];

function seed() {
  rnd = 11;
  const today = ymd();
  const now = Date.now();
  const shop = {
    id: SHOP, name: 'Ama Couture', phone: '0244 000 001', address: 'Adum, Kumasi', momo: '0244 000 001 (Ama Owusu)', currency: 'GH₵', unit: 'in',
    tag_prefix: 'AC', next_tag: 1, per_day: 3, plan: 'solo', paid_until: null, trial_until: addDays(today, 18), ai_credits: 5, markup: 50, shop_token: 'amacouture1', created_at: iso(now - 200 * 86400000),
  };
  const members = [
    { user_id: DEMO_USERS.owner, shop_id: SHOP, role: 'owner', name: 'Ama Owusu', phone: '0244000001', status: 'active' },
    { user_id: DEMO_USERS.staff, shop_id: SHOP, role: 'staff', name: 'Kojo Asare', phone: '0244000002', status: 'active' },
    { user_id: 'demo-s2', shop_id: SHOP, role: 'staff', name: 'Abena Frimpong', phone: '0244000003', status: 'active' },
    { user_id: 'demo-s3', shop_id: SHOP, role: 'staff', name: 'Yaw Darko', phone: '0244000004', status: 'pending' },
  ];
  const people = [
    ['Akosua Mensah', 'female'], ['Efua Boateng', 'female'], ['Kwame Nkrumah Jnr', 'male'], ['Adwoa Sarpong', 'female'], ['Nana Yaa Agyeman', 'female'],
    ['Kofi Ofori', 'male'], ['Esi Quaye', 'female'], ['Abena Asantewaa', 'female'], ['Yaw Bonsu', 'male'], ['Afia Kyei', 'female'],
    ['Maame Serwaa', 'female'], ['Kojo Antwi', 'male'], ['Ama Pokuaa (child)', 'child'], ['Gifty Amponsah', 'female'],
  ];
  const customers = people.map(([name, gender], i) => ({ id: `c${i + 1}`, shop_id: SHOP, name, gender, phone: `024${String(5000000 + i * 1371).padStart(7, '0')}`, notes: i === 0 ? 'Likes fitted styles. Always wants pockets.' : '', created_at: iso(now - (150 - i * 8) * 86400000) }));
  const base = { female: { bust: 36, underbust: 31, waist: 30, hip: 41, shoulder: 15, nipple: 7.5, sh_nipple: 10, sh_underbust: 13, sh_waist: 16, armhole: 16, sleeve: 10, round_sleeve: 12, blouse_len: 22, skirt_len: 42, dress_len: 46 },
    male: { neck: 15.5, chest: 40, stomach: 36, seat: 41, shoulder: 18, sleeve: 25, short_sleeve: 10, round_sleeve: 14, cuff: 9, top_len: 30, agbada_len: 54, trouser_len: 41, trouser_waist: 34, thigh: 24, knee: 17, bottom: 15 },
    child: { chest: 24, waist: 22, hip: 26, shoulder: 10, sleeve: 6, round_sleeve: 8, top_len: 15, dress_len: 26, trouser_len: 24 } };
  const vary = (v) => Object.fromEntries(Object.entries(v).map(([k, n]) => [k, Math.round((n + (rand() - 0.5) * n * 0.12) * 4) / 4]));
  const measurements = [];
  for (const c of customers) {
    const v = vary(base[c.gender]);
    measurements.push({ id: id(), shop_id: SHOP, customer_id: c.id, unit: 'in', values: v, note: '', source: 'shop', taken_at: iso(now - 120 * 86400000), created_at: iso(now - 120 * 86400000) });
    if (rand() < 0.4) {
      const v2 = { ...v }; const k = c.gender === 'male' ? 'stomach' : 'waist'; v2[k] = v[k] + 1; v2[c.gender === 'male' ? 'seat' : 'hip'] += 0.5;
      measurements.push({ id: id(), shop_id: SHOP, customer_id: c.id, unit: 'in', values: v2, note: 'Re-measured for new order', source: 'shop', taken_at: iso(now - 20 * 86400000), created_at: iso(now - 20 * 86400000) });
    }
  }
  const latestFor = (cid) => measurements.filter((m) => m.customer_id === cid).sort((a, b) => b.taken_at.localeCompare(a.taken_at))[0];
  const styles = {
    female: [['w-print-dress', 'Kaba & slit'], ['w-print-suit', 'Skirt & blouse'], ['w-lace-print', 'Dress'], ['w-lace-gown', 'Dress']],
    male: [['m-smock-blue', 'Smock (fugu)'], ['m-kaftan-maroon', 'Kaftan'], ['m-agbada-white', 'Agbada'], ['m-agbada-navy', 'Agbada'], ['m-agbada-blue', 'Agbada']],
    child: [['c-print-dress', 'Dress'], ['c-print-girl', 'Dress']],
  };
  let n = 1;
  const orders = []; const payments = []; const tasks = [];
  const plan = [
    // [customer, stage, dueOffset, fittingOffset, price, paidShare, titleOverride]
    [1, 'sewing', 2, 0, 450, 0.5, 'Engagement kaba & slit'], [2, 'cutting', 5, 2, 380, 0.5], [3, 'fitting', 1, 0, 600, 0.6, 'Kente agbada for wedding'],
    [4, 'received', 9, 5, 300, 0.3], [5, 'ready', -3, null, 520, 0.5], [6, 'finishing', 0, null, 280, 1], [7, 'sewing', -1, null, 350, 0.4],
    [8, 'ready', -12, null, 400, 0.5], [9, 'collected', -20, null, 250, 1], [10, 'received', 14, 9, 900, 0.5, 'Bridal gown — lace'],
    [11, 'cutting', 3, 1, 320, 0.5], [12, 'collected', -8, null, 300, 1], [13, 'sewing', 6, null, 150, 0.5, 'Christmas dress'], [14, 'received', 2, null, 350, 0],
    [1, 'collected', -60, null, 300, 1, 'Office dress'],
  ];
  for (const [ci, stage, due, fit, price, share, title] of plan) {
    const c = customers[ci - 1];
    let [shape, garment] = pick(styles[c.gender]);
    let fab = pick(FABRICS);
    if (/Bridal/.test(title || '')) { shape = 'w-bride-lace'; garment = 'Bridal gown'; fab = 'f-lace'; }
    if (/Kente/.test(title || '')) { shape = 'm-kente'; fab = 'f-kente'; }
    if (/Christmas/.test(title || '')) shape = 'c-kente-girl';
    const m = latestFor(c.id);
    const created = now - (25 + Math.max(0, -due)) * 86400000;
    const o = {
      id: id(), shop_id: SHOP, customer_id: c.id, event_id: null, code: tagCode(shop.tag_prefix, n++), garment, title: title || garment,
      style_photos: [pic(shape)], fabric_photo: pic(fab), fabric_note: `${fab === 'f-kente' ? '4' : fab === 'f-lace' ? '5' : '6'} yards, customer's fabric`,
      measurement: { gender: c.gender, unit: 'in', values: m.values }, price, due_date: addDays(today, due), fitting_date: fit == null ? null : addDays(today, fit),
      stage, ready_on: STAGE[stage].i >= STAGE.ready.i ? addDays(today, Math.min(due, -1)) : null, collected_on: stage === 'collected' ? addDays(today, due + 2) : null,
      notes: ci === 1 ? 'Slit should be fitted; add a peplum to the kaba.' : '', track_token: token(12), cancelled: false, created_at: iso(created), updated_at: iso(created),
    };
    orders.push(o);
    const dep = Math.round(price * Math.min(share, 0.5));
    if (dep) payments.push({ id: id(), shop_id: SHOP, order_id: o.id, amount: dep, method: rand() < 0.6 ? 'momo' : 'cash', note: 'Deposit', at: iso(created), voided: false });
    if (share > 0.5) payments.push({ id: id(), shop_id: SHOP, order_id: o.id, amount: Math.round(price * share) - dep, method: 'momo', note: share >= 1 ? 'Balance' : 'Part payment', at: iso(created + 10 * 86400000), voided: false });
    // Work given to the staff
    for (const st of ['cutting', 'sewing', 'finishing']) {
      if (STAGE[o.stage].i < STAGE[st].i - 0) continue;
      const done = STAGE[o.stage].i > STAGE[st].i;
      tasks.push({ id: id(), shop_id: SHOP, order_id: o.id, stage: st, staff_id: st === 'cutting' ? 'demo-s2' : DEMO_USERS.staff, rate: { cutting: 20, sewing: 60, finishing: 25 }[st], done_at: done ? iso(created + 5 * 86400000) : null, paid: done && o.stage === 'collected', paid_on: done && o.stage === 'collected' ? addDays(today, -5) : null, created_at: iso(created) });
    }
  }
  // A wedding group
  const ev = { id: 'ev1', shop_id: SHOP, name: 'Owusu–Mensah wedding', event_date: addDays(today, 21), garment: 'Kaba & slit', fabric_note: 'Family cloth: 6 yards each', fabric_photo: pic('f-wax-yellow'), style_photos: [pic('w-print-suit')], price: 250, due_date: addDays(today, 18), join_token: 'weddingdemo1', open: true, notes: 'Bridesmaids and family. Men: smock in the same cloth.', created_at: iso(now - 6 * 86400000) };
  const group = [['Comfort Owusu', 'female', 1], ['Linda Mensah', 'female', 0.5], ['Rita Owusu', 'female', 0], ['Kwaku Owusu', 'male', 1], ['Joyce Mensah', 'female', 0.5], ['Sandra Agyei', 'female', 0]];
  group.forEach(([name, gender, share], i) => {
    const c = { id: `g${i + 1}`, shop_id: SHOP, name, gender, phone: `020${String(7000000 + i * 911).padStart(7, '0')}`, notes: '', created_at: iso(now - 5 * 86400000) };
    customers.push(c);
    const v = vary(base[gender]);
    measurements.push({ id: id(), shop_id: SHOP, customer_id: c.id, unit: 'in', values: v, note: '', source: i % 2 ? 'self' : 'shop', taken_at: iso(now - 4 * 86400000), created_at: iso(now - 4 * 86400000) });
    const o = { id: id(), shop_id: SHOP, customer_id: c.id, event_id: ev.id, code: tagCode(shop.tag_prefix, n++), garment: gender === 'male' ? 'Smock (fugu)' : ev.garment, title: ev.name, style_photos: [pic(gender === 'male' ? 'm-smock-blue' : 'w-print-suit')], fabric_photo: ev.fabric_photo, fabric_note: ev.fabric_note, measurement: { gender, unit: 'in', values: v }, price: ev.price, due_date: ev.due_date, fitting_date: null, stage: i < 2 ? 'cutting' : 'received', ready_on: null, collected_on: null, notes: '', track_token: token(12), cancelled: false, created_at: iso(now - 4 * 86400000) };
    orders.push(o);
    if (share) payments.push({ id: id(), shop_id: SHOP, order_id: o.id, amount: ev.price * share, method: 'momo', note: share === 1 ? 'Full payment' : 'Deposit', at: iso(now - 3 * 86400000), voided: false });
  });
  shop.next_tag = n;
  // Ready-made stock and some sales this month
  const P = (name, photo, category, price, cost, sizes, extra = {}) => ({ id: id(), shop_id: SHOP, name, photos: [pic(photo)], category, price, cost, sizes, description: '', published: true, created_at: iso(now - 30 * 86400000), ...extra });
  const products = [
    P('Ankara two-piece set', 'w-print-suit', 'Women', 450, 260, { S: 1, M: 2, L: 1 }, { description: 'Wax-print top and trousers, fully lined.' }),
    P('Printed maxi dress', 'w-print-dress', 'Women', 380, 210, { M: 2, L: 0, XL: 1 }),
    P('Lace & print evening dress', 'w-lace-print', 'Women', 650, 400, { M: 1, L: 1 }),
    P('Embroidered kaftan', 'm-kaftan-maroon', 'Men', 520, 300, { M: 1, L: 2, XL: 1 }),
    P('White agbada set', 'm-agbada-white', 'Men', 900, 560, { L: 1, XL: 1 }, { description: 'Three-piece agbada with cap. Hand embroidery.' }),
    P('Girls’ party dress', 'c-print-dress', 'Kids', 220, 110, { '4-5y': 2, '6-7y': 1 }),
    P('Kente stole', 'f-kente', 'Accessories', 300, 180, { 'One size': 3 }),
    P('Blue embroidered smock', 'm-smock-blue', 'Men', 480, 290, { L: 1 }, { published: false }),
  ];
  const sales = [
    [0, 'M', 450, 'momo', 'Dela K.', 6], [3, 'L', 520, 'cash', '', 4], [5, '4-5y', 220, 'momo', 'Mrs Asante', 2], [6, 'One size', 300, 'cash', '', 1],
  ].map(([i, size, amount, method, who, daysAgo]) => ({ id: id(), shop_id: SHOP, product_id: products[i].id, product_name: products[i].name, size, qty: 1, amount, method, customer_name: who, customer_phone: '', note: '', at: iso(now - daysAgo * 86400000) }));
  const aiJobs = [];
  const otherShops = [
    { id: 'shop-2', name: 'Kofi Tailoring', phone: '0207000111', plan: 'solo', paid_until: null, trial_until: addDays(today, 3), ai_credits: 0, created_at: iso(now - 40 * 86400000), customers: 18 },
    { id: 'shop-3', name: 'Bella Bridals', phone: '0557000222', plan: 'studio', paid_until: addDays(today, 12), trial_until: addDays(today, -78), ai_credits: 0, created_at: iso(now - 90 * 86400000), customers: 140 },
    { id: 'shop-4', name: 'Kente Kings', phone: '0267000333', plan: 'studio', paid_until: addDays(today, -4), trial_until: addDays(today, -100), ai_credits: 0, created_at: iso(now - 120 * 86400000), customers: 76 },
  ];
  const requests = [{ id: 'rq1', shop_id: 'shop-2', plan: 'studio', months: 1, amount: 99, momo_ref: '7712345678', status: 'pending', created_at: iso(now - 3600000) }];
  return { shop, members, customers, measurements, orders, payments, tasks, events: [ev], aiJobs, inviteCode: 'AMA247', otherShops, requests, products, sales };
}

async function load() {
  if (db) return db;
  try { const raw = await idbStorage.getItem(KEY); db = raw ? JSON.parse(raw) : null; } catch { db = null; }
  if (!db) { db = seed(); await persist(); }
  return db;
}
const persist = () => idbStorage.setItem(KEY, JSON.stringify(db));
export async function resetDemo() { db = seed(); await persist(); }

const TABLE = { customers: 'customers', measurements: 'measurements', orders: 'orders', payments: 'payments', tasks: 'tasks', events: 'events', aiJobs: 'aiJobs', requests: 'requests', products: 'products', sales: 'sales' };
let current = null;

export const demo = {
  async session() { return current ? { userId: current } : null; },
  async signIn(phone) {
    await load();
    const digits = String(phone).replace(/\D/g, '').slice(-9);
    if (digits === '200000000') { current = DEMO_USERS.admin; return { userId: current }; }
    const p = db.members.find((x) => x.phone.replace(/\D/g, '').slice(-9) === digits);
    if (!p) throw new Error('No demo account with that phone. Use the “Try the demo” buttons.');
    current = p.user_id;
    return { userId: current };
  },
  async signUp(phone) { current = `demo-${String(phone).replace(/\D/g, '')}`; return { userId: current }; },
  async signOut() { current = null; },
  async restore(userId) { current = userId; },
  async createShop() { throw new Error('The demo already has a shop — use “Try as the designer”.'); },
  async joinShop(name, phone, code) {
    await load();
    if (String(code).toUpperCase() !== db.inviteCode) throw new Error(`Wrong invite code — in the demo it is ${db.inviteCode}`);
    db.members.push({ user_id: current, shop_id: SHOP, role: 'staff', name, phone, status: 'pending' });
    await persist();
  },
  async changePassword() {},

  async fetch(userId) {
    await load();
    if (userId === DEMO_USERS.admin) return { me: { user_id: userId, role: 'admin', name: 'Platform admin', status: 'active' }, platformAdmin: true, shop: null };
    const me = db.members.find((p) => p.user_id === userId) || null;
    if (!me) return { me: null };
    if (me.status !== 'active') return { me, shop: { name: db.shop.name } };
    const owner = me.role === 'owner';
    return {
      me, shop: db.shop, platformAdmin: false,
      members: owner ? db.members : db.members.filter((m) => m.status === 'active'),
      inviteCode: owner ? db.inviteCode : '',
      customers: db.customers, measurements: db.measurements, orders: db.orders, events: db.events,
      payments: owner ? db.payments : [],
      tasks: owner ? db.tasks : db.tasks.filter((t) => t.staff_id === userId),
      aiJobs: owner ? db.aiJobs : [],
      requests: owner ? db.requests.filter((r) => r.shop_id === SHOP) : [],
      products: owner ? db.products : [],
      sales: owner ? db.sales : [],
    };
  },

  async push(op) {
    await load();
    const now = new Date().toISOString();
    switch (op.t) {
      case 'up': {
        const k = TABLE[op.table]; const row = { shop_id: SHOP, ...op.row };
        db[k] = db[k].some((r) => r.id === row.id) ? db[k].map((r) => (r.id === row.id ? { ...r, ...row, updated_at: now } : r)) : [...db[k], row];
        break;
      }
      case 'del': { const k = TABLE[op.table]; db[k] = db[k].filter((r) => r.id !== op.id); break; }
      case 'shop': { const { plan: _p, paid_until: _u, ai_credits: _c, ...rest } = op.patch; db.shop = { ...db.shop, ...rest, ...(op.demoPlan ? op.patch : {}) }; break; }
      case 'member': db.members = db.members.map((m) => (m.user_id === op.id ? { ...m, ...op.patch } : m)); break;
      case 'memberDel': db.members = db.members.filter((m) => m.user_id !== op.id); db.tasks = db.tasks.filter((t) => t.staff_id !== op.id); break;
      case 'invite': db.inviteCode = op.code; break;
      case 'staffDone': {
        const t = db.tasks.find((x) => x.id === op.id); if (!t) throw new Error('Task not found');
        t.done_at = op.done ? now : null;
        const o = db.orders.find((x) => x.id === t.order_id);
        if (op.done && o && STAGE[o.stage].i <= STAGE[t.stage].i) { o.stage = nextStage(t.stage); if (o.stage === 'ready') o.ready_on = ymd(); }
        break;
      }
      default: throw new Error(`Unknown change ${op.t}`);
    }
    await persist();
    return null;
  },

  // ---------------- public pages (in the demo they only work in this browser)
  async track(tok) {
    await load();
    const o = db.orders.find((x) => x.track_token === tok);
    if (!o) return null;
    const c = db.customers.find((x) => x.id === o.customer_id);
    const paid = db.payments.filter((p) => p.order_id === o.id && !p.voided).reduce((s, p) => s + Number(p.amount), 0);
    const { name, phone, momo, currency, address } = db.shop;
    return { shop: { name, phone, momo, currency, address }, order: { ...o, paid }, customer: c?.name.split(' ')[0] };
  },
  async catalog(tok) {
    await load();
    if (tok !== db.shop.shop_token) return null;
    const { name, phone, currency, address, momo } = db.shop;
    return { shop: { name, phone, currency, address, momo }, products: db.products.filter((p) => p.published).map(({ cost: _c, ...p }) => p) };
  },
  async eventInfo(tok) {
    await load();
    const e = db.events.find((x) => x.join_token === tok);
    if (!e) return null;
    const { name, phone, currency, unit, momo } = db.shop;
    return { shop: { name, phone, currency, unit, momo }, event: { ...e, joined: db.orders.filter((o) => o.event_id === e.id).length } };
  },
  async eventJoin(tok, { name, phone, gender, unit, values, note }) {
    await load();
    const e = db.events.find((x) => x.join_token === tok);
    if (!e) throw new Error('This link is not valid');
    if (!e.open) throw new Error('Sign-up for this group is closed');
    const c = { id: id(), shop_id: SHOP, name, phone, gender, notes: '', created_at: new Date().toISOString() };
    db.customers.push(c);
    db.measurements.push({ id: id(), shop_id: SHOP, customer_id: c.id, unit, values, note: note || '', source: 'self', taken_at: c.created_at, created_at: c.created_at });
    const tk = token(12);
    db.orders.push({ id: id(), shop_id: SHOP, customer_id: c.id, event_id: e.id, code: tagCode(db.shop.tag_prefix, db.shop.next_tag++), garment: e.garment || 'Other', title: e.name, style_photos: e.style_photos, fabric_photo: e.fabric_photo, fabric_note: e.fabric_note, measurement: { gender, unit, values }, price: e.price, due_date: e.due_date, fitting_date: null, stage: 'received', ready_on: null, collected_on: null, notes: note || '', track_token: tk, cancelled: false, created_at: c.created_at });
    await persist();
    return tk;
  },

  // ---------------- AI style preview (demo: drawn on the phone, no AI service)
  async stylePreview({ orderId, stylePhoto, fabricPhoto }) {
    await load();
    if (db.shop.ai_credits <= 0) throw new Error('No AI credits left. Top up in Plan & billing.');
    const result = await blendPreview(stylePhoto, fabricPhoto);
    db.shop.ai_credits -= 1;
    const job = { id: id(), shop_id: SHOP, order_id: orderId || null, status: 'done', prompt: '', result, created_at: new Date().toISOString() };
    db.aiJobs.push(job);
    await persist();
    return { job, credits: db.shop.ai_credits };
  },
  async requestUpgrade(row) { await load(); const r = { id: id(), shop_id: SHOP, status: 'pending', created_at: new Date().toISOString(), ...row }; db.requests.push(r); await persist(); return r; },
  /** Demo only: try the app as a different plan. */
  async demoPlan(kind) {
    await load();
    const t = ymd();
    if (kind === 'trial') Object.assign(db.shop, { plan: 'solo', paid_until: null, trial_until: addDays(t, 18) });
    else if (kind === 'expired') Object.assign(db.shop, { paid_until: null, trial_until: addDays(t, -2) });
    else Object.assign(db.shop, { plan: kind, paid_until: addDays(t, 40), trial_until: addDays(t, -2) });
    if (db.shop.ai_credits < 3) db.shop.ai_credits = 5;
    await persist();
  },

  // ---------------- platform admin
  async adminData() {
    await load();
    const mine = { ...db.shop, customers: db.customers.length };
    return { shops: [mine, ...db.otherShops], requests: db.requests };
  },
  async adminSetShop(shopId, patch) {
    await load();
    if (shopId === SHOP) db.shop = { ...db.shop, ...patch }; else db.otherShops = db.otherShops.map((s) => (s.id === shopId ? { ...s, ...patch } : s));
    await persist();
  },
  async adminApprove(reqId) {
    await load();
    const r = db.requests.find((x) => x.id === reqId); if (!r) return;
    r.status = 'approved';
    const s = r.shop_id === SHOP ? db.shop : db.otherShops.find((x) => x.id === r.shop_id);
    if (s) { const from = s.paid_until && s.paid_until > ymd() ? s.paid_until : ymd(); const [y, m, d] = from.split('-').map(Number); s.plan = r.plan; s.paid_until = ymd(new Date(y, m - 1 + r.months, d)); if (r.plan === 'business') s.ai_credits = (s.ai_credits || 0) + 20 * r.months; }
    await persist();
  },
  async adminReject(reqId) { await load(); db.requests = db.requests.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r)); await persist(); },
};
