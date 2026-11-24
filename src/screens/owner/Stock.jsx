import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Store, Share2, Copy, Minus, ShoppingBag, Trash2, Eye, EyeOff } from 'lucide-react';
import { useStore, save, remove, sellProduct, stockCount } from '../../data/store';
import { has, canWrite } from '../../lib/plans';
import { waLink, ymd } from '../../lib/orders';
import { money, dayLabel } from '../../lib/format';
import { publicBase } from '../../config';
import { PageHead, Card, Button, Field, Input, Select, Textarea, Empty, Locked, Modal, Segmented, Toggle, Thumb, Paywall, cx } from '../../components/ui';
import PhotoPicker from '../../components/PhotoPicker';
import { toast } from '../../components/toast';

export const CATEGORIES = ['Women', 'Men', 'Kids', 'Accessories', 'Fabric', 'Other'];
const QUICK_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'];

export function Stock() {
  const shop = useStore((s) => s.shop);
  const products = useStore((s) => s.products);
  const sales = useStore((s) => s.sales);
  const [cat, setCat] = useState('');
  const month = ymd().slice(0, 7);
  const soldMonth = useMemo(() => sales.filter((x) => ymd(x.at).startsWith(month)), [sales, month]);
  if (!has(shop, 'stock')) return <Locked feature="stock" />;
  const link = `${publicBase()}#/s/${shop.shop_token}`;
  const list = products.filter((p) => !cat || p.category === cat).sort((a, b) => a.name.localeCompare(b.name));
  const cur = shop.currency;
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title="Ready-made stock" sub={`${products.length} items · ${products.reduce((s, p) => s + stockCount(p), 0)} pieces in stock`} right={<Link to="/stock/new"><Button size="sm"><Plus className="h-4 w-4" />Add</Button></Link>} />
      <Card className="flex flex-wrap items-center justify-between gap-3 !border-ink-800 !bg-ink-950 p-4 text-white">
        <div><p className="flex items-center gap-2 font-bold"><Store className="h-4 w-4 text-brand-300" />Your online shop</p><p className="text-sm text-white/60">Customers see items you’ve put online and order on WhatsApp.</p></div>
        <div className="flex gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(`Shop ready-made pieces from ${shop.name}: ${link}`)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="wa"><Share2 className="h-4 w-4" />Share</Button></a>
          <Button size="sm" variant="outline" className="!border-white/20 !bg-transparent !text-white" aria-label="Copy shop link" onClick={() => { navigator.clipboard?.writeText(link); toast.success('Shop link copied'); }}><Copy className="h-4 w-4" /></Button>
          <a href={link} target="_blank" rel="noreferrer"><Button size="sm" variant="gold">Open</Button></a>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3"><p className="text-xs text-stone-500">Sold this month</p><p className="text-lg font-bold">{soldMonth.reduce((s, x) => s + x.qty, 0)} pieces</p></Card>
        <Card className="p-3"><p className="text-xs text-stone-500">Sales this month</p><p className="text-lg font-bold">{money(soldMonth.reduce((s, x) => s + Number(x.amount), 0), cur)}</p></Card>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
        {['', ...CATEGORIES].map((c) => <button type="button" key={c} onClick={() => setCat(c)} className={cx('whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold', cat === c ? 'border-ink-950 bg-ink-950 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-ink-950' : 'border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-ink-900 dark:text-stone-300')}>{c || 'All'}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {list.map((p) => { const n = stockCount(p); return (
          <Link key={p.id} to={`/stock/${p.id}`} className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-soft dark:border-white/5 dark:bg-ink-900">
            <div className="relative"><Thumb src={p.photos?.[0]} className="aspect-[3/4] w-full !rounded-none" />{!p.published && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 text-[10px] font-semibold text-white">Not online</span>}</div>
            <div className="p-2.5"><p className="truncate text-sm font-semibold">{p.name}</p><p className="text-sm font-bold text-brand-700 dark:text-brand-300">{money(p.price, cur)}</p><p className={cx('text-xs', n === 0 ? 'font-semibold text-rose-600' : n <= 2 ? 'text-amber-600' : 'text-stone-500')}>{n === 0 ? 'Sold out' : `${n} in stock`}</p></div>
          </Link>
        ); })}
      </div>
      {!list.length && <Empty icon={ShoppingBag} title="No ready-made pieces yet">Add pieces you’ve already sewn to sell them here and online.</Empty>}
      {soldMonth.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Recent sales</h2>
          <Card className="divide-y divide-stone-100 text-sm dark:divide-white/5">
            {[...sales].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8).map((x) => <p key={x.id} className="flex justify-between gap-2 px-4 py-2.5"><span className="truncate">{x.product_name}{x.size ? ` (${x.size})` : ''} ×{x.qty} · <span className="text-stone-500">{dayLabel(ymd(x.at))}{x.customer_name ? ` · ${x.customer_name}` : ''}</span></span><b>{money(x.amount, cur)}</b></p>)}
          </Card>
        </div>
      )}
    </div>
  );
}

