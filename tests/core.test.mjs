import test from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../src/lib/orders.js';
import * as M from '../src/lib/measure.js';
import * as P from '../src/lib/plans.js';
import * as C from '../src/lib/costing.js';

test('tag codes', () => {
  assert.equal(O.tagCode('sb', 42), 'SB-0042');
  assert.equal(O.parseTag('https://x/#/o/SB-0142'), 'SB-0142');
  assert.equal(O.parseTag('ama-7'), 'AMA-0007');
  assert.equal(O.parseTag('hello'), null);
});

test('money: paid and balance ignore voided payments', () => {
  const pays = [{ order_id: 'a', amount: 100 }, { order_id: 'a', amount: '50.5' }, { order_id: 'a', amount: 30, voided: true }, { order_id: 'b', amount: 9 }];
  assert.equal(O.paidFor(pays, 'a'), 150.5);
  assert.equal(O.balanceOf({ id: 'a', price: 400 }, pays), 249.5);
  assert.equal(O.balanceOf({ id: 'a', price: 100 }, pays), 0);
});

test('urgency and capacity', () => {
  const t = '2026-12-10';
  assert.equal(O.urgency({ stage: 'sewing', due_date: '2026-12-09' }, t), 'overdue');
  assert.equal(O.urgency({ stage: 'sewing', due_date: t }, t), 'today');
  assert.equal(O.urgency({ stage: 'sewing', due_date: '2026-12-13' }, t), 'soon');
  assert.equal(O.urgency({ stage: 'ready', due_date: '2026-12-01' }, t), 'none');
  const orders = [1, 2, 3].map((i) => ({ id: `o${i}`, stage: 'sewing', due_date: t }));
  assert.match(O.capacityWarning(orders, t, 3), /already have 3 pieces/);
  assert.equal(O.capacityWarning(orders, t, 3, 'o1'), '');
  assert.equal(O.capacityWarning(orders, t, 4), '');
  assert.equal(O.nextFreeDay(orders, t, 3), '2026-12-11');
});

test('whatsapp numbers and messages', () => {
  assert.equal(O.waNumber('024 412 3456'), '233244123456');
  assert.equal(O.waNumber('+233 24 412 3456'), '233244123456');
  const txt = O.message('ready', { order: { title: 'Kaba & slit', code: 'SB-0001', price: 300 }, customer: { name: 'Akosua Mensah' }, shop: { name: 'Ama Couture', currency: 'GH₵' }, balance: 100, link: 'https://t' });
  assert.match(txt, /Hello Akosua/);
  assert.match(txt, /ready for collection/);
  assert.match(txt, /GH₵ 100\.00/);
  assert.match(txt, /https:\/\/t/);
});

test('uncollected and staff pay', () => {
  const orders = [{ stage: 'ready', ready_on: '2026-12-01' }, { stage: 'ready', ready_on: '2026-12-08' }, { stage: 'collected', ready_on: '2026-11-01' }];
  assert.equal(O.uncollected(orders, 7, '2026-12-10').length, 1);
  const tasks = [{ staff_id: 's', rate: 20, done_at: 'x' }, { staff_id: 's', rate: 15, done_at: 'x', paid: true }, { staff_id: 's', rate: 5 }];
  assert.equal(O.owedTo(tasks, 's'), 20);
});

test('measurements: clean, rows, convert, changes', () => {
  const v = M.clean({ bust: '36', waist: '29,5', hip: '', x_slit: 'abc', sleeve: 0 });
  assert.deepEqual(v, { bust: 36, waist: 29.5 });
  const r = M.rows('female', { ...v, x_slit_opening: 10 });
  assert.deepEqual(r.map((x) => x[1]), ['Bust', 'Waist', 'slit opening']);
  assert.equal(M.customKey('Slit opening!'), 'x_slit_opening');
  assert.deepEqual(M.convert({ bust: 36 }, 'in', 'cm'), { bust: 91.4 });
  assert.deepEqual(M.changes({ values: { bust: 36, waist: 29 } }, { values: { bust: 37, waist: 29 } }), [{ key: 'bust', from: 36, to: 37, diff: 1 }]);
});

test('plans: trial then paid', () => {
  const now = new Date('2026-12-01T10:00:00');
  assert.equal(P.effectivePlan({ plan: 'solo', trial_until: '2026-12-10' }, now), 'business');
  assert.deepEqual(P.subscription({ plan: 'solo', trial_until: '2026-12-10' }, now), { kind: 'trial', days: 10 });
  assert.equal(P.effectivePlan({ plan: 'solo', trial_until: '2026-11-30' }, now), null);
  assert.equal(P.canWrite({ plan: 'solo', trial_until: '2026-11-30' }, now), false);
  assert.equal(P.subscription({ plan: 'studio', trial_until: '2026-11-01' }, now).kind, 'expired');
  assert.equal(P.effectivePlan({ plan: 'studio', paid_until: '2026-12-01', trial_until: '2026-11-01' }, now), 'studio');
  assert.equal(P.has({ plan: 'studio', paid_until: '2027-01-01' }, 'ai', now), false);
  assert.equal(P.has({ plan: 'business', paid_until: '2027-01-01' }, 'stock', now), true);
  assert.equal(P.has({ plan: 'solo', paid_until: '2027-01-01' }, 'groups', now), false);
  assert.equal(P.planFor('stock'), 'business');
});

test('costing', () => {
  const items = [{ name: 'Fabric', amount: '120' }, { name: 'Zip', amount: 5 }, { name: 'Labour', amount: 80.5 }];
  assert.equal(C.costTotal(items), 205.5);
  assert.equal(C.suggestPrice(205.5, 50), 310);
  assert.equal(C.suggestPrice(0, 50), 0);
  assert.deepEqual(C.profit(300, 205.5), { profit: 94.5, margin: 32 });
});

test('yards estimate', () => {
  const mid = C.estimateYards({ garment: 'Dress', values: { bust: 40, hip: 40, dress_len: 42 } });
  assert.equal(mid.yards, 3.5);
  const big = C.estimateYards({ garment: 'Dress', values: { bust: 50, hip: 54, dress_len: 46 } });
  assert.ok(big.yards > mid.yards);
  const wide = C.estimateYards({ garment: 'Dress', values: { bust: 40, hip: 40, dress_len: 42 }, width: 60 });
  assert.ok(wide.yards < mid.yards);
  const kid = C.estimateYards({ garment: 'Dress', child: true });
  assert.ok(kid.yards <= 2);
  assert.equal(C.estimateYards({ garment: 'Alteration' }).yards, 0);
  assert.equal(C.estimateYards({ garment: 'Dress', values: { bust: 101.6, hip: 101.6, dress_len: 106.7 }, unit: 'cm' }).yards, 3.5);
  assert.equal(mid.yards % 0.5, 0);
});
