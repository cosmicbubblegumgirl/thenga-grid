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
import { OwnerDashboard } from '@/components/owner-dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api';
import type { Drop, Position, Shop, User } from '@/lib/types';

declare global {
  interface Document {
    readonly modelContext?: {
      registerTool(tool: {
        name: string;
        title: string;
        description: string;
        inputSchema: object;
        annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
        execute(input: unknown): unknown | Promise<unknown>;
      }, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

type View = 'grid' | 'basket' | 'drops' | 'community' | 'quests';
type CommunityPost = { id: string; authorName: string; body: string; createdAt: number; shopName?: string };
const DEFAULT_LOCATION: Position = { latitude: -26.2383, longitude: 27.9077 };

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

  const notify = useCallback((message: string) => {
    setNotice(message);
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
  }, [locate]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'search_nearby_basket',
      title: 'Search a nearby shopping basket',
      description: 'Compare connected neighbourhood shops for a list of products and show Basket Battle results in the app.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', minLength: 2, maxLength: 180 } },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const next = typeof input === 'object' && input !== null && 'query' in input ? String(input.query).trim().slice(0, 180) : '';
        if (next.length < 2) throw new Error('A basket query of at least two characters is required.');
        setQuery(next);
        setView('basket');
        return { query: next, status: 'results_visible' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

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

  async function reserve(drop: Drop) {
    if (!user) { setAuthOpen(true); return; }
    const response = await apiFetch('/api/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dropId: drop.id }) });
    const data = await response.json() as { reservation?: { pickupCode: string }; error?: string };
    if (!response.ok) return notify(data.error || 'Could not reserve this Drop.');
    notify(`Reserved. Your pickup code is ${data.reservation?.pickupCode}.`);
    await loadArea(location);
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

  if (authOpen) return <AuthScreen location={location} locationName={locationName} onClose={() => setAuthOpen(false)} onAuthenticated={(account) => { setUser(account); setAuthOpen(false); notify(`Welcome to the Grid, ${account.displayName}.`); }} />;

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

      {user?.role === 'owner' ? <OwnerDashboard notify={notify} /> : <div className="customer-layout">
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
    </main>
  );
}

function GridView({ location, locationName, locationStatus, shops, selectedShop, selectedId, loading, favourites, onLocate, onSelect, onDirections, onFavourite, onReserve, notify }: {
  location: Position; locationName: string; locationStatus: string; shops: Shop[]; selectedShop: Shop | null; selectedId: string | null; loading: boolean; favourites: string[];
  onLocate: () => void; onSelect: (id: string) => void; onDirections: (shop: Shop) => void; onFavourite: (id: string) => void; onReserve: (drop: Drop) => void; notify: (message: string) => void;
}) {
  return <div className="grid-view">
    <section className="map-panel">
      <div className="map-toolbar"><div><span className="live-dot" /><strong>{locationStatus === 'live' ? 'Grid live around you' : 'Soweto demo Grid'}</strong><small>{shops.length} shops found near {locationName}</small></div><Button variant="outline" onClick={onLocate}><LocateFixed /> Use my location</Button></div>
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
    <div className="signal-title"><span className="shop-avatar">{shop.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</span><div><h1>{shop.name}</h1><p><MapPin /> {shop.distanceKm ? `${shop.distanceKm} km away · ` : ''}{shop.openingHours}</p></div><button className={saved ? 'saved' : ''} onClick={onFavourite}><Heart /></button></div>
    {connected ? <>
      <div className="rating-row"><span>▣▣▣▣▣</span><strong>{shop.rating.toFixed(1)} CRATES</strong><small>{shop.verified && <><ShieldCheck /> Verified</>}</small></div>
      <section className="live-stock"><header><strong>Live stock</strong><span>Updated recently</span></header>{shop.inventory.slice(0, 6).map((item) => <div key={item.id}><span>{item.name}</span><i className={item.quantity < 5 ? 'low' : ''} /><b>{item.quantity}</b><strong>R{(item.priceCents / 100).toFixed(2)}</strong></div>)}{!shop.inventory.length && <p>No stock published yet.</p>}</section>
      <div className="pickup-row"><div><Clock3 /><span><small>Average pickup</small><strong>{shop.pickupMinutes} min</strong></span></div><div><PackageCheck /><span><small>Grab & Go</small><strong>On</strong></span></div></div>
      {shop.drops[0] && <div className="live-drop"><div><span><Flame /> LIVE DROP</span><small>{shop.drops[0].quantity} remaining</small></div><h2>{shop.drops[0].productName}</h2><p><del>R{(shop.drops[0].originalPriceCents / 100).toFixed(2)}</del><strong>R{(shop.drops[0].priceCents / 100).toFixed(2)}</strong></p><Button onClick={() => onReserve(shop.drops[0])}>Reserve for 15 min</Button></div>}
    </> : <div className="unconnected-card"><Store /><h2>Not connected yet</h2><p>This real nearby listing comes from OpenStreetMap. Prices, stock and reservations appear once the owner joins THENGA//GRID.</p></div>}
    <div className="signal-actions"><Button onClick={onDirections}><Navigation /> Take me there</Button><Button variant="outline" onClick={() => notify(`Walk With Me link prepared for ${shop.name}.`)}><ShieldCheck /> Walk With Me</Button></div>
  </div>;
}

function BasketView({ query, setQuery, results, onDirections, notify }: { query: string; setQuery: (value: string) => void; results: Array<{ shop: Shop; total: number; found: number; requested: number }>; onDirections: (shop: Shop) => void; notify: (message: string) => void }) {
  return <div className="feature-page"><header className="feature-heading"><div><p className="eyebrow">BASKET BATTLE</p><h1>Your whole run, compared.</h1><p>THENGA//GRID compares the basket—not a single teaser price.</p></div><CircleDollarSign /></header><form className="basket-search" onSubmit={(event) => { event.preventDefault(); notify('Basket results refreshed.'); }}><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} /><Button type="submit">Compare</Button></form><div className="route-results">{results.slice(0, 5).map((result, index) => <article className={index === 0 ? 'best' : ''} key={result.shop.id}><div className="route-badge">{index === 0 ? <CircleDollarSign /> : index === 1 ? <Zap /> : <Heart />}</div><div><small>{index === 0 ? 'CHEAP RUN' : index === 1 ? 'QUICK RUN' : 'COMMUNITY PICK'}</small><h2>{result.shop.name}</h2><p>{result.found}/{result.requested} requested items found · {result.shop.pickupMinutes} min pickup</p></div><span><small>Basket total</small><strong>R{(result.total / 100).toFixed(2)}</strong></span><Button onClick={() => onDirections(result.shop)}>Take me there <Navigation /></Button></article>)}{!results.length && <div className="feature-empty"><ShoppingBasket /><h2>No connected shop matches that basket yet</h2><p>Post a Neighbourhood Request so nearby merchants can respond.</p></div>}</div><section className="price-shock"><Zap /><div><small>PRICE SHOCK</small><strong>Egg prices vary by up to R5 nearby</strong><p>Lowest connected price: R21.99 at Lwazi Market.</p></div><ChevronRight /></section></div>;
}

function DropsView({ drops, onReserve, onDirections }: { drops: Array<Drop & { shop: Shop }>; onReserve: (drop: Drop) => void; onDirections: (shop: Shop) => void }) {
  return <div className="feature-page"><header className="feature-heading drops-heading"><div><p className="eyebrow">DROPS</p><h1>Fresh deals. Right now.</h1><p>Reserve limited local specials before you walk.</p></div><Flame /></header><div className="drop-grid">{drops.map((drop) => <article key={drop.id}><div className="drop-art"><span>{drop.kind === 'last_crate' ? 'LAST CRATE' : `${drop.shop.name.toUpperCase()} JUST DROPPED`}</span><Flame /></div><div className="drop-body"><p><MapPin /> {drop.shop.name}</p><h2>{drop.productName}</h2><div><del>R{(drop.originalPriceCents / 100).toFixed(2)}</del><strong>R{(drop.priceCents / 100).toFixed(2)}</strong></div><small>{drop.quantity} remaining · expires today</small><Button onClick={() => onReserve(drop)}>Reserve</Button><button onClick={() => onDirections(drop.shop)}>View route <ArrowRight /></button></div></article>)}</div></div>;
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
