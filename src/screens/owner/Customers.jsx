import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, Phone, MessageCircle, Ruler, Pencil, Trash2, History } from 'lucide-react';
import { useStore, save, remove, addMeasurement } from '../../data/store';
import { isOpen, balanceOf, waLink } from '../../lib/orders';
import { GENDERS, latest, rows, clean, changes, labelFor, convert } from '../../lib/measure';
import { canWrite } from '../../lib/plans';
import { money, dayLabel } from '../../lib/format';
import { PageHead, Card, Button, Input, Field, Textarea, Empty, Avatar, Modal, Segmented, Paywall } from '../../components/ui';
import MeasureForm from '../../components/MeasureForm';
import OrderCard from '../../components/OrderCard';
import { toast } from '../../components/toast';

export function Customers() {
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const payments = useStore((s) => s.payments);
  const cur = useStore((s) => s.shop?.currency);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers.filter((c) => !t || `${c.name} ${c.phone}`.toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
      const mine = orders.filter((o) => o.customer_id === c.id && !o.cancelled);
      return { c, open: mine.filter(isOpen).length, owe: mine.reduce((s, o) => s + balanceOf(o, payments), 0) };
    });
  }, [customers, orders, payments, q]);
  return (
    <div className="animate-fade-in">
      <PageHead title="Customers" sub={`${customers.length} in your book`} right={<Link to="/customers/new"><Button size="sm"><Plus className="h-4 w-4" />Add</Button></Link>} />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-stone-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone…" className="pl-10" />
      </div>
      <Card className="divide-y divide-stone-100 dark:divide-white/5">
        {list.map(({ c, open, owe }) => (
          <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-white/5">
            <Avatar name={c.name} src={c.photo} />
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.name}</p><p className="text-sm text-stone-500">{c.phone || 'No phone'}{open ? ` · ${open} open` : ''}</p></div>
            {owe > 0 && <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{money(owe, cur)}</span>}
          </Link>
        ))}
        {!list.length && <Empty icon={Users} title={q ? 'No match' : 'No customers yet'}>{q ? 'Try another name.' : 'Add your first customer and their measurements.'}</Empty>}
      </Card>
    </div>
  );
}

