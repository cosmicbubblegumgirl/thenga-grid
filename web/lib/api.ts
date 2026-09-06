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
  community: Array<{ id: string; authorName: string; body: string; createdAt: number; shopName?: string; area: 'soweto' | 'ramsgate' }>;
  orders: DemoOrder[];
  demand: Record<string, number>;
};

const STORAGE_KEY = 'thenga-grid-pages-demo-v2';
export const isStaticDemo = typeof __THENGA_STATIC_DEMO__ !== 'undefined' && __THENGA_STATIC_DEMO__;

const SOWETO_LOCATION: Position = { latitude: -26.2383, longitude: 27.9077 };
const RAMSGATE_LOCATION: Position = { latitude: -30.8874, longitude: 30.35 };

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
  ['shop_harbour', 'Harbour Basket', 'Marine Drive, Ramsgate Beach', -30.8857, 30.3514, 4.9, 143, 6, true, true],
  ['shop_bidstone', 'Bidstone Pantry', '88 Bidstone Road, Ramsgate Beach', -30.8885, 30.3485, 4.8, 97, 5, true, true],
  ['shop_lagoon', 'Lagoon Fresh Stop', 'Ramsgate South, KwaZulu-Natal', -30.8911, 30.3523, 4.7, 81, 7, false, true],
  ['shop_marine', 'Marine Tuck Shop', 'Marine Drive, Ramsgate Beach', -30.8838, 30.3551, 4.6, 62, 4, true, true],
  ['shop_south_coast', 'South Coast Save', 'Ramsgate, KwaZulu-Natal', -30.8843, 30.3459, 4.5, 55, 8, false, false],
  ['shop_coastal', 'Coastal Corner Store', 'Ramsgate North, KwaZulu-Natal', -30.8811, 30.3584, 4.8, 104, 6, true, true],
  ['shop_ocean', 'Ocean View Grocer', 'Ramsgate Beach, KwaZulu-Natal', -30.8879, 30.3611, 4.7, 76, 9, true, true],
  ['shop_family', 'Ramsgate Family Foods', 'Ramsgate West, KwaZulu-Natal', -30.8917, 30.3409, 4.6, 69, 7, false, true],
  ['shop_green_valley', 'Green Valley Spaza', 'Ramsgate West, KwaZulu-Natal', -30.8863, 30.3379, 4.5, 44, 5, true, false],
] as const;

const STOCK_ROWS = [
  ['shop_mamat', 'prd_bread', 1899, 11], ['shop_mamat', 'prd_milk', 2199, 12], ['shop_mamat', 'prd_eggs', 2499, 8], ['shop_mamat', 'prd_coke', 2999, 3], ['shop_mamat', 'prd_maize', 3899, 17],
  ['shop_lwazi', 'prd_bread', 1799, 15], ['shop_lwazi', 'prd_milk', 2299, 8], ['shop_lwazi', 'prd_eggs', 2199, 22], ['shop_lwazi', 'prd_coke', 3199, 14], ['shop_lwazi', 'prd_rice', 2999, 19],
  ['shop_corner', 'prd_bread', 1999, 5], ['shop_corner', 'prd_milk', 2099, 9], ['shop_corner', 'prd_eggs', 2699, 10], ['shop_corner', 'prd_coke', 2399, 9],
  ['shop_khaya', 'prd_potatoes', 2400, 13], ['shop_khaya', 'prd_chicken', 5800, 8], ['shop_khaya', 'prd_rice', 2800, 16], ['shop_khaya', 'prd_bread', 1850, 9],
  ['shop_naledi', 'prd_maize', 3699, 11], ['shop_naledi', 'prd_milk', 2250, 7], ['shop_naledi', 'prd_bread', 1950, 12],
  ['shop_mzansi', 'prd_coke', 2600, 18], ['shop_mzansi', 'prd_eggs', 2350, 14], ['shop_mzansi', 'prd_bread', 1800, 10], ['shop_mzansi', 'prd_milk', 2150, 11],
  ['shop_harbour', 'prd_bread', 1850, 14], ['shop_harbour', 'prd_milk', 2250, 9], ['shop_harbour', 'prd_eggs', 2450, 17], ['shop_harbour', 'prd_coke', 2899, 6], ['shop_harbour', 'prd_rice', 3199, 18],
  ['shop_bidstone', 'prd_bread', 1799, 21], ['shop_bidstone', 'prd_milk', 2199, 11], ['shop_bidstone', 'prd_maize', 3799, 13], ['shop_bidstone', 'prd_potatoes', 2599, 8],
  ['shop_lagoon', 'prd_chicken', 5799, 7], ['shop_lagoon', 'prd_eggs', 2399, 16], ['shop_lagoon', 'prd_rice', 2999, 12], ['shop_lagoon', 'prd_bread', 1899, 9],
  ['shop_marine', 'prd_coke', 2699, 15], ['shop_marine', 'prd_bread', 1750, 12], ['shop_marine', 'prd_milk', 2299, 5],
  ['shop_south_coast', 'prd_maize', 3650, 14], ['shop_south_coast', 'prd_rice', 2950, 19], ['shop_south_coast', 'prd_eggs', 2499, 10],
  ['shop_coastal', 'prd_bread', 1825, 18], ['shop_coastal', 'prd_milk', 2175, 13], ['shop_coastal', 'prd_potatoes', 2499, 9], ['shop_coastal', 'prd_coke', 2799, 11],
  ['shop_ocean', 'prd_chicken', 5899, 6], ['shop_ocean', 'prd_rice', 3050, 14], ['shop_ocean', 'prd_eggs', 2425, 12],
  ['shop_family', 'prd_maize', 3599, 20], ['shop_family', 'prd_milk', 2249, 8], ['shop_family', 'prd_bread', 1849, 16],
  ['shop_green_valley', 'prd_bread', 1700, 10], ['shop_green_valley', 'prd_coke', 2599, 12], ['shop_green_valley', 'prd_eggs', 2299, 9],
] as const;

