import { getDb } from '@/db';
import { createSession, json, normaliseEmail, verifyPassword } from '@/lib/auth';

type LoginRow = {
  id: string;
  email: string;
  displayName: string;
  role: 'customer' | 'owner';
  passwordHash: string;
  passwordSalt: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json<Record<string, unknown>>();
    const email = normaliseEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const user = await getDb().prepare(`
      SELECT id, email, display_name AS displayName, role, password_hash AS passwordHash, password_salt AS passwordSalt
      FROM users WHERE email = ?
    `).bind(email).first<LoginRow>();
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
      return json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }
    const session = await createSession(user.id, request);
    return json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role }, mobileToken: body.client === 'mobile' ? session.token : undefined }, { headers: { 'set-cookie': session.cookie } });
  } catch (error) {
    console.error('Login failed', error);
    return json({ error: 'Sign in is temporarily unavailable.' }, { status: 500 });
  }
}
