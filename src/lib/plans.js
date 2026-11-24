// Subscription plans. Every new shop gets a free trial with everything switched on;
// after that the shop pays for a plan, and features unlock by plan.
export const TRIAL_DAYS = 30;
export const PLANS = {
  solo: { label: 'Solo', price: 49, priceLabel: 'GH₵ 49/month', staff: 0, features: [] },
  studio: { label: 'Studio', price: 99, priceLabel: 'GH₵ 99/month', staff: 10, features: ['staff', 'groups'] },
  business: { label: 'Business', price: 199, priceLabel: 'GH₵ 199/month · 20 AI previews', staff: 50, features: ['staff', 'groups', 'stock', 'ai'] },
};
export const FEATURE_NAMES = { staff: 'Staff & task board', groups: 'Group / event orders', stock: 'Ready-made stock & online shop', ai: 'AI style preview' };
/** Which plan first unlocks a feature. */
export const planFor = (feature) => Object.keys(PLANS).find((k) => PLANS[k].features.includes(feature));

const endOf = (d) => new Date(`${d}T23:59:59`);
const daysLeft = (d, now) => Math.max(0, Math.ceil((endOf(d) - now) / 86400000));
export const paidActive = (shop, now = new Date()) => !!shop?.paid_until && endOf(shop.paid_until) >= now;
export const trialActive = (shop, now = new Date()) => !!shop?.trial_until && endOf(shop.trial_until) >= now;
/** Back-compat name used by the admin list. */
export const planActive = (shop, now) => paidActive(shop, now) || trialActive(shop, now);

/** The plan whose features apply now: the paid plan, Business during the trial, or null when it has run out. */
export function effectivePlan(shop, now = new Date()) {
  if (paidActive(shop, now)) return shop.plan;
  if (trialActive(shop, now)) return 'business';
  return null;
}
export const has = (shop, feature, now) => { const p = effectivePlan(shop, now); return !!p && PLANS[p].features.includes(feature); };
/** Can the shop add new customers / orders? (Old records stay readable after the trial ends.) */
export const canWrite = (shop, now) => !!effectivePlan(shop, now);

/** {kind: 'paid' | 'trial' | 'expired', days} for banners. */
export function subscription(shop, now = new Date()) {
  if (paidActive(shop, now)) return { kind: 'paid', days: daysLeft(shop.paid_until, now) };
  if (trialActive(shop, now)) return { kind: 'trial', days: daysLeft(shop.trial_until, now) };
  return { kind: 'expired', days: 0 };
}
