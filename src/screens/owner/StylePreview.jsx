import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Wand2, Download, MessageCircle } from 'lucide-react';
import { useStore, api } from '../../data/store';
import { has } from '../../lib/plans';
import { waLink } from '../../lib/orders';
import { DEMO } from '../../config';
import { PageHead, Card, Field, Button, Textarea, Locked } from '../../components/ui';
import PhotoPicker from '../../components/PhotoPicker';
import { toast } from '../../components/toast';

/** AI style preview: the chosen style, sewn in the customer's fabric (optionally on the customer's photo). */
export default function StylePreview() {
  const [params] = useSearchParams();
  const shop = useStore((s) => s.shop);
  const order = useStore((s) => s.orders.find((o) => o.id === params.get('order')));
  const customer = useStore((s) => s.customers.find((c) => c.id === order?.customer_id));
  const jobs = useStore((s) => s.aiJobs);
  const [style, setStyle] = useState(order?.style_photos?.[0] || null);
  const [fabric, setFabric] = useState(order?.fabric_photo || null);
  const [person, setPerson] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  if (!has(shop, 'ai')) return <Locked feature="ai" />;
  async function run() {
    if (!style || !fabric) return toast.error('Add a style picture and a fabric picture');
    setBusy(true);
    try {
      const r = await api.stylePreview({ orderId: order?.id, stylePhoto: style, fabricPhoto: fabric, personPhoto: person, note });
      setResult(r.job.result);
      useStore.setState((s) => ({ aiJobs: [...s.aiJobs.filter((j) => j.id !== r.job.id), r.job], shop: { ...s.shop, ai_credits: r.credits } }));
      toast.success('Preview ready', `${r.credits} credits left`);
    } catch (e) { toast.error('Preview failed', e.message); } finally { setBusy(false); }
  }
  const past = jobs.filter((j) => j.result && (!order || j.order_id === order.id)).slice(-6).reverse();
  return (
    <div className="animate-fade-in space-y-4">
      <PageHead title="AI style preview" back={order ? `/orders/${order.id}` : '/'} sub={`Show the customer how the style will look in their fabric · ${shop.ai_credits} credits left`} />
      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Style"><PhotoPicker single value={style} onChange={setStyle} label="Style" /></Field>
          <Field label="Fabric"><PhotoPicker single value={fabric} onChange={setFabric} label="Fabric" /></Field>
          <Field label="Customer (optional)"><PhotoPicker single value={person} onChange={setPerson} label="Photo" /></Field>
        </div>
        <Field label="Changes (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. make the sleeves puffed, add a peplum, longer slit" /></Field>
        <Button size="lg" className="w-full" loading={busy} onClick={run}><Wand2 className="h-5 w-5" />Make preview (1 credit)</Button>
        {DEMO && <p className="text-xs text-stone-500">Demo: the preview is drawn on your phone. The live app uses an AI image service for realistic results.</p>}
      </Card>
      {result && (
        <Card className="overflow-hidden">
          <img src={result} alt="Style preview" className="w-full" />
          <div className="flex gap-2 p-3">
            <a href={result} download={`preview-${order?.code || 'style'}.jpg`} className="flex-1"><Button variant="outline" className="w-full"><Download className="h-4 w-4" />Save</Button></a>
            {customer?.phone && <a href={waLink(customer.phone, `Hello ${customer.name.split(' ')[0]}, here's a preview of your ${order.title} in your fabric: ${result.startsWith('http') ? result : ''}`)} target="_blank" rel="noreferrer" className="flex-1"><Button variant="wa" className="w-full"><MessageCircle className="h-4 w-4" />Send</Button></a>}
          </div>
          <p className="px-3 pb-3 text-xs text-stone-500">A preview is a guide — the real garment depends on the fabric, cut and finishing.</p>
        </Card>
      )}
      {past.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Earlier previews</h2>
          <div className="grid grid-cols-3 gap-2">{past.map((j) => <button type="button" key={j.id} onClick={() => setResult(j.result)}><img src={j.result} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" /></button>)}</div>
        </div>
      )}
      {!order && <p className="text-center text-sm text-stone-500">Tip: open an order and tap “AI style preview” to use its photos. <Link to="/orders" className="font-semibold text-brand-700">Orders</Link></p>}
    </div>
  );
}
