import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Users, Link2, MessageCircle, Lock, Unlock, Trash2 } from 'lucide-react';
import { useStore, save, remove, createOrder } from '../../data/store';
import { GARMENTS, balanceOf, paidFor, STAGE, token, ymd, addDays } from '../../lib/orders';
import { latest } from '../../lib/measure';
import { has, canWrite } from '../../lib/plans';
import { money, dayLabel } from '../../lib/format';
import { publicBase } from '../../config';
import { PageHead, Card, Button, Field, Input, Select, Textarea, Empty, Locked, Modal, StagePill, Thumb, Paywall } from '../../components/ui';
import PhotoPicker from '../../components/PhotoPicker';
import { toast } from '../../components/toast';

export function Groups() {
  const shop = useStore((s) => s.shop);
  const events = useStore((s) => s.events);
  const orders = useStore((s) => s.orders);
  if (!has(shop, 'groups')) return <Locked feature="groups" />;
  return (
    <div className="animate-fade-in">
      <PageHead title="Group orders" sub="Weddings, funerals, church & school uniforms" right={<Link to="/groups/new"><Button size="sm"><Plus className="h-4 w-4" />New group</Button></Link>} />
      <div className="space-y-2">
        {[...events].sort((a, b) => (b.event_date || '').localeCompare(a.event_date || '')).map((e) => {
          const mine = orders.filter((o) => o.event_id === e.id);
          const done = mine.filter((o) => STAGE[o.stage].i >= STAGE.ready.i).length;
          return (
            <Link key={e.id} to={`/groups/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white p-3 shadow-soft dark:border-white/5 dark:bg-ink-900">
              <Thumb src={e.style_photos?.[0] || e.fabric_photo} className="h-16 w-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.name}</p>
                <p className="text-sm text-stone-500">{e.event_date ? dayLabel(e.event_date, true) : 'No date'} · {mine.length} people · {done} ready</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10"><div className="h-full bg-brand-600" style={{ width: `${mine.length ? (done / mine.length) * 100 : 0}%` }} /></div>
              </div>
            </Link>
          );
        })}
        {!events.length && <Empty icon={Users} title="No group orders yet">Create a group, share the link, and each person enters their own measurements.</Empty>}
      </div>
    </div>
  );
}

export function GroupForm() {
  const { id } = useParams();
  const go = useNavigate();
  const editing = useStore((s) => s.events.find((e) => e.id === id));
  const cur = useStore((s) => s.shop?.currency);
  const [f, setF] = useState(editing ? { ...editing, price: String(editing.price) } : { name: '', event_date: addDays(ymd(), 21), due_date: addDays(ymd(), 18), garment: GARMENTS[0], price: '', fabric_note: '', fabric_photo: null, style_photos: [], notes: '', open: true });
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const shop = useStore((s) => s.shop);
  if (!editing && !canWrite(shop)) return <Paywall />;
  function submit() {
    if (f.name.trim().length < 3) return toast.error('Give the group a name');
    const e = save('events', { ...(editing ? { id: editing.id } : { join_token: token(12) }), name: f.name.trim(), event_date: f.event_date || null, due_date: f.due_date || null, garment: f.garment, price: Number(f.price) || 0, fabric_note: f.fabric_note, fabric_photo: f.fabric_photo, style_photos: f.style_photos, notes: f.notes, open: f.open });
    go(`/groups/${e.id}`, { replace: true });
  }
  return (
    <div className="animate-fade-in">
      <PageHead title={editing ? 'Edit group' : 'New group order'} back={editing ? `/groups/${editing.id}` : '/groups'} />
      <Card className="space-y-3 p-4">
        <Field label="Group name"><Input value={f.name} onChange={set('name')} placeholder="e.g. Owusu–Mensah wedding" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Event date"><Input type="date" value={f.event_date || ''} onChange={set('event_date')} /></Field>
          <Field label="Ready by"><Input type="date" value={f.due_date || ''} onChange={set('due_date')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Garment"><Select value={f.garment} onChange={set('garment')}>{GARMENTS.map((g) => <option key={g}>{g}</option>)}</Select></Field>
          <Field label={`Price per person (${cur})`}><Input inputMode="decimal" value={f.price} onChange={set('price')} /></Field>
        </div>
        <Field label="Style photos"><PhotoPicker value={f.style_photos} onChange={set('style_photos')} label="Style" /></Field>
        <Field label="Fabric"><PhotoPicker single value={f.fabric_photo} onChange={set('fabric_photo')} label="Fabric" /></Field>
        <Field label="Fabric notes"><Input value={f.fabric_note} onChange={set('fabric_note')} placeholder="e.g. 6 yards each, collect from the family" /></Field>
        <Field label="Message for the group" hint="Shown on the sign-up page"><Textarea value={f.notes} onChange={set('notes')} /></Field>
        <Button size="lg" className="w-full" onClick={submit}>{editing ? 'Save' : 'Create group'}</Button>
      </Card>
    </div>
  );
}

export function GroupDetail() {
  const { id } = useParams();
  const go = useNavigate();
  const e = useStore((s) => s.events.find((x) => x.id === id));
  const shop = useStore((s) => s.shop);
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const measurements = useStore((s) => s.measurements);
  const payments = useStore((s) => s.payments);
  const [add, setAdd] = useState(false);
  const [pickId, setPickId] = useState('');
  const members = useMemo(() => orders.filter((o) => o.event_id === id).map((o) => ({ o, c: customers.find((c) => c.id === o.customer_id), paid: paidFor(payments, o.id), bal: balanceOf(o, payments) })).sort((a, b) => (a.c?.name || '').localeCompare(b.c?.name || '')), [orders, customers, payments, id]);
  if (!e) return <Empty title="Group not found" />;
  const cur = shop?.currency;
  const link = `${publicBase()}#/g/${e.join_token}`;
  const invite = `You're invited to get your outfit for *${e.name}* sewn by ${shop.name}.\nPlease enter your measurements here: ${link}${e.price ? `\nPrice: ${money(e.price, cur)} per person` : ''}`;
  const totPaid = members.reduce((s, m) => s + m.paid, 0); const totBal = members.reduce((s, m) => s + m.bal, 0);
  const ready = members.filter((m) => STAGE[m.o.stage].i >= STAGE.ready.i).length;
  function addExisting() {
    const c = customers.find((x) => x.id === pickId); if (!c) return;
    const m = latest(measurements, c.id);
    createOrder({ customer_id: c.id, event_id: e.id, garment: e.garment, title: e.name, style_photos: e.style_photos, fabric_photo: e.fabric_photo, fabric_note: e.fabric_note, price: e.price, due_date: e.due_date, fitting_date: null, measurement: m ? { gender: c.gender, unit: m.unit, values: m.values } : null });
    setAdd(false); setPickId('');
    toast.success(`${c.name} added`);
  }
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title={e.name} back="/groups" sub={`${e.event_date ? dayLabel(e.event_date, true) : ''} · ${e.garment} · ${money(e.price, cur)} each`} right={<Link to={`/groups/${e.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3"><p className="text-xs text-stone-500">People</p><p className="text-xl font-bold">{members.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-stone-500">Ready</p><p className="text-xl font-bold text-emerald-600">{ready}</p></Card>
        <Card className="p-3"><p className="text-xs text-stone-500">Still owed</p><p className="text-lg font-bold text-rose-600">{money(totBal, cur)}</p><p className="text-[10px] text-stone-400">paid {money(totPaid, cur)}</p></Card>
      </div>
      <Card className="p-4">
        <p className="text-sm font-bold">Sign-up link</p>
        <p className="mt-1 text-sm text-stone-500">Share it in the family or church WhatsApp group. Each person enters their own measurements and gets their own order and tracking link.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(invite)}`} target="_blank" rel="noreferrer"><Button variant="wa" size="sm"><MessageCircle className="h-4 w-4" />Share on WhatsApp</Button></a>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(link); toast.success('Link copied'); }}><Link2 className="h-4 w-4" />Copy link</Button>
          <Button variant="ghost" size="sm" onClick={() => save('events', { id: e.id, open: !e.open })}>{e.open ? <><Lock className="h-4 w-4" />Close sign-up</> : <><Unlock className="h-4 w-4" />Re-open sign-up</>}</Button>
        </div>
        {!e.open && <p className="mt-2 text-xs font-semibold text-amber-700">Sign-up is closed.</p>}
      </Card>
      <div className="flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Members</h2><Button size="sm" variant="soft" onClick={() => setAdd(true)}><Plus className="h-4 w-4" />Add a customer</Button></div>
      <Card className="divide-y divide-stone-100 dark:divide-white/5">
        {members.map(({ o, c, bal }) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c?.name}</p><p className="text-xs text-stone-500"><span className="font-mono">{o.code}</span> · {o.measurement ? 'measured' : <span className="text-amber-600">no measurements</span>}</p></div>
            <StagePill stage={o.stage} />
            <span className={bal ? 'w-20 text-right text-sm font-bold text-rose-600' : 'w-20 text-right text-sm font-semibold text-emerald-600'}>{bal ? money(bal, cur) : 'Paid'}</span>
          </Link>
        ))}
        {!members.length && <p className="p-4 text-sm text-stone-500">Nobody yet — share the link.</p>}
      </Card>
      <Button variant="ghost" className="text-rose-600" onClick={() => { if (confirm('Delete this group? Members’ orders are kept.')) { remove('events', e.id); go('/groups', { replace: true }); } }}><Trash2 className="h-4 w-4" />Delete group</Button>
      <Modal open={add} onClose={() => setAdd(false)} title="Add a customer to the group" footer={<Button className="w-full" onClick={addExisting} disabled={!pickId}>Add</Button>}>
        <Select value={pickId} onChange={(ev) => setPickId(ev.target.value)}><option value="">Choose…</option>{[...customers].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => !members.some((m) => m.c?.id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <p className="mt-2 text-xs text-stone-500">Their saved measurements are used. New people can use the sign-up link instead.</p>
      </Modal>
    </div>
  );
}