export function ProductForm() {
  const { id } = useParams();
  const go = useNavigate();
  const shop = useStore((s) => s.shop);
  const editing = useStore((s) => s.products.find((p) => p.id === id));
  const [f, setF] = useState(() => (editing ? { ...editing, price: String(editing.price), cost: String(editing.cost ?? '') } : { name: '', category: 'Women', price: '', cost: '', photos: [], sizes: { M: 1 }, description: '', published: true }));
  const [newSize, setNewSize] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  if (!has(shop, 'stock')) return <Locked feature="stock" />;
  if (!editing && !canWrite(shop)) return <Paywall />;
  const setQty = (k, n) => setF({ ...f, sizes: { ...f.sizes, [k]: Math.max(0, n) } });
  const delSize = (k) => { const s = { ...f.sizes }; delete s[k]; setF({ ...f, sizes: s }); };
  const addSize = (k) => { const key = k.trim(); if (key && !(key in f.sizes)) setF({ ...f, sizes: { ...f.sizes, [key]: 1 } }); setNewSize(''); };
  function submit() {
    if (f.name.trim().length < 2) return toast.error('Give the item a name');
    if (!(Number(f.price) > 0)) return toast.error('Enter the selling price');
    const p = save('products', { ...(editing ? { id: editing.id } : {}), name: f.name.trim(), category: f.category, price: Number(f.price), cost: Number(f.cost) || 0, photos: f.photos, sizes: f.sizes, description: f.description, published: f.published });
    toast.success('Saved');
    go(`/stock/${p.id}`, { replace: true });
  }
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title={editing ? 'Edit item' : 'Add ready-made item'} back={editing ? `/stock/${editing.id}` : '/stock'} />
      <Card className="space-y-3 p-4">
        <Field label="Photos"><PhotoPicker value={f.photos} onChange={set('photos')} label="Photo" /></Field>
        <Field label="Name"><Input value={f.name} onChange={set('name')} placeholder="e.g. Ankara two-piece set" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Category"><Select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label={`Price (${shop.currency})`}><Input inputMode="decimal" value={f.price} onChange={set('price')} /></Field>
          <Field label="Your cost" hint="Only you see this"><Input inputMode="decimal" value={f.cost} onChange={set('cost')} /></Field>
        </div>
        <Field label="Description"><Textarea value={f.description} onChange={set('description')} placeholder="Fabric, lining, how it fits…" /></Field>
      </Card>
      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold">Sizes in stock</p>
        <div className="space-y-2">
          {Object.entries(f.sizes).map(([k, n]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-24 font-semibold">{k}</span>
              <Button size="sm" variant="outline" onClick={() => setQty(k, n - 1)} aria-label="Less"><Minus className="h-4 w-4" /></Button>
              <span className="w-8 text-center font-bold">{n}</span>
              <Button size="sm" variant="outline" onClick={() => setQty(k, n + 1)} aria-label="More"><Plus className="h-4 w-4" /></Button>
              <button type="button" onClick={() => delSize(k)} className="ml-auto text-xs text-stone-400">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{QUICK_SIZES.filter((q) => !(q in f.sizes)).map((q) => <button type="button" key={q} onClick={() => addSize(q)} className="rounded-full border border-stone-200 px-2.5 py-1 text-xs font-semibold dark:border-white/10">+ {q}</button>)}</div>
        <div className="mt-2 flex gap-2"><Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Other size (e.g. 6-7y, 42)" className="h-10" /><Button size="sm" variant="outline" className="h-10" onClick={() => addSize(newSize)}>Add</Button></div>
      </Card>
      <Card className="px-4"><Toggle label="Show in my online shop" sub="Customers can see it and order on WhatsApp" checked={f.published} onChange={set('published')} /></Card>
      <Button size="lg" className="w-full" onClick={submit}>Save</Button>
    </div>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const go = useNavigate();
  const shop = useStore((s) => s.shop);
  const p = useStore((s) => s.products.find((x) => x.id === id));
  const sales = useStore((s) => s.sales);
  const [sell, setSell] = useState(null);
  if (!p) return <Empty title="Item not found" />;
  const cur = shop.currency;
  const mine = sales.filter((x) => x.product_id === p.id).sort((a, b) => b.at.localeCompare(a.at));
  const inStock = Object.entries(p.sizes || {}).filter(([, n]) => n > 0);
  function doSell() {
    if (Object.keys(p.sizes || {}).length && !sell.size) return toast.error('Choose the size');
    if (sell.size && (p.sizes[sell.size] || 0) < sell.qty) return toast.error('Not enough in stock');
    sellProduct(p, { ...sell, amount: Number(sell.amount) });
    setSell(null);
    toast.success('Sale recorded', `${p.name}${sell.size ? ` (${sell.size})` : ''}`);
    if (sell.customer_phone) window.open(waLink(sell.customer_phone, `Thank you for buying ${p.name}${sell.size ? ` (size ${sell.size})` : ''} from ${shop.name}! Paid: ${money(sell.amount, cur)}.`), '_blank');
  }
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title={p.name} back="/stock" sub={`${p.category} · ${money(p.price, cur)}${p.cost ? ` · profit ${money(p.price - p.cost, cur)}` : ''}`} right={<Link to={`/stock/${p.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">{(p.photos || []).map((src, i) => <img key={i} src={src} alt="" className="h-64 w-48 shrink-0 rounded-2xl object-cover" />)}</div>
      {p.description && <p className="text-sm">{p.description}</p>}
      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold">In stock</p>
        <div className="flex flex-wrap gap-2">{Object.entries(p.sizes || {}).map(([k, n]) => <span key={k} className={cx('rounded-xl px-3 py-1.5 text-sm font-semibold', n ? 'bg-stone-100 dark:bg-white/10' : 'bg-rose-50 text-rose-500 line-through dark:bg-rose-500/10')}>{k}: {n}</span>)}</div>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" disabled={!inStock.length} onClick={() => setSell({ size: inStock[0]?.[0] || '', qty: 1, amount: String(p.price), method: 'momo', customer_name: '', customer_phone: '' })}><ShoppingBag className="h-4 w-4" />{inStock.length ? 'Sell' : 'Sold out'}</Button>
          <Button variant="outline" onClick={() => save('products', { id: p.id, published: !p.published })}>{p.published ? <><EyeOff className="h-4 w-4" />Hide online</> : <><Eye className="h-4 w-4" />Show online</>}</Button>
        </div>
      </Card>
      {mine.length > 0 && <Card className="divide-y divide-stone-100 text-sm dark:divide-white/5">{mine.map((x) => <p key={x.id} className="flex justify-between px-4 py-2.5"><span>{dayLabel(ymd(x.at), true)}{x.size ? ` · ${x.size}` : ''} ×{x.qty}{x.customer_name ? ` · ${x.customer_name}` : ''} · {x.method.toUpperCase()}</span><b>{money(x.amount, cur)}</b></p>)}</Card>}
      <Button variant="ghost" className="text-rose-600" onClick={() => { if (confirm(`Delete ${p.name}?`)) { remove('products', p.id); go('/stock', { replace: true }); } }}><Trash2 className="h-4 w-4" />Delete item</Button>
      <Modal open={!!sell} onClose={() => setSell(null)} title={`Sell ${p.name}`} footer={<Button className="w-full" onClick={doSell}>Record sale</Button>}>
        {sell && (
          <div className="space-y-3">
            {inStock.length > 0 && Object.keys(p.sizes).length > 0 && <Field label="Size"><Select value={sell.size} onChange={(e) => setSell({ ...sell, size: e.target.value })}>{inStock.map(([k, n]) => <option key={k} value={k}>{k} ({n} left)</option>)}</Select></Field>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="How many"><Input inputMode="numeric" value={sell.qty} onChange={(e) => { const q = Math.max(1, parseInt(e.target.value, 10) || 1); setSell({ ...sell, qty: q, amount: String(p.price * q) }); }} /></Field>
              <Field label={`Amount (${cur})`}><Input inputMode="decimal" value={sell.amount} onChange={(e) => setSell({ ...sell, amount: e.target.value })} /></Field>
            </div>
            <Segmented value={sell.method} onChange={(v) => setSell({ ...sell, method: v })} options={[{ value: 'momo', label: 'MoMo' }, { value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank' }]} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Buyer (optional)"><Input value={sell.customer_name} onChange={(e) => setSell({ ...sell, customer_name: e.target.value })} /></Field>
              <Field label="Phone (for a WhatsApp thank-you)"><Input type="tel" value={sell.customer_phone} onChange={(e) => setSell({ ...sell, customer_phone: e.target.value })} /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
