// Live backend: Supabase (schema "stitchbook"). Same shape as demo.js.
import { supabase } from '../lib/supabase';
import { PHONE_DOMAIN } from '../config';
import { uid } from '../lib/format';
import { dataUrlToBlob } from '../lib/image';

export const phoneEmail = (phone) => `0${String(phone).replace(/\D/g, '').slice(-9)}@${PHONE_DOMAIN}`;
const DB_TABLE = { customers: 'customers', measurements: 'measurements', orders: 'orders', payments: 'payments', tasks: 'tasks', events: 'events', aiJobs: 'ai_jobs', requests: 'upgrade_requests', products: 'products', sales: 'sales' };
const PHOTO_FIELDS = ['photo', 'fabric_photo', 'style_photos', 'result', 'photos'];

async function must(p) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}
async function all(table, order = 'created_at') {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await must(supabase.from(table).select('*').order(order).order('id').range(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

let shopId = null;
/** Uploads a photo kept on the phone (data: URL) and returns its web address. */
async function upload(dataUrl) {
  const blob = await dataUrlToBlob(dataUrl);
  const ext = blob.type === 'image/png' ? 'png' : blob.type.includes('svg') ? 'svg' : 'jpg';
  const path = `${shopId}/${uid()}.${ext}`;
  await must(supabase.storage.from('stitchbook').upload(path, blob, { contentType: blob.type, upsert: false }));
  return supabase.storage.from('stitchbook').getPublicUrl(path).data.publicUrl;
}
async function withUploads(row) {
  let changed = false;
  const out = { ...row };
  for (const f of PHOTO_FIELDS) {
    const v = out[f];
    if (typeof v === 'string' && v.startsWith('data:')) { out[f] = await upload(v); changed = true; }
    if (Array.isArray(v) && v.some((x) => typeof x === 'string' && x.startsWith('data:'))) {
      out[f] = await Promise.all(v.map((x) => (typeof x === 'string' && x.startsWith('data:') ? upload(x) : x)));
      changed = true;
    }
  }
  return { row: out, changed };
}

export const live = {
  async session() {
    const { data } = await supabase.auth.getSession();
    return data.session ? { userId: data.session.user.id } : null;
  },
  async signIn(phone, password) {
    const r = await must(supabase.auth.signInWithPassword({ email: phoneEmail(phone), password }));
    return { userId: r.user.id };
  },
  async signUp(phone, password) {
    const r = await must(supabase.auth.signUp({ email: phoneEmail(phone), password }));
    if (!r.session) throw new Error('Account made, but sign-in needs email confirmation switched off in Supabase.');
    return { userId: r.user.id };
  },
  async signOut() { await supabase.auth.signOut(); },
  async restore() {},
  createShop: (name, phone, shop, prefix) => must(supabase.rpc('create_shop', { p_name: name, p_phone: phone, p_shop: shop, p_prefix: prefix })),
  joinShop: (name, phone, code) => must(supabase.rpc('join_shop', { p_name: name, p_phone: phone, p_code: code })),
  async changePassword(pw) { await must(supabase.auth.updateUser({ password: pw })); },

  /** Everything this account may see (row-level security does the filtering). */
  async fetch(userId) {
    const [me] = await must(supabase.from('members').select('*').eq('user_id', userId));
    const padmin = (await must(supabase.from('platform_admins').select('user_id').eq('user_id', userId))).length > 0;
    if (!me) return padmin ? { me: { user_id: userId, role: 'admin', name: 'Platform admin', status: 'active' }, platformAdmin: true, shop: null } : { me: null };
    if (me.status !== 'active') return { me, shop: null, platformAdmin: padmin };
    shopId = me.shop_id;
    const owner = me.role === 'owner';
    const [shop, members, secret, customers, measurements, orders, events, payments, tasks, aiJobs, requests, products, sales] = await Promise.all([
      must(supabase.from('shops').select('*').eq('id', me.shop_id)),
      must(supabase.from('members').select('*').eq('shop_id', me.shop_id).order('name')),
      owner ? must(supabase.from('shop_secrets').select('invite_code')) : Promise.resolve([]),
      all('customers'), all('measurements', 'taken_at'), all('orders'), all('events'),
      owner ? all('payments', 'at') : Promise.resolve([]),
      all('tasks'),
      owner ? all('ai_jobs') : Promise.resolve([]),
      owner ? all('upgrade_requests') : Promise.resolve([]),
      owner ? all('products') : Promise.resolve([]),
      owner ? all('sales', 'at') : Promise.resolve([]),
    ]);
    return { me, shop: shop[0] || null, members, inviteCode: secret[0]?.invite_code || '', platformAdmin: padmin, customers, measurements, orders, events, payments, tasks, aiJobs, requests, products, sales };
  },

  /** Sends one queued change. Throws on failure. Returns {row} when photos were uploaded. */
  async push(op) {
    switch (op.t) {
      case 'up': {
        const { row, changed } = await withUploads(op.row);
        const clean = { ...row };
        delete clean.shop_id;
        await must(supabase.from(DB_TABLE[op.table]).upsert(clean, { onConflict: 'id' }));
        return changed ? { row } : null;
      }
      case 'del': { await must(supabase.from(DB_TABLE[op.table]).delete().eq('id', op.id)); return null; }
      case 'shop': { const p = { ...op.patch }; delete p.plan; delete p.paid_until; delete p.ai_credits; await must(supabase.from('shops').update(p).eq('id', shopId)); return null; }
      case 'member': await must(supabase.from('members').update(op.patch).eq('user_id', op.id)); return null;
      case 'memberDel': await must(supabase.from('members').delete().eq('user_id', op.id)); return null;
      case 'invite': await must(supabase.from('shop_secrets').update({ invite_code: op.code }).eq('shop_id', shopId)); return null;
      case 'staffDone': await must(supabase.rpc('staff_done', { p_task: op.id, p_done: op.done })); return null;
      default: throw new Error(`Unknown change ${op.t}`);
    }
  },

  // ---------------- public pages (no sign-in)
  track: (tok) => must(supabase.rpc('track_order', { p_token: tok })),
  eventInfo: (tok) => must(supabase.rpc('event_info', { p_token: tok })),
  catalog: (tok) => must(supabase.rpc('shop_catalog', { p_token: tok })),
  eventJoin: (tok, f) => must(supabase.rpc('event_join', { p_token: tok, p_name: f.name, p_phone: f.phone, p_gender: f.gender, p_unit: f.unit, p_values: f.values, p_note: f.note || '' })),

  // ---------------- AI style preview (Edge Function; uses one credit)
  async stylePreview({ orderId, stylePhoto, fabricPhoto, personPhoto, note }) {
    const prep = async (x) => (x && x.startsWith('data:') ? upload(x) : x);
    const body = { order_id: orderId || null, style: await prep(stylePhoto), fabric: await prep(fabricPhoto), person: await prep(personPhoto), note: note || '' };
    const { data, error } = await supabase.functions.invoke('stitchbook-ai', { body });
    if (error) {
      let msg = error.message;
      try { msg = (await error.context.json()).error || msg; } catch { /* keep */ }
      throw new Error(msg);
    }
    return data;
  },
  requestUpgrade: async (row) => (await must(supabase.from('upgrade_requests').insert(row).select()))[0],
  async demoPlan() { throw new Error('Only in the demo'); },

  // ---------------- platform admin
  async adminData() {
    const [shops, requests] = await Promise.all([must(supabase.rpc('admin_shops')), must(supabase.from('upgrade_requests').select('*').order('created_at', { ascending: false }))]);
    return { shops, requests };
  },
  adminSetShop: (id, patch) => must(supabase.from('shops').update(patch).eq('id', id)),
  adminApprove: (id) => must(supabase.rpc('approve_upgrade', { p_id: id })),
  adminReject: (id) => must(supabase.from('upgrade_requests').update({ status: 'rejected' }).eq('id', id)),
};