function isNear(position: Position, target: Position, tolerance = 0.25) {
  return Math.abs(position.latitude - target.latitude) < tolerance && Math.abs(position.longitude - target.longitude) < tolerance;
}

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
  shops.find((shop) => shop.id === 'shop_harbour')!.drops.push({
    id: 'drop_ramsgate_bread', productId: 'prd_bread', productName: 'Fresh white bread', priceCents: 1450,
    originalPriceCents: 1850, quantity: 14, expiresAt: now + 86400, kind: 'drop',
  });
  shops.find((shop) => shop.id === 'shop_bidstone')!.drops.push({
    id: 'drop_ramsgate_maize', productId: 'prd_maize', productName: 'Maize meal 2kg', priceCents: 3200,
    originalPriceCents: 3799, quantity: 8, expiresAt: now + 64800, kind: 'last_crate',
  });
  return {
    users: [],
    currentUserId: null,
    shops,
    community: [
      { id: 'post_1', authorName: 'Nandi K.', body: 'Mama T finally has electricity vouchers again.', shopName: "Mama T's", createdAt: now - 480, area: 'soweto' },
      { id: 'post_2', authorName: 'Lwazi Market', body: 'Fresh vetkoek available from 07:00 tomorrow morning.', shopName: 'Lwazi Market', createdAt: now - 1320, area: 'soweto' },
      { id: 'post_3', authorName: 'Ayanda M.', body: 'Harbour Basket has fresh bread and milk back in stock.', shopName: 'Harbour Basket', createdAt: now - 620, area: 'ramsgate' },
      { id: 'post_4', authorName: 'Bidstone Pantry', body: 'New vegetable delivery has arrived near 88 Bidstone Road.', shopName: 'Bidstone Pantry', createdAt: now - 1740, area: 'ramsgate' },
    ],
    orders: [
      { id: 'order_soweto_new', shopId: 'shop_mamat', status: 'reserved', pickupCode: '4821', productName: 'Fresh white bread', customerName: 'Nandi Khumalo', priceCents: 1500 },
      { id: 'order_soweto_packing', shopId: 'shop_mamat', status: 'packing', pickupCode: '1764', productName: 'Full cream milk 1L', customerName: 'Thabo Mokoena', priceCents: 2199 },
      { id: 'order_ramsgate_new', shopId: 'shop_harbour', status: 'reserved', pickupCode: '5932', productName: 'Fresh white bread', customerName: 'Ayesha Naidoo', priceCents: 1450 },
      { id: 'order_ramsgate_ready', shopId: 'shop_harbour', status: 'ready', pickupCode: '8046', productName: 'Large eggs 6-pack', customerName: 'Sipho Cele', priceCents: 2450 },
    ],
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
    const area = isNear(origin, RAMSGATE_LOCATION) ? 'ramsgate' : 'soweto';
    const shops = state.shops.map((shop) => ({
      ...shop,
      distanceKm: located ? Number(distanceKm(origin, shop).toFixed(2)) : null,
    })).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return json({ shops, community: state.community.filter((post) => post.area === area) });
  }
  if (url.pathname.endsWith('/api/osm-shops') && method === 'GET') return json({ shops: [] });
  if (url.pathname.endsWith('/api/location') && method === 'GET') {
    const latitude = Number(url.searchParams.get('lat'));
    const longitude = Number(url.searchParams.get('lng'));
    const position = { latitude, longitude };
    if (isNear(position, SOWETO_LOCATION)) return json({ displayName: 'Orlando West, Soweto', address: { suburb: 'Orlando West', city: 'Soweto' } });
    if (isNear(position, RAMSGATE_LOCATION)) return json({ displayName: 'Ramsgate Beach, KwaZulu-Natal', address: { town: 'Ramsgate Beach', state: 'KwaZulu-Natal' } });
    return json({ displayName: 'Your current area', address: {} });
  }
  if (url.pathname.endsWith('/api/auth/session') && method === 'GET') return json({ user: publicUser(current) });
  if (url.pathname.endsWith('/api/auth/logout') && method === 'POST') {
    state.currentUserId = null;
    saveState(state);
    return json({ ok: true });
  }
  if (url.pathname.endsWith('/api/auth/demo') && method === 'POST') {
    const body = await bodyOf(init);
    const role: AccountRole = body.role === 'owner' ? 'owner' : 'customer';
    const position = { latitude: Number(body.latitude), longitude: Number(body.longitude) };
    const region = isNear(position, RAMSGATE_LOCATION) ? 'ramsgate' : 'soweto';
    const userId = `demo_${role}_${region}`;
    const ownerShopId = region === 'ramsgate' ? 'shop_harbour' : 'shop_mamat';
    let user = state.users.find((candidate) => candidate.id === userId);
    if (!user) {
      user = {
        id: userId,
        email: `${role}.${region}@thengagrid.demo`,
        password: 'local-demo',
        displayName: role === 'owner' ? (region === 'ramsgate' ? 'Zanele Dlamini' : 'Lindiwe Mokoena') : (region === 'ramsgate' ? 'Ayesha Naidoo' : 'Nandi Khumalo'),
        role,
        ...(role === 'owner' ? { shopId: ownerShopId } : {}),
      };
      state.users.push(user);
    }
    if (role === 'owner') {
      const shop = state.shops.find((candidate) => candidate.id === ownerShopId);
      if (shop) shop.ownerId = user.id;
    }
    state.currentUserId = user.id;
    saveState(state);
    return json({ user: publicUser(user) });
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
