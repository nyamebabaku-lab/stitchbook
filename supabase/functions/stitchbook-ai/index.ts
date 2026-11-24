// StitchBook AI style preview. Uses one credit from the caller's shop.
// Input: { order_id?, style, fabric, person?, note? } (picture web addresses).
// Secrets: OPENAI_API_KEY (required), STITCHBOOK_AI_MODEL (default gpt-image-1).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'stitchbook' } });
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { db: { schema: 'stitchbook' }, global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: 'Please sign in' }, 401);
    const { data: m } = await admin.from('members').select('shop_id, role, status').eq('user_id', u.user.id).maybeSingle();
    if (!m || m.role !== 'owner' || m.status !== 'active') return json({ error: 'Only the shop owner can make previews' }, 403);
    const { data: shop } = await admin.from('shops').select('id, plan, paid_until, trial_until, ai_credits').eq('id', m.shop_id).single();
    const live = (d: string | null) => !!d && new Date(`${d}T23:59:59`) >= new Date();
    if (!((shop.plan === 'business' && live(shop.paid_until)) || live(shop.trial_until))) return json({ error: 'AI preview comes with the Business plan' }, 402);
    if (shop.ai_credits <= 0) return json({ error: 'No AI credits left. Top up in Plans.' }, 402);
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return json({ error: 'AI preview is not switched on yet' }, 503);

    const body = await req.json();
    const okUrl = (x: unknown) => typeof x === 'string' && /^https:\/\//.test(x);
    if (!okUrl(body.style) || !okUrl(body.fabric) || (body.person && !okUrl(body.person))) return json({ error: 'Pictures missing' }, 400);
    // Take the credit first (atomically) so two taps can't overspend.
    const { data: took } = await admin.from('shops').update({ ai_credits: shop.ai_credits - 1 }).eq('id', shop.id).eq('ai_credits', shop.ai_credits).select('ai_credits');
    if (!took?.length) return json({ error: 'Please try again' }, 409);

    const prompt = [
      'Fashion design preview for a Ghanaian dressmaker.',
      'Image 1 is the STYLE (cut and silhouette) to copy. Image 2 is the FABRIC: sew the garment from exactly this fabric pattern and colours.',
      body.person ? 'Image 3 is the CUSTOMER: show this same person wearing the garment, keeping their face, skin tone and body shape.' : 'Show the garment on a model with a plain studio background.',
      'Realistic photo, full length, natural light, well tailored, accurate fabric print scale.',
      body.note ? `Designer's changes: ${String(body.note).slice(0, 300)}` : '',
    ].join(' ');
    const form = new FormData();
    form.append('model', Deno.env.get('STITCHBOOK_AI_MODEL') || 'gpt-image-1');
    form.append('prompt', prompt);
    form.append('size', '1024x1536');
    for (const src of [body.style, body.fabric, body.person].filter(Boolean)) {
      const r = await fetch(src);
      const b = await r.blob();
      form.append('image[]', new File([b], 'in.png', { type: b.type || 'image/png' }));
    }
    const ai = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
    const out = await ai.json();
    const b64 = out?.data?.[0]?.b64_json;
    if (!ai.ok || !b64) {
      await admin.from('shops').update({ ai_credits: took[0].ai_credits + 1 }).eq('id', shop.id); // give the credit back
      await admin.from('ai_jobs').insert({ shop_id: shop.id, order_id: body.order_id || null, status: 'failed', prompt, error: JSON.stringify(out?.error || out).slice(0, 500), created_by: u.user.id });
      return json({ error: 'The AI could not make this preview. Your credit was not used.' }, 502);
    }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${shop.id}/ai-${crypto.randomUUID()}.png`;
    await admin.storage.from('stitchbook').upload(path, bytes, { contentType: 'image/png' });
    const result = admin.storage.from('stitchbook').getPublicUrl(path).data.publicUrl;
    const { data: job } = await admin.from('ai_jobs').insert({ shop_id: shop.id, order_id: body.order_id || null, status: 'done', prompt, result, created_by: u.user.id }).select().single();
    return json({ job, credits: took[0].ai_credits });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
