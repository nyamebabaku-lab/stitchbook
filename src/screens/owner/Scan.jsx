import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { useStore } from '../../data/store';
import { parseTag } from '../../lib/orders';
import { PageHead, Card, Input, Button } from '../../components/ui';
import { toast } from '../../components/toast';

/** Scan a fabric tag's QR (or type its code) to open the order. */
export default function Scan() {
  const go = useNavigate();
  const orders = useStore((s) => s.orders);
  const video = useRef();
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const find = (text) => {
    const c = parseTag(text);
    const o = c && orders.find((x) => x.code === c);
    if (o) { go(`/orders/${o.id}`, { replace: true }); return true; }
    return false;
  };
  useEffect(() => {
    let stream; let raf; let stop = false;
    const canvas = document.createElement('canvas');
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stop) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = () => {
          if (stop) return;
          const v = video.current;
          if (v && v.readyState >= 2) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            const g = canvas.getContext('2d', { willReadFrequently: true });
            g.drawImage(v, 0, 0);
            const img = g.getImageData(0, 0, canvas.width, canvas.height);
            const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (hit?.data) { if (find(hit.data)) return; toast.error('Not one of your tags', hit.data.slice(0, 60)); }
          }
          raf = setTimeout(() => requestAnimationFrame(tick), 250);
        };
        tick();
      } catch { setErr('The camera could not start. Type the code from the tag instead.'); }
    })();
    return () => { stop = true; clearTimeout(raf); stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="animate-fade-in">
      <PageHead title="Scan a fabric tag" back="/" />
      <Card className="overflow-hidden">
        {err ? <p className="p-6 text-center text-sm text-stone-500">{err}</p> : <video ref={video} playsInline muted className="aspect-square w-full bg-black object-cover" />}
      </Card>
      <div className="mt-4 flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Or type the code, e.g. AC-0012" onKeyDown={(e) => e.key === 'Enter' && !find(code) && toast.error('No order with that code')} />
        <Button onClick={() => !find(code) && toast.error('No order with that code')}>Open</Button>
      </div>
    </div>
  );
}
