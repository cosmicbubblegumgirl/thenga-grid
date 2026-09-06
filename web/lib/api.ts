import type { AccountRole, Drop, Position, Shop, StockItem, User } from '@/lib/types';

declare const __THENGA_STATIC_DEMO__: boolean | undefined;

type DemoUser = User & { password: string; shopId?: string };
type DemoOrder = {
  id: string;
  shopId: string;
  status: string;
  pickupCode: string;
  productName: string;
  customerName: string;
  priceCents: number;
};
type DemoShop = Shop & { ownerId?: string };
type DemoState = {
  users: DemoUser[];
  currentUserId: string | null;
  shops: DemoShop[];
  community: Array<{ id: string; authorName: string; body: string; createdAt: number; shopName?: string }>;
  orders: DemoOrder[];
  demand: Record<string, number>;
};

const STORAGE_KEY = 'thenga-grid-pages-demo-v1';
export const isStaticDemo = typeof __THENGA_STATIC_DEMO__ !== 'undefined' && __THENGA_STATIC_DEMO__;

const PRODUCTS = [
  ['prd_bread', 'Fresh white bread', 'Bakery'],
  ['prd_milk', 'Full cream milk 1L', 'Dairy'],
  ['prd_eggs', 'Large eggs 6-pack', 'Dairy'],
  ['prd_coke', 'Coke 2L', 'Drinks'],
  ['prd_maize', 'Maize meal 2kg', 'Pantry'],
  ['prd_rice', 'Rice 1kg', 'Pantry'],
  ['prd_potatoes', 'Potatoes 2kg', 'Fresh produce'],
  ['prd_chicken', 'Chicken portions 1kg', 'Butchery'],
] as const;

const SHOP_ROWS = [
  ['shop_mamat', "Mama T's", '54 Vilakazi Street, Orlando West, Soweto', -26.2383, 27.9077, 4.9, 186, 6, true, true],
  ['shop_lwazi', 'Lwazi Market', 'Mooki Street, Orlando East, Soweto', -26.2305, 27.9246, 4.7, 93, 4, true, true],
  ['shop_corner', 'Corner Spot', 'Chris Hani Road, Diepkloof, Soweto', -26.2502, 27.9501, 4.6, 71, 7, false, true],
  ['shop_khaya', 'Khaya Fresh Store', 'Maponya Street, Pimville, Soweto', -26.2661, 27.8965, 4.8, 112, 8, true, true],
  ['shop_naledi', 'Naledi Superette', 'Koma Road, Jabulani, Soweto', -26.2518, 27.8584, 4.5, 48, 9, false, false],
  ['shop_mzansi', 'Mzansi Mini Market', 'Mahalefele Road, Dube, Soweto', -26.2289, 27.8912, 4.7, 64, 5, true, true],
] as const;

const STOCK_ROWS = [
  ['shop_mamat', 'prd_bread', 1899, 11], ['shop_mamat', 'prd_milk', 2199, 12], ['shop_mamat', 'prd_eggs', 2499, 8], ['shop_mamat', 'prd_coke', 2999, 3], ['shop_mamat', 'prd_maize', 3899, 17],
  ['shop_lwazi', 'prd_bread', 1799, 15], ['shop_lwazi', 'prd_milk', 2299, 8], ['shop_lwazi', 'prd_eggs', 2199, 22], ['shop_lwazi', 'prd_coke', 3199, 14], ['shop_lwazi', 'prd_rice', 2999, 19],
  ['shop_corner', 'prd_bread', 1999, 5], ['shop_corner', 'prd_milk', 2099, 9], ['shop_corner', 'prd_eggs', 2699, 10], ['shop_corner', 'prd_coke', 2399, 9],
  ['shop_khaya', 'prd_potatoes', 2400, 13], ['shop_khaya', 'prd_chicken', 5800, 8], ['shop_khaya', 'prd_rice', 2800, 16], ['shop_khaya', 'prd_bread', 1850, 9],
  ['shop_naledi', 'prd_maize', 3699, 11], ['shop_naledi', 'prd_milk', 2250, 7], ['shop_naledi', 'prd_bread', 1950, 12],
  ['shop_mzansi', 'prd_coke', 2600, 18], ['shop_mzansi', 'prd_eggs', 2350, 14], ['shop_mzansi', 'prd_bread', 1800, 10], ['shop_mzansi', 'prd_milk', 2150, 11],
] as const;

