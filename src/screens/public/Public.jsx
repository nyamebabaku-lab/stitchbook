import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../data/store';
import { STAGES, STAGE } from '../../lib/orders';
import { GENDERS, clean } from '../../lib/measure';
import { money, dayLabel } from '../../lib/format';
import { DEMO, publicBase } from '../../config';
import { Card, Button, Field, Input, Segmented, Textarea, cx } from '../../components/ui';
import MeasureForm from '../../components/MeasureForm';
import Logo from '../../components/Logo';

function Shell({ shop, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-stone-50 px-4 py-6 dark:from-ink-900 dark:to-ink-950">
      <div className="mx-auto max-w-md">
        <div className="mb-5 text-center">
          <p className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-white">{shop?.name || 'StitchBook'}</p>
          {shop?.address && <p className="text-sm text-stone-500">{shop.address}</p>}
        </div>
        {children}
        {DEMO && <p className="mt-4 text-center text-xs text-stone-400">Demo page — sample data</p>}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-stone-400"><Logo className="h-4 w-4" />Powered by StitchBook Pro</p>
      </div>
    </div>
  );
}
const Loading = () => <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

/** Customer tracking page: /t/:token */
export function Track() {
  const { token } = useParams();
  const [d, setD] = useState(undefined);
  const [err, setErr] = useState('');
  useEffect(() => { api.track(token).then(setD).catch((e) => setErr(e.message)); }, [token]);
  if (err) return <Shell><Card className="p-6 text-center text-sm">Could not load your order. Check your internet and try again.</Card></Shell>;
  if (d === undefined) return <Loading />;
  if (!d) return <Shell><Card className="p-6 text-center text-sm">This tracking link is not valid.</Card></Shell>;
  const { shop, order: o, customer } = d;
  const st = STAGE[o.stage];
  const bal = Math.max(0, Number(o.price) - Number(o.paid));
  const steps = STAGES.filter((s) => s.key !== 'cutting' && s.key !== 'finishing');
  const at = { received: 0, cutting: 1, sewing: 1, fitting: 2, finishing: 2, ready: 3, collected: 4 }[o.stage];
  return (
    <Shell shop={shop}>
      <Card className="overflow-hidden">
        {o.style_photos?.[0] && <img src={o.style_photos[0]} alt="" className="h-64 w-full object-cover" />}
        <div className="p-5">
          <p className="text-sm text-stone-500">Hello {customer} 👋</p>
          <h1 className="text-xl font-bold">{o.title || o.garment}</h1>
          <p className="font-mono text-xs text-stone-400">{o.code}</p>
          {o.cancelled ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">This order was cancelled. Please call the shop.</p> : (
            <>
              <div className={cx('mt-4 rounded-2xl p-4 text-center', o.stage === 'ready' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-brand-50 dark:bg-brand-500/10')}>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Status</p>
                <p className={cx('text-2xl font-extrabold', o.stage === 'ready' ? 'text-emerald-700 dark:text-emerald-300' : 'text-brand-800 dark:text-brand-200')}>{o.stage === 'ready' ? 'Ready for collection! 🎉' : o.stage === 'collected' ? 'Collected — enjoy! ✨' : st.label === 'Received' ? 'Order received' : `Being ${st.label.toLowerCase() === 'fitting' ? 'fitted' : st.label === 'Cutting' ? 'cut' : 'sewn'}`}</p>
              </div>
              <ol className="mt-5 space-y-3">
                {steps.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-3">
                    <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', i < at || o.stage === 'collected' ? 'bg-brand-600 text-white' : i === at ? 'bg-gold-400 text-ink-950' : 'bg-stone-100 text-stone-400 dark:bg-white/5')}>{i < at || o.stage === 'collected' ? <Check className="h-4 w-4" /> : i + 1}</span>
                    <span className={cx('text-sm', i === at ? 'font-bold' : 'text-stone-500')}>{s.key === 'sewing' ? 'Cutting & sewing' : s.key === 'fitting' ? 'Fitting & finishing' : s.label}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {o.due_date && <p><span className="text-stone-500">Ready by</span><br /><b>{dayLabel(o.due_date, true)}</b></p>}
            {o.fitting_date && o.stage !== 'collected' && <p><span className="text-stone-500">Fitting</span><br /><b>{dayLabel(o.fitting_date, true)}</b></p>}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-stone-50 p-2 dark:bg-white/5"><p className="text-[11px] text-stone-500">Price</p><b>{money(o.price, shop.currency)}</b></div>
            <div className="rounded-xl bg-stone-50 p-2 dark:bg-white/5"><p className="text-[11px] text-stone-500">Paid</p><b>{money(o.paid, shop.currency)}</b></div>
            <div className="rounded-xl bg-stone-50 p-2 dark:bg-white/5"><p className="text-[11px] text-stone-500">Balance</p><b className={bal ? 'text-rose-600' : ''}>{money(bal, shop.currency)}</b></div>
          </div>
          {bal > 0 && shop.momo && <p className="mt-3 text-center text-sm">Pay by MoMo to <b>{shop.momo}</b></p>}
          {shop.phone && <a href={`tel:${shop.phone}`}><Button variant="outline" className="mt-4 w-full"><Phone className="h-4 w-4" />Call {shop.name}</Button></a>}
        </div>
      </Card>
    </Shell>
  );
}

/** Group sign-up: /g/:token — each member enters their own measurements. */
export function GroupJoin() {
  const { token } = useParams();
  const [d, setD] = useState(undefined);
  const [f, setF] = useState({ name: '', phone: '', gender: 'female', note: '' });
  const [vals, setVals] = useState({});
  const [unit, setUnit] = useState('in');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  useEffect(() => { api.eventInfo(token).then((x) => { setD(x); if (x?.shop?.unit) setUnit(x.shop.unit); }).catch(() => setD(null)); }, [token]);
  if (d === undefined) return <Loading />;
  if (!d) return <Shell><Card className="p-6 text-center text-sm">This sign-up link is not valid.</Card></Shell>;
  const { shop, event: e } = d;
  async function submit() {
    setErr('');
    const v = clean(vals);
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, '').length < 9) return setErr('Please enter your name and phone number.');
    if (Object.keys(v).length < 3) return setErr('Please enter at least 3 measurements (ask someone to help you measure).');
    setBusy(true);
    try { setDone(await api.eventJoin(token, { ...f, name: f.name.trim(), unit, values: v })); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  if (done) {
    return (
      <Shell shop={shop}>
        <Card className="p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-2 text-xl font-bold">Thank you, {f.name.split(' ')[0]}!</h1>
          <p className="mt-1 text-sm text-stone-500">{shop.name} has your measurements for <b>{e.name}</b>.{e.price ? ` Price: ${money(e.price, shop.currency)}.` : ''}{shop.momo ? ` Pay by MoMo to ${shop.momo}.` : ''}</p>
          <a href={`${publicBase()}#/t/${done}`}><Button className="mt-4 w-full">Track my outfit</Button></a>
          <p className="mt-2 text-xs text-stone-400">Save this link to check on your outfit any time.</p>
        </Card>
      </Shell>
    );
  }
  return (
    <Shell shop={shop}>
      <Card className="overflow-hidden">
        {(e.style_photos?.[0] || e.fabric_photo) && <div className="flex">{e.style_photos?.[0] && <img src={e.style_photos[0]} alt="" className="h-52 w-1/2 flex-1 object-cover" />}{e.fabric_photo && <img src={e.fabric_photo} alt="" className="h-52 w-1/2 flex-1 object-cover" />}</div>}
        <div className="p-5">
          <h1 className="text-xl font-bold">{e.name}</h1>
          <p className="text-sm text-stone-500">{e.garment}{e.event_date ? ` · ${dayLabel(e.event_date, true)}` : ''}{e.price ? ` · ${money(e.price, shop.currency)} per person` : ''}</p>
          {e.notes && <p className="mt-2 text-sm">{e.notes}</p>}
          <p className="mt-1 text-xs text-stone-400">{e.joined} already signed up</p>
        </div>
      </Card>
      {!e.open ? <Card className="mt-4 p-6 text-center text-sm">Sign-up is closed. Please call {shop.phone || 'the shop'}.</Card> : (
        <Card className="mt-4 space-y-3 p-5">
          <Field label="Your name"><Input value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
          <Field label="Your phone (WhatsApp)"><Input type="tel" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} placeholder="024 000 0000" /></Field>
          <Field label="I am a"><Segmented value={f.gender} onChange={(g) => setF({ ...f, gender: g })} options={GENDERS} /></Field>
          <MeasureForm gender={f.gender} unit={unit} values={vals} onChange={setVals} onUnit={setUnit} />
          <Field label="Anything else?"><Textarea value={f.note} onChange={(x) => setF({ ...f, note: x.target.value })} placeholder="e.g. I want long sleeves" /></Field>
          {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
          <Button size="lg" className="w-full" loading={busy} onClick={submit}>Send my measurements</Button>
          <p className="text-center text-xs text-stone-400">Not sure? Fill what you can — the designer will check at the fitting.</p>
        </Card>
      )}
    </Shell>
  );
}

/** Online shop: /s/:token — ready-made pieces, ordered on WhatsApp. */
export function ShopPage() {
  const { token } = useParams();
  const [d, setD] = useState(undefined);
  const [open, setOpen] = useState(null);
  const [size, setSize] = useState('');
  const [cat, setCat] = useState('');
  useEffect(() => { api.catalog(token).then(setD).catch(() => setD(null)); }, [token]);
  if (d === undefined) return <Loading />;
  if (!d) return <Shell><Card className="p-6 text-center text-sm">This shop link is not valid.</Card></Shell>;
  const { shop, products } = d;
  const cats = [...new Set(products.map((p) => p.category))];
  const left = (p) => Object.values(p.sizes || {}).reduce((s, n) => s + Number(n || 0), 0);
  const list = products.filter((p) => !cat || p.category === cat).sort((a, b) => (left(b) > 0) - (left(a) > 0) || a.name.localeCompare(b.name));
  const order = (p) => `https://wa.me/${String(shop.phone || '').replace(/\D/g, '').replace(/^0/, '233')}?text=${encodeURIComponent(`Hello ${shop.name}, I'd like to buy: ${p.name}${size ? `, size ${size}` : ''} (${money(p.price, shop.currency)}). Is it available?`)}`;
  return (
    <Shell shop={shop}>
      {cats.length > 1 && (
        <div className="-mx-4 mb-3 flex justify-center gap-1.5 overflow-x-auto px-4">
          {['', ...cats].map((c) => <button type="button" key={c} onClick={() => setCat(c)} className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold', cat === c ? 'bg-ink-950 text-white' : 'bg-white text-stone-600 dark:bg-ink-900')}>{c || 'All'}</button>)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {list.map((p) => (
          <button type="button" key={p.id} onClick={() => { setOpen(p); setSize(Object.entries(p.sizes || {}).find(([, n]) => n > 0)?.[0] || ''); }} className="overflow-hidden rounded-2xl bg-white text-left shadow-soft dark:bg-ink-900">
            <div className="relative">{p.photos?.[0] ? <img src={p.photos[0]} alt="" className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] bg-stone-100" />}{!left(p) && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-semibold text-white">Sold out</span>}</div>
            <div className="p-2.5"><p className="truncate text-sm font-semibold">{p.name}</p><p className="text-sm font-bold text-brand-700 dark:text-brand-300">{money(p.price, shop.currency)}</p></div>
          </button>
        ))}
      </div>
      {!list.length && <Card className="p-6 text-center text-sm">Nothing in the shop right now — check back soon.</Card>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setOpen(null)}>
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl dark:bg-ink-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex snap-x overflow-x-auto">{(open.photos || []).map((src, i) => <img key={i} src={src} alt="" className="aspect-[3/4] w-full shrink-0 snap-center object-cover" />)}</div>
            <div className="space-y-3 p-5">
              <div><h2 className="text-xl font-bold">{open.name}</h2><p className="text-lg font-bold text-brand-700 dark:text-brand-300">{money(open.price, shop.currency)}</p></div>
              {open.description && <p className="text-sm text-stone-600 dark:text-stone-300">{open.description}</p>}
              {Object.keys(open.sizes || {}).length > 0 && (
                <div><p className="mb-1.5 text-sm font-semibold">Size</p><div className="flex flex-wrap gap-2">{Object.entries(open.sizes).map(([k, n]) => <button type="button" key={k} disabled={!n} onClick={() => setSize(k)} className={cx('rounded-xl border px-3 py-1.5 text-sm font-semibold', !n ? 'border-stone-100 text-stone-300 line-through' : size === k ? 'border-ink-950 bg-ink-950 text-white' : 'border-stone-200')}>{k}</button>)}</div></div>
              )}
              {left(open) > 0 ? <a href={order(open)} target="_blank" rel="noreferrer"><Button variant="wa" size="lg" className="mt-2 w-full">Order on WhatsApp</Button></a> : <p className="text-center text-sm font-semibold text-rose-600">Sold out — ask about sewing one for you</p>}
              {shop.phone && <a href={`tel:${shop.phone}`}><Button variant="outline" className="w-full"><Phone className="h-4 w-4" />Call {shop.name}</Button></a>}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
