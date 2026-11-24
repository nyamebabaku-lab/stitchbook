import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Ruler, LogOut, Wallet, Scissors } from 'lucide-react';
import { useStore, staffDone, signOut, setPrefs } from '../../data/store';
import { STAGE, urgency, owedTo } from '../../lib/orders';
import { rows } from '../../lib/measure';
import { money, dayLabel } from '../../lib/format';
import { PageHead, Card, Button, Segmented, Empty, UrgencyPill, Thumb, Toggle, Stat, cx } from '../../components/ui';
import { toast } from '../../components/toast';

const RANK = { overdue: 0, today: 1, soon: 2, ok: 3, none: 4 };

export function StaffWork() {
  const me = useStore((s) => s.me);
  const tasks = useStore((s) => s.tasks);
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const [tab, setTab] = useState('todo');
  const mine = useMemo(() => tasks.filter((t) => t.staff_id === me.user_id).map((t) => ({ t, o: orders.find((o) => o.id === t.order_id) })).filter((x) => x.o), [tasks, orders, me.user_id]);
  const list = mine.filter(({ t }) => (tab === 'todo' ? !t.done_at : !!t.done_at)).sort((a, b) => RANK[urgency(a.o)] - RANK[urgency(b.o)] || (a.o.due_date || '9').localeCompare(b.o.due_date || '9'));
  const todo = mine.filter((x) => !x.t.done_at).length;
  return (
    <div className="animate-fade-in">
      <PageHead title={`Hi ${me.name.split(' ')[0]} 👋`} sub={todo ? `You have ${todo} piece${todo > 1 ? 's' : ''} to work on` : 'All your work is done'} />
      <Segmented value={tab} onChange={setTab} className="mb-3 w-full [&>button]:flex-1" options={[{ value: 'todo', label: 'To do', count: todo }, { value: 'done', label: 'Done' }]} />
      <div className="space-y-2">
        {list.map(({ t, o }) => (
          <Link key={t.id} to={`/work/${t.id}`} className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white p-3 shadow-soft dark:border-white/5 dark:bg-ink-900">
            <Thumb src={o.style_photos?.[0] || o.fabric_photo} className="h-16 w-14" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{STAGE[t.stage].label}: {o.title || o.garment}</p>
              <p className="truncate text-sm text-stone-500">{customers.find((c) => c.id === o.customer_id)?.name} · <span className="font-mono text-xs">{o.code}</span></p>
              <div className="mt-1 flex items-center gap-1.5">{!t.done_at && <UrgencyPill u={urgency(o)} />}{o.due_date && <span className="text-[11px] text-stone-500">Due {dayLabel(o.due_date)}</span>}</div>
            </div>
            {t.done_at ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-stone-300" />}
          </Link>
        ))}
        {!list.length && <Empty icon={Scissors} title={tab === 'todo' ? 'No work for now' : 'Nothing finished yet'}>{tab === 'todo' ? 'New work from your boss shows up here.' : ''}</Empty>}
      </div>
    </div>
  );
}

export function StaffTask() {
  const { id } = useParams();
  const t = useStore((s) => s.tasks.find((x) => x.id === id));
  const o = useStore((s) => s.orders.find((x) => x.id === t?.order_id));
  const c = useStore((s) => s.customers.find((x) => x.id === o?.customer_id));
  const cur = useStore((s) => s.shop?.currency);
  const [photo, setPhoto] = useState(null);
  if (!t || !o) return <Empty title="Task not found"><Link to="/" className="text-brand-700">Back</Link></Empty>;
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title={`${STAGE[t.stage].label}: ${o.title || o.garment}`} back="/" sub={`${c?.name} · ${o.code}${o.due_date ? ` · due ${dayLabel(o.due_date, true)}` : ''}`} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {[...(o.style_photos || []), ...(o.fabric_photo ? [o.fabric_photo] : [])].map((src, i) => <button type="button" key={i} onClick={() => setPhoto(src)}><img src={src} alt="" className="h-44 w-36 shrink-0 rounded-2xl object-cover" /></button>)}
      </div>
      {o.fabric_note && <p className="text-sm"><b>Fabric:</b> {o.fabric_note}</p>}
      {o.notes && <Card className="p-4 text-sm"><b>Notes:</b> {o.notes}</Card>}
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Ruler className="h-4 w-4 text-brand-600" />Measurements ({o.measurement?.unit === 'cm' ? 'cm' : 'inches'})</h2>
        {o.measurement ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
            {rows(o.measurement.gender, o.measurement.values).map(([k, l, v]) => <p key={k} className="flex justify-between gap-2 border-b border-dashed border-stone-200 py-1.5 dark:border-white/10"><span className="truncate capitalize text-stone-500">{l}</span><b>{v}</b></p>)}
          </div>
        ) : <p className="text-sm text-stone-500">No measurements — ask your boss.</p>}
      </Card>
      <Card className="flex items-center justify-between p-4"><span className="text-sm text-stone-500">Your pay for this</span><b>{money(t.rate, cur)}</b></Card>
      {t.paid ? <p className="text-center text-sm font-semibold text-emerald-600">Done and paid ✓</p> : t.done_at ? (
        <Button variant="outline" className="w-full" onClick={() => staffDone(t, false)}>Not finished — undo</Button>
      ) : (
        <Button size="lg" variant="success" className="w-full" onClick={() => { staffDone(t, true); toast.success('Well done!', 'Marked as finished'); }}><CheckCircle2 className="h-5 w-5" />I’ve finished the {STAGE[t.stage].label.toLowerCase()}</Button>
      )}
      {photo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPhoto(null)}><img src={photo} alt="" className="max-h-full max-w-full rounded-xl" /></div>}
    </div>
  );
}

export function StaffMe() {
  const me = useStore((s) => s.me);
  const shop = useStore((s) => s.shop);
  const tasks = useStore((s) => s.tasks);
  const prefs = useStore((s) => s.prefs);
  const mine = tasks.filter((t) => t.staff_id === me.user_id);
  const paid = mine.filter((t) => t.paid).reduce((s, t) => s + Number(t.rate), 0);
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title="Me" sub={shop?.name} />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Owed to you" value={money(owedTo(tasks, me.user_id), shop?.currency)} sub="Finished, not yet paid" icon={Wallet} tone="amber" />
        <Stat label="Paid so far" value={money(paid, shop?.currency)} sub={`${mine.filter((t) => t.done_at).length} pieces finished`} icon={Wallet} tone="green" />
      </div>
      <Card className="px-4"><Toggle label="Dark mode" checked={!!prefs.dark} onChange={(v) => setPrefs({ dark: v })} /></Card>
      <Card className={cx('flex items-center justify-between p-4')}>
        <div><p className="font-semibold">{me.name}</p><p className="text-sm text-stone-500">{me.phone}</p></div>
        <Button variant="outline" onClick={() => confirm('Sign out?') && signOut()}><LogOut className="h-4 w-4" />Sign out</Button>
      </Card>
    </div>
  );
}