export function CustomerForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const go = useNavigate();
  const shop = useStore((s) => s.shop);
  const editing = useStore((s) => s.customers.find((c) => c.id === id));
  const [f, setF] = useState(editing || { name: '', phone: '', gender: 'female', notes: '' });
  const [vals, setVals] = useState({});
  const [unit, setUnit] = useState(shop?.unit || 'in');
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  if (!editing && !canWrite(shop)) return <Paywall />;
  function submit() {
    if (f.name.trim().length < 2) return toast.error('Enter the customer’s name');
    const c = save('customers', { ...(editing ? { id: editing.id } : {}), name: f.name.trim(), phone: f.phone.trim(), gender: f.gender, notes: f.notes });
    const v = clean(vals);
    if (!editing && Object.keys(v).length) addMeasurement(c.id, unit, v);
    toast.success(editing ? 'Saved' : 'Customer added');
    go(params.get('then') === 'order' ? `/orders/new?customer=${c.id}` : `/customers/${c.id}`, { replace: true });
  }
  return (
    <div className="animate-fade-in">
      <PageHead title={editing ? 'Edit customer' : 'New customer'} back={editing ? `/customers/${editing.id}` : '/customers'} />
      <div className="space-y-4">
        <Card className="space-y-3 p-4">
          <Field label="Name"><Input autoFocus value={f.name} onChange={set('name')} placeholder="e.g. Akosua Mensah" /></Field>
          <Field label="Phone (WhatsApp)"><Input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="024 000 0000" /></Field>
          <Field label="Measure as"><Segmented value={f.gender} onChange={set('gender')} options={GENDERS} /></Field>
          <Field label="Notes"><Textarea value={f.notes} onChange={set('notes')} placeholder="Style she likes, allergies to fabrics, birthday…" /></Field>
        </Card>
        {!editing && <Card className="p-4"><MeasureForm gender={f.gender} unit={unit} values={vals} onChange={setVals} onUnit={setUnit} /><p className="mt-2 text-xs text-stone-500">You can skip this and measure later.</p></Card>}
        <Button size="lg" className="w-full" onClick={submit}>{editing ? 'Save' : params.get('then') === 'order' ? 'Save & continue to order' : 'Save customer'}</Button>
      </div>
    </div>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const go = useNavigate();
  const c = useStore((s) => s.customers.find((x) => x.id === id));
  const shop = useStore((s) => s.shop);
  const all = useStore((s) => s.measurements);
  const orders = useStore((s) => s.orders);
  const payments = useStore((s) => s.payments);
  const [measure, setMeasure] = useState(false);
  const [vals, setVals] = useState({});
  const [unit, setUnit] = useState(shop?.unit || 'in');
  const [hist, setHist] = useState(false);
  const [show, setShow] = useState(shop?.unit || 'in');
  const history = useMemo(() => all.filter((m) => m.customer_id === id).sort((a, b) => b.taken_at.localeCompare(a.taken_at)), [all, id]);
  const mine = useMemo(() => orders.filter((o) => o.customer_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)), [orders, id]);
  if (!c) return <Empty title="Customer not found" />;
  const last = latest(all, id);
  const owe = mine.filter((o) => !o.cancelled).reduce((s, o) => s + balanceOf(o, payments), 0);
  const shown = last ? convert(last.values, last.unit, show) : {};
  function startMeasure() { setVals(last ? Object.fromEntries(Object.entries(convert(last.values, last.unit, unit)).map(([k, v]) => [k, String(v)])) : {}); setMeasure(true); }
  function saveMeasure() {
    const v = clean(vals);
    if (!Object.keys(v).length) return toast.error('Enter at least one measurement');
    addMeasurement(c.id, unit, v);
    setMeasure(false);
    toast.success('Measurements saved');
  }
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title={c.name} back="/customers" sub={`${GENDERS.find((g) => g.value === c.gender)?.label} · customer since ${dayLabel(c.created_at.slice(0, 10), true)}`} right={<Link to={`/customers/${c.id}/edit`}><Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button></Link>} />
      <div className="flex flex-wrap gap-2">
        <Link to={`/orders/new?customer=${c.id}`}><Button><Plus className="h-4 w-4" />New order</Button></Link>
        {c.phone && <a href={`tel:${c.phone}`}><Button variant="outline"><Phone className="h-4 w-4" />Call</Button></a>}
        {c.phone && <a href={waLink(c.phone, `Hello ${c.name.split(' ')[0]},`)} target="_blank" rel="noreferrer"><Button variant="wa"><MessageCircle className="h-4 w-4" />WhatsApp</Button></a>}
      </div>
      {c.notes && <Card className="p-4 text-sm">{c.notes}</Card>}
      {owe > 0 && <Card className="flex items-center justify-between p-4"><span className="text-sm text-stone-500">Owes you</span><b className="text-rose-600 dark:text-rose-400">{money(owe, shop?.currency)}</b></Card>}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Ruler className="h-4 w-4 text-brand-600" />Measurements</h2>
          <div className="flex items-center gap-2">{last && <Segmented value={show} onChange={setShow} options={[{ value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }]} />}<Button size="sm" variant="soft" onClick={startMeasure}>{last ? 'Update' : 'Measure'}</Button></div>
        </div>
        {last ? (
          <>
            <p className="mb-2 text-xs text-stone-500">Taken {dayLabel(last.taken_at.slice(0, 10), true)}{last.source === 'self' ? ' · entered by the customer' : ''}{last.note ? ` · ${last.note}` : ''}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              {rows(c.gender, shown).map(([k, l, v]) => <p key={k} className="flex justify-between gap-2 border-b border-dashed border-stone-200 py-1 dark:border-white/10"><span className="truncate capitalize text-stone-500">{l}</span><b>{v}</b></p>)}
            </div>
            {history.length > 1 && <button type="button" onClick={() => setHist(true)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300"><History className="h-4 w-4" />History ({history.length})</button>}
          </>
        ) : <p className="text-sm text-stone-500">No measurements yet.</p>}
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Orders ({mine.length})</h2>
        <div className="space-y-2">{mine.map((o) => <OrderCard key={o.id} order={o} />)}</div>
        {!mine.length && <p className="text-sm text-stone-500">No orders yet.</p>}
      </div>
      <Button variant="ghost" className="text-rose-600" onClick={() => { if (confirm(`Delete ${c.name}, their measurements and all their orders?`)) { remove('customers', c.id); go('/customers', { replace: true }); } }}><Trash2 className="h-4 w-4" />Delete customer</Button>

      <Modal wide open={measure} onClose={() => setMeasure(false)} title={`Measure ${c.name.split(' ')[0]}`} footer={<Button className="w-full" onClick={saveMeasure}>Save measurements</Button>}>
        <MeasureForm gender={c.gender} unit={unit} values={vals} onChange={setVals} onUnit={(u) => { setVals(Object.fromEntries(Object.entries(convert(clean(vals), unit, u)).map(([k, v]) => [k, String(v)]))); setUnit(u); }} />
        <p className="mt-2 text-xs text-stone-500">The old measurements are kept in the history.</p>
      </Modal>
      <Modal open={hist} onClose={() => setHist(false)} title="Measurement history">
        <div className="space-y-4">
          {history.map((m, i) => {
            const diff = changes(history[i + 1], m);
            return (
              <div key={m.id}>
                <p className="text-sm font-semibold">{dayLabel(m.taken_at.slice(0, 10), true)} <span className="font-normal text-stone-500">({m.unit})</span></p>
                {diff.length ? <p className="text-sm text-stone-600 dark:text-stone-300">{diff.map((d) => `${labelFor(c.gender, d.key)} ${d.diff > 0 ? '+' : ''}${d.diff}`).join(' · ')}</p> : <p className="text-sm text-stone-500">{i === history.length - 1 ? 'First measurements' : 'No change'}</p>}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
