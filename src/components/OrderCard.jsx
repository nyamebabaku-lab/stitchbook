import { Link } from 'react-router-dom';
import { useStore } from '../data/store';
import { balanceOf, urgency } from '../lib/orders';
import { dayLabel, money } from '../lib/format';
import { StagePill, UrgencyPill, Thumb } from './ui';

export default function OrderCard({ order: o, showMoney = true }) {
  const customer = useStore((s) => s.customers.find((c) => c.id === o.customer_id));
  const payments = useStore((s) => s.payments);
  const cur = useStore((s) => s.shop?.currency);
  const bal = balanceOf(o, payments);
  return (
    <Link to={`/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white p-3 shadow-soft transition hover:border-brand-200 dark:border-white/5 dark:bg-ink-900">
      <Thumb src={o.style_photos?.[0] || o.fabric_photo} className="h-16 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><p className="truncate font-semibold text-stone-900 dark:text-white">{customer?.name || 'Customer'}</p></div>
        <p className="truncate text-sm text-stone-500">{o.title || o.garment} · <span className="font-mono text-xs">{o.code}</span></p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <StagePill stage={o.stage} />
          <UrgencyPill u={urgency(o)} />
          {o.due_date && o.stage !== 'collected' && <span className="text-[11px] text-stone-500">Due {dayLabel(o.due_date)}</span>}
        </div>
      </div>
      {showMoney && bal > 0 && <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-stone-400">Balance</p><p className="text-sm font-bold text-rose-600 dark:text-rose-400">{money(bal, cur)}</p></div>}
    </Link>
  );
}
