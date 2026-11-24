import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ruler } from 'lucide-react';
import { useStore } from '../../data/store';
import { GARMENTS } from '../../lib/orders';
import { latest } from '../../lib/measure';
import { estimateYards, WIDTHS } from '../../lib/costing';
import { PageHead, Card, Field, Select, Input, Toggle } from '../../components/ui';

/** "How many yards should I buy?" — style + size → an estimate. */
export default function Yards() {
  const [params] = useSearchParams();
  const order = useStore((s) => s.orders.find((o) => o.id === params.get('order')));
  const customers = useStore((s) => s.customers);
  const measurements = useStore((s) => s.measurements);
  const [garment, setGarment] = useState(order?.garment || 'Kaba & slit');
  const [cid, setCid] = useState(order?.customer_id || '');
  const [manual, setManual] = useState({ hip: '', len: '' });
  const [width, setWidth] = useState(45);
  const [bigPrint, setBigPrint] = useState(false);
  const [longSleeves, setLongSleeves] = useState(false);
  const c = customers.find((x) => x.id === cid);
  const m = order?.measurement || (c ? latest(measurements, c.id) : null);
  const res = useMemo(() => {
    const values = m?.values || { hip: Number(manual.hip) || 0, dress_len: Number(manual.len) || 0 };
    return estimateYards({ garment, values, unit: m?.unit || 'in', width, child: (m?.gender || c?.gender) === 'child', bigPrint, longSleeves });
  }, [garment, m, manual, width, bigPrint, longSleeves, c]);
  const sorted = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name)), [customers]);
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title="Yards calculator" back={order ? `/orders/${order.id}` : '/'} sub="How much fabric should the customer buy?" />
      <Card className="space-y-3 p-4">
        <Field label="Garment"><Select value={garment} onChange={(e) => setGarment(e.target.value)}>{GARMENTS.map((g) => <option key={g}>{g}</option>)}</Select></Field>
        {!order && <Field label="Customer (uses their measurements)"><Select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">— Type sizes instead —</option>{sorted.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>}
        {!m && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hip or chest (in)"><Input inputMode="decimal" value={manual.hip} onChange={(e) => setManual({ ...manual, hip: e.target.value })} placeholder="40" /></Field>
            <Field label="Length (in)"><Input inputMode="decimal" value={manual.len} onChange={(e) => setManual({ ...manual, len: e.target.value })} placeholder="42" /></Field>
          </div>
        )}
        <Field label="Fabric width"><Select value={width} onChange={(e) => setWidth(Number(e.target.value))}>{WIDTHS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}</Select></Field>
        <div className="divide-y divide-stone-100 dark:divide-white/5">
          <Toggle label="Big print to match" sub="Large motifs need extra to line up" checked={bigPrint} onChange={setBigPrint} />
          <Toggle label="Long sleeves" checked={longSleeves} onChange={setLongSleeves} />
        </div>
      </Card>
      <Card className="!border-ink-800 !bg-ink-950 p-6 text-center text-white">
        <Ruler className="mx-auto h-7 w-7 text-brand-300" />
        <p className="mt-2 text-sm text-white/60">Buy about</p>
        <p className="text-5xl font-extrabold text-brand-300">{res.yards} <span className="text-2xl">yards</span></p>
        {res.yards > 0 && <p className="mt-1 text-sm text-white/60">Between {res.low} and {res.high} yards depending on the cut</p>}
        {res.notes.map((n) => <p key={n} className="mt-2 text-xs text-white/70">{n}</p>)}
      </Card>
      <p className="text-center text-xs text-stone-500">An estimate for planning. Check the fabric and your pattern before cutting.</p>
    </div>
  );
}
