import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CloudOff, RefreshCw, CheckCircle2, MoreHorizontal, X } from 'lucide-react';
import { useStore, sync } from '../data/store';
import { DEMO } from '../config';
import { ago } from '../lib/format';
import Logo from './Logo';
import { cx } from './ui';
import { subscription } from '../lib/plans';

export function SyncBadge() {
  const online = useStore((s) => s.online);
  const syncing = useStore((s) => s.syncing);
  const outbox = useStore((s) => s.outbox.length);
  const lastSync = useStore((s) => s.lastSync);
  const label = syncing ? 'Syncing…' : !online ? `Offline${outbox ? ` · ${outbox} to send` : ''}` : outbox ? `${outbox} to send` : `Synced ${ago(lastSync)}`;
  const Icon = syncing ? RefreshCw : !online ? CloudOff : CheckCircle2;
  return (
    <button type="button" onClick={sync} className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', !online ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300')} title="Sync now">
      <Icon className={cx('h-3.5 w-3.5', syncing && 'animate-spin')} />{label}
    </button>
  );
}

const linkCls = ({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200' : 'text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5');

/** Bottom tabs on phones (with a "More" sheet), a sidebar on wide screens. */
export default function Layout({ nav, more = [], title }) {
  const shopName = useStore((s) => s.shop?.name);
  const syncError = useStore((s) => s.syncError);
  const shop = useStore((s) => s.shop);
  const me = useStore((s) => s.me);
  const sub = shop?.plan ? subscription(shop) : null;
  const [open, setOpen] = useState(false);
  const go = useNavigate();
  const tabs = more.length ? [...nav, { to: '#more', icon: MoreHorizontal, label: 'More' }] : nav;
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-ink-950">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-stone-200/70 bg-white p-4 md:flex dark:border-white/5 dark:bg-ink-900">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <Logo className="h-9 w-9" />
          <div className="min-w-0"><p className="font-extrabold tracking-tight text-stone-900 dark:text-white">{title}</p><p className="truncate text-xs text-stone-500">{shopName}</p></div>
        </div>
        <nav className="space-y-1 overflow-y-auto">
          {[...nav, ...more].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}><n.icon className="h-5 w-5" />{n.label}{n.badge ? <span className="ml-auto rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{n.badge}</span> : null}</NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-3"><SyncBadge /></div>
      </aside>
      {DEMO && <div className="bg-gradient-to-r from-ink-950 to-brand-800 py-1 text-center text-[11px] font-semibold text-white md:ml-60">Demo — sample data only</div>}
      {me?.role === 'owner' && sub && (sub.kind === 'expired' || (sub.kind === 'trial' && sub.days <= 7) || (sub.kind === 'paid' && sub.days <= 5)) && (
        <button type="button" onClick={() => go('/settings/plan')} className={cx('block w-full px-4 py-1.5 text-center text-xs font-semibold md:pl-64', sub.kind === 'expired' ? 'bg-rose-600 text-white' : 'bg-brand-100 text-brand-900 dark:bg-brand-500/20 dark:text-brand-100')}>
          {sub.kind === 'expired' ? 'Your free trial has ended — tap to choose a plan' : sub.kind === 'trial' ? `Free trial: ${sub.days} day${sub.days === 1 ? '' : 's'} left — tap to choose a plan` : `Your plan ends in ${sub.days} day${sub.days === 1 ? '' : 's'} — tap to renew`}
        </button>
      )}
      {syncError && <div className="bg-rose-50 px-4 py-1.5 text-center text-xs text-rose-700 md:ml-60 dark:bg-rose-500/10 dark:text-rose-300">Not saved on the server: {syncError}</div>}
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] md:ml-60 md:px-8 md:pb-10 md:pt-8">
        <div className="mb-3 flex justify-end md:hidden"><SyncBadge /></div>
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-white/5 dark:bg-ink-900/95">
        <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((n) => (n.to === '#more' ? (
            <button type="button" key="more" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-stone-500"><n.icon className="h-5 w-5" />{n.label}</button>
          ) : (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', isActive ? 'text-brand-700 dark:text-brand-300' : 'text-stone-500')}>
              <n.icon className="h-5 w-5" />{n.label}
              {n.badge ? <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-rose-500" /> : null}
            </NavLink>
          )))}
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slide-up dark:bg-ink-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between"><p className="font-bold">More</p><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5 text-stone-400" /></button></div>
            <div className="grid grid-cols-3 gap-2">
              {more.map((n) => (
                <button type="button" key={n.to} onClick={() => { setOpen(false); go(n.to); }} className="flex flex-col items-center gap-1.5 rounded-2xl bg-stone-50 p-3 text-xs font-semibold text-stone-700 dark:bg-white/5 dark:text-stone-200">
                  <n.icon className="h-6 w-6 text-brand-600 dark:text-brand-300" />{n.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
