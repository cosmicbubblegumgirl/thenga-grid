'use client';

import {
  Accessibility, ArrowRight, Check, ChevronRight, CircleDollarSign, Clock3,
  Flame, Grid3X3, Heart, LocateFixed, LogOut, MapPin, Menu, Mic, Navigation,
  PackageCheck, Radio, Search, ShieldCheck, ShoppingBasket, Store,
  Target, UserRound, Users, X, Zap,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AuthScreen, BrandIcon } from '@/components/auth-screen';
import { LiveMap } from '@/components/live-map';
import { InterledgerCheckout, type PaymentReceipt } from '@/components/interledger-checkout';
import { OwnerDashboard } from '@/components/owner-dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { apiFetch, isStaticDemo } from '@/lib/api';
import type { AccountRole, Drop, Position, Shop, User } from '@/lib/types';

type View = 'grid' | 'basket' | 'drops' | 'community' | 'quests';
type CommunityPost = { id: string; authorName: string; body: string; createdAt: number; shopName?: string };
const DEFAULT_LOCATION: Position = { latitude: -26.2383, longitude: 27.9077 };
const DEMO_AREAS = [
  { id: 'soweto', label: 'Soweto', detail: 'Orlando West', position: DEFAULT_LOCATION },
  { id: 'ramsgate', label: 'Ramsgate Beach', detail: 'South Coast', position: { latitude: -30.8874, longitude: 30.35 } },
] as const;

const navItems: { id: View; label: string; icon: typeof Grid3X3 }[] = [
  { id: 'grid', label: 'Grid', icon: Grid3X3 },
  { id: 'basket', label: 'Basket Battle', icon: ShoppingBasket },
  { id: 'drops', label: 'Drops', icon: Flame },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'quests', label: 'Quests', icon: Target },
];

