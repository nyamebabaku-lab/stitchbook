import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Pencil, Printer, Trash2, Ban, Link2, Wand2, MessageCircle, Plus, Check, ChevronRight, Ruler, Wallet, Users, Tag as TagIcon, Calculator, FileText } from 'lucide-react';
import CostCalc from '../../components/CostCalc';
import { receiptPdf as makeReceipt } from '../../lib/pdf';
import { costTotal, profit } from '../../lib/costing';
import { useStore, setStage, addPayment, save, remove } from '../../data/store';
import { STAGES, STAGE, balanceOf, paidFor, message, waLink, WORK_STAGES, urgency } from '../../lib/orders';
import { rows } from '../../lib/measure';
import { has } from '../../lib/plans';
import { money, dayLabel } from '../../lib/format';
import { publicBase } from '../../config';
import { Card, Button, Modal, Field, Input, Select, Segmented, StagePill, UrgencyPill, Empty, cx } from '../../components/ui';
import Tag from '../../components/Tag';
import { toast } from '../../components/toast';

function Section({ title, icon: Icon, right, children }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4 text-brand-600" />{title}</h2>{right}</div>
      {children}
    </Card>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const go = useNavigate();
  const o = useStore((s) => s.orders.find((x) => x.id === id));
  const shop = useStore((s) => s.shop);
  const customer = useStore((s) => s.customers.find((c) => c.id === o?.customer_id));
  const allPays = useStore((s) => s.payments);
  const tasks = useStore((s) => s.tasks);
  const members = useStore((s) => s.members);
  const event = useStore((s) => s.events.find((e) => e.id === o?.event_id));
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState({ amount: '', method: 'momo', note: '' });
  const [tagOpen, setTagOpen] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [assign, setAssign] = useState(null);
  const [costOpen, setCostOpen] = useState(false);
  const pays = useMemo(() => allPays.filter((p) => p.order_id === id && !p.voided).sort((a, b) => a.at.localeCompare(b.at)), [allPays, id]);
  if (!o) return <Empty title="Order not found"><Link to="/orders" className="text-brand-700">Back to orders</Link></Empty>;
  const cur = shop?.currency;
  const paid = paidFor(allPays, o.id);
  const bal = balanceOf(o, allPays);
  const link = `${publicBase()}#/t/${o.track_token}`;
  const ctx = { order: o, customer, shop, paid, balance: bal, link };
  const wa = (kind, extra = {}) => customer?.phone && window.open(waLink(customer.phone, message(kind, { ...ctx, ...extra })), '_blank');
  const staffOn = has(shop, 'staff');
  const staff = members.filter((m) => m.role === 'staff' && m.status === 'active');
  const st = STAGE[o.stage];

  const receiptPdf = () => makeReceipt({ shop, order: o, customer, payments: allPays }).catch((e) => toast.error('Could not make the PDF', e.message));
  function addPay() {
    const amt = Number(pay.amount);
    if (!(amt > 0)) return toast.error('Enter the amount');
    addPayment({ order_id: o.id, amount: amt, method: pay.method, note: pay.note });
    setPayOpen(false);
    const newPaid = paid + amt; const newBal = Math.max(0, o.price - newPaid);
    toast.success(`${money(amt, cur)} recorded`, newBal ? `Balance now ${money(newBal, cur)}` : 'Fully paid 🎉');
    if (customer?.phone && confirm('Send the customer a receipt on WhatsApp?')) window.open(waLink(customer.phone, message('receipt', { ...ctx, amount: amt, paid: newPaid, balance: newBal })), '_blank');
    setPay({ amount: '', method: 'momo', note: '' });
  }
  function move(stage) {
    setStage(o, stage);
    if (stage === 'ready' && customer?.phone && confirm('Tell the customer it’s ready (WhatsApp)?')) wa('ready', { order: { ...o, stage } });
  }
  function saveTask() {
    if (!assign.staff_id) return toast.error('Choose who will do it');
    save('tasks', { id: assign.id, order_id: o.id, stage: assign.stage, staff_id: assign.staff_id, rate: Number(assign.rate) || 0, done_at: assign.done_at || null, paid: assign.paid || false });
    setAssign(null);
    toast.success('Work assigned');
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <Link to="/orders" className="mb-1 inline-block text-sm font-semibold text-brand-700 dark:text-brand-300">‹ Orders</Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-brand-700 dark:text-brand-300">{o.code}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-stone-900 dark:text-white">{o.title || o.garment}</h1>
            <Link to={`/customers/${customer?.id}`} className="font-semibold text-stone-600 hover:underline dark:text-stone-300">{customer?.name}</Link>
            {event && <Link to={`/groups/${event.id}`} className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Users className="h-3 w-3" />{event.name}</Link>}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setTagOpen(true)} aria-label="Fabric tag"><TagIcon className="h-4 w-4" /></Button>
            <Link to={`/orders/${o.id}/edit`}><Button variant="outline" size="sm" aria-label="Edit"><Pencil className="h-4 w-4" /></Button></Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5"><StagePill stage={o.stage} /><UrgencyPill u={urgency(o)} />{o.cancelled && <span className="rounded-full bg-rose-100 px-2 text-[11px] font-semibold text-rose-700">Cancelled</span>}</div>
      </div>

      {params.get('new') && (
        <Card className="border-brand-200 bg-brand-50 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
          <p className="font-bold text-brand-900 dark:text-brand-100">Order saved — tag the fabric with <span className="font-mono">{o.code}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="wa" size="sm" onClick={() => wa('received')} disabled={!customer?.phone}><MessageCircle className="h-4 w-4" />Send order receipt</Button>
            <Button variant="outline" size="sm" onClick={() => setTagOpen(true)}><Printer className="h-4 w-4" />Print / show tag</Button>
            <Button variant="ghost" size="sm" onClick={() => setParams({})}>Done</Button>
          </div>
        </Card>
      )}

      {/* Photos */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[...(o.style_photos || []), ...(o.fabric_photo ? [o.fabric_photo] : [])].map((src, i, arr) => (
          <button type="button" key={i} onClick={() => setPhoto(src)} className="relative shrink-0">
            <img src={src} alt="" className="h-40 w-32 rounded-2xl object-cover shadow-soft" />
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 text-[10px] font-semibold text-white">{o.fabric_photo && i === arr.length - 1 ? 'Fabric' : 'Style'}</span>
          </button>
        ))}
        {has(shop, 'ai') && <Link to={`/preview?order=${o.id}`} className="flex h-40 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-600 to-ink-900 p-3 text-center text-xs font-semibold text-white"><Wand2 className="h-6 w-6 text-gold-300" />AI style preview</Link>}
      </div>
      {o.fabric_note && <p className="text-sm text-stone-600 dark:text-stone-300"><b>Fabric:</b> {o.fabric_note}</p>}

      {/* Stage */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-1 overflow-x-auto">
          {STAGES.map((s, i) => (
            <button type="button" key={s.key} onClick={() => move(s.key)} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={s.label}>
              <span className={cx('flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold', i < st.i ? 'bg-brand-600 text-white' : i === st.i ? 'bg-gold-400 text-ink-950 ring-4 ring-gold-100 dark:ring-gold-500/20' : 'bg-stone-100 text-stone-400 dark:bg-white/5')}>{i < st.i ? <Check className="h-4 w-4" /> : i + 1}</span>
              <span className={cx('truncate text-[10px] font-semibold', i === st.i ? 'text-stone-900 dark:text-white' : 'text-stone-400')}>{s.short}</span>
            </button>
          ))}
        </div>
        {o.stage !== 'collected' && <Button className="w-full" onClick={() => move(STAGES[st.i + 1].key)}>Move to {STAGES[st.i + 1].label}<ChevronRight className="h-4 w-4" /></Button>}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-stone-500">Ready by</span><br /><b>{o.due_date ? dayLabel(o.due_date, true) : '—'}</b></p>
          <p><span className="text-stone-500">Fitting</span><br /><b>{o.fitting_date ? dayLabel(o.fitting_date, true) : '—'}</b></p>
          {o.ready_on && <p><span className="text-stone-500">Ready since</span><br /><b>{dayLabel(o.ready_on)}</b></p>}
          {o.collected_on && <p><span className="text-stone-500">Collected</span><br /><b>{dayLabel(o.collected_on)}</b></p>}
        </div>
        {o.notes && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm dark:bg-white/5">{o.notes}</p>}
      </Card>

      {/* Money */}
      <Section title="Money" icon={Wallet} right={<Button size="sm" variant="soft" onClick={() => setPayOpen(true)}><Plus className="h-4 w-4" />Payment</Button>}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-stone-50 p-2 dark:bg-white/5"><p className="text-[11px] text-stone-500">Price</p><p className="font-bold">{money(o.price, cur)}</p></div>
          <div className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-500/10"><p className="text-[11px] text-emerald-700 dark:text-emerald-300">Paid</p><p className="font-bold text-emerald-700 dark:text-emerald-300">{money(paid, cur)}</p></div>
          <div className={cx('rounded-xl p-2', bal ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-stone-50 dark:bg-white/5')}><p className="text-[11px] text-stone-500">Balance</p><p className={cx('font-bold', bal && 'text-rose-600 dark:text-rose-400')}>{money(bal, cur)}</p></div>
        </div>
        {pays.length > 0 && (
          <ul className="mt-3 divide-y divide-stone-100 text-sm dark:divide-white/5">
            {pays.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span><b>{money(p.amount, cur)}</b> <span className="text-stone-500">· {p.method.toUpperCase()} · {dayLabel(p.at.slice(0, 10))}{p.note ? ` · ${p.note}` : ''}</span></span>
                <button type="button" className="text-xs text-stone-400 hover:text-rose-600" onClick={() => confirm('Cancel this payment?') && save('payments', { id: p.id, voided: true })}>Undo</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {bal > 0 && customer?.phone && <Button variant="outline" size="sm" onClick={() => wa('balance')}><MessageCircle className="h-4 w-4" />Remind about balance</Button>}
          <Button variant="outline" size="sm" onClick={() => receiptPdf()}><FileText className="h-4 w-4" />PDF receipt</Button>
        </div>
      </Section>

      {/* Cost & profit */}
      <Section title="Cost & profit" icon={Calculator} right={<Button size="sm" variant="soft" onClick={() => setCostOpen(true)}>{o.costs?.length ? 'Edit' : 'Work it out'}</Button>}>
        {o.costs?.length ? (() => { const c = costTotal(o.costs); const pr = profit(o.price, c); return (
          <div className="text-sm">
            <p className="text-stone-500">{o.costs.map((x) => `${x.name} ${money(x.amount, cur)}`).join(' · ')}</p>
            <p className="mt-2 flex justify-between"><span>Cost</span><b>{money(c, cur)}</b></p>
            <p className={cx('flex justify-between', pr.profit < 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400')}><span>{pr.profit < 0 ? 'Loss' : 'Profit'}</span><b>{money(Math.abs(pr.profit), cur)} ({pr.margin}%)</b></p>
          </div>
        ); })() : <p className="text-sm text-stone-500">Add fabric, lining, zips and labour to see your real profit.</p>}
        <Link to={`/yards?order=${o.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300"><Ruler className="h-4 w-4" />How many yards to buy?</Link>
      </Section>

      {/* Measurements */}
      <Section title="Measurements" icon={Ruler} right={<span className="text-xs text-stone-500">{o.measurement?.unit === 'cm' ? 'cm' : 'inches'}</span>}>
        {o.measurement ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {rows(o.measurement.gender, o.measurement.values).map(([k, l, v]) => <p key={k} className="flex justify-between gap-2 border-b border-dashed border-stone-200 py-1 dark:border-white/10"><span className="truncate capitalize text-stone-500">{l}</span><b>{v}</b></p>)}
          </div>
        ) : <p className="text-sm text-stone-500">No measurements on this order. <Link className="font-semibold text-brand-700" to={`/orders/${o.id}/edit`}>Add them</Link></p>}
      </Section>

      {/* Work */}
      {staffOn && (
        <Section title="Who is working on it" icon={Users}>
          <div className="space-y-2">
            {WORK_STAGES.map((stg) => {
              const t = tasks.find((x) => x.order_id === o.id && x.stage === stg);
              const who = members.find((m) => m.user_id === t?.staff_id);
              return (
                <div key={stg} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 p-2.5 text-sm dark:bg-white/5">
                  <span className="w-20 font-semibold">{STAGE[stg].label}</span>
                  <span className="min-w-0 flex-1 truncate">{who ? <>{who.name} · {money(t.rate, cur)} {t.done_at ? <span className="text-emerald-600">✓ done</span> : ''}</> : <span className="text-stone-400">Not assigned</span>}</span>
                  <Button size="sm" variant="ghost" onClick={() => setAssign(t ? { ...t } : { stage: stg, staff_id: staff[0]?.user_id || '', rate: { cutting: 20, sewing: 60, finishing: 25 }[stg] })} disabled={!staff.length}>{t ? 'Change' : 'Assign'}</Button>
                </div>
              );
            })}
            {!staff.length && <p className="text-xs text-stone-500">Add staff in <Link to="/team" className="font-semibold text-brand-700">Team</Link> to give them work.</p>}
          </div>
        </Section>
      )}

      {/* Share */}
      <Section title="Tell the customer" icon={MessageCircle}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="wa" size="sm" onClick={() => wa('received')} disabled={!customer?.phone}>Order receipt</Button>
          <Button variant="wa" size="sm" onClick={() => wa('ready')} disabled={!customer?.phone}>It’s ready</Button>
          <Button variant="outline" size="sm" onClick={() => wa('fitting')} disabled={!customer?.phone || !o.fitting_date}>Fitting reminder</Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(link); toast.success('Tracking link copied'); }}><Link2 className="h-4 w-4" />Copy tracking link</Button>
        </div>
        <a href={link} target="_blank" rel="noreferrer" className="mt-2 block text-center text-xs font-semibold text-brand-700 dark:text-brand-300">Open the customer’s tracking page ›</a>
        {!customer?.phone && <p className="mt-2 text-xs text-stone-500">Add the customer’s phone number to send WhatsApp messages.</p>}
      </Section>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => { save('orders', { id: o.id, cancelled: !o.cancelled }); }}><Ban className="h-4 w-4" />{o.cancelled ? 'Restore order' : 'Cancel order'}</Button>
        <Button variant="ghost" className="text-rose-600" onClick={() => { if (confirm('Delete this order and its payments for good?')) { remove('orders', o.id); go('/orders', { replace: true }); } }}><Trash2 className="h-4 w-4" /></Button>
      </div>

      {costOpen && <CostCalc open onClose={() => setCostOpen(false)} items={o.costs || []} price={o.price} markup={shop?.markup ?? 50} currency={cur} onSave={(costs, newPrice) => { save('orders', { id: o.id, costs, ...(newPrice ? { price: newPrice } : {}) }); setCostOpen(false); toast.success(newPrice ? `Price set to ${money(newPrice, cur)}` : 'Costs saved'); }} />}

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record a payment" footer={<Button className="w-full" onClick={addPay}>Save payment</Button>}>
        <div className="space-y-3">
          <Field label={`Amount (${cur})`} hint={bal ? `Balance is ${money(bal, cur)}` : ''}><Input autoFocus inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
          {bal > 0 && <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => setPay({ ...pay, amount: String(bal) })}>Pay full balance</button>}
          <Segmented value={pay.method} onChange={(v) => setPay({ ...pay, method: v })} options={[{ value: 'momo', label: 'MoMo' }, { value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank' }]} />
          <Field label="Note (optional)"><Input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder="MoMo ref, who paid…" /></Field>
        </div>
      </Modal>

      <Modal open={tagOpen} onClose={() => setTagOpen(false)} title="Fabric tag" footer={<Button className="w-full" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>}>
        <div className="flex justify-center"><Tag order={o} customer={customer} shop={shop} /></div>
        <p className="mt-3 text-center text-xs text-stone-500">Pin the printed tag to the fabric, or write <b className="font-mono">{o.code}</b> on a paper tag. Scan it later to open this order.</p>
      </Modal>

      <Modal open={!!assign} onClose={() => setAssign(null)} title={`Assign ${assign ? STAGE[assign.stage].label.toLowerCase() : ''}`} footer={<>{assign?.id && <Button variant="ghost" className="text-rose-600" onClick={() => { remove('tasks', assign.id); setAssign(null); }}>Remove</Button>}<Button className="flex-1" onClick={saveTask}>Save</Button></>}>
        {assign && (
          <div className="space-y-3">
            <Field label="Who"><Select value={assign.staff_id} onChange={(e) => setAssign({ ...assign, staff_id: e.target.value })}>{staff.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</Select></Field>
            <Field label={`Pay for this piece (${cur})`}><Input inputMode="decimal" value={assign.rate} onChange={(e) => setAssign({ ...assign, rate: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      {photo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPhoto(null)}><img src={photo} alt="" className="max-h-full max-w-full rounded-xl" /></div>}
    </div>
  );
}
