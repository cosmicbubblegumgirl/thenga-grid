import { getDb } from '@/db';
import { getSessionUser, json, newId, safeText } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  const body = await request.json<Record<string, unknown>>();
  const query = safeText(body.query, 180);
  if (!query) return json({ error: 'Tell nearby shops what you need.' }, { status: 400 });
  const latitude = typeof body.latitude === 'number' ? body.latitude : null;
  const longitude = typeof body.longitude === 'number' ? body.longitude : null;
  await getDb().prepare(`
    INSERT INTO demand_requests (id, customer_id, query, latitude, longitude, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(newId('need'), user?.id ?? null, query, latitude, longitude, Math.floor(Date.now() / 1000)).run();
  return json({ ok: true, message: 'Nearby participating shops can now respond.' }, { status: 201 });
}
