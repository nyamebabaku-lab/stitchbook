import { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, Loader2, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToasts } from './toast';
import { STAGE } from '../lib/orders';
import { initials } from '../lib/format';
import { FEATURE_NAMES, PLANS, planFor } from '../lib/plans';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...p }) {
  const v = {
    primary: 'bg-ink-950 text-white hover:bg-ink-800 active:bg-ink-700 shadow-sm dark:bg-brand-400 dark:text-ink-950 dark:hover:bg-brand-300',
    dark: 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900',
    gold: 'bg-gold-400 text-ink-950 hover:bg-gold-500',
    soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200',
    ghost: 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/5',
    outline: 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-white/10 dark:bg-transparent dark:text-stone-200 dark:hover:bg-white/5',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    wa: 'bg-[#25D366] text-white hover:bg-[#1ebe5a]',
  }[variant];
  const s = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-14 px-6 text-base' }[size];
  return (
    <button type="button" className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none', v, s, className)} disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export const Card = ({ className, children, ...p }) => (
  <div className={cx('rounded-2xl border border-stone-200/70 bg-white shadow-soft dark:border-white/5 dark:bg-ink-900', className)} {...p}>{children}</div>
);

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
export const inputCls = 'w-full min-w-0 h-11 rounded-xl border border-stone-200 bg-white px-3 text-[15px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-ink-950 dark:text-white';
export const Input = ({ className, ...p }) => <input className={cx(inputCls, className)} {...p} />;
export const Select = ({ className, children, ...p }) => <select className={cx(inputCls, 'pr-8', className)} {...p}>{children}</select>;
export const Textarea = ({ className, ...p }) => <textarea className={cx(inputCls, 'h-auto min-h-[80px] py-2', className)} {...p} />;

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className={cx('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-slide-up sm:rounded-3xl sm:animate-fade-in dark:bg-ink-900', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-white/5">
          <h3 className="text-base font-bold text-stone-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-stone-100 px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] dark:border-white/5">{footer}</div>}
      </div>
    </div>
  );
}

export function Toasts() {
  const list = useToasts((s) => s.list);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 pt-[max(.75rem,env(safe-area-inset-top))]">
      {list.map((t) => {
        const Icon = t.kind === 'error' ? AlertTriangle : t.kind === 'info' ? Info : CheckCircle2;
        const c = t.kind === 'error' ? 'text-rose-500' : t.kind === 'info' ? 'text-sky-500' : 'text-emerald-500';
        return (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-black/5 animate-fade-in dark:bg-ink-800 dark:ring-white/10">
            <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', c)} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 dark:text-white">{t.title}</p>
              {t.body && <p className="text-xs text-stone-500 dark:text-stone-400">{t.body}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const StagePill = ({ stage, className }) => {
  const s = STAGE[stage] || STAGE.received;
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', s.cls, className)}>{s.label}</span>;
};
const URG = { overdue: ['Overdue', 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'], today: ['Due today', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'], soon: ['Due soon', 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300'] };
export const UrgencyPill = ({ u }) => (URG[u] ? <span className={cx('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', URG[u][1])}>{URG[u][0]}</span> : null);

export const Avatar = ({ name, src, className }) => (
  src ? <img src={src} alt="" className={cx('h-10 w-10 shrink-0 rounded-full object-cover', className)} />
    : <span className={cx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-800 to-brand-500 text-sm font-bold text-white', className)}>{initials(name)}</span>
);

export function Stat({ label, value, sub, icon: Icon, tone = 'brand', to }) {
  const t = { brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300', green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' }[tone];
  const body = (
    <Card className="h-full p-4">
      <div className="flex items-center gap-2">
        {Icon && <span className={cx('rounded-lg p-1.5', t)}><Icon className="h-4 w-4" /></span>}
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      </div>
      <p className={cx('mt-2 font-bold tracking-tight text-stone-900 dark:text-white', String(value).length > 9 ? 'text-lg' : 'text-2xl')}>{value}</p>
      {sub && <p className="text-xs text-stone-500 dark:text-stone-400">{sub}</p>}
    </Card>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col items-center px-6 py-12 text-center">
    {Icon && <Icon className="mb-3 h-10 w-10 text-stone-300 dark:text-stone-600" />}
    <p className="font-semibold text-stone-700 dark:text-stone-200">{title}</p>
    {children && <div className="mt-1 text-sm text-stone-500">{children}</div>}
  </div>
);

export function PageHead({ title, sub, right, back }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {back && <Link to={back} className="mb-1 inline-block text-sm font-semibold text-brand-700 dark:text-brand-300">‹ Back</Link>}
        <h1 className="truncate text-2xl font-bold tracking-tight text-stone-900 dark:text-white">{title}</h1>
        {sub && <p className="text-sm text-stone-500 dark:text-stone-400">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-3 text-left">
      <span>
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{label}</span>
        {sub && <span className="block text-xs text-stone-500">{sub}</span>}
      </span>
      <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-600')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function Segmented({ value, onChange, options, className }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-stone-100 p-1 dark:bg-white/5', className)}>
      {options.map((o) => (
        <button type="button" key={o.value} onClick={() => onChange(o.value)} className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold transition', value === o.value ? 'bg-white text-stone-900 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-stone-500')}>
          {o.label}{o.count != null ? <span className="ml-1 text-xs opacity-60">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Shown in place of a feature the shop's plan doesn't include. */
export function Locked({ feature }) {
  const plan = planFor(feature);
  return (
    <Card className="mx-auto mt-6 max-w-md p-6 text-center">
      <span className="mx-auto mb-3 inline-flex rounded-2xl bg-gold-100 p-3 text-gold-600"><Lock className="h-6 w-6" /></span>
      <h2 className="text-lg font-bold">{FEATURE_NAMES[feature]}</h2>
      <p className="mt-1 text-sm text-stone-500">This comes with the <b>{PLANS[plan].label}</b> plan ({PLANS[plan].priceLabel}).</p>
      <Link to="/settings/plan" className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white">See plans</Link>
    </Card>
  );
}

/** Shown instead of "new" forms once the free trial has ended and no plan is paid. */
export function Paywall() {
  return (
    <Card className="mx-auto mt-6 max-w-md p-6 text-center">
      <span className="mx-auto mb-3 inline-flex rounded-2xl bg-gold-100 p-3 text-gold-600"><Lock className="h-6 w-6" /></span>
      <h2 className="text-lg font-bold">Your free trial has ended</h2>
      <p className="mt-1 text-sm text-stone-500">Your customers, measurements and orders are all still here. Choose a plan to keep adding new work.</p>
      <Link to="/settings/plan" className="mt-4 inline-flex h-11 items-center rounded-xl bg-ink-950 px-5 text-sm font-semibold text-white dark:bg-brand-400 dark:text-ink-950">See plans</Link>
    </Card>
  );
}

/** Square photo thumbnail with a fallback. */
export const Thumb = ({ src, className, alt = '' }) => (
  src ? <img src={src} alt={alt} loading="lazy" className={cx('rounded-xl bg-stone-100 object-cover dark:bg-white/5', className)} />
    : <span className={cx('inline-block rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 dark:from-white/5 dark:to-white/10', className)} />
);
