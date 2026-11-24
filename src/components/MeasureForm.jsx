import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TEMPLATES, labelFor, customKey } from '../lib/measure';
import { Input, Button, Segmented } from './ui';

/** Measurement entry grid for a template, plus custom fields. `values` holds strings while typing. */
export default function MeasureForm({ gender, unit, values, onChange, onUnit }) {
  const [extra, setExtra] = useState('');
  const fields = TEMPLATES[gender]?.fields || [];
  const custom = Object.keys(values).filter((k) => !fields.some(([f]) => f === k));
  const setV = (k, v) => onChange({ ...values, [k]: v });
  const addCustom = () => { const k = customKey(extra); if (extra.trim() && !(k in values)) setV(k, ''); setExtra(''); };
  return (
    <div>
      {onUnit && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Measurements</p>
          <Segmented value={unit} onChange={onUnit} options={[{ value: 'in', label: 'inches' }, { value: 'cm', label: 'cm' }]} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
        {[...fields.map(([k, l]) => [k, l]), ...custom.map((k) => [k, labelFor(gender, k)])].map(([k, l]) => (
          <label key={k} className="block">
            <span className="mb-0.5 block truncate text-xs font-medium capitalize text-stone-500">{l}</span>
            <Input inputMode="decimal" value={values[k] ?? ''} onChange={(e) => setV(k, e.target.value)} placeholder={unit} className="h-10" />
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Add another measurement (e.g. Slit opening)" className="h-10" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
        <Button variant="outline" size="sm" className="h-10" onClick={addCustom}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
