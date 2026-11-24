// PDF receipts and the monthly money report (download on a computer, share sheet on a phone).
import { IS_NATIVE } from '../config';
import { money, dayLabel } from './format';
import { ymd } from './orders';

async function lib() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF, autoTable };
}
const cur = (shop) => (shop?.currency || 'GH₵').replace('₵', 'C'); // the built-in PDF font has no ₵
const m = (n, shop) => money(n, cur(shop));
const GOLD = [201, 146, 39];

function header(doc, shop, title, sub) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(11, 11, 11);
  doc.rect(0, 0, W, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(shop?.name || 'StitchBook Pro', 32, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text([shop?.address, shop?.phone].filter(Boolean).join('  ·  ') || 'StitchBook Pro', 32, 50);
  doc.setTextColor(11, 11, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, 32, 102);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(sub, 32, 118);
}
function footer(doc, line = 'Thank you for your business.') {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${line}  ·  Made with StitchBook Pro  ·  page ${i} of ${n}`, 32, doc.internal.pageSize.getHeight() - 18);
  }
}
async function save(doc, name) {
  const file = `${name.replace(/[^\w\s.-]+/g, '').trim().replace(/\s+/g, '-')}.pdf`;
  if (!IS_NATIVE) { doc.save(file); return; }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const data = doc.output('datauristring').split(',')[1];
  const r = await Filesystem.writeFile({ path: file, data, directory: Directory.Cache });
  await Share.share({ title: name, url: r.uri, dialogTitle: 'Save or send' });
}

/** Receipt for one order: what was ordered, every payment, the balance. */
export async function receiptPdf({ shop, order, customer, payments }) {
  const { jsPDF, autoTable } = await lib();
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const pays = payments.filter((p) => p.order_id === order.id && !p.voided).sort((a, b) => a.at.localeCompare(b.at));
  const paid = pays.reduce((s, p) => s + Number(p.amount), 0);
  header(doc, shop, `Receipt  ${order.code}`, `${customer?.name || ''}${customer?.phone ? `  ·  ${customer.phone}` : ''}  ·  ${dayLabel(ymd(), true)}`);
  autoTable(doc, {
    startY: 134, theme: 'plain', styles: { fontSize: 10, cellPadding: 4 },
    body: [['Item', `${order.title || order.garment}${order.title && order.title !== order.garment ? ` (${order.garment})` : ''}`], ['Ready by', order.due_date ? dayLabel(order.due_date, true) : '-'], ['Price', m(order.price, shop)]],
    columnStyles: { 0: { textColor: [110, 110, 110], cellWidth: 90 }, 1: { fontStyle: 'bold' } },
  });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10, theme: 'striped', styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: [11, 11, 11], textColor: GOLD },
    head: [['Date', 'Method', 'Note', 'Amount']],
    body: pays.length ? pays.map((p) => [dayLabel(ymd(p.at), true), p.method.toUpperCase(), p.note || '', m(p.amount, shop)]) : [['-', '', 'No payment yet', '']],
    columnStyles: { 3: { halign: 'right' } },
  });
  const bal = Math.max(0, Number(order.price) - paid);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6, theme: 'plain', styles: { fontSize: 11, cellPadding: 4, halign: 'right' },
    body: [['Total paid', m(paid, shop)], [{ content: 'Balance', styles: { fontStyle: 'bold' } }, { content: m(bal, shop), styles: { fontStyle: 'bold', textColor: bal ? [190, 30, 60] : [20, 130, 70] } }]],
    columnStyles: { 0: { textColor: [110, 110, 110] } },
  });
  if (bal && shop?.momo) { doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.text(`Pay by MoMo to ${shop.momo}`, 32, doc.lastAutoTable.finalY + 16); }
  footer(doc);
  await save(doc, `Receipt ${order.code} ${customer?.name || ''}`);
}

/** Month report: money in (orders and shop sales), by method, and who still owes. */
export async function monthReportPdf({ shop, month, payments, sales = [], orders, customers, owed }) {
  const { jsPDF, autoTable } = await lib();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const name = new Date(`${month}-01T00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const byO = Object.fromEntries(orders.map((o) => [o.id, o]));
  const byC = Object.fromEntries(customers.map((c) => [c.id, c]));
  const pays = payments.filter((p) => !p.voided && ymd(p.at).startsWith(month)).sort((a, b) => a.at.localeCompare(b.at));
  const sold = sales.filter((s) => ymd(s.at).startsWith(month)).sort((a, b) => a.at.localeCompare(b.at));
  const sum = (l) => l.reduce((s, x) => s + Number(x.amount), 0);
  const methods = ['momo', 'cash', 'bank', 'other'].map((k) => [k.toUpperCase(), m(sum(pays.filter((p) => p.method === k)) + sum(sold.filter((p) => p.method === k)), shop)]);
  const done = orders.filter((o) => o.collected_on?.startsWith(month)).length;
  header(doc, shop, `Money report — ${name}`, `${pays.length} order payments · ${sold.length} shop sales · ${done} orders collected`);
  autoTable(doc, {
    startY: 134, theme: 'grid', styles: { fontSize: 10, cellPadding: 6 }, headStyles: { fillColor: [11, 11, 11], textColor: GOLD },
    head: [['From orders', 'From ready-made sales', 'Total received', 'Customers still owe']],
    body: [[m(sum(pays), shop), m(sum(sold), shop), m(sum(pays) + sum(sold), shop), m(owed.reduce((s, x) => s + x.bal, 0), shop)]],
  });
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 12, theme: 'grid', styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: [60, 60, 60] }, head: [['Method', 'Received']], body: methods, tableWidth: 220 });
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16, theme: 'striped', styles: { fontSize: 8.5, cellPadding: 4 }, headStyles: { fillColor: [11, 11, 11], textColor: GOLD },
    head: [['Date', 'Customer', 'Order', 'Method', 'Amount']],
    body: [
      ...pays.map((p) => { const o = byO[p.order_id]; return [dayLabel(ymd(p.at)), byC[o?.customer_id]?.name || '-', `${o?.code || ''} ${o?.title || ''}`, p.method.toUpperCase(), m(p.amount, shop)]; }),
      ...sold.map((s) => [dayLabel(ymd(s.at)), s.customer_name || 'Walk-in', `Sale: ${s.product_name}${s.size ? ` (${s.size})` : ''} x${s.qty}`, s.method.toUpperCase(), m(s.amount, shop)]),
    ],
    columnStyles: { 4: { halign: 'right' } },
  });
  if (owed.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16, theme: 'striped', styles: { fontSize: 8.5, cellPadding: 4 }, headStyles: { fillColor: [150, 30, 50] },
      head: [['Who owes', 'Phone', 'Order', 'Stage', 'Balance']],
      body: owed.map(({ o, bal }) => [byC[o.customer_id]?.name || '-', byC[o.customer_id]?.phone || '', `${o.code} ${o.title}`, o.stage, m(bal, shop)]),
      columnStyles: { 4: { halign: 'right' } },
    });
  }
  footer(doc, `${shop?.name || ''} money report`);
  await save(doc, `${shop?.name || 'Shop'} report ${month}`);
}
