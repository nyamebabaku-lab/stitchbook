# StitchBook Pro

The fashion designer's shop in one phone: customers, measurements, orders, fabric QR tags, payments, WhatsApp messages and a customer tracking link. As the shop grows it adds staff, group orders and AI style previews. It's a multi-shop subscription product: every new shop gets a 30-day free trial with everything switched on, then pays for Solo (GH₵49), Studio (GH₵99: staff + groups) or Business (GH₵199: + ready-made stock, online shop `#/s/<token>`, AI previews). Every plan includes the cost & price helper, the yards calculator, and PDF receipts and reports.

Brand: black & gold. The logo is in `brand/`. Demo photos are in `public/samples/` (Pexels, free licence; see CREDITS.txt). Before launch, set the real subscription MoMo number in `PAY_TO` in `src/config.js`.

## Run
```
npm install
npm run dev:demo     # demo with a sample shop (no server needed)
npm test             # order, measurement and plan rules
npm run build        # live app → dist/, demo → dist/demo/
```

## Apps
- **StitchBook Pro** (`VITE_ROLE=designer`, com.stitchbook.designer): shop owner
- **StitchBook Staff** (`VITE_ROLE=staff`, com.stitchbook.staff): tailors and apprentices, who see only their own tasks
- Web (no role): both, plus the platform admin view
- Public pages: `#/t/<token>` order tracking, `#/g/<token>` group sign-up

## Backend (Supabase, schema `stitchbook`)
- `supabase/migrations/0001_stitchbook.sql`: tables, row-level security per shop, RPCs (create_shop, join_shop, staff_done, track_order, event_info, event_join, approve_upgrade, admin_shops), photo bucket.
- `supabase/functions/stitchbook-ai`: AI style preview. Needs secret `OPENAI_API_KEY` (optional `STITCHBOOK_AI_MODEL`). Uses 1 credit per preview and gives the credit back if the preview fails.
- Make yourself platform admin: `insert into stitchbook.platform_admins values ('<your auth user id>');`
- Add `stitchbook` to the API's exposed schemas (db_schema).

## Offline
Every change is saved on the phone first (IndexedDB, keys `stitchbook-*`) and sent when online. Photos are compressed on the phone and uploaded on sync. Fabric tag codes are made on the phone; if two phones pick the same number, the server moves the later one up.

## Android
`.github/workflows/android.yml` builds both signed APKs on every push once the signing secrets are set (same setup as ShiftMark).
