import { getDb } from '@/db';
import { getSessionUser, json, newId, safeText } from '@/lib/auth';

async function getOwnerShopId(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'owner') return null;
  const shop = await getDb().prepare('SELECT id FROM shops WHERE owner_id = ? LIMIT 1').bind(user.id).first<{ id: string }>();
  return shop?.id ?? null;
}

export async function POST(request: Request) {
  const shopId = await getOwnerShopId(request);
  if (!shopId) return json({ error: 'A shop owner account is required.' }, { status: 403 });
  const body = await request.json<Record<string, unknown>>();
  const name = safeText(body.name, 100);
  const category = safeText(body.category, 60) || 'General';
  const quantity = Math.max(0, Math.floor(Number(body.quantity) || 0));
  const priceCents = Math.max(1, Math.round(Number(body.price) * 100));
  if (!name || !Number.isFinite(priceCents)) return json({ error: 'Enter a product name and valid price.' }, { status: 400 });
  const db = getDb();
  const existing = await db.prepare('SELECT id FROM products WHERE lower(name) = lower(?)').bind(name).first<{ id: string }>();
  const productId = existing?.id ?? newId('prd');
  const now = Math.floor(Date.now() / 1000);
  const statements = [];
  if (!existing) statements.push(db.prepare('INSERT INTO products (id, name, category, unit) VALUES (?, ?, ?, ?)').bind(productId, name, category, 'each'));
  statements.push(db.prepare(`
    INSERT INTO inventory (id, shop_id, product_id, price_cents, quantity, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(shop_id, product_id) DO UPDATE SET price_cents = excluded.price_cents, quantity = excluded.quantity, updated_at = excluded.updated_at
  `).bind(newId('inv'), shopId, productId, priceCents, quantity, now));
  await db.batch(statements);
  return json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const shopId = await getOwnerShopId(request);
  if (!shopId) return json({ error: 'A shop owner account is required.' }, { status: 403 });
  const body = await request.json<Record<string, unknown>>();
  const inventoryId = safeText(body.inventoryId, 100);
  const quantity = Math.max(0, Math.floor(Number(body.quantity) || 0));
  const priceCents = Math.max(1, Math.round(Number(body.price) * 100));
  await getDb().prepare(`
    UPDATE inventory SET quantity = ?, price_cents = ?, updated_at = ? WHERE id = ? AND shop_id = ?
  `).bind(quantity, priceCents, Math.floor(Date.now() / 1000), inventoryId, shopId).run();
  return json({ ok: true });
}