function createDemoState(): DemoState {
  const now = Math.floor(Date.now() / 1000);
  const shops: DemoShop[] = SHOP_ROWS.map(([id, name, address, latitude, longitude, rating, reviewCount, pickupMinutes, stepFree, verified]) => ({
    id, name, address, latitude, longitude, rating, reviewCount, pickupMinutes, stepFree, verified,
    description: 'Independent shop with live neighbourhood stock',
    phone: null,
    openingHours: '07:00–20:00',
    isOpen: true,
    distanceKm: null,
    inventory: STOCK_ROWS.filter(([shopId]) => shopId === id).map(([shopId, productId, priceCents, quantity], index) => {
      const product = PRODUCTS.find(([candidate]) => candidate === productId)!;
      return { id: `inv_${shopId}_${index + 1}`, productId, name: product[1], category: product[2], priceCents, quantity, updatedAt: now };
    }),
    drops: [],
  }));
  shops.find((shop) => shop.id === 'shop_mamat')!.drops.push({
    id: 'drop_bread', productId: 'prd_bread', productName: 'Fresh white bread', priceCents: 1500,
    originalPriceCents: 1999, quantity: 11, expiresAt: now + 86400, kind: 'drop',
  });
  shops.find((shop) => shop.id === 'shop_corner')!.drops.push({
    id: 'drop_coke', productId: 'prd_coke', productName: 'Coke 2L', priceCents: 1800,
    originalPriceCents: 2999, quantity: 9, expiresAt: now + 43200, kind: 'drop',
  });
  return {
    users: [],
    currentUserId: null,
    shops,
    community: [
      { id: 'post_1', authorName: 'Nandi K.', body: 'Mama T finally has electricity vouchers again.', shopName: "Mama T's", createdAt: now - 480 },
      { id: 'post_2', authorName: 'Lwazi Market', body: 'Fresh vetkoek available from 07:00 tomorrow morning.', shopName: 'Lwazi Market', createdAt: now - 1320 },
    ],
    orders: [],
    demand: { bread: 12, milk: 9, 'baby formula': 7, airtime: 5 },
  };
}

function loadState(): DemoState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as DemoState;
  } catch {
    // A private browser session can disable storage; the demo still works in memory.
  }
  return createDemoState();
}

let memoryState: DemoState | null = null;

function getState() {
  memoryState ??= loadState();
  return memoryState;
}

