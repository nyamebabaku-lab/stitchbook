import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, UserPlus, Calculator } from 'lucide-react';
import CostCalc from '../../components/CostCalc';
import { useStore, createOrder, save, addPayment, addMeasurement } from '../../data/store';
import { GARMENTS, capacityWarning, nextFreeDay, ymd, addDays } from '../../lib/orders';
import { latest, clean, rows } from '../../lib/measure';
import { PageHead, Card, Field, Input, Select, Textarea, Button, Segmented, Paywall } from '../../components/ui';
import { canWrite } from '../../lib/plans';
import PhotoPicker from '../../components/PhotoPicker';
import MeasureForm from '../../components/MeasureForm';
import { toast } from '../../components/toast';

export default function OrderForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const go = useNavigate();
  const shop = useStore((s) => s.shop);
  const customers = useStore((s) => s.customers);
  const measurements = useStore((s) => s.measurements);
  const orders = useStore((s) => s.orders);
  const editing = useStore((s) => s.orders.find((o) => o.id === id));
  const [f, setF] = useState(() => editing ? { ...editing, price: String(editing.price) } : {
    customer_id: params.get('customer') || '', garment: GARMENTS[0], title: '', style_photos: [], fabric_photo: null, fabric_note: '',
    price: '', deposit: '', method: 'cash', due_date: nextFreeDay(orders, addDays(ymd(), 7), shop?.per_day || 3), fitting_date: '', notes: '',
  });
  const [mode, setMode] = useState('saved'); // saved | new (measurements to use)
  const [newVals, setNewVals] = useState({});
  const [unit, setUnit] = useState(shop?.unit || 'in');
  const [busy, setBusy] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const customer = customers.find((c) => c.id === f.customer_id);
  const saved = useMemo(() => (customer ? latest(measurements, customer.id) : null), [customer, measurements]);
  const warn = capacityWarning(orders, f.due_date, shop?.per_day, editing?.id);
  const sorted = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name)), [customers]);

  if (!editing && !canWrite(shop)) return <Paywall />;

  function submit() {
    if (!customer) return toast.error('Choose the customer first');
    if (!(Number(f.price) >= 0)) return toast.error('Enter the price');
    setBusy(true);
    let measurement = editing?.measurement || null;
    if (!editing || mode === 'new') {
      if (mode === 'new' || !saved) {
        const v = clean(newVals);
        if (Object.keys(v).length) { addMeasurement(customer.id, unit, v); measurement = { gender: customer.gender, unit, values: v }; }
      } else measurement = { gender: customer.gender, unit: saved.unit, values: saved.values };
    }
    const fields = { customer_id: customer.id, garment: f.garment, title: f.title.trim() || f.garment, style_photos: f.style_photos, fabric_photo: f.fabric_photo, fabric_note: f.fabric_note, price: Number(f.price) || 0, costs: f.costs || [], due_date: f.due_date || null, fitting_date: f.fitting_date || null, notes: f.notes, measurement };
    let o;
    if (editing) o = save('orders', { id: editing.id, ...fields });
    else {
      o = createOrder(fields);
      if (Number(f.deposit) > 0) addPayment({ order_id: o.id, amount: f.deposit, method: f.method, note: 'Deposit' });
    }
    toast.success(editing ? 'Order updated' : `Order ${o.code} saved`, editing ? '' : 'Write this code on the fabric tag.');
    go(`/orders/${o.id}${editing ? '' : '?new=1'}`, { replace: true });
  }

  return (
    <div className="animate-fade-in">
      <PageHead title={editing ? `Edit ${editing.code}` : 'New order'} back={editing ? `/orders/${editing.id}` : '/orders'} />
      <div className="space-y-4">
        <Card className="space-y-3 p-4">
          <Field label="Customer">
            <div className="flex gap-2">
              <Select value={f.customer_id} onChange={set('customer_id')} disabled={!!editing}>
                <option value="">Choose…</option>
                {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </Select>
              {!editing && <Link to="/customers/new?then=order"><Button variant="outline" className="h-11"><UserPlus className="h-4 w-4" /></Button></Link>}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Garment"><Select value={f.garment} onChange={set('garment')}>{GARMENTS.map((g) => <option key={g}>{g}</option>)}</Select></Field>
            <Field label="Name / description"><Input value={f.title} onChange={set('title')} placeholder="e.g. Engagement kaba" /></Field>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <Field label="Style photos" hint="Picture from WhatsApp/Instagram, or a sketch"><PhotoPicker value={f.style_photos} onChange={set('style_photos')} label="Style" /></Field>
          <Field label="Fabric"><PhotoPicker single value={f.fabric_photo} onChange={set('fabric_photo')} label="Fabric" /></Field>
          <Field label="Fabric notes"><Input value={f.fabric_note} onChange={set('fabric_note')} placeholder="e.g. 6 yards, customer's fabric, lining needed" /></Field>
        </Card>

        {customer && (
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Measurements</p>
              {saved && <Segmented value={mode} onChange={setMode} options={[{ value: 'saved', label: editing ? 'Keep' : 'Use saved' }, { value: 'new', label: 'Measure again' }]} />}
            </div>
            {saved && mode === 'saved' ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {rows((editing?.measurement || saved).gender || customer.gender, (editing?.measurement || saved).values).map(([k, l, v]) => <p key={k} className="flex justify-between gap-2 border-b border-dashed border-stone-200 py-1 dark:border-white/10"><span className="truncate text-stone-500">{l}</span><b>{v}</b></p>)}
              </div>
            ) : <MeasureForm gender={customer.gender} unit={unit} values={newVals} onChange={setNewVals} onUnit={setUnit} />}
          </Card>
        )}

        <Card className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Price (${shop?.currency})`}><Input inputMode="decimal" value={f.price} onChange={set('price')} placeholder="0.00" /></Field>
            {!editing && <Field label="Deposit paid now"><Input inputMode="decimal" value={f.deposit} onChange={set('deposit')} placeholder="0.00" /></Field>}
          </div>
          <button type="button" onClick={() => setCostOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300"><Calculator className="h-4 w-4" />{f.costs?.length ? 'Costs added — edit' : 'Help me price this'}</button>
          {costOpen && <CostCalc open onClose={() => setCostOpen(false)} items={f.costs || []} price={Number(f.price) || 0} markup={shop?.markup ?? 50} currency={shop?.currency} onSave={(costs, p) => { setF({ ...f, costs, ...(p ? { price: String(p) } : {}) }); setCostOpen(false); }} />}
          {!editing && Number(f.deposit) > 0 && <Segmented value={f.method} onChange={set('method')} options={[{ value: 'cash', label: 'Cash' }, { value: 'momo', label: 'MoMo' }, { value: 'bank', label: 'Bank' }]} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ready by"><Input type="date" value={f.due_date || ''} onChange={set('due_date')} /></Field>
            <Field label="Fitting (optional)"><Input type="date" value={f.fitting_date || ''} onChange={set('fitting_date')} /></Field>
          </div>
          {warn && <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{warn} <button type="button" className="font-semibold underline" onClick={() => setF({ ...f, due_date: nextFreeDay(orders, f.due_date, shop.per_day) })}>Use the next free day</button></span></p>}
          <Field label="Notes"><Textarea value={f.notes} onChange={set('notes')} placeholder="Lining, zip at the back, add pockets…" /></Field>
        </Card>
        <Button size="lg" className="w-full" loading={busy} onClick={submit}>{editing ? 'Save changes' : 'Save order'}</Button>
      </div>
    </div>
  );
}
