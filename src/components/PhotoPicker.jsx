import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { compress } from '../lib/image';
import { toast } from './toast';
import { cx } from './ui';

/** Pick or take photos. `value` is an array of picture addresses (or a single one when `single`). */
export default function PhotoPicker({ value, onChange, single, label = 'Add photo', max = 4, className }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const list = single ? (value ? [value] : []) : value || [];
  async function pick(e) {
    const files = [...e.target.files].slice(0, single ? 1 : max - list.length);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = await Promise.all(files.map((f) => compress(f)));
      onChange(single ? urls[0] : [...list, ...urls]);
    } catch (err) { toast.error('Could not use that photo', err.message); } finally { setBusy(false); }
  }
  const del = (i) => onChange(single ? null : list.filter((_, j) => j !== i));
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {list.map((src, i) => (
        <div key={i} className="relative h-24 w-24">
          <img src={src} alt="" className="h-24 w-24 rounded-xl object-cover" />
          <button type="button" onClick={() => del(i)} className="absolute -right-1.5 -top-1.5 rounded-full bg-ink-900 p-1 text-white shadow" aria-label="Remove photo"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      {list.length < (single ? 1 : max) && (
        <button type="button" onClick={() => ref.current.click()} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-500 hover:border-brand-400 hover:text-brand-600 dark:border-white/15">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}{label}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple={!single} className="hidden" onChange={pick} />
    </div>
  );
}
