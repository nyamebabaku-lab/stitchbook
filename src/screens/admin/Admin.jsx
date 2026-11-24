import { useEffect, useState, useCallback } from 'react';
import { Store, LogOut, Check, X, RefreshCw } from 'lucide-react';
import { api, signOut } from '../../data/store';
import { PLANS, paidActive, subscription } from '../../lib/plans';
import { dayLabel, money } from '../../lib/format';
import { addDays, ymd } from '../../lib/orders';
import { PageHead, Card, Button, Modal, Field, Input, Select, Stat } from '../../components/ui';
import { toast } from '../../components/toast';
import Logo from '../../components/Logo';

/** Platform admin (the StitchBook owner): every shop, plans, payments to approve, AI credits. */
export default function Admin() {
  const [d, setD] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => api.adminData().then(setD).catch((e) => toast.error('Could not load', e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function act(fn, msg) { try { await fn(); toast.success(msg); load(); } catch (e) { toast.error('Failed', e.message); } }
  const shops = d?.shops || [];
  const pending = (d?.requests || []).filter((r) => r.status === 'pending');
  const paying = shops.filter((s) => paidActive(s));
  const trials = shops.filter((s) => subscription(s).kind === 'trial');
  const mrr = paying.reduce((sum, s) => sum + PLANS[s.plan].price, 0);
  const name = (id) => shops.find((s) => s.id === id)?.name || id;
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 dark:bg-ink-950">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3"><Logo className="h-10 w-10" /><div className="flex-1"><p className="text-lg font-extrabold">StitchBook Admin</p><p className="text-sm text-stone-500">All shops on the platform</p></div><Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4" /></Button></div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Shops" value={shops.length} icon={Store} />
          <Stat label="Paying" value={paying.length} sub={`${trials.length} on free trial`} icon={Store} tone="green" />
          <Stat label="Monthly income" value={money(mrr)} icon={Store} tone="violet" />
          <Stat label="Payments to check" value={pending.length} icon={Store} tone={pending.length ? 'rose' : 'amber'} />
        </div>
        {pending.length > 0 && (
          <Card className="p-4">
            <PageHead title="Payments to check" />
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 py-3 text-sm dark:border-white/5">
                <span><b>{name(r.shop_id)}</b> · {PLANS[r.plan].label} × {r.months} mo · {money(r.amount)} · MoMo ref <span className="font-mono">{r.momo_ref}</span></span>
                <span className="flex gap-2"><Button size="sm" variant="success" onClick={() => act(() => api.adminApprove(r.id), 'Approved — plan switched on')}><Check className="h-4 w-4" />Approve</Button><Button size="sm" variant="ghost" onClick={() => act(() => api.adminReject(r.id), 'Rejected')}><X className="h-4 w-4" /></Button></span>
              </div>
            ))}
          </Card>
        )}
        <Card className="divide-y divide-stone-100 dark:divide-white/5">
          {shops.map((s) => (
            <button type="button" key={s.id} onClick={() => setEdit({ ...s, paid_until: s.paid_until || '' })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-white/5">
              <div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="text-xs text-stone-500">{s.owner || s.phone} · {s.customers ?? '—'} customers · since {dayLabel(String(s.created_at).slice(0, 10), true)}</p></div>
              <div className="text-right text-sm"><b>{PLANS[s.plan].label}</b>{(() => { const st = subscription(s); return <p className={st.kind === 'expired' ? 'text-xs text-rose-600' : st.kind === 'trial' ? 'text-xs text-amber-600' : 'text-xs text-emerald-600'}>{st.kind === 'paid' ? `paid to ${dayLabel(s.paid_until)}` : st.kind === 'trial' ? `trial · ${st.days} days left` : 'trial/plan ended'}{s.ai_credits ? ` · ${s.ai_credits} AI` : ''}</p>; })()}</div>
            </button>
          ))}
        </Card>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name} footer={<Button className="w-full" onClick={() => { const { id, plan, paid_until, trial_until, ai_credits } = edit; act(() => api.adminSetShop(id, { plan, paid_until: paid_until || null, trial_until, ai_credits: Number(ai_credits) || 0 }), 'Shop updated'); setEdit(null); }}>Save</Button>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Plan"><Select value={edit.plan} onChange={(e) => setEdit({ ...edit, plan: e.target.value })}>{Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select></Field>
            <Field label="Paid until" hint="Empty = not paid (trial only)"><Input type="date" value={edit.paid_until} onChange={(e) => setEdit({ ...edit, paid_until: e.target.value })} /></Field>
            <div className="flex gap-2">{[1, 3, 12].map((m) => <Button key={m} size="sm" variant="outline" onClick={() => setEdit({ ...edit, paid_until: addDays(edit.paid_until && edit.paid_until > ymd() ? edit.paid_until : ymd(), m * 30) })}>+{m} mo</Button>)}</div>
            <Field label="Free trial until"><Input type="date" value={edit.trial_until || ''} onChange={(e) => setEdit({ ...edit, trial_until: e.target.value })} /></Field>
            <Field label="AI preview credits"><Input inputMode="numeric" value={edit.ai_credits} onChange={(e) => setEdit({ ...edit, ai_credits: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
