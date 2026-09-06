import { getDb } from '@/db';
import { getSessionUser, json, newId, safeText } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'owner') return json({ error: 'A shop owner account is required.' }, { status: 403 });
  const body = await request.json<Record<string, unknown>>();
  const productId = safeText(body.productId, 100);
  const priceCents = Math.round(Number(body.price) * 100);
  const originalPriceCents = Math.round(Number(body.originalPrice) * 100);
  const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));
  const kind = body.kind === 'last_crate' ? 'last_crate' : 'drop';
  const db = getDb();
  const shop = await db.prepare('SELECT id FROM shops WHERE owner_id = ? LIMIT 1').bind(user.id).first<{ id: string }>();
  const owned = shop ? await db.prepare('SELECT id FROM inventory WHERE shop_id = ? AND product_id = ?').bind(shop.id, productId).first() : null;
  if (!shop || !owned || priceCents < 1 || originalPriceCents < priceCents) return json({ error: 'Choose a stocked product and valid drop price.' }, { status: 400 });
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    INSERT INTO drops (id, shop_id, product_id, price_cents, original_price_cents, quantity, expires_at, kind, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(newId('drop'), shop.id, productId, priceCents, originalPriceCents, quantity, now + 86400, kind, now).run();
  return json({ ok: true }, { status: 201 });
}
