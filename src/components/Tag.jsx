import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { publicBase } from '../config';
import { dayLabel } from '../lib/format';

/** The fabric tag: QR + big code + who/what/when. Printed or shown to copy onto a paper tag. */
export default function Tag({ order, customer, shop }) {
  const [qr, setQr] = useState('');
  useEffect(() => { QRCode.toDataURL(`${publicBase()}#/o/${order.code}`, { margin: 1, width: 240 }).then(setQr); }, [order.code]);
  return (
    <div className="print-area w-[280px] rounded-2xl border-2 border-dashed border-stone-400 bg-white p-4 text-center text-stone-900">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">{shop?.name}</p>
      {qr && <img src={qr} alt="" className="mx-auto my-2 h-40 w-40" />}
      <p className="font-mono text-3xl font-extrabold tracking-wider">{order.code}</p>
      <p className="mt-1 font-semibold">{customer?.name}</p>
      <p className="text-sm">{order.title || order.garment}</p>
      {order.due_date && <p className="mt-1 text-sm">Ready by <b>{dayLabel(order.due_date)}</b></p>}
    </div>
  );
}
