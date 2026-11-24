import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { COST_ITEMS, costTotal, suggestPrice, profit } from '../lib/costing';
import { money } from '../lib/format';
import { Button, Input, Modal, cx } from './ui';

/** Costing helper: list what the piece costs, see the profit, get a suggested price. */
export default function CostCalc({ open, onClose, items: start = [], price, markup = 50, currency, onSave }) {
  const [items, setItems] = useState(() => (start.length ? start : [{ name: 'Fabric', amount: '' }, { name: 'Labour', amount: '' }]).map((i) => ({ ...i, amount: String(i.amount ?? '') })));
  const [mk, setMk] = useState(String(markup));
  const cost = costTotal(items);
  const suggested = suggestPrice(cost, Number(mk));
  const p = profit(price, cost);
  const setItem = (i, patch) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const used = new Set(items.map((i) => i.name));
  const clean = () => items.filter((i) => i.name.trim() && Number(i.amount) > 0).map((i) => ({ name: i.name.trim(), amount: Number(i.amount) }));
  return (
    <Modal open={open} onClose={onClose} title="Cost & price helper" footer={<><Button variant="outline" className="flex-1" onClick={() => onSave(clean(), null)}>Save costs</Button><Button className="flex-1" disabled={!suggested} onClick={() => onSave(clean(), suggested)}>Use {money(suggested, currency)}</Button></>}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} className="h-10 flex-1" placeholder="Item" />
            <Input value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })} inputMode="decimal" className="h-10 w-28" placeholder="0.00" />
            <button type="button" aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== i))} className="px-1 text-stone-400"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {COST_ITEMS.filter((n) => !used.has(n)).map((n) => (
          <button type="button" key={n} onClick={() => setItems([...items, { name: n, amount: '' }])} className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:border-white/10 dark:text-stone-300"><Plus className="h-3 w-3" />{n}</button>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 rounded-2xl bg-stone-50 p-4 text-sm dark:bg-white/5">
        <p className="flex justify-between"><span className="text-stone-500">It costs you</span><b>{money(cost, currency)}</b></p>
        <p className="flex items-center justify-between gap-2"><span className="text-stone-500">Your profit %</span><span className="flex items-center gap-1"><Input value={mk} onChange={(e) => setMk(e.target.value)} inputMode="numeric" className="h-8 w-16 text-right" />%</span></p>
        <p className="flex justify-between text-base"><span className="font-semibold">Suggested price</span><b className="text-brand-700 dark:text-brand-300">{money(suggested, currency)}</b></p>
        {Number(price) > 0 && <p className={cx('flex justify-between border-t border-stone-200 pt-1.5 dark:border-white/10', p.profit < 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400')}><span>At your price of {money(price, currency)}</span><b>{p.profit < 0 ? 'Loss' : 'Profit'} {money(Math.abs(p.profit), currency)} ({p.margin}%)</b></p>}
      </div>
    </Modal>
  );
}
