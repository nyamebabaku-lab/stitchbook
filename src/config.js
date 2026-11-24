import { Capacitor } from '@capacitor/core';

export const IS_NATIVE = Capacitor.isNativePlatform();
/** Android builds are either the designer (owner) app or the staff app. The web app serves both. */
export const APP_ROLE = import.meta.env.VITE_ROLE || '';
export const DEMO = import.meta.env.VITE_DEMO === '1' || !import.meta.env.VITE_SUPABASE_URL;
export const PHONE_DOMAIN = 'phone.stitchbook.app';
export const STORE_KEY = DEMO ? 'stitchbook-demo' : 'stitchbook-live';
export const SCHEMA = 'stitchbook';
const SITE = 'https://nyamebabaku-lab.github.io/stitchbook/';
/** Base address for links sent to customers (tracking page, group sign-up form). */
export function publicBase() {
  if (IS_NATIVE) return DEMO ? `${SITE}demo/` : SITE;
  return location.href.split('#')[0];
}
export const APK_URL = 'https://github.com/nyamebabaku-lab/stitchbook/releases/latest/download/StitchBook.apk';
/** Where shops send subscription payments (MoMo). Replace with the real number before launch. */
export const PAY_TO = 'StitchBook Pro · 024 000 0000';
