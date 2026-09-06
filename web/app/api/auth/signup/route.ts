import { getDb } from '@/db';
import { createSession, hashPassword, json, newId, normaliseEmail, safeText, validPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json<Record<string, unknown>>();
    const email = normaliseEmail(body.email);
    const password = body.password;
    const displayName = safeText(body.displayName, 80);
    const phone = safeText(body.phone, 30);
    const role = body.role === 'owner' ? 'owner' : body.role === 'customer' ? 'customer' : null;

    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (!validPassword(password)) return json({ error: 'Use at least 8 characters for your password.' }, { status: 400 });
    if (!displayName) return json({ error: 'Enter your name.' }, { status: 400 });
    if (!role) return json({ error: 'Choose customer or shop owner.' }, { status: 400 });

    const db = getDb();
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return json({ error: 'An account already exists for this email.' }, { status: 409 });

    const userId = newId('usr');
    const now = Math.floor(Date.now() / 1000);
    const credentials = await hashPassword(password as string);
    const statements = [db.prepare(`
      INSERT INTO users (id, email, password_hash, password_salt, role, display_name, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, email, credentials.hash, credentials.salt, role, displayName, phone || null, now)];

    if (role === 'owner') {
      const shopName = safeText(body.shopName, 100) || `${displayName}'s Shop`;
      const address = safeText(body.address, 180) || 'Location to be confirmed';
      const latitude = typeof body.latitude === 'number' ? body.latitude : -26.2383;
      const longitude = typeof body.longitude === 'number' ? body.longitude : 27.9077;
      statements.push(db.prepare(`
        INSERT INTO shops
        (id, owner_id, name, description, address, latitude, longitude, phone, opening_hours, rating, review_count, pickup_minutes, step_free, verified, is_open, created_at)
        VALUES (?, ?, ?, 'New neighbourhood shop', ?, ?, ?, ?, '07:00–20:00', 5, 0, 10, 0, 0, 1, ?)
      `).bind(newId('shop'), userId, shopName, address, latitude, longitude, phone || null, now));
    }

    await db.batch(statements);
    const session = await createSession(userId, request);
    return json({ user: { id: userId, email, displayName, role }, mobileToken: body.client === 'mobile' ? session.token : undefined }, { status: 201, headers: { 'set-cookie': session.cookie } });
  } catch (error) {
    console.error('Signup failed', error);
    return json({ error: 'Account creation is temporarily unavailable.' }, { status: 500 });
  }
}
