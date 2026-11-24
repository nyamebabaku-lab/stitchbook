import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, RefreshCw, UserCheck, UserX, Wallet, Users } from 'lucide-react';
import { useStore, updateMember, removeMember, newInviteCode, save } from '../../data/store';
import { STAGE, owedTo, ymd } from '../../lib/orders';
import { has } from '../../lib/plans';
import { money, dayLabel } from '../../lib/format';
import { PageHead, Card, Button, Avatar, Empty, Locked, Modal, Segmented } from '../../components/ui';
import { toast } from '../../components/toast';

export default function Team() {
  const shop = useStore((s) => s.shop);
  const members = useStore((s) => s.members);
  const tasks = useStore((s) => s.tasks);
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const code = useStore((s) => s.inviteCode);
  const [who, setWho] = useState(null);
  const [tab, setTab] = useState('todo');
  const staff = members.filter((m) => m.role === 'staff');
  const cur = shop?.currency;
  const orderById = useMemo(() => Object.fromEntries(orders.map((o) => [o.id, o])), [orders]);
  const nameOf = (o) => customers.find((c) => c.id === o?.customer_id)?.name;
  if (!has(shop, 'staff')) return <Locked feature="staff" />;
  const sel = who && members.find((m) => m.user_id === who);
  const selTasks = sel ? tasks.filter((t) => t.staff_id === sel.user_id && (tab === 'todo' ? !t.done_at : tab === 'unpaid' ? t.done_at && !t.paid : t.paid)) : [];
  function payAll() {
    const due = tasks.filter((t) => t.staff_id === sel.user_id && t.done_at && !t.paid);
    due.forEach((t) => save('tasks', { id: t.id, paid: true, paid_on: ymd() }));
    toast.success(`Paid ${sel.name.split(' ')[0]} ${money(due.reduce((s, t) => s + Number(t.rate), 0), cur)}`);
  }
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title="Team" sub="Tailors and apprentices" />
      <Card className="p-4">
        <p className="text-sm font-bold">Add staff</p>
        <p className="mt-1 text-sm text-stone-500">Ask them to install <b>StitchBook Staff</b>, create an account and join with this code. Then approve them here.</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-xl bg-stone-100 px-4 py-2 font-mono text-xl font-bold tracking-widest dark:bg-white/5">{code || '—'}</span>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(code); toast.success('Code copied'); }}><Copy className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => confirm('Make a new code? The old one stops working.') && newInviteCode()}><RefreshCw className="h-4 w-4" />New code</Button>
        </div>
      </Card>
      <Card className="divide-y divide-stone-100 dark:divide-white/5">
        {staff.map((m) => {
          const open = tasks.filter((t) => t.staff_id === m.user_id && !t.done_at).length;
          const owed = owedTo(tasks, m.user_id);
          return (
            <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => m.status === 'active' && setWho(m.user_id)}>
                <p className="truncate font-semibold">{m.name}</p>
                <p className="text-sm text-stone-500">{m.status === 'pending' ? 'Waiting for approval' : m.status === 'disabled' ? 'Blocked' : `${open} to do · owed ${money(owed, cur)}`}</p>
              </button>
              {m.status === 'pending' && <><Button size="sm" variant="success" onClick={() => updateMember(m.user_id, { status: 'active' })}><UserCheck className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => confirm(`Remove ${m.name}?`) && removeMember(m.user_id)}><UserX className="h-4 w-4" /></Button></>}
              {m.status === 'active' && <Button size="sm" variant="ghost" onClick={() => setWho(m.user_id)}>Open</Button>}
              {m.status === 'disabled' && <Button size="sm" variant="ghost" onClick={() => updateMember(m.user_id, { status: 'active' })}>Unblock</Button>}
            </div>
          );
        })}
        {!staff.length && <Empty icon={Users} title="No staff yet">Share the code above.</Empty>}
      </Card>
      <p className="text-xs text-stone-500">Give work from an order’s page (“Who is working on it”). Staff see only their own tasks and can’t see prices or payments.</p>

      <Modal wide open={!!sel} onClose={() => setWho(null)} title={sel?.name} footer={sel && <><Button variant="ghost" className="text-rose-600" onClick={() => { updateMember(sel.user_id, { status: 'disabled' }); setWho(null); }}>Block</Button><Button className="flex-1" variant="success" onClick={payAll} disabled={!owedTo(tasks, sel.user_id)}><Wallet className="h-4 w-4" />Pay {money(owedTo(tasks, sel.user_id), cur)}</Button></>}>
        {sel && (
          <>
            <Segmented value={tab} onChange={setTab} className="mb-3 w-full [&>button]:flex-1" options={[{ value: 'todo', label: 'To do' }, { value: 'unpaid', label: 'Done, not paid' }, { value: 'paid', label: 'Paid' }]} />
            <ul className="divide-y divide-stone-100 text-sm dark:divide-white/5">
              {selTasks.map((t) => { const o = orderById[t.order_id]; return (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <Link to={`/orders/${t.order_id}`} onClick={() => setWho(null)} className="min-w-0"><p className="truncate font-semibold">{STAGE[t.stage].label} · {o?.title}</p><p className="text-xs text-stone-500">{nameOf(o)} · {o?.code}{o?.due_date ? ` · due ${dayLabel(o.due_date)}` : ''}{t.paid_on ? ` · paid ${dayLabel(t.paid_on)}` : ''}</p></Link>
                  <b>{money(t.rate, cur)}</b>
                </li>
              ); })}
              {!selTasks.length && <li className="py-4 text-stone-500">Nothing here.</li>}
            </ul>
          </>
        )}
      </Modal>
    </div>
  );
}
