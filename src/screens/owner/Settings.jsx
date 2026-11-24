import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, CreditCard, Moon, LogOut, ChevronRight, Check, Sparkles } from 'lucide-react';
import { useStore, saveShop, setPrefs, signOut, sync, api } from '../../data/store';
import { PLANS, effectivePlan, subscription, FEATURE_NAMES, TRIAL_DAYS } from '../../lib/plans';
import { dayLabel, money } from '../../lib/format';
import { DEMO, PAY_TO } from '../../config';
import { resetDemo } from '../../data/demo';
import { PageHead, Card, Field, Input, Button, Segmented, Toggle, Modal, cx } from '../../components/ui';
import { toast } from '../../components/toast';

export function Settings() {
  const shop = useStore((s) => s.shop);
  const me = useStore((s) => s.me);
  const prefs = useStore((s) => s.prefs);
  const [f, setF] = useState({ name: shop.name, phone: shop.phone, address: shop.address, momo: shop.momo, per_day: String(shop.per_day), tag_prefix: shop.tag_prefix, markup: String(shop.markup ?? 50) });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  function submit() {
    const pfx = f.tag_prefix.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'SB';
    saveShop({ name: f.name.trim() || shop.name, phone: f.phone, address: f.address, momo: f.momo, per_day: Math.max(1, parseInt(f.per_day, 10) || 3), tag_prefix: pfx, markup: Math.max(0, parseInt(f.markup, 10) || 0) });
    toast.success('Settings saved');
  }
  const plan = effectivePlan(shop);
  const sub = subscription(shop);
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title="Settings" />
      <Link to="/settings/plan">
        <Card className="flex items-center gap-3 bg-gradient-to-r from-ink-950 to-brand-900 p-4 text-white">
          <CreditCard className="h-6 w-6 text-gold-300" />
          <div className="flex-1"><p className="font-bold">{sub.kind === 'trial' ? 'Free trial — everything on' : sub.kind === 'paid' ? `${PLANS[plan].label} plan` : 'Trial ended'}</p><p className="text-sm text-white/70">{sub.kind === 'trial' ? `${sub.days} days left` : sub.kind === 'paid' ? `Paid until ${dayLabel(shop.paid_until, true)}` : 'Choose a plan to keep adding work'}{shop.ai_credits ? ` · ${shop.ai_credits} AI previews left` : ''}</p></div>
          <ChevronRight className="h-5 w-5" />
        </Card>
      </Link>
      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><Store className="h-4 w-4 text-brand-600" />Your shop</p>
        <Field label="Shop name"><Input value={f.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shop phone"><Input value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Location"><Input value={f.address} onChange={set('address')} /></Field>
        </div>
        <Field label="MoMo for payments" hint="Shown to customers on reminders and the tracking page"><Input value={f.momo} onChange={set('momo')} placeholder="024 000 0000 (Name)" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pieces you can finish a day" hint="Warns you before you overbook"><Input inputMode="numeric" value={f.per_day} onChange={set('per_day')} /></Field>
          <Field label="Tag code letters" hint={`Next tag: ${(f.tag_prefix || 'SB').toUpperCase()}-${String(shop.next_tag).padStart(4, '0')}`}><Input value={f.tag_prefix} onChange={set('tag_prefix')} maxLength={5} /></Field>
        </div>
        <Field label="Usual profit %" hint="Used by the cost & price helper"><Input inputMode="numeric" value={f.markup} onChange={set('markup')} /></Field>
        <Field label="Measure in"><Segmented value={shop.unit} onChange={(v) => saveShop({ unit: v })} options={[{ value: 'in', label: 'Inches' }, { value: 'cm', label: 'Centimetres' }]} /></Field>
        <Button onClick={submit}>Save</Button>
      </Card>
      <Card className="px-4">
        <Toggle label="Dark mode" sub="Easier on the eyes at night" checked={!!prefs.dark} onChange={(v) => setPrefs({ dark: v })} />
      </Card>
      <Card className="flex items-center justify-between p-4">
        <div><p className="font-semibold">{me.name}</p><p className="text-sm text-stone-500">{me.phone}</p></div>
        <Button variant="outline" onClick={() => confirm('Sign out?') && signOut()}><LogOut className="h-4 w-4" />Sign out</Button>
      </Card>
      {DEMO && <Button variant="ghost" className="w-full" onClick={async () => { await resetDemo(); await sync(); toast.success('Demo data reset'); }}>Reset the demo data</Button>}
      <p className="text-center text-xs text-stone-400"><Moon className="mr-1 inline h-3 w-3" />StitchBook Pro · works offline, syncs when online</p>
    </div>
  );
}

