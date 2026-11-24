import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, UserPlus, ScanLine, Scissors, AlarmClock, Wallet, PackageCheck, Ruler, AlertTriangle } from 'lucide-react';
import { useStore } from '../../data/store';
import { isOpen, urgency, balanceOf, uncollected, ymd, addDays, loadOn, message, waLink } from '../../lib/orders';
import { money, dayLabel } from '../../lib/format';
import { publicBase } from '../../config';
import { Card, Stat, Button } from '../../components/ui';
import OrderCard from '../../components/OrderCard';

function Section({ title, icon: Icon, children, to }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-500"><Icon className="h-4 w-4" />{title}</h2>
        {to && <Link to={to} className="text-sm font-semibold text-brand-700 dark:text-brand-300">See all</Link>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function Home() {
  const me = useStore((s) => s.me);
  const shop = useStore((s) => s.shop);
  const orders = useStore((s) => s.orders);
  const payments = useStore((s) => s.payments);
  const customers = useStore((s) => s.customers);
  const sales = useStore((s) => s.sales);
  const today = ymd();
  const d = useMemo(() => {
    const open = orders.filter(isOpen);
    const working = open.filter((o) => o.stage !== 'ready');
    const late = working.filter((o) => urgency(o, today) === 'overdue');
    const due = working.filter((o) => ['today', 'soon'].includes(urgency(o, today))).sort((a, b) => a.due_date.localeCompare(b.due_date));
    const fittings = open.filter((o) => o.fitting_date && o.fitting_date >= today && o.fitting_date <= addDays(today, 2)).sort((a, b) => a.fitting_date.localeCompare(b.fitting_date));
    const owed = orders.filter((o) => !o.cancelled).reduce((s, o) => s + balanceOf(o, payments), 0);
    const month = today.slice(0, 7);
    const income = payments.filter((p) => !p.voided && ymd(p.at).startsWith(month)).reduce((s, p) => s + Number(p.amount), 0) + sales.filter((x) => ymd(x.at).startsWith(month)).reduce((s, x) => s + Number(x.amount), 0);
    const busy = [];
    for (let i = 0; i < 14; i++) { const day = addDays(today, i); const n = loadOn(orders, day); if (n > (shop?.per_day || 3)) busy.push([day, n]); }
    return { open, working, late, due, fittings, owed, income, waiting: uncollected(orders, 7, today), busy };
  }, [orders, payments, sales, today, shop?.per_day]);
  const cur = shop?.currency;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const nameOf = (id) => customers.find((c) => c.id === id);

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <p className="text-sm text-stone-500">{greet},</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">{me?.name?.split(' ')[0]} ✂️</h1>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Link to="/orders/new"><Button className="w-full flex-col !gap-1 !h-20" size="lg"><Plus className="h-6 w-6" /><span className="text-xs">New order</span></Button></Link>
        <Link to="/customers/new"><Button variant="soft" className="w-full flex-col !gap-1 !h-20" size="lg"><UserPlus className="h-6 w-6" /><span className="text-xs">Customer</span></Button></Link>
        <Link to="/scan"><Button variant="dark" className="w-full flex-col !gap-1 !h-20" size="lg"><ScanLine className="h-6 w-6" /><span className="text-xs">Scan tag</span></Button></Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="In the workshop" value={d.working.length} sub={`${d.late.length} overdue`} icon={Scissors} tone={d.late.length ? 'rose' : 'brand'} to="/orders" />
        <Stat label="Ready to collect" value={d.open.length - d.working.length} sub={d.waiting.length ? `${d.waiting.length} waiting 7+ days` : 'All fresh'} icon={PackageCheck} tone="green" to="/orders?tab=ready" />
        <Stat label="Customers owe" value={money(d.owed, cur)} icon={Wallet} tone="amber" to="/money" />
        <Stat label="Received this month" value={money(d.income, cur)} icon={Wallet} tone="violet" to="/money" />
      </div>
      {d.busy.length > 0 && (
        <Card className="mt-4 border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />Too much work on some days</p>
          <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">{d.busy.map(([day, n]) => `${dayLabel(day)}: ${n} pieces`).join(' · ')} — your limit is {shop?.per_day} a day. Move some due dates or get help.</p>
        </Card>
      )}
      {d.late.length > 0 && <Section title={`Overdue (${d.late.length})`} icon={AlarmClock}>{d.late.slice(0, 5).map((o) => <OrderCard key={o.id} order={o} />)}</Section>}
      <Section title="Due in the next 3 days" icon={AlarmClock} to="/calendar">
        {d.due.length ? d.due.slice(0, 6).map((o) => <OrderCard key={o.id} order={o} />) : <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 dark:bg-ink-900">Nothing due soon. 🎉</p>}
      </Section>
      {d.fittings.length > 0 && (
        <Section title="Fittings coming up" icon={Ruler}>
          {d.fittings.map((o) => {
            const c = nameOf(o.customer_id);
            return (
              <Card key={o.id} className="flex items-center justify-between gap-3 p-3">
                <Link to={`/orders/${o.id}`} className="min-w-0"><p className="truncate font-semibold">{c?.name}</p><p className="text-sm text-stone-500">{o.title} · {o.fitting_date === today ? 'Today' : dayLabel(o.fitting_date)}</p></Link>
                {c?.phone && <a href={waLink(c.phone, message('fitting', { order: o, customer: c, shop, link: `${publicBase()}#/t/${o.track_token}` }))} target="_blank" rel="noreferrer"><Button variant="wa" size="sm">Remind</Button></a>}
              </Card>
            );
          })}
        </Section>
      )}
      {d.waiting.length > 0 && (
        <Section title="Ready but not collected" icon={PackageCheck} to="/orders?tab=ready">
          {d.waiting.slice(0, 4).map((o) => <OrderCard key={o.id} order={o} />)}
        </Section>
      )}
    </div>
  );
}
