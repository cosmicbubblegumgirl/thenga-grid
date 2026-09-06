import { endSession, json } from '@/lib/auth';

export async function POST(request: Request) {
  return json({ ok: true }, { headers: { 'set-cookie': await endSession(request) } });
}