export function Plan() {
  const shop = useStore((s) => s.shop);
  const requests = useStore((s) => s.requests);
  const [want, setWant] = useState(null);
  const [months, setMonths] = useState(1);
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const sub = subscription(shop);
  const paidPlan = sub.kind === 'paid' ? shop.plan : null;
  const pending = requests.find((r) => r.status === 'pending');
  async function send() {
    if (ref.trim().length < 4) return toast.error('Enter the MoMo transaction ID');
    setBusy(true);
    try {
      const r = await api.requestUpgrade({ plan: want, months, amount: PLANS[want].price * months, momo_ref: ref.trim() });
      useStore.setState({ requests: [...requests, r] });
      setWant(null); setRef('');
      toast.success('Payment sent for checking', 'Your plan switches on as soon as it’s confirmed.');
    } catch (e) { toast.error('Could not send', e.message); } finally { setBusy(false); }
  }
  async function demo(kind) { await api.demoPlan(kind); await sync(); toast.success('Demo updated'); }
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title="Plans" back="/settings" sub={`Every new shop gets ${TRIAL_DAYS} days free with everything switched on.`} />
      <Card className={cx('p-4 text-sm', sub.kind === 'expired' ? 'border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300' : 'border-brand-200 bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-200')}>
        {sub.kind === 'trial' && <>You’re on the <b>free trial</b> — {sub.days} days left. Pick a plan any time; your days carry on.</>}
        {sub.kind === 'paid' && <><b>{PLANS[shop.plan].label}</b> is paid until <b>{dayLabel(shop.paid_until, true)}</b>.</>}
        {sub.kind === 'expired' && <>Your trial has ended. Your records are safe — choose a plan to keep adding new work.</>}
      </Card>
      {pending && <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">Your payment for <b>{PLANS[pending.plan].label}</b> ({pending.months} month{pending.months > 1 ? 's' : ''}, ref {pending.momo_ref}) is being checked.</Card>}
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(PLANS).map(([k, p]) => (
          <Card key={k} className={cx('flex flex-col p-5', paidPlan === k && 'ring-2 ring-brand-500')}>
            <p className="text-lg font-extrabold">{p.label}</p>
            <p className="text-sm text-stone-500">{p.priceLabel}</p>
            <ul className="my-4 flex-1 space-y-1.5 text-sm">
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />Unlimited customers & orders</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />Measurements, fabric tags, calendar</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />Money, PDF receipts & reports</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />Costing helper & yards calculator</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />WhatsApp messages & tracking link</li>
              {p.features.map((x) => <li key={x} className="flex gap-2"><Sparkles className="h-4 w-4 shrink-0 text-brand-500" />{FEATURE_NAMES[x]}</li>)}
              {p.staff > 0 && <li className="flex gap-2 text-stone-500">Up to {p.staff} staff</li>}
            </ul>
            <Button variant={paidPlan === k ? 'soft' : 'primary'} onClick={() => setWant(k)}>{paidPlan === k ? 'Renew' : `Choose ${p.label}`}</Button>
          </Card>
        ))}
      </div>
      {DEMO && (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-semibold">Demo only: see the app in another state</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => demo('trial')}>Free trial</Button>
            {Object.entries(PLANS).map(([k, p]) => <Button key={k} size="sm" variant="outline" onClick={() => demo(k)}>Paid {p.label}</Button>)}
            <Button size="sm" variant="outline" onClick={() => demo('expired')}>Trial ended</Button>
          </div>
        </Card>
      )}
      <Modal open={!!want} onClose={() => setWant(null)} title={want ? `Pay for ${PLANS[want].label}` : ''} footer={<Button className="w-full" loading={busy} onClick={send}>I have paid</Button>}>
        {want && (
          <div className="space-y-3 text-sm">
            <Segmented value={months} onChange={setMonths} options={[{ value: 1, label: '1 month' }, { value: 3, label: '3 months' }, { value: 12, label: '12 months' }]} />
            <p className="rounded-xl bg-stone-50 p-3 dark:bg-white/5">Send <b>{money(PLANS[want].price * months, shop.currency)}</b> by MoMo to <b>{PAY_TO}</b>, then type the transaction ID below.</p>
            <Field label="MoMo transaction ID"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 7712345678" /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
