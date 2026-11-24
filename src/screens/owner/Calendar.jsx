import { useMemo, useState } from 'react';
import { useStore } from '../../data/store';
import { isOpen, ymd, addDays } from '../../lib/orders';
import { dayLabel } from '../../lib/format';
import { PageHead, Card, cx } from '../../components/ui';
import OrderCard from '../../components/OrderCard';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const orders = useStore((s) => s.orders);
  const perDay = useStore((s) => s.shop?.per_day || 3);
  const today = ymd();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return [d.getFullYear(), d.getMonth()]; });
  const [sel, setSel] = useState(today);
  const [y, m] = cursor;
  const { due, fit } = useMemo(() => {
    const due = {}; const fit = {};
    for (const o of orders) {
      if (!isOpen(o)) continue;
      if (o.due_date && o.stage !== 'ready') (due[o.due_date] ||= []).push(o);
      if (o.fitting_date) (fit[o.fitting_date] ||= []).push(o);
    }
    return { due, fit };
  }, [orders]);
  const first = new Date(y, m, 1);
  const start = addDays(ymd(first), -((first.getDay() + 6) % 7)); // weeks start Monday
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const go = (n) => { const d = new Date(y, m + n, 1); setCursor([d.getFullYear(), d.getMonth()]); };
  const dayDue = due[sel] || []; const dayFit = fit[sel] || [];

  return (
    <div className="animate-fade-in">
      <PageHead title="Calendar" sub={`Your daily limit: ${perDay} pieces (change it in Settings)`} />
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className="rounded-lg px-3 py-1 text-lg" onClick={() => go(-1)} aria-label="Previous month">‹</button>
          <p className="font-bold">{MONTHS[m]} {y}</p>
          <button type="button" className="rounded-lg px-3 py-1 text-lg" onClick={() => go(1)} aria-label="Next month">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-stone-400">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="py-1">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const n = (due[d] || []).length; const f = (fit[d] || []).length;
            const inMonth = Number(d.slice(5, 7)) === m + 1;
            const load = n / perDay;
            return (
              <button type="button" key={d} onClick={() => setSel(d)} className={cx('relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition', !inMonth && 'opacity-35', sel === d ? 'ring-2 ring-brand-600' : '', d === today && 'font-extrabold', n === 0 ? 'bg-stone-50 dark:bg-white/5' : load > 1 ? 'bg-rose-500 text-white' : load === 1 ? 'bg-amber-400 text-ink-950' : 'bg-brand-100 text-brand-900 dark:bg-brand-500/25 dark:text-brand-100')}>
                {Number(d.slice(8))}
                {n > 0 && <span className="text-[10px] font-bold leading-none">{n}</span>}
                {f > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-600" title="Fitting" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-stone-500">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-brand-100" />Under limit</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-amber-400" />Full</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-rose-500" />Too much</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-violet-600" />Fitting</span>
        </div>
      </Card>
      <h2 className="mb-2 mt-5 font-bold">{sel === today ? 'Today' : dayLabel(sel, true)}</h2>
      {dayFit.length > 0 && <p className="mb-2 text-sm font-semibold text-violet-700 dark:text-violet-300">Fittings: {dayFit.length}</p>}
      <div className="space-y-2">
        {[...dayDue, ...dayFit.filter((o) => !dayDue.includes(o))].map((o) => <OrderCard key={o.id} order={o} />)}
        {!dayDue.length && !dayFit.length && <p className="text-sm text-stone-500">Nothing due this day.</p>}
      </div>
    </div>
  );
}
