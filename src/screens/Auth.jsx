import { useState } from 'react';
import { Scissors, Users, ShieldCheck, Loader2, LogOut } from 'lucide-react';
import { api, signedIn, signOut, sync, useStore } from '../data/store';
import { DEMO, APP_ROLE, APK_URL } from '../config';
import { DEMO_USERS } from '../data/demo';
import { friendly } from '../lib/supabase';
import { Button, Field, Input, Card, Segmented } from '../components/ui';
import { Wordmark } from '../components/Logo';

function Frame({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950 bg-[radial-gradient(ellipse_at_top,_rgba(201,146,39,.28),_transparent_60%)] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1><Wordmark light className="mx-auto w-72" /></h1>
          <p className="mt-1 text-sm text-white/60">{APP_ROLE === 'staff' ? 'For tailors & apprentices' : 'Your fashion shop in one phone'}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
const dark = 'border-white/10 bg-white/5 text-white placeholder:text-white/30';

export default function Auth() {
  const [mode, setMode] = useState('in');
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setErr('');
    if (phone.replace(/\D/g, '').length < 9) return setErr('Enter your phone number');
    if (!DEMO && pw.length < 6) return setErr('Password must be at least 6 characters');
    setBusy(true);
    try { const s = mode === 'in' ? await api.signIn(phone, pw) : await api.signUp(phone, pw); await signedIn(s); } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  async function demoAs(userId) { setBusy(true); await api.restore(userId); await signedIn({ userId }); setBusy(false); }
  return (
    <Frame>
      {DEMO && (
        <Card className="mb-5 space-y-2 border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">Try the demo — no account needed</p>
          {APP_ROLE !== 'staff' && <Button size="lg" variant="gold" className="w-full" loading={busy} onClick={() => demoAs(DEMO_USERS.owner)}><Scissors className="h-5 w-5" />Try as the designer</Button>}
          {APP_ROLE !== 'designer' && <Button size="lg" variant="outline" className="w-full !border-white/20 !bg-white/5 !text-white" disabled={busy} onClick={() => demoAs(DEMO_USERS.staff)}><Users className="h-5 w-5" />Try as a tailor (staff)</Button>}
          {!APP_ROLE && <Button variant="ghost" className="w-full text-white/70 hover:bg-white/10" disabled={busy} onClick={() => demoAs(DEMO_USERS.admin)}><ShieldCheck className="h-4 w-4" />Platform admin view</Button>}
        </Card>
      )}
      <Card className="space-y-3 border-white/10 bg-white/5 p-5">
        <Segmented value={mode} onChange={setMode} className="w-full bg-white/10 [&>button]:flex-1 [&>button]:text-white/70 [&>button.bg-white]:!text-ink-950" options={[{ value: 'in', label: 'Sign in' }, { value: 'up', label: 'Create account' }]} />
        <Field label={<span className="text-white/80">Phone number</span>}><Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000" className={dark} /></Field>
        <Field label={<span className="text-white/80">Password</span>}><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" className={dark} onKeyDown={(e) => e.key === 'Enter' && go()} /></Field>
        {err && <p className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">{err}</p>}
        <Button size="lg" variant="gold" className="w-full" loading={busy} onClick={go}>{mode === 'in' ? 'Sign in' : 'Create account'}</Button>
      </Card>
      {!DEMO && APP_ROLE !== 'staff' && <p className="mt-6 text-center text-xs text-white/40"><a href={APK_URL} className="underline">Download the Android app</a></p>}
    </Frame>
  );
}

/** Signed in, but not part of a shop yet: set up a shop, or join one as staff. */
export function Onboard() {
  const [mode, setMode] = useState(APP_ROLE === 'staff' ? 'join' : 'shop');
  const [f, setF] = useState({ name: '', phone: '', shop: '', prefix: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function go() {
    setErr('');
    if (f.name.trim().length < 2) return setErr('Enter your name');
    setBusy(true);
    try {
      if (mode === 'shop') await api.createShop(f.name.trim(), f.phone, f.shop.trim(), f.prefix || f.shop.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'SB');
      else await api.joinShop(f.name.trim(), f.phone, f.code);
      await sync();
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Frame>
      <Card className="space-y-3 border-white/10 bg-white/5 p-5">
        {APP_ROLE === '' && <Segmented value={mode} onChange={setMode} className="w-full bg-white/10 [&>button]:flex-1 [&>button]:text-white/70 [&>button.bg-white]:!text-ink-950" options={[{ value: 'shop', label: 'I own a shop' }, { value: 'join', label: 'I work in a shop' }]} />}
        <Field label={<span className="text-white/80">Your name</span>}><Input value={f.name} onChange={set('name')} className={dark} /></Field>
        <Field label={<span className="text-white/80">Your phone</span>}><Input type="tel" value={f.phone} onChange={set('phone')} className={dark} /></Field>
        {mode === 'shop' ? (
          <>
            <Field label={<span className="text-white/80">Shop / brand name</span>}><Input value={f.shop} onChange={set('shop')} placeholder="e.g. Ama Couture" className={dark} /></Field>
            <Field label={<span className="text-white/80">Letters for your fabric tags (optional)</span>}><Input value={f.prefix} onChange={set('prefix')} maxLength={5} placeholder="e.g. AC → AC-0001" className={dark} /></Field>
          </>
        ) : <Field label={<span className="text-white/80">Invite code from the shop owner</span>}><Input value={f.code} onChange={set('code')} className={`${dark} font-mono uppercase tracking-widest`} /></Field>}
        {err && <p className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">{err}</p>}
        <Button size="lg" variant="gold" className="w-full" loading={busy} onClick={go}>{mode === 'shop' ? 'Open my shop' : 'Ask to join'}</Button>
      </Card>
      <button type="button" className="mx-auto mt-6 flex items-center gap-1 text-sm text-white/50" onClick={() => signOut()}><LogOut className="h-4 w-4" />Sign out</button>
    </Frame>
  );
}

export function Waiting() {
  const me = useStore((s) => s.me);
  return (
    <Frame>
      <Card className="border-white/10 bg-white/5 p-6 text-center text-white">
        {me?.status === 'disabled' ? <p>Your account has been blocked by the shop owner.</p> : <><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-gold-400" /><p className="font-semibold">Waiting for the shop owner to approve you</p><p className="mt-1 text-sm text-white/60">Ask them to open Team and tap ✓ next to your name.</p></>}
        <Button variant="outline" className="mt-5 w-full !border-white/20 !bg-transparent !text-white" onClick={() => sync()}>Check again</Button>
        <button type="button" className="mt-3 text-sm text-white/50" onClick={() => signOut()}>Sign out</button>
      </Card>
    </Frame>
  );
}

export function WrongApp() {
  const me = useStore((s) => s.me);
  return (
    <Frame>
      <Card className="border-white/10 bg-white/5 p-6 text-center text-white">
        <p className="font-semibold">{me?.role === 'owner' ? 'This is the staff app. Shop owners use StitchBook Pro.' : 'This app is for shop owners. Please use StitchBook Staff.'}</p>
        <Button variant="outline" className="mt-5 w-full !border-white/20 !bg-transparent !text-white" onClick={() => signOut()}>Sign out</Button>
      </Card>
    </Frame>
  );
}
