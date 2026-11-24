import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Shirt } from 'lucide-react';
import { useStore } from '../../data/store';
import { isOpen, urgency, STAGES } from '../../lib/orders';
import { PageHead, Button, Input, Segmented, Empty, cx } from '../../components/ui';
import OrderCard from '../../components/OrderCard';

const RANK = { overdue: 0, today: 1, soon: 2, ok: 3, none: 4 };

export default function Orders() {
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'work';
  const [stage, setStage] = useState('');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const name = Object.fromEntries(customers.map((c) => [c.id, `${c.name} ${c.phone}`.toLowerCase()]));
    let l = orders.filter((o) => !o.cancelled);
    if (tab === 'work') l = l.filter((o) => isOpen(o) && o.stage !== 'ready');
    if (tab === 'ready') l = l.filter((o) => o.stage === 'ready');
    if (tab === 'done') l = l.filter((o) => o.stage === 'collected');
    if (stage) l = l.filter((o) => o.stage === stage);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((o) => `${o.code} ${o.title} ${o.garment} ${name[o.customer_id] || ''}`.toLowerCase().includes(t)); }
    return l.sort((a, b) => (tab === 'done' ? (b.collected_on || '').localeCompare(a.collected_on || '') : RANK[urgency(a)] - RANK[urgency(b)] || (a.due_date || '9').localeCompare(b.due_date || '9')));
  }, [orders, customers, tab, stage, q]);
  const counts = { work: orders.filter((o) => isOpen(o) && o.stage !== 'ready').length, ready: orders.filter((o) => o.stage === 'ready').length };

  return (
    <div className="animate-fade-in">
      <PageHead title="Orders" right={<Link to="/orders/new"><Button size="sm"><Plus className="h-4 w-4" />New</Button></Link>} />
      <Segmented value={tab} onChange={(v) => { setParams({ tab: v }); setStage(''); }} className="mb-3 w-full [&>button]:flex-1" options={[{ value: 'work', label: 'In work', count: counts.work }, { value: 'ready', label: 'Ready', count: counts.ready }, { value: 'done', label: 'Collected' }, { value: 'all', label: 'All' }]} />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-stone-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, tag code…" className="pl-10" />
      </div>
      {tab === 'work' && (
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {[{ key: '', label: 'All stages' }, ...STAGES.slice(0, 5)].map((s) => (
            <button type="button" key={s.key} onClick={() => setStage(s.key)} className={cx('whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold', stage === s.key ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-ink-900 dark:text-stone-300')}>
              {s.label}{s.key ? ` · ${orders.filter((o) => o.stage === s.key && !o.cancelled).length}` : ''}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {list.map((o) => <OrderCard key={o.id} order={o} />)}
        {!list.length && <Empty icon={Shirt} title="No orders here">Tap “New” to take an order.</Empty>}
      </div>
    </div>
  );
}
