import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Home as HomeIcon, Shirt, Users, CalendarDays, Wallet, UsersRound, Scissors, Settings as SettingsIcon, Wand2, User, ScanLine, ShoppingBag, Ruler } from 'lucide-react';
import { Stock, ProductForm, ProductDetail } from './screens/owner/Stock';
import Yards from './screens/owner/Yards';
import { useStore, sync, api, signOut } from './data/store';
import { DEMO, APP_ROLE, IS_NATIVE } from './config';
import { supabase } from './lib/supabase';
import { has } from './lib/plans';
import Layout from './components/Layout';
import { Toasts } from './components/ui';
import Logo from './components/Logo';
import Auth, { Onboard, Waiting, WrongApp } from './screens/Auth';
import Home from './screens/owner/Home';
import Orders from './screens/owner/Orders';
import OrderForm from './screens/owner/OrderForm';
import OrderDetail from './screens/owner/OrderDetail';
import { Customers, CustomerForm, CustomerDetail } from './screens/owner/Customers';
import Calendar from './screens/owner/Calendar';
import Money from './screens/owner/Money';
import Scan from './screens/owner/Scan';
import { Groups, GroupForm, GroupDetail } from './screens/owner/Groups';
import Team from './screens/owner/Team';
import { Settings, Plan } from './screens/owner/Settings';
import StylePreview from './screens/owner/StylePreview';
import { StaffWork, StaffTask, StaffMe } from './screens/staff/Staff';
import { Track, GroupJoin, ShopPage } from './screens/public/Public';
import Admin from './screens/admin/Admin';

function Splash() {
  return <div className="flex min-h-screen items-center justify-center bg-ink-950"><Logo className="h-16 w-16 animate-pulse" /></div>;
}

/** Keeps data fresh: on start, when the internet comes back, when the app reopens, and every 2 minutes. */
function useSyncLoop(active) {
  useEffect(() => {
    if (!active) return undefined;
    sync();
    const on = () => { useStore.setState({ online: true }); sync(); };
    const off = () => useStore.setState({ online: false });
    const vis = () => document.visibilityState === 'visible' && sync();
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    document.addEventListener('visibilitychange', vis);
    const t = setInterval(() => document.visibilityState === 'visible' && sync(), 120000);
    let sub;
    if (IS_NATIVE) import('@capacitor/app').then(({ App }) => { sub = App.addListener('appStateChange', (s) => s.isActive && sync()); });
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      document.removeEventListener('visibilitychange', vis);
      clearInterval(t);
      sub?.then?.((h) => h.remove());
    };
  }, [active]);
}

/** A scanned tag link (…#/o/AC-0012) opens that order. */
function OpenByCode() {
  const { code } = useParams();
  const o = useStore((s) => s.orders.find((x) => x.code === code));
  return <Navigate to={o ? `/orders/${o.id}` : '/orders'} replace />;
}

function Main() {
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.session);
  const me = useStore((s) => s.me);
  const shop = useStore((s) => s.shop);
  const platformAdmin = useStore((s) => s.platformAdmin);
  const lastSync = useStore((s) => s.lastSync);
  const pendingStaff = useStore((s) => s.members.filter((m) => m.status === 'pending').length);

  useEffect(() => {
    if (!hydrated || !session) return;
    if (DEMO) api.restore(session.userId);
    else supabase?.auth.getSession().then(({ data }) => { if (!data.session) signOut(); });
  }, [hydrated, session]);
  useSyncLoop(hydrated && !!session);

  if (!hydrated) return <Splash />;
  if (!session) return <Auth />;
  if (!me) return lastSync ? <Onboard /> : <Splash />;
  if (platformAdmin && me.role === 'admin') return <Admin />;
  if (me.status !== 'active') return <Waiting />;
  if (!shop) return <Splash />;
  if (APP_ROLE && ((APP_ROLE === 'staff') !== (me.role === 'staff'))) return <WrongApp />;

  if (me.role === 'staff') {
    const nav = [{ to: '/', end: true, icon: Scissors, label: 'My work' }, { to: '/me', icon: User, label: 'Me' }];
    return (
      <Routes>
        <Route element={<Layout nav={nav} title="StitchBook Staff" />}>
          <Route index element={<StaffWork />} />
          <Route path="work/:id" element={<StaffTask />} />
          <Route path="me" element={<StaffMe />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  const nav = [
    { to: '/', end: true, icon: HomeIcon, label: 'Home' },
    { to: '/orders', icon: Shirt, label: 'Orders' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  ];
  const more = [
    { to: '/money', icon: Wallet, label: 'Money' },
    { to: '/scan', icon: ScanLine, label: 'Scan tag' },
    ...(has(shop, 'stock') ? [{ to: '/stock', icon: ShoppingBag, label: 'Stock & shop' }] : []),
    { to: '/yards', icon: Ruler, label: 'Yards' },
    ...(has(shop, 'groups') ? [{ to: '/groups', icon: UsersRound, label: 'Groups' }] : []),
    ...(has(shop, 'staff') ? [{ to: '/team', icon: Scissors, label: 'Team', badge: pendingStaff }] : []),
    ...(has(shop, 'ai') ? [{ to: '/preview', icon: Wand2, label: 'AI preview' }] : []),
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];
  return (
    <Routes>
      <Route element={<Layout nav={nav} more={more} title="StitchBook Pro" />}>
        <Route index element={<Home />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<OrderForm key="new" />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="orders/:id/edit" element={<OrderForm key="edit" />} />
        <Route path="o/:code" element={<OpenByCode />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CustomerForm key="new" />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<CustomerForm key="edit" />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="money" element={<Money />} />
        <Route path="scan" element={<Scan />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/new" element={<GroupForm key="new" />} />
        <Route path="groups/:id" element={<GroupDetail />} />
        <Route path="groups/:id/edit" element={<GroupForm key="edit" />} />
        <Route path="team" element={<Team />} />
        <Route path="stock" element={<Stock />} />
        <Route path="stock/new" element={<ProductForm key="new" />} />
        <Route path="stock/:id" element={<ProductDetail />} />
        <Route path="stock/:id/edit" element={<ProductForm key="edit" />} />
        <Route path="yards" element={<Yards />} />
        <Route path="preview" element={<StylePreview />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/plan" element={<Plan />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const dark = useStore((s) => s.prefs.dark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!dark);
    if (IS_NATIVE) import('@capacitor/status-bar').then(({ StatusBar }) => StatusBar.setBackgroundColor({ color: dark ? '#0b0b0b' : '#fafaf9' }).catch(() => {}));
  }, [dark]);
  return (
    <HashRouter>
      <Routes>
        <Route path="/t/:token" element={<Track />} />
        <Route path="/g/:token" element={<GroupJoin />} />
        <Route path="/s/:token" element={<ShopPage />} />
        <Route path="*" element={<Main />} />
      </Routes>
      <Toasts />
    </HashRouter>
  );
}