function saveState(state: DemoState) {
  memoryState = state;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Keep the in-memory copy. */ }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function distanceKm(origin: Position, shop: Shop) {
  const rad = Math.PI / 180;
  const dLat = (shop.latitude - origin.latitude) * rad;
  const dLon = (shop.longitude - origin.longitude) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(origin.latitude * rad) * Math.cos(shop.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function bodyOf(init?: RequestInit) {
  if (typeof init?.body !== 'string') return {} as Record<string, unknown>;
  try { return JSON.parse(init.body) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; }
}

function publicUser(user: DemoUser | undefined): User | null {
  if (!user) return null;
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

async function demoFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  const url = new URL(rawUrl, window.location.origin);
  const method = (init?.method ?? 'GET').toUpperCase();
  const state = getState();
  const current = state.users.find((user) => user.id === state.currentUserId);

  if (url.pathname.endsWith('/api/shops') && method === 'GET') {
    const origin = { latitude: Number(url.searchParams.get('lat')), longitude: Number(url.searchParams.get('lng')) };
    const located = Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude);
    const shops = state.shops.map((shop) => ({
      ...shop,
      distanceKm: located ? Number(distanceKm(origin, shop).toFixed(2)) : null,
    })).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return json({ shops, community: state.community });
  }
  if (url.pathname.endsWith('/api/osm-shops') && method === 'GET') return json({ shops: [] });
  if (url.pathname.endsWith('/api/location') && method === 'GET') {
    const latitude = Number(url.searchParams.get('lat'));
    const longitude = Number(url.searchParams.get('lng'));
    const nearSoweto = Math.abs(latitude + 26.2383) < 0.2 && Math.abs(longitude - 27.9077) < 0.2;
    return json(nearSoweto
      ? { displayName: 'Orlando West, Soweto', address: { suburb: 'Orlando West', city: 'Soweto' } }
      : { displayName: 'Your current area', address: {} });
  }
  if (url.pathname.endsWith('/api/auth/session') && method === 'GET') return json({ user: publicUser(current) });
  if (url.pathname.endsWith('/api/auth/logout') && method === 'POST') {
    state.currentUserId = null;
    saveState(state);
    return json({ ok: true });
  }
  if (url.pathname.endsWith('/api/auth/signup') && method === 'POST') {
    const body = await bodyOf(init);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? '').trim().slice(0, 80);
    const role: AccountRole | null = body.role === 'owner' ? 'owner' : body.role === 'customer' ? 'customer' : null;
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
    if (password.length < 8) return json({ error: 'Use at least 8 characters for your password.' }, 400);
    if (!displayName || !role) return json({ error: 'Enter your name and choose an account type.' }, 400);
    if (state.users.some((user) => user.email === email)) return json({ error: 'An account already exists for this email.' }, 409);
    const userId = id('usr');
    const user: DemoUser = { id: userId, email, password, displayName, role };
    if (role === 'owner') {
      const shopId = id('shop');
      user.shopId = shopId;
      state.shops.push({
        id: shopId,
        ownerId: userId,
        name: String(body.shopName ?? '').trim() || `${displayName}'s Shop`,
        description: 'New neighbourhood shop',
        address: String(body.address ?? '').trim() || 'Location to be confirmed',
        latitude: Number(body.latitude) || -26.2383,
        longitude: Number(body.longitude) || 27.9077,
        phone: String(body.phone ?? '').trim() || null,
        openingHours: '07:00–20:00',
        rating: 5,
        reviewCount: 0,
        pickupMinutes: 10,
        stepFree: false,
        verified: false,
        isOpen: true,
        distanceKm: 0,
        inventory: [],
        drops: [],
      });
    }
    state.users.push(user);
    state.currentUserId = userId;
    saveState(state);
    return json({ user: publicUser(user) }, 201);
  }
  if (url.pathname.endsWith('/api/auth/login') && method === 'POST') {
    const body = await bodyOf(init);
    const email = String(body.email ?? '').trim().toLowerCase();
    const user = state.users.find((candidate) => candidate.email === email && candidate.password === String(body.password ?? ''));
    if (!user) return json({ error: 'Email or password is incorrect in this browser demo.' }, 401);
    state.currentUserId = user.id;
    saveState(state);
    return json({ user: publicUser(user) });
  }
  if (url.pathname.endsWith('/api/reservations') && method === 'POST') {
    if (!current) return json({ error: 'Sign in to reserve this drop.' }, 401);
    if (current.role !== 'customer') return json({ error: 'Use a customer account to make reservations.' }, 403);
    const body = await bodyOf(init);
    const shop = state.shops.find((candidate) => candidate.drops.some((drop) => drop.id === body.dropId));
    const drop = shop?.drops.find((candidate) => candidate.id === body.dropId);
    if (!shop || !drop || drop.quantity < 1 || drop.expiresAt <= Math.floor(Date.now() / 1000)) return json({ error: 'This drop is no longer available.' }, 409);
    drop.quantity -= 1;
    const pickupCode = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const reservationId = id('res');
    state.orders.push({ id: reservationId, shopId: shop.id, status: 'reserved', pickupCode, productName: drop.productName, customerName: current.displayName, priceCents: drop.priceCents });
    saveState(state);
    return json({ reservation: { id: reservationId, status: 'reserved', pickupCode, expiresAt: Math.floor(Date.now() / 1000) + 900 } }, 201);
  }
  if (url.pathname.endsWith('/api/demand') && method === 'POST') {
    const body = await bodyOf(init);
    const query = String(body.query ?? '').trim().slice(0, 180);
    if (!query) return json({ error: 'Tell nearby shops what you need.' }, 400);
    state.demand[query] = (state.demand[query] ?? 0) + 1;
    saveState(state);
    return json({ ok: true, message: 'Nearby participating shops can now respond.' }, 201);
  }
  if (url.pathname.endsWith('/api/owner/shop') && method === 'GET') {
    if (!current || current.role !== 'owner') return json({ error: 'Sign in as a shop owner.' }, 401);
    const shop = state.shops.find((candidate) => candidate.ownerId === current.id || candidate.id === current.shopId);
    if (!shop) return json({ error: 'No shop is linked to this account.' }, 404);
    const demand = Object.entries(state.demand).map(([query, searches]) => ({ query, searches })).sort((a, b) => b.searches - a.searches).slice(0, 8);
    return json({ shop, inventory: shop.inventory, orders: state.orders.filter((order) => order.shopId === shop.id), demand });
  }
  if (url.pathname.endsWith('/api/owner/inventory') && method === 'POST') {
    if (!current || current.role !== 'owner') return json({ error: 'A shop owner account is required.' }, 403);
    const shop = state.shops.find((candidate) => candidate.ownerId === current.id || candidate.id === current.shopId);
    if (!shop) return json({ error: 'No shop is linked to this account.' }, 404);
    const body = await bodyOf(init);
    const name = String(body.name ?? '').trim().slice(0, 100);
    const category = String(body.category ?? '').trim().slice(0, 60) || 'General';
    const priceCents = Math.round(Number(body.price) * 100);
    const quantity = Math.max(0, Math.floor(Number(body.quantity) || 0));
    if (!name || !Number.isFinite(priceCents) || priceCents < 1) return json({ error: 'Enter a product name and valid price.' }, 400);
    const productId = id('prd');
    const item: StockItem = { id: id('inv'), productId, name, category, priceCents, quantity, updatedAt: Math.floor(Date.now() / 1000) };
    shop.inventory.push(item);
    saveState(state);
    return json({ ok: true }, 201);
  }
  if (url.pathname.endsWith('/api/owner/orders') && method === 'PATCH') {
    if (!current || current.role !== 'owner') return json({ error: 'A shop owner account is required.' }, 403);
    const body = await bodyOf(init);
    const order = state.orders.find((candidate) => candidate.id === body.reservationId);
    if (!order) return json({ error: 'Order was not found.' }, 404);
    order.status = String(body.status ?? order.status);
    saveState(state);
    return json({ ok: true });
  }
  if (url.pathname.endsWith('/api/owner/drops') && method === 'POST') {
    if (!current || current.role !== 'owner') return json({ error: 'A shop owner account is required.' }, 403);
    const shop = state.shops.find((candidate) => candidate.ownerId === current.id || candidate.id === current.shopId);
    if (!shop) return json({ error: 'No shop is linked to this account.' }, 404);
    const body = await bodyOf(init);
    const item = shop.inventory.find((candidate) => candidate.productId === body.productId);
    const priceCents = Math.round(Number(body.price) * 100);
    const originalPriceCents = Math.round(Number(body.originalPrice) * 100);
    if (!item || priceCents < 1 || originalPriceCents < priceCents) return json({ error: 'Choose a stocked product and valid drop price.' }, 400);
    const drop: Drop = {
      id: id('drop'), productId: item.productId, productName: item.name, priceCents, originalPriceCents,
      quantity: Math.max(1, Math.floor(Number(body.quantity) || 1)),
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      kind: body.kind === 'last_crate' ? 'last_crate' : 'drop',
    };
    shop.drops.push(drop);
    saveState(state);
    return json({ ok: true }, 201);
  }

  return json({ error: 'This feature needs the hosted THENGA//GRID API.' }, 501);
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const rawUrl = input instanceof Request ? input.url : String(input);
  const isApiRequest = new URL(rawUrl, typeof window === 'undefined' ? 'http://localhost' : window.location.origin).pathname.includes('/api/');
  if (!isStaticDemo || !isApiRequest || typeof window === 'undefined') return fetch(input, init);
  return demoFetch(rawUrl, init);
}
