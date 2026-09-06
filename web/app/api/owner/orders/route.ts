import { getDb } from '@/db';
import { getSessionUser, json, safeText } from '@/lib/auth';

const allowedStatuses = new Set([
  'received',
  'packing',
  'sold_out',
  'bag_tied',
  'ready',
  'collected',
  'cancelled',
]);

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'owner') return json({ error: 'A shop owner account is required.' }, { status: 403 });
  const body = await request.json<Record<string, unknown>>();
  const reservationId = safeText(body.reservationId, 100);
  const status = safeText(body.status, 20);
  if (!allowedStatuses.has(status)) return json({ error: 'Invalid order status.' }, { status: 400 });
  const result = await getDb().prepare(`
    UPDATE reservations SET status = ? WHERE id = ? AND drop_id IN (
      SELECT drops.id FROM drops JOIN shops ON shops.id = drops.shop_id WHERE shops.owner_id = ?
    )
  `).bind(status, reservationId, user.id).run();
  if (!result.meta.changes) return json({ error: 'Order was not found.' }, { status: 404 });
  return json({ ok: true });
}
