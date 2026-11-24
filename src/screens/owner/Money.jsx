import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Wallet, TrendingUp, Smartphone, Banknote, FileText } from 'lucide-react';
import { monthReportPdf } from '../../lib/pdf';
import { toast } from '../../components/toast';
import { useStore } from '../../data/store';
import { balanceOf, paidFor, message, waLink, ymd } from '../../lib/orders';
import { money, dayLabel } from '../../lib/format';
import { publicBase } from '../../config';
import { PageHead, Card, Stat, Button, Segmented } from '../../components/ui';

export default function Money() {
  const shop = useStore((s) => s.shop);
  const orders = useStore((s) => s.orders);
  const payments = useStore((s) => s.payments);
  const customers = useStore((s) => s.customers);
  const sales = useStore((s) => s.sales);
  const [tab, setTab] = useState('owed');
  const [month, setMonth] = useState(ymd().slice(0, 7));
  const cur = shop?.currency;
  const byId = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const orderById = useMemo(() => Object.fromEntries(orders.map((o) => [o.id, o])), [orders]);
  const owed = useMemo(() => orders.filter((o) => !o.cancelled).map((o) => ({ o, bal: balanceOf(o, payments) })).filter((x) => x.bal > 0).sort((a, b) => (b.o.stage === 'ready') - (a.o.stage === 'ready') || b.bal - a.bal), [orders, payments]);
  const inMonth = useMemo(() => payments.filter((p) => !p.voided && ymd(p.at).startsWith(month)).sort((a, b) => b.at.localeCompare(a.at)), [payments, month]);
  const soldInMonth = useMemo(() => sales.filter((x) => ymd(x.at).startsWith(month)), [sales, month]);
  const sumOf = (l) => l.reduce((s, p) => s + Number(p.amount), 0);
  const total = sumOf(inMonth) + sumOf(soldInMonth);
  const momo = sumOf(inMonth.filter((p) => p.method === 'momo')) + sumOf(soldInMonth.filter((p) => p.method === 'momo'));
  const sumOwed = owed.reduce((s, x) => s + x.bal, 0);
  const months = useMemo(() => { const out = []; const d = new Date(); for (let i = 0; i < 12; i++) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(ymd(x).slice(0, 7)); } return out; }, []);

  return (
    <div className="animate-fade-in">
      <PageHead title="Money" right={<Button size="sm" variant="outline" onClick={() => monthReportPdf({ shop, month, payments, sales, orders, customers, owed }).catch((e) => toast.error('Could not make the PDF', e.message))}><FileText className="h-4 w-4" />Month report</Button>} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Customers owe" value={money(sumOwed, cur)} sub={`${owed.length} orders`} icon={Wallet} tone="rose" />
        <Stat label="Received" value={money(total, cur)} sub={new Date(`${month}-01T00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} icon={TrendingUp} tone="green" />
        <Stat label="By MoMo" value={money(momo, cur)} icon={Smartphone} tone="amber" />
        <Stat label="Cash & bank" value={money(total - momo, cur)} icon={Banknote} tone="violet" />
      </div>
      <Segmented value={tab} onChange={setTab} className="my-4 w-full [&>button]:flex-1" options={[{ value: 'owed', label: 'Who owes', count: owed.length }, { value: 'in', label: 'Payments received' }]} />
      {tab === 'owed' ? (
        <Card className="divide-y divide-stone-100 dark:divide-white/5">
          {owed.map(({ o, bal }) => {
            const c = byId[o.customer_id];
            const msg = message('balance', { order: o, customer: c, shop, paid: paidFor(payments, o.id), balance: bal, link: `${publicBase()}#/t/${o.track_token}` });
            return (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/orders/${o.id}`} className="min-w-0 flex-1"><p className="truncate font-semibold">{c?.name}</p><p className="truncate text-sm text-stone-500">{o.title} · {o.code}{o.stage === 'ready' ? ' · ready' : ''}</p></Link>
                <b className="text-rose-600 dark:text-rose-400">{money(bal, cur)}</b>
                {c?.phone && <a href={waLink(c.phone, msg)} target="_blank" rel="noreferrer" aria-label="Remind on WhatsApp"><Button variant="wa" size="sm"><MessageCircle className="h-4 w-4" /></Button></a>}
              </div>
            );
          })}
          {!owed.length && <p className="p-4 text-sm text-stone-500">Nobody owes you. 🎉</p>}
        </Card>
      ) : (
        <>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="mb-3 h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-ink-900">
            {months.map((mm) => <option key={mm} value={mm}>{new Date(`${mm}-01T00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>)}
          </select>
          <Card className="divide-y divide-stone-100 dark:divide-white/5">
            {inMonth.map((p) => {
              const o = orderById[p.order_id]; const c = byId[o?.customer_id];
              return (
                <Link key={p.id} to={o ? `/orders/${o.id}` : '#'} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="truncate font-semibold">{c?.name || '—'}</p><p className="text-sm text-stone-500">{dayLabel(ymd(p.at))} · {p.method.toUpperCase()}{p.note ? ` · ${p.note}` : ''}</p></div>
                  <b className="text-emerald-600 dark:text-emerald-400">{money(p.amount, cur)}</b>
                </Link>
              );
            })}
            {soldInMonth.map((x) => (
              <Link key={x.id} to={`/stock/${x.product_id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><p className="truncate font-semibold">{x.customer_name || 'Walk-in buyer'} <span className="rounded-full bg-brand-100 px-1.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">Shop sale</span></p><p className="truncate text-sm text-stone-500">{dayLabel(ymd(x.at))} · {x.product_name}{x.size ? ` (${x.size})` : ''} · {x.method.toUpperCase()}</p></div>
                <b className="text-emerald-600 dark:text-emerald-400">{money(x.amount, cur)}</b>
              </Link>
            ))}
            {!inMonth.length && !soldInMonth.length && <p className="p-4 text-sm text-stone-500">No payments this month.</p>}
          </Card>
        </>
      )}
    </div>
  );
}
