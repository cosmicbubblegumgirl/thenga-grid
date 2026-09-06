import { getDb } from '@/db';
import { getSessionUser, json, newId, safeText } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return json({ error: 'Sign in to view reservations.' }, { status: 401 });
  const rows = await getDb().prepare(`
    SELECT reservations.id, reservations.status, reservations.pickup_code AS pickupCode,
      reservations.expires_at AS expiresAt, products.name AS productName,
      drops.price_cents AS priceCents, shops.name AS shopName
    FROM reservations
    JOIN drops ON drops.id = reservations.drop_id
    JOIN products ON products.id = drops.product_id
    JOIN shops ON shops.id = drops.shop_id
    WHERE reservations.customer_id = ?
    ORDER BY reservations.created_at DESC
  `).bind(user.id).all();
  return json({ reservations: rows.results });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return json({ error: 'Sign in to reserve this drop.' }, { status: 401 });
  if (user.role !== 'customer') return json({ error: 'Use a customer account to make reservations.' }, { status: 403 });
  const body = await request.json<Record<string, unknown>>();
  const dropId = safeText(body.dropId, 100);
  const testPayment = body.paymentMethod === 'open_payments_test';
  const db = getDb();
  const drop = await db.prepare('SELECT id, quantity, expires_at AS expiresAt FROM drops WHERE id = ?').bind(dropId).first<{ id: string; quantity: number; expiresAt: number }>();
  const now = Math.floor(Date.now() / 1000);
  if (!drop || drop.quantity < 1 || drop.expiresAt <= now) return json({ error: 'This drop is no longer available.' }, { status: 409 });
  const id = newId('res');
  const pickupCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10_000).padStart(4, '0');
  const status = testPayment ? 'awaiting_payment' : 'reserved';
  const statements = [
    db.prepare(`INSERT INTO reservations (id, customer_id, drop_id, status, pickup_code, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, dropId, status, pickupCode, now + 900, now),
  ];
  if (!testPayment) statements.push(db.prepare('UPDATE drops SET quantity = quantity - 1 WHERE id = ? AND quantity > 0').bind(dropId));
  await db.batch(statements);
  return json({ reservation: { id, status, pickupCode, expiresAt: now + 900 } }, { status: 201 });
}