export default function Home() {
  const [view, setView] = useState<View>('grid');
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [easyMode, setEasyMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState<Position>(DEFAULT_LOCATION);
  const [locationName, setLocationName] = useState('Orlando West, Soweto');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'live' | 'denied'>('idle');
  const [shops, setShops] = useState<Shop[]>([]);
  const [community, setCommunity] = useState<CommunityPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('bread, milk, eggs and Coke');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [checkout, setCheckout] = useState<{ drop: Drop; shop: Shop } | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null);

  const notify = useCallback((message: string) => {
    setNotice(isStaticDemo ? `Demo data — ${message}` : message);
    window.setTimeout(() => setNotice(''), 3200);
  }, []);

  const loadArea = useCallback(async (position: Position) => {
    setLoading(true);
    try {
      const [shopResponse, osmResponse, locationResponse] = await Promise.all([
        apiFetch(`/api/shops?lat=${position.latitude}&lng=${position.longitude}`),
        apiFetch(`/api/osm-shops?lat=${position.latitude}&lng=${position.longitude}`),
        apiFetch(`/api/location?lat=${position.latitude}&lng=${position.longitude}`),
      ]);
      const shopData = await shopResponse.json() as { shops?: Shop[]; community?: CommunityPost[] };
      const osmData = await osmResponse.json() as { shops?: Array<Partial<Shop> & Pick<Shop, 'id' | 'name' | 'latitude' | 'longitude' | 'address'>> };
      const area = await locationResponse.json() as { displayName?: string; address?: Record<string, string> };
      const discovered: Shop[] = (osmData.shops ?? []).map((shop) => ({
        id: shop.id, name: shop.name, address: shop.address, latitude: shop.latitude, longitude: shop.longitude,
        description: `A nearby ${shop.category || 'shop'} listed by OpenStreetMap. Live stock is not yet connected.`,
        phone: shop.phone ?? null, openingHours: shop.openingHours || 'Hours not listed', rating: 0, reviewCount: 0,
        pickupMinutes: 0, stepFree: false, verified: false, isOpen: true, distanceKm: null, inventory: [], drops: [],
        source: 'OpenStreetMap', category: shop.category,
      }));
      const local = shopData.shops ?? [];
      const nearbyLocal = local.filter((shop) => shop.distanceKm === null || shop.distanceKm < 40);
      setShops([...nearbyLocal, ...discovered].filter((shop, index, all) => all.findIndex((item) => item.id === shop.id) === index));
      setCommunity(shopData.community ?? []);
      setSelectedId((current) => current && [...nearbyLocal, ...discovered].some((shop) => shop.id === current) ? current : (nearbyLocal[0]?.id ?? discovered[0]?.id ?? null));
      const address = area.address ?? {};
      setLocationName(address.suburb || address.neighbourhood || address.town || address.city || area.displayName?.split(',').slice(0, 2).join(',') || 'Your current area');
    } catch {
      notify('The live feed is reconnecting. Showing the last known neighbourhood.');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const locate = useCallback((announce = true) => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      if (announce) notify('Location is not available in this browser.');
      void loadArea(DEFAULT_LOCATION);
      return;
    }
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const next = { latitude: result.coords.latitude, longitude: result.coords.longitude };
        setLocation(next);
        setLocationStatus('live');
        if (announce) notify('The Grid is now centred on your location.');
        void loadArea(next);
      },
      () => {
        setLocationStatus('denied');
        if (announce) notify('Location access was not granted. Showing the Soweto demo Grid.');
        void loadArea(DEFAULT_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, [loadArea, notify]);

  useEffect(() => {
    void apiFetch('/api/auth/session').then((response) => response.json()).then((value) => {
      const data = value as { user?: User };
      setUser(data.user ?? null);
    }).catch(() => undefined);
    const savedMode = window.localStorage.getItem('tg_easy_mode');
    if (savedMode === 'on') setEasyMode(true);
    locate(false);
    const paymentParams = new URLSearchParams(window.location.search);
    const paymentId = paymentParams.get('paymentId');
    const returnedPaymentState = paymentParams.get('payment');
    if (paymentId) void apiFetch(`/api/payments/interledger/status?paymentId=${encodeURIComponent(paymentId)}`).then((response) => response.json()).then((value) => {
      const data = value as { payment?: PaymentReceipt };
      if (data.payment) setPaymentReceipt({ ...data.payment, status: returnedPaymentState === 'ilp-failed' ? 'failed' : data.payment.status, paymentMethod: 'open_payments_test' });
      window.history.replaceState({}, '', window.location.pathname);
    });
  }, [locate]);

  const selectedShop = useMemo(() => shops.find((shop) => shop.id === selectedId) ?? shops[0] ?? null, [shops, selectedId]);
  const participating = shops.filter((shop) => !shop.source);
  const allDrops = participating.flatMap((shop) => shop.drops.map((drop) => ({ ...drop, shop }))).sort((a, b) => a.priceCents - b.priceCents);

  const basketResults = useMemo(() => {
    const terms = query.toLowerCase().split(/,|\band\b/).map((term) => term.trim()).filter((term) => term.length > 1);
    return participating.map((shop) => {
      const matches = terms.map((term) => shop.inventory.find((item) => item.name.toLowerCase().includes(term)));
      const found = matches.filter(Boolean);
      return { shop, total: found.reduce((sum, item) => sum + (item?.priceCents ?? 0), 0), found: found.length, requested: terms.length };
    }).filter((result) => result.found > 0).sort((a, b) => b.found - a.found || a.total - b.total);
  }, [participating, query]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setView('basket');
    notify(`Basket Battle checked ${participating.length} connected shops.`);
  }

  function directions(shop: Shop) {
    const destination = `${shop.latitude},${shop.longitude}`;
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${destination}&travelmode=walking`, '_blank', 'noopener,noreferrer');
  }

  function reserve(drop: Drop) {
    if (!user) { setAuthOpen(true); return; }
    const shop = shops.find((candidate) => candidate.drops.some((candidateDrop) => candidateDrop.id === drop.id));
    if (!shop) return notify('This Drop is no longer available.');
    setPaymentReceipt(null);
    setCheckout({ drop, shop });
  }

  async function signOut() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    notify('You have signed out.');
  }

  function toggleEasyMode(value: boolean) {
    setEasyMode(value);
    window.localStorage.setItem('tg_easy_mode', value ? 'on' : 'off');
    notify(value ? 'Easy Mode is on.' : 'Grid Mode is on.');
  }

  async function enterDemo(role: AccountRole, position = location, areaLabel = locationName) {
    const response = await apiFetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role, latitude: position.latitude, longitude: position.longitude }),
    });
    const data = await response.json() as { user?: User; error?: string };
    if (!response.ok || !data.user) throw new Error(data.error || 'Could not open this demo.');
    setUser(data.user);
    setAuthOpen(false);
    if (role === 'customer') setView('grid');
    notify(`${role === 'owner' ? 'Shop owner' : 'Customer'} demo opened in ${areaLabel}.`);
  }

  async function selectDemoArea(area: typeof DEMO_AREAS[number]) {
    setLocation(area.position);
    setLocationName(area.id === 'ramsgate' ? 'Ramsgate Beach, KwaZulu-Natal' : 'Orlando West, Soweto');
    setLocationStatus('idle');
    setSelectedId(null);
    setView('grid');
    await loadArea(area.position);
    if (user) await enterDemo(user.role, area.position, area.label);
    else notify(`${area.label} demo Grid loaded.`);
  }

  const activeDemoArea = DEMO_AREAS.find((area) => Math.abs(location.latitude - area.position.latitude) < 0.25 && Math.abs(location.longitude - area.position.longitude) < 0.25)?.id;
  const activeDemoRole: AccountRole = user?.role ?? 'customer';

  if (authOpen) return <AuthScreen location={location} locationName={locationName} onClose={() => setAuthOpen(false)} onAuthenticated={(account) => { setUser(account); setAuthOpen(false); notify(`Welcome to the Grid, ${account.displayName}.`); }} onDemo={(role) => enterDemo(role)} />;

  return (
    <main className={easyMode ? 'site-shell easy-mode' : 'site-shell'}>
      <header className="app-header">
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation"><Menu /></button>
        <button className="brand" onClick={() => setView('grid')}><BrandIcon compact /><span><strong>THENGA</strong>//GRID<small>Your neighbourhood. Live.</small></span></button>
        <form className="global-search" onSubmit={submitSearch}><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What do you need?" aria-label="What do you need?" /><button type="button" onClick={() => notify('Voice search is ready on supported mobile devices.')} aria-label="Voice search"><Mic /></button><Button type="submit">Find my run <ArrowRight /></Button></form>
        <button className="location-chip" onClick={() => locate()}><span className={locationStatus === 'live' ? 'location-live' : ''}><LocateFixed /></span><span><small>{locationStatus === 'locating' ? 'FINDING YOU…' : locationStatus === 'live' ? 'LIVE LOCATION' : 'GRID LOCATION'}</small><strong>{locationName}</strong></span></button>
        <label className="easy-toggle"><Accessibility /><span><strong>Easy Mode</strong><small>Larger & simpler</small></span><Switch checked={easyMode} onCheckedChange={toggleEasyMode} /></label>
        {user ? <div className="account-menu"><button><span>{user.displayName.split(/\s+/).map((word) => word[0]).slice(0, 2).join('')}</span><i /><b>{user.displayName}</b></button><button onClick={() => void signOut()} aria-label="Sign out"><LogOut /></button></div> : <Button className="signin-button" onClick={() => setAuthOpen(true)}><UserRound /> Sign in</Button>}
      </header>

      <aside className="prototype-notice" role="note"><span>DEMO DATA</span> THENGA//GRID is a hackathon prototype. Shops, products, prices, locations, stock levels, reviews and orders shown in this demo may be fictional.</aside>

      {isStaticDemo && <section className="demo-toolbar" aria-label="Demo controls">
        <div className="demo-toolbar-copy"><span><Radio /></span><div><small>EXPLORE THE LIVE DEMO</small><strong>Choose a neighbourhood and view</strong></div></div>
        <div className="demo-switch-group"><small>AREA</small><div>{DEMO_AREAS.map((area) => <button key={area.id} className={activeDemoArea === area.id ? 'active' : ''} onClick={() => void selectDemoArea(area)}><MapPin /><span><strong>{area.label}</strong><small>{area.detail}</small></span></button>)}</div></div>
        <div className="demo-switch-group role"><small>VIEW AS</small><div>
          <button className={activeDemoRole === 'customer' ? 'active' : ''} onClick={() => void enterDemo('customer')}><UserRound /><span><strong>Customer</strong><small>Shop nearby</small></span></button>
          <button className={activeDemoRole === 'owner' ? 'active' : ''} onClick={() => void enterDemo('owner')}><Store /><span><strong>Shop owner</strong><small>Run the shop</small></span></button>
        </div></div>
      </section>}

      {user?.role === 'owner' ? <OwnerDashboard key={user.id} notify={notify} /> : <div className="customer-layout">
        <aside className={menuOpen ? 'main-nav open' : 'main-nav'}>
          <div className="nav-title"><span>GRID MODE</span><button onClick={() => setMenuOpen(false)}><X /></button></div>
          <nav>{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setMenuOpen(false); }}><Icon /><span>{item.label}</span>{item.id === 'drops' && allDrops.length > 0 && <b>{allDrops.length}</b>}</button>; })}</nav>
          <section className="quest-mini"><div><Target /><small>GRID QUEST</small></div><strong>Local Legend</strong><p>Shop at 3 local stores this month.</p><i><span /></i><small>2 of 3 complete</small></section>
          <section className="trust-card"><ShieldCheck /><span><strong>Privacy first</strong><small>Your precise location is used only while finding nearby places.</small></span></section>
        </aside>

        <section className="customer-workspace">
          {view === 'grid' && <GridView location={location} locationName={locationName} locationStatus={locationStatus} shops={shops} selectedShop={selectedShop} selectedId={selectedId} loading={loading} favourites={favourites} onLocate={() => locate()} onSelect={setSelectedId} onDirections={directions} onFavourite={(id) => setFavourites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onReserve={(drop) => void reserve(drop)} notify={notify} />}
          {view === 'basket' && <BasketView query={query} setQuery={setQuery} results={basketResults} onDirections={directions} notify={notify} />}
          {view === 'drops' && <DropsView drops={allDrops} onReserve={(drop) => void reserve(drop)} onDirections={directions} />}
          {view === 'community' && <CommunityView posts={community} location={location} notify={notify} />}
          {view === 'quests' && <QuestView notify={notify} />}
        </section>
      </div>}

      {notice && <div className="toast" role="status"><Check />{notice}</div>}
      <InterledgerCheckout selection={checkout} receipt={paymentReceipt} easyMode={easyMode} onClose={() => { setCheckout(null); setPaymentReceipt(null); }} onComplete={(receipt) => { setPaymentReceipt(receipt); void loadArea(location); }} />
    </main>
  );
}

function GridView({ location, locationName, locationStatus, shops, selectedShop, selectedId, loading, favourites, onLocate, onSelect, onDirections, onFavourite, onReserve, notify }: {
  location: Position; locationName: string; locationStatus: string; shops: Shop[]; selectedShop: Shop | null; selectedId: string | null; loading: boolean; favourites: string[];
  onLocate: () => void; onSelect: (id: string) => void; onDirections: (shop: Shop) => void; onFavourite: (id: string) => void; onReserve: (drop: Drop) => void; notify: (message: string) => void;
}) {
  const demoArea = locationName.toLowerCase().includes('ramsgate') ? 'Ramsgate Beach' : 'Soweto';
  return <div className="grid-view">
    <section className="map-panel">
      <div className="map-toolbar"><div><span className="live-dot" /><strong>{locationStatus === 'live' ? 'Grid live around you' : `${demoArea} demo Grid`} <em className="demo-data-badge">DEMO DATA</em></strong><small>{shops.length} demo shops near {locationName}</small></div><Button variant="outline" onClick={onLocate}><LocateFixed /> Use my location</Button></div>
      <div className="map-frame">{loading ? <div className="map-loading"><Radio /><strong>Reading the neighbourhood signal…</strong></div> : <LiveMap shops={shops} selectedId={selectedId} location={location} onSelect={onSelect} />}</div>
      <div className="map-legend"><span><i className="connected" />Connected shop</span><span><i />Nearby OpenStreetMap listing</span><small>Map and local listings © OpenStreetMap contributors</small></div>
    </section>
    <aside className="shop-panel">{selectedShop ? <ShopSignal shop={selectedShop} saved={favourites.includes(selectedShop.id)} onDirections={() => onDirections(selectedShop)} onFavourite={() => onFavourite(selectedShop.id)} onReserve={onReserve} notify={notify} /> : <div className="empty-signal"><Store /><h2>No shops found yet</h2><p>Try widening your area or enable location access.</p><Button onClick={onLocate}>Refresh location</Button></div>}</aside>
  </div>;
}

function ShopSignal({ shop, saved, onDirections, onFavourite, onReserve, notify }: { shop: Shop; saved: boolean; onDirections: () => void; onFavourite: () => void; onReserve: (drop: Drop) => void; notify: (message: string) => void }) {
  const connected = !shop.source;
  return <div className="signal-content">
    <div className="signal-kicker"><Radio /><span>SHOP SIGNAL</span><b>{connected ? 'STRONG' : 'DISCOVERED'}</b></div>
    <div className="signal-title"><span className="shop-avatar">{shop.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</span><div><h1>{shop.name} <em className="demo-data-badge">DEMO DATA</em></h1><p><MapPin /> {shop.distanceKm ? `${shop.distanceKm} km away · ` : ''}{shop.openingHours}</p></div><button className={saved ? 'saved' : ''} onClick={onFavourite}><Heart /></button></div>
    {connected ? <>
      <div className="rating-row"><span>▣▣▣▣▣</span><strong>{shop.rating.toFixed(1)} CRATES <em className="demo-data-badge">DEMO DATA</em></strong><small>{shop.verified && <><ShieldCheck /> Demo listing</>}</small></div>
      <section className="live-stock"><header><strong>Stock <em className="demo-data-badge">DEMO DATA</em></strong><span>Seeded availability</span></header>{shop.inventory.slice(0, 6).map((item) => <div key={item.id}><span>{item.name}</span><i className={item.quantity < 5 ? 'low' : ''} /><b>{item.quantity}</b><strong>R{(item.priceCents / 100).toFixed(2)}</strong></div>)}{!shop.inventory.length && <p>No stock published yet.</p>}</section>
      <div className="pickup-row"><div><Clock3 /><span><small>Average pickup</small><strong>{shop.pickupMinutes} min</strong></span></div><div><PackageCheck /><span><small>Grab & Go</small><strong>On</strong></span></div></div>
      {shop.drops[0] && <div className="live-drop"><div><span><Flame /> DEMO DROP</span><small>{shop.drops[0].quantity} demo units</small></div><h2>{shop.drops[0].productName}</h2><p><del>R{(shop.drops[0].originalPriceCents / 100).toFixed(2)}</del><strong>R{(shop.drops[0].priceCents / 100).toFixed(2)}</strong></p><Button onClick={() => onReserve(shop.drops[0])}>Reserve for 15 min</Button></div>}
    </> : <div className="unconnected-card"><Store /><h2>Not connected yet</h2><p>This real nearby listing comes from OpenStreetMap. Prices, stock and reservations appear once the owner joins THENGA//GRID.</p></div>}
    <div className="signal-actions"><Button onClick={onDirections}><Navigation /> Take me there</Button><Button variant="outline" onClick={() => notify(`Walk With Me link prepared for ${shop.name}.`)}><ShieldCheck /> Walk With Me</Button></div>
  </div>;
}

function BasketView({ query, setQuery, results, onDirections, notify }: { query: string; setQuery: (value: string) => void; results: Array<{ shop: Shop; total: number; found: number; requested: number }>; onDirections: (shop: Shop) => void; notify: (message: string) => void }) {
  return <div className="feature-page"><header className="feature-heading"><div><p className="eyebrow">BASKET BATTLE · DEMO DATA</p><h1>Your whole run, compared.</h1><p>Prototype comparison using seeded products, prices and routes.</p></div><CircleDollarSign /></header><form className="basket-search" onSubmit={(event) => { event.preventDefault(); notify('Basket results refreshed.'); }}><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} /><Button type="submit">Compare</Button></form><div className="route-results">{results.slice(0, 5).map((result, index) => <article className={index === 0 ? 'best' : ''} key={result.shop.id}><div className="route-badge">{index === 0 ? <CircleDollarSign /> : index === 1 ? <Zap /> : <Heart />}</div><div><small>{index === 0 ? 'DEMO BASKET RUN' : index === 1 ? 'DEMO QUICK RUN' : 'DEMO COMMUNITY PICK'}</small><h2>{result.shop.name}</h2><p>{result.found}/{result.requested} demo items · {result.shop.pickupMinutes} min demo pickup</p></div><span><small>Demo basket total</small><strong>R{(result.total / 100).toFixed(2)}</strong></span><Button onClick={() => onDirections(result.shop)}>View demo route <Navigation /></Button></article>)}{!results.length && <div className="feature-empty"><ShoppingBasket /><h2>No demo shop matches that basket yet</h2><p>Post a Neighbourhood Request so nearby demo merchants can respond.</p></div>}</div><section className="price-shock"><Zap /><div><small>DEMO PRICE COMPARISON</small><strong>Seeded prices can vary nearby</strong><p>Figures shown here are prototype data.</p></div><ChevronRight /></section></div>;
}

function DropsView({ drops, onReserve, onDirections }: { drops: Array<Drop & { shop: Shop }>; onReserve: (drop: Drop) => void; onDirections: (shop: Shop) => void }) {
  return <div className="feature-page"><header className="feature-heading drops-heading"><div><p className="eyebrow">DROPS · DEMO DATA</p><h1>Prototype deals.</h1><p>Seeded specials and availability for the hackathon demonstration.</p></div><Flame /></header><div className="drop-grid">{drops.map((drop) => <article key={drop.id}><div className="drop-art"><span>{drop.kind === 'last_crate' ? 'DEMO LAST CRATE' : `${drop.shop.name.toUpperCase()} · DEMO DROP`}</span><Flame /></div><div className="drop-body"><p><MapPin /> {drop.shop.name} <em className="demo-data-badge">DEMO DATA</em></p><h2>{drop.productName}</h2><div><del>R{(drop.originalPriceCents / 100).toFixed(2)}</del><strong>R{(drop.priceCents / 100).toFixed(2)}</strong></div><small>{drop.quantity} demo units · prototype expiry</small><Button onClick={() => onReserve(drop)}>Reserve</Button><button onClick={() => onDirections(drop.shop)}>View demo route <ArrowRight /></button></div></article>)}</div></div>;
}

function CommunityView({ posts, location, notify }: { posts: CommunityPost[]; location: Position; notify: (message: string) => void }) {
  const [request, setRequest] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); const response = await apiFetch('/api/demand', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: request, ...location }) }); if (response.ok) { setRequest(''); notify('Your request is now on Need Radar.'); } }
  return <div className="feature-page community-page"><header className="feature-heading"><div><p className="eyebrow">COMMUNITY</p><h1>Useful things, close by.</h1><p>Local information that helps people find what they need.</p></div><Users /></header><form className="need-card" onSubmit={submit}><div><Radio /><span><small>NEIGHBOURHOOD REQUEST</small><strong>Can’t find something?</strong></span></div><p>Tell nearby shops what you need. Connected merchants see the demand on Need Radar.</p><div><Input value={request} onChange={(event) => setRequest(event.target.value)} required placeholder="e.g. Anyone nearby have size 5 nappies?" /><Button type="submit">Ask shops <ArrowRight /></Button></div></form><section className="community-feed">{posts.map((post) => <article key={post.id}><span>{post.authorName.split(/\s+/).map((word) => word[0]).slice(0, 2).join('')}</span><div><header><strong>{post.authorName}</strong><small>{Math.max(1, Math.round((Date.now() / 1000 - post.createdAt) / 60))} min ago</small></header><p>{post.body}</p>{post.shopName && <b>Tagged · {post.shopName}</b>}</div></article>)}</section></div>;
}

function QuestView({ notify }: { notify: (message: string) => void }) {
  const quests = [{ title: 'Local Legend', text: 'Shop at 3 independent stores this month.', progress: 66, reward: 'R10 community credit' }, { title: 'Last Crate Hero', text: 'Rescue 3 near-expiry items.', progress: 33, reward: 'Green Grid badge' }, { title: 'Neighbourhood Scout', text: 'Verify details for 2 local shops.', progress: 50, reward: 'R5 community credit' }];
  return <div className="feature-page"><header className="feature-heading quest-heading"><div><p className="eyebrow">GRID QUESTS</p><h1>Small actions. Stronger neighbourhood.</h1><p>Tasteful local rewards for useful shopping habits.</p></div><Target /></header><div className="quest-grid">{quests.map((quest) => <article key={quest.title}><div><Target /><span><small>GRID QUEST</small><strong>{quest.title}</strong></span></div><p>{quest.text}</p><i><span style={{ width: `${quest.progress}%` }} /></i><small>{quest.progress}% complete</small><b>Unlock · {quest.reward}</b><Button variant="outline" onClick={() => notify(`${quest.title} added to your active quests.`)}>Track quest</Button></article>)}</div></div>;
}
