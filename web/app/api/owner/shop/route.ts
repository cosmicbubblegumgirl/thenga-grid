import { getDb } from '@/db';
import { getSessionUser, json, safeText } from '@/lib/auth';

async function ownerShop(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'owner') return { user, shop: null };
  const shop = await getDb().prepare(`
    SELECT id, name, description, address, latitude, longitude, phone,
      opening_hours AS openingHours, pickup_minutes AS pickupMinutes,
      step_free AS stepFree, verified, is_open AS isOpen
    FROM shops WHERE owner_id = ? LIMIT 1
  `).bind(user.id).first<Record<string, unknown>>();
  return { user, shop };
}

export async function GET(request: Request) {
  const { user, shop } = await ownerShop(request);
  if (!user) return json({ error: 'Sign in as a shop owner.' }, { status: 401 });
  if (!shop) return json({ error: 'No shop is linked to this account.' }, { status: 404 });
  const inventory = await getDb().prepare(`
    SELECT inventory.id, products.id AS productId, products.name, products.category,
      inventory.price_cents AS priceCents, inventory.quantity, inventory.updated_at AS updatedAt
    FROM inventory JOIN products ON products.id = inventory.product_id
    WHERE inventory.shop_id = ? ORDER BY products.name
  `).bind(shop.id).all();
  const orders = await getDb().prepare(`
    SELECT reservations.id, reservations.status, reservations.pickup_code AS pickupCode,
      products.name AS productName, users.display_name AS customerName,
      drops.price_cents AS priceCents, reservations.created_at AS createdAt
    FROM reservations
    JOIN drops ON drops.id = reservations.drop_id
    JOIN products ON products.id = drops.product_id
    JOIN users ON users.id = reservations.customer_id
    WHERE drops.shop_id = ? ORDER BY reservations.created_at DESC LIMIT 30
  `).bind(shop.id).all();
  const demand = await getDb().prepare(`
    SELECT query, COUNT(*) AS searches, MAX(created_at) AS latest
    FROM demand_requests
    WHERE created_at > ? GROUP BY lower(query) ORDER BY searches DESC LIMIT 8
  `).bind(Math.floor(Date.now() / 1000) - 604800).all();
  return json({ shop: { ...shop, stepFree: Boolean(shop.stepFree), verified: Boolean(shop.verified), isOpen: Boolean(shop.isOpen) }, inventory: inventory.results, orders: orders.results, demand: demand.results });
}

export async function PATCH(request: Request) {
  const { user, shop } = await ownerShop(request);
  if (!user) return json({ error: 'Sign in as a shop owner.' }, { status: 401 });
  if (!shop) return json({ error: 'No shop is linked to this account.' }, { status: 404 });
  const body = await request.json<Record<string, unknown>>();
  const name = safeText(body.name, 100) || String(shop.name);
  const description = safeText(body.description, 240) || String(shop.description);
  const address = safeText(body.address, 180) || String(shop.address);
  const openingHours = safeText(body.openingHours, 80) || String(shop.openingHours);
  const isOpen = body.isOpen === false ? 0 : 1;
  const stepFree = body.stepFree === true ? 1 : 0;
  const latitude = typeof body.latitude === 'number' ? body.latitude : Number(shop.latitude);
  const longitude = typeof body.longitude === 'number' ? body.longitude : Number(shop.longitude);
  await getDb().prepare(`
    UPDATE shops SET name = ?, description = ?, address = ?, opening_hours = ?, is_open = ?, step_free = ?, latitude = ?, longitude = ? WHERE id = ?
  `).bind(name, description, address, openingHours, isOpen, stepFree, latitude, longitude, shop.id).run();
  return json({ ok: true });
}
